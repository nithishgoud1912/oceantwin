"""Source-aware scientific data access. No synthetic measurements or silent fallbacks."""
from __future__ import annotations
import json
import threading
from contextlib import contextmanager
from pathlib import Path
import gsw
import numpy as np
import pandas as pd
import xarray as xr
from config import PROJECT_ROOT

IO_LOCK = threading.RLock()  # netCDF4/HDF5 access is serialized within this process.
COORDS = {'lat': ('lat', 'latitude', 'LATITUDE'), 'lon': ('lon', 'longitude', 'LONGITUDE'), 'depth': ('depth', 'DEPTH', 'lev'), 'time': ('time', 'TIME')}
BUILTINS = {
 'argo': {'file':'argo_clean.csv','kind':'argo','columns':{'id':'PLATFORM_NUMBER','profile':'CYCLE_NUMBER','time':'time','lat':'latitude','lon':'longitude','pressure':'PRES','temperature':'TEMP','salinity':'PSAL'},'units':{'temperature':'degC','salinity':'psu'}},
 'glider': {'file':'glider_clean.csv','kind':'glider','columns':{'time':'TIME','lat':'LATITUDE','lon':'LONGITUDE','depth':'DEPTH','temperature':'TEMP','salinity':'PSAL','chlorophyll':'CPHL'},'units':{'temperature':'degC','salinity':'psu','chlorophyll':'unknown'}},
}

def clean(v):
    if isinstance(v, dict): return {str(k):clean(x) for k,x in v.items()}
    if isinstance(v, np.ndarray) and v.ndim == 0: return clean(v.item())
    if isinstance(v, (list,tuple,np.ndarray)): return [clean(x) for x in v]
    if isinstance(v, (pd.Timestamp,np.datetime64)): return pd.Timestamp(v).isoformat()
    if isinstance(v, np.generic): return clean(v.item())
    if isinstance(v, float) and not np.isfinite(v): return None
    return v

def indices(n, limit):
    return np.unique(np.linspace(0,n-1,min(n,max(1,limit)),dtype=int)) if n else np.array([],dtype=int)

def identifier(v): return str(v).removesuffix('.0')

