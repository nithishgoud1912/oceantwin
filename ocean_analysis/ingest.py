"""Portable, explicit preprocessing. Source files are never overwritten by default.

Run `python ocean_analysis/ingest.py --help` from any directory.
"""
import argparse
import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd
import xarray as xr

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from scientific_data import open_grid


def satellite(files, output, bbox=(50, 0, 100, 30)):
    """Preserve actual composite intervals; do not call daily composites instantaneous."""
    arrays, intervals, provenance = [], [], []
    west, south, east, north = bbox
    for path in sorted(files):
        with open_grid(path) as ds:
            start = pd.Timestamp(ds.attrs['time_coverage_start']).tz_convert('UTC').tz_localize(None)
            end = pd.Timestamp(ds.attrs['time_coverage_end']).tz_convert('UTC').tz_localize(None)
            a = ds.chlor_a.sel(lat=slice(south, north), lon=slice(west, east)).load()
            if not a.size: raise ValueError(f'No cells in region: {path}')
            arrays.append(a.expand_dims(time=[start.to_datetime64()]))
            intervals.append([start.to_datetime64(), end.to_datetime64()])
            provenance.append(Path(path).name)
    if not arrays: raise ValueError('No satellite files found')
    ds = xr.concat(arrays, dim='time', join='exact').to_dataset(name='chlor_a')
    ds['time_bounds'] = (('time', 'bounds'), np.array(intervals, dtype='datetime64[ns]'))
    ds.time.attrs.update(standard_name='time', bounds='time_bounds')
    ds.lat.attrs.update(standard_name='latitude', units='degrees_north')
    ds.lon.attrs.update(standard_name='longitude', units='degrees_east')
    ds.attrs.update(Conventions='CF-1.8', source='; '.join(provenance),
        time_interpretation='Daily satellite composites; timestamps mark interval starts. Coverage ends are preserved in time_bounds; intervals can overlap. Surface-only observations, not a 3D model.')
    # Use the same encoding for the time coordinate and its bounds.
    encoding = {k: {'units':'seconds since 1970-01-01', 'calendar':'proleptic_gregorian'} for k in ('time','time_bounds')}
    encoding['chlor_a'] = {'zlib':True, 'complevel':4}
    ds.to_netcdf(output, encoding=encoding)
    return {'file':str(output), 'shape':dict(ds.sizes), 'sources':provenance}


def export_grid(path, variable, output):
    with open_grid(path) as ds:
        frame=ds[variable].to_dataframe().reset_index().dropna(subset=[variable])
        frame.to_csv(output,index=False)
    return {'rows':len(frame),'source':str(path),'variable':variable}


def export_currents(upath,vpath,output):
    with open_grid(upath) as uds, open_grid(vpath) as vds:
        times=np.intersect1d(uds.time.values,vds.time.values)
        depths=np.intersect1d(uds.depth.values,vds.depth.values)
        if not len(times) or not len(depths): raise ValueError('Current components have no shared timestamp/depth. No output written.')
        u=uds.water_u.sel(time=times,depth=depths)
        v=vds.water_v.sel(time=times,depth=depths).interp(lat=u.lat,lon=u.lon,method='nearest')
        out=xr.Dataset({'u_current':u,'v_current':v,'current_speed':np.hypot(u,v)})
        frame=out.to_dataframe().reset_index().dropna(subset=['u_current','v_current'])
        frame.to_csv(output,index=False)
    return {'rows':len(frame),'sources':[str(upath),str(vpath)],'alignment':'Shared time/depth; nearest v on u grid'}


def export_argo(path,output):
    frame=pd.read_csv(path,low_memory=False)
    required=['PLATFORM_NUMBER','CYCLE_NUMBER','time','latitude','longitude','PRES','TEMP','PSAL']
    # Keep original QC columns when present, rather than silently discarding them.
    frame=frame[required+[c for c in frame if c.endswith('_QC') and c not in required]].copy()
    for c in ['latitude','longitude','PRES','TEMP','PSAL']: frame[c]=pd.to_numeric(frame[c],errors='coerce')
    frame['time']=pd.to_datetime(frame.time,errors='coerce',utc=True)
    frame=frame.dropna(subset=['PLATFORM_NUMBER','CYCLE_NUMBER','time','latitude','longitude','PRES'])
    frame.sort_values(['PLATFORM_NUMBER','CYCLE_NUMBER','PRES']).to_csv(output,index=False)
    return {'rows':len(frame),'source':str(path),'note':'Pressure retained in dbar; backend converts to depth'}


def export_glider(path,output):
    with xr.open_dataset(path) as ds:
        names=[n for n in ['TEMP','PSAL','CPHL'] if n in ds]
        frame=ds[names].to_dataframe().reset_index()
        frame=frame[['TIME','LATITUDE','LONGITUDE','DEPTH']+names].dropna(subset=['TIME','LATITUDE','LONGITUDE','DEPTH'])
        frame.sort_values(['TIME','DEPTH']).to_csv(output,index=False)
        units={n:ds[n].attrs.get('units','unknown') for n in names}
    return {'rows':len(frame),'source':str(path),'units':units,'note':'Configure these units in the observation adapter'}


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('kind',choices=['modis','grid','currents','argo','glider'])
    parser.add_argument('--input',type=Path,help='Input file; for modis, a directory')
    parser.add_argument('--v-input',type=Path,help='Northward component file for currents')
    parser.add_argument('--variable',help='NetCDF variable for grid export')
    parser.add_argument('--output',type=Path,required=True,help='New output path; existing files are refused')
    args=parser.parse_args(argv)
    if args.output.exists(): parser.error('Output exists. Choose a new versioned path.')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    try:
        if args.kind=='modis': result=satellite((args.input or ROOT/'arch1').glob('AQUA_MODIS*.nc'),args.output)
        elif not args.input: parser.error('--input is required')
        elif args.kind=='grid':
            if not args.variable: parser.error('--variable is required')
            result=export_grid(args.input,args.variable,args.output)
        elif args.kind=='currents':
            if not args.v_input: parser.error('--v-input is required')
            result=export_currents(args.input,args.v_input,args.output)
        elif args.kind=='argo': result=export_argo(args.input,args.output)
        else: result=export_glider(args.input,args.output)
    except (ValueError,KeyError,OSError) as exc: parser.exit(1,f'{exc}\n')
    args.output.with_suffix(args.output.suffix+'.provenance.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps(result,indent=2))


if __name__=='__main__': main()