def bounded(a,budget):
    sizes=dict(a.sizes)
    while np.prod(list(sizes.values()),dtype=np.int64)>budget:
        dim=max(sizes,key=sizes.get); sizes[dim]=max(1,(sizes[dim]+1)//2)
    return a.isel({d:indices(a.sizes[d],n) for d,n in sizes.items() if n<a.sizes[d]})

@contextmanager
def open_grid(path):
    with IO_LOCK, xr.open_dataset(path,decode_times=True) as original:
        rename={}
        for coord,names in COORDS.items():
            found=next((n for n in names if n in original.coords),None)
            standard={'lat':'latitude','lon':'longitude','depth':'depth','time':'time'}[coord]
            if found is None: found=next((n for n,a in original.coords.items() if a.attrs.get('standard_name')==standard),None)
            if found and found!=coord: rename[found]=coord
        ds=original.rename(rename)
        for coord in ('lat','lon'):
            if coord not in ds.coords or ds[coord].ndim!=1: raise ValueError('Only rectilinear latitude/longitude grids supported; regrid this source first')
        for coord in ('lat','lon','time','depth'):
            if coord in ds.coords and ds[coord].ndim==1 and ds[coord].dims[0]!=coord:
                ds=ds.swap_dims({ds[coord].dims[0]:coord})
        ds=ds.assign_coords(lon=((ds.lon+180)%360)-180).sortby('lon').sortby('lat')
        if 'depth' in ds.coords:
            unit=str(ds.depth.attrs.get('units','m')).lower()
            if unit not in ('m','meter','meters','metre','metres'): raise ValueError(f'Unsupported depth unit: {unit}')
            if ds.depth.attrs.get('positive')=='up': ds=ds.assign_coords(depth=-ds.depth)
            ds=ds.sortby('depth')
        yield ds

def distance(lat1,lon1,lat2,lon2):
    p1,p2=np.radians([lat1,lat2]); dp=p2-p1; dl=np.radians(lon2-lon1)
    h=np.sin(dp/2)**2+np.cos(p1)*np.cos(p2)*np.sin(dl/2)**2
    return float(6371*2*np.arcsin(np.sqrt(np.clip(h,0,1))))

class DataCatalog:
    def __init__(self,root=PROJECT_ROOT):
        self.root=Path(root); self._lock=threading.RLock(); self._tables={}; self.refresh()

    def refresh(self):
        entries,errors,sources={},{},dict(BUILTINS)
        manifest=self.root/'sources.json'
        if manifest.exists():
            try:
                for name,spec in json.loads(manifest.read_text(encoding='utf-8')).items():
                    if not (self.root/spec['file']).resolve().is_relative_to(self.root.resolve()): raise ValueError('Source paths must remain in the data directory')
                    if not isinstance(spec.get('columns'),dict): raise ValueError('Adapter requires columns mapping')
                    sources[name]=spec
            except Exception as exc: errors['sources.json']=str(exc)
        paths=sorted(p for p in set(self.root.glob('*.nc4'))|set(self.root.glob('*.nc'))|set((self.root/'incoming').glob('*.nc*')) if p.suffix in ('.nc','.nc4'))
        for path in paths:
            try:
                with open_grid(path) as ds:
                    for name,a in ds.data_vars.items():
                        if not {'lat','lon'}.issubset(a.dims) or set(a.dims)-{'lat','lon','time','depth'} or not np.issubdtype(a.dtype,np.number): continue
                        key=f'{path.stem}:{name}'
                        if key in entries: raise ValueError(f'Duplicate source key {key}')
                        sample=np.asarray(bounded(a,10000).values); valid=sample[np.isfinite(sample)]
                        entries[key]={'key':key,'name':name,'dataset':path.stem,'file':str(path.relative_to(self.root)),
                            'units':a.attrs.get('units','unknown'),'standard_name':a.attrs.get('standard_name'),
                            'shape':dict(a.sizes),'depths':clean(ds.depth.values) if 'depth' in a.dims else [0.0],
                            'times':[pd.Timestamp(t).isoformat() for t in ds.time.values] if 'time' in a.dims else [],
                            'bounds':[float(ds.lon.min()),float(ds.lat.min()),float(ds.lon.max()),float(ds.lat.max())],
                            'minimum':float(valid.min()) if valid.size else None,'maximum':float(valid.max()) if valid.size else None,
                            'range_method':'bounded sample, up to 10000 cells','conventions':str(ds.attrs.get('Conventions','not declared')),
                            'cf_status':'Coordinates decoded; not full CF certification',
                            'provenance':str(ds.attrs.get('source',path.name)),
                            'time_interpretation':str(ds.attrs.get('time_interpretation','Source timestamps'))}
            except Exception as exc: errors[path.name]=str(exc)
        with self._lock:
            self.entries,self.errors,self.sources=entries,errors,sources; self._tables.clear()
        return self.summary()

    def summary(self):
        return {'variables':list(self.entries.values()),'sources':[{'id':k,'kind':v.get('kind','sensor'),'file':v['file'],'variables':[c for c in v['columns'] if c not in ('id','time','profile','lat','lon','depth','pressure','qc')],'available':(self.root/v['file']).exists()} for k,v in self.sources.items()],
            'errors':self.errors,'status':'ready' if self.entries and not self.errors else 'degraded','data_mode':'Archived source files; no live feed configured'}

    def resolve(self,key):
        if key in self.entries: return self.entries[key]
        name={'temperature':'water_temp','temp':'water_temp','u':'water_u','v':'water_v'}.get(key,key)
        matches=[v for v in self.entries.values() if v['name']==name]
        if len(matches)!=1: raise ValueError('Variable missing or ambiguous; choose a dataset-qualified key')
        return matches[0]

    def select(self,ds,meta,time=None,depth=None,volume=False,bbox=None):
        a=ds[meta['name']]
        if 'time' in a.dims:
            times=pd.DatetimeIndex(a.time.values)
            if time:
                t=pd.Timestamp(time)
                if t.tzinfo: t=t.tz_convert('UTC').tz_localize(None)
                possible=np.where(times.normalize()==t.normalize())[0] if len(time)==10 else np.where(times==t)[0]
                if not len(possible): raise ValueError('No model sample at this time; select an available timestamp')
                idx=int(possible[0])
            else: idx=0
            a=a.isel(time=idx)
        if 'depth' in a.dims and not volume:
            d=float(a.depth.values[0]) if depth is None else float(depth)
            if not float(a.depth.min())<=d<=float(a.depth.max()): raise ValueError('Depth outside source coverage; no extrapolation performed')
            a=a.sel(depth=d,method='nearest')
        if bbox:
            west,south,east,north=bbox
            if not (-180<=west<east<=180 and -90<=south<north<=90): raise ValueError('Invalid bounding box; split dateline-crossing regions')
            a=a.sel(lon=slice(west,east),lat=slice(south,north))
        if not a.size: raise ValueError('No grid cells in selected region')
        return a

    def field(self,key,time=None,depth=None,volume=False,bbox=None,budget=24000):
        meta=self.resolve(key)
        with open_grid(self.root/meta['file']) as ds:
            a=self.select(ds,meta,time,depth,volume,bbox); original=dict(a.sizes)
            a=bounded(a,max(1,min(budget,60000)))
            if 'depth' not in a.dims: a=a.expand_dims(depth=[float(a.depth) if 'depth' in a.coords else 0.0])
            a=a.transpose('depth','lat','lon'); v=np.asarray(a.values,dtype=float)
            time_bounds=None
            bounds_name=ds.time.attrs.get('bounds') if 'time' in ds.coords else None
            if bounds_name in ds and 'time' in a.coords:
                time_bounds=[pd.Timestamp(t).isoformat() for t in ds[bounds_name].sel(time=a.time).values.reshape(-1)]
            return clean({'variable':meta,'time':pd.Timestamp(a.time.values).isoformat() if 'time' in a.coords else None,
                'time_bounds':time_bounds,
                'depths':a.depth.values,'latitudes':a.lat.values,'longitudes':a.lon.values,'shape':list(v.shape),'values':v.ravel(),
                'source_shape':original,'sampled':v.size<int(np.prod(list(original.values()))),'sampling':'coordinate-stride before field read',
                'valid_cells':int(np.isfinite(v).sum()),'requested_depth':depth})

    def ocean_data(self,key,filters,max_points):
        bbox=[filters[k] for k in ['lon_min','lat_min','lon_max','lat_max']] if all(filters.get(k) is not None for k in ['lon_min','lat_min','lon_max','lat_max']) else None
        f=self.field(key,filters.get('time'),filters.get('depth'),bbox=bbox,budget=max_points); rows=[]
        for k,z in enumerate(f['depths']):
            for j,lat in enumerate(f['latitudes']):
                for i,lon in enumerate(f['longitudes']):
                    value=f['values'][(k*len(f['latitudes'])+j)*len(f['longitudes'])+i]
                    if value is not None: rows.append({'lat':lat,'lon':lon,'depth':z,'time':f['time'],f['variable']['name']:value})
        return {'variable':f['variable'],'count':len(rows),'sampled':f['sampled'],'data':rows}

    def model_profile(self,key,lat,lon,time=None):
        meta=self.resolve(key)
        if not (-90<=lat<=90 and -180<=lon<=180): raise ValueError('Invalid coordinates')
        with open_grid(self.root/meta['file']) as ds:
            if not (float(ds.lat.min())<=lat<=float(ds.lat.max()) and float(ds.lon.min())<=lon<=float(ds.lon.max())): raise ValueError('Location outside source grid')
            a=self.select(ds,meta,time,volume=True).sel(lat=lat,lon=lon,method='nearest')
            values=np.asarray(a.values).reshape(-1); depths=np.asarray(a.depth.values).reshape(-1) if 'depth' in a.coords else [0]
            return clean({'variable':meta,'latitude':float(a.lat),'longitude':float(a.lon),'distance_km':distance(lat,lon,float(a.lat),float(a.lon)),
                'time':pd.Timestamp(a.time.values).isoformat() if 'time' in a.coords else None,
                'data':[{'depth':float(d),'value':float(v)} for d,v in zip(depths,values)],'availability':'available' if np.isfinite(values).any() else 'masked / no ocean data'})

    def table(self,source):
        if source not in self.sources: raise ValueError('Unknown observation source')
        spec=self.sources[source]; path=self.root/spec['file']
        if not path.exists(): raise ValueError('Observation source file missing')
        stamp=(path.stat().st_mtime_ns,path.stat().st_size)
        with self._lock:
            cached=self._tables.get(source)
            if cached and cached[0]==stamp: return cached[1]
        raw=pd.read_csv(path,sep=spec.get('delimiter',','),low_memory=False); mapping=spec['columns']
        if not {'time','lat','lon'}.issubset(mapping) or not ('depth' in mapping or 'pressure' in mapping): raise ValueError('Adapter requires time, lat, lon and depth/pressure')
        missing=set(mapping.values())-set(raw.columns)
        if missing: raise ValueError(f'Missing mapped columns: {sorted(missing)}')
        frame=raw[list(mapping.values())].rename(columns={v:k for k,v in mapping.items()}).copy()
        frame['id']=frame['id'].map(identifier) if 'id' in frame else source
        frame['time']=pd.to_datetime(frame.time,errors='coerce',utc=True)
        for c in set(frame.columns)-{'id','profile','time','qc'}: frame[c]=pd.to_numeric(frame[c],errors='coerce')
        if 'pressure' in frame: frame['depth']=-gsw.z_from_p(frame.pressure.to_numpy(),frame.lat.to_numpy())
        frame['profile']=frame['profile'].map(identifier) if 'profile' in frame else frame.time.dt.strftime('%Y-%m-%d')
        frame=frame.dropna(subset=['time','lat','lon','depth','id','profile'])
        frame=frame[frame.lat.between(-90,90)&frame.lon.between(-180,360)&(frame.depth>=0)].copy(); frame['lon']=((frame.lon+180)%360)-180
        frame['qc_status']='unverified'
        if 'qc' in frame: frame['qc_status']=np.where(frame.qc.map(identifier).isin([str(v) for v in spec.get('good_qc',[1,2])]),'source accepted','source flagged')
        for name,limits in {'temperature':(-3,45),'salinity':(2,45),'chlorophyll':(0,200)}.items():
            if name in frame: frame.loc[~frame[name].between(*limits)&frame[name].notna(),'qc_status']='range flagged'
        frame=frame.sort_values(['id','time','depth']).reset_index(drop=True)
        with self._lock: self._tables[source]=(stamp,frame)
        return frame

    def fleet(self,source):
        if source=='all':
            sensors=[]; errors={}
            for name,spec in self.sources.items():
                if not (self.root/spec['file']).exists(): continue
                try: sensors.extend(self.fleet(name)['sensors'])
                except (ValueError,OSError) as exc: errors[name]=str(exc)
            return {'sensors':sensors,'count':len(sensors),'errors':errors,'status':'archive'}
        frame=self.table(source); rows=[]
        for key,g in frame.groupby('id'):
            last=g.iloc[-1]
            rows.append({'id':key,'source':source,'kind':self.sources[source].get('kind','sensor'),'lat':float(last.lat),'lon':float(last.lon),'time':last.time.isoformat(),'profiles':int(g.profile.nunique()),'samples':len(g)})
        return {'source':source,'sensors':rows,'count':len(rows),'time_min':frame.time.min().isoformat() if len(frame) else None,'time_max':frame.time.max().isoformat() if len(frame) else None,'status':'archive','file':self.sources[source]['file']}

    def observation_profile(self,source,key,profile=None,variable='temperature'):
        frame=self.table(source); frame=frame[frame.id==identifier(key)]
        if frame.empty: raise ValueError('Instrument not found')
        profiles=frame.groupby('profile',sort=False).agg(time=('time','min'),end=('time','max'),count=('depth','size')).reset_index()
        selected=str(profile) if profile is not None else str(profiles.iloc[-1]['profile']); group=frame[frame.profile==selected]
        if group.empty: raise ValueError('Profile not found')
        if variable not in group: raise ValueError('Variable not measured by instrument')
        cols=['time','lat','lon','depth',variable,'qc_status']+(['pressure'] if 'pressure' in group else [])
        records=group[cols].iloc[indices(len(group),5000)]
        track=frame[['lat','lon','time']].drop_duplicates(['lat','lon']); track=track.iloc[indices(len(track),500)]
        return clean({'source':source,'file':self.sources[source]['file'],'id':identifier(key),'profile':selected,'profiles':profiles.to_dict('records'),
            'variable':variable,'units':self.sources[source].get('units',{}).get(variable,'unknown'),
            'variables':[k for k in self.sources[source]['columns'] if k not in ['id','profile','time','lat','lon','depth','pressure','qc']],
            'profile_type':'instrument cycle' if 'profile' in self.sources[source]['columns'] else 'daily samples; may contain multiple dives',
            'depth_method':'TEOS-10 pressure-to-depth using latitude' if 'pressure' in group else 'source depth (m)',
            'count':len(group),'sampled':len(group)>len(records),'data':records.to_dict('records'),'track':track.to_dict('records')})

    def compare(self,key,source,sensor,profile=None,variable='temperature',hours=24,km=25,depth_tolerance=20):
        obs=self.observation_profile(source,sensor,profile,variable); meta=self.resolve(key)
        empty=lambda reason:{'status':'unavailable','reason':reason,'pairs':[],'metrics':None}
        if meta.get('standard_name')=='sea_water_potential_temperature': return empty('Potential temperature must be converted before comparing with in-situ temperature')
        expected={'temperature':('water_temp','sea_water_temperature'),'salinity':('salinity','sea_water_salinity','sea_water_practical_salinity'),'chlorophyll':('chlor_a','mass_concentration_of_chlorophyll_a_in_sea_water','mass_concentration_of_chlorophyll_in_sea_water')}
        if variable not in expected or not any(meta.get(k) in expected[variable] for k in ['name','standard_name']): return empty('Model and observation variables are incompatible')
        unit_groups=[{'degc','degree_celsius','degrees_celsius','celsius'},{'psu','1e-3','pss-78','1'},{'mg m-3','mg m^-3','mg/m^3','mg/m3'}]
        if not any(str(meta['units']).lower() in g and str(obs['units']).lower() in g for g in unit_groups): return empty('Source units incompatible or unknown')
        pairs=[]; rejected={'missing_or_flagged':0,'time':0,'space':0,'depth':0,'masked':0}
        with open_grid(self.root/meta['file']) as ds:
            a=ds[meta['name']]
            if 'time' not in a.dims: return empty('Model timestamp missing')
            ts=pd.DatetimeIndex(a.time.values).tz_localize('UTC')
            for row in obs['data']:
                if row[variable] is None or 'flagged' in row['qc_status']: rejected['missing_or_flagged']+=1; continue
                delta=np.abs((ts-pd.Timestamp(row['time'])).total_seconds()); ti=int(np.argmin(delta))
                if delta[ti]>hours*3600: rejected['time']+=1; continue
                if not (float(a.lat.min())<=row['lat']<=float(a.lat.max()) and float(a.lon.min())<=row['lon']<=float(a.lon.max())): rejected['space']+=1; continue
                chosen=a.isel(time=ti).sel(lat=row['lat'],lon=row['lon'],method='nearest'); sep=distance(row['lat'],row['lon'],float(chosen.lat),float(chosen.lon))
                if sep>km: rejected['space']+=1; continue
                if 'depth' in chosen.dims: chosen=chosen.sel(depth=row['depth'],method='nearest')
                z=float(chosen.depth) if 'depth' in chosen.coords else 0
                if abs(z-row['depth'])>depth_tolerance: rejected['depth']+=1; continue
                v=float(chosen.values)
                if not np.isfinite(v): rejected['masked']+=1; continue
                pairs.append({'depth':row['depth'],'observed':row[variable],'model':v,'difference':v-row[variable],
                    'observation_time':row['time'],'model_time':ts[ti].isoformat(),'model_depth':z,'model_lat':float(chosen.lat),'model_lon':float(chosen.lon),
                    'distance_km':sep,'time_difference_hours':float(delta[ti]/3600),'qc_status':row['qc_status']})
        diffs=np.array([p['difference'] for p in pairs])
        return clean({'status':'matched' if pairs else 'unavailable','reason':None if pairs else 'No independent observations satisfy the time, location, depth and quality constraints',
            'source':obs['file'],'model_source':meta['file'],'variable':variable,'units':obs['units'],'pairs':pairs,'rejected':rejected,
            'tolerances':{'hours':hours,'km':km,'depth_metres':depth_tolerance},'observations_sampled':obs['sampled'],
            'metrics':{'count':len(pairs),'rmse':float(np.sqrt(np.mean(diffs**2))),'bias':float(diffs.mean()),'mae':float(np.abs(diffs).mean())} if pairs else None})

catalog=DataCatalog()
