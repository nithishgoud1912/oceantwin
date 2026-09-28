"""Explicitly scoped OGC interfaces: WMS 1.1.1/EPSG:4326 and WCS 1.0.0/NetCDF.

This is an interoperability subset, not a claim of OGC certification.
"""
import io
from xml.sax.saxutils import escape
import numpy as np
import xarray as xr
from PIL import Image
from fastapi import APIRouter, Request
from fastapi.responses import Response
from scientific_data import catalog

router=APIRouter()

def xml(body): return Response(body,media_type='application/xml')
def error(message): return xml(f'<ServiceExceptionReport version="1.1.1"><ServiceException>{escape(str(message))}</ServiceException></ServiceExceptionReport>')
def params(request): return {k.upper():v for k,v in request.query_params.items()}
def bbox(p):
    b=[float(x) for x in p['BBOX'].split(',')]
    if len(b)!=4: raise ValueError('BBOX requires four values')
    return b

@router.get('/ogc/wms')
def wms(request:Request):
    p=params(request); op=p.get('REQUEST','GetCapabilities').lower()
    try:
        if p.get('VERSION','1.1.1')!='1.1.1': raise ValueError('Supported WMS version: 1.1.1')
        url=escape(str(request.url).split('?')[0],{'"':'&quot;'})
        resource=f'<OnlineResource xmlns:xlink="http://www.w3.org/1999/xlink" xlink:type="simple" xlink:href="{url}?"/>'
        if op=='getcapabilities':
            layers=''.join(f'<Layer queryable="0"><Name>{escape(m["key"])}</Name><Title>{escape(m["dataset"]+" / "+m["name"])}</Title><SRS>EPSG:4326</SRS><LatLonBoundingBox minx="{m["bounds"][0]}" miny="{m["bounds"][1]}" maxx="{m["bounds"][2]}" maxy="{m["bounds"][3]}"/><Style><Name>default</Name><Title>Blue to red; sampled field range</Title></Style></Layer>' for m in catalog.entries.values())
            return xml(f'<?xml version="1.0"?><WMT_MS_Capabilities version="1.1.1"><Service><Name>OGC:WMS</Name><Title>OceanTwin archived fields</Title>{resource}</Service><Capability><Request><GetCapabilities><Format>application/vnd.ogc.wms_xml</Format><DCPType><HTTP><Get>{resource}</Get></HTTP></DCPType></GetCapabilities><GetMap><Format>image/png</Format><DCPType><HTTP><Get>{resource}</Get></HTTP></DCPType></GetMap></Request><Exception><Format>application/vnd.ogc.se_xml</Format></Exception><Layer><Title>Ocean fields</Title><SRS>EPSG:4326</SRS>{layers}</Layer></Capability></WMT_MS_Capabilities>')
        if op!='getmap': raise ValueError('Supported operations: GetCapabilities, GetMap')
        if p.get('SRS','EPSG:4326')!='EPSG:4326' or p.get('FORMAT','image/png')!='image/png': raise ValueError('Only EPSG:4326 and image/png supported')
        if p.get('STYLES','') not in ('','default'): raise ValueError('Only default style supported')
        b=bbox(p); w=int(p.get('WIDTH','512')); h=int(p.get('HEIGHT','256'))
        if not (1<=w<=1024 and 1<=h<=1024): raise ValueError('WIDTH/HEIGHT must be 1..1024')
        f=catalog.field(p['LAYERS'],p.get('TIME'),float(p['ELEVATION']) if 'ELEVATION' in p else None,bbox=b,budget=60000)
        values=np.array(f['values'],dtype=float).reshape(f['shape'])[0]
        # Geographic pixel centres, nearest grid cell; mask outside source cell coverage.
        xs=np.linspace(b[0],b[2],w,endpoint=False)+(b[2]-b[0])/(2*w)
        ys=np.linspace(b[3],b[1],h,endpoint=False)-(b[3]-b[1])/(2*h)
        lons=np.array(f['longitudes']); lats=np.array(f['latitudes'])
        ix=np.abs(xs[:,None]-lons).argmin(axis=1); iy=np.abs(ys[:,None]-lats).argmin(axis=1)
        data=values[np.ix_(iy,ix)]; valid=np.isfinite(data)&(xs[None,:]>=lons.min())&(xs[None,:]<=lons.max())&(ys[:,None]>=lats.min())&(ys[:,None]<=lats.max())
        good=data[valid]; lo=float(p.get('COLOR_MIN',good.min() if good.size else 0)); hi=float(p.get('COLOR_MAX',good.max() if good.size else 1))
        if hi<=lo: hi=lo+1
        t=np.clip(np.nan_to_num((data-lo)/(hi-lo)),0,1)
        rgb=np.stack([255*t,200*(1-np.abs(2*t-1)),255*(1-t),255*valid],axis=-1).astype('uint8')
        output=io.BytesIO(); Image.fromarray(rgb).save(output,format='PNG')
        return Response(output.getvalue(),media_type='image/png',headers={'X-OceanTwin-Source':f['variable']['file'],'X-OceanTwin-Sampled':str(f['sampled']).lower()})
    except (ValueError,KeyError,TypeError) as exc: return error(exc)

@router.get('/ogc/wcs')
def wcs(request:Request):
    p=params(request); op=p.get('REQUEST','GetCapabilities').lower()
    try:
        if p.get('VERSION','1.0.0')!='1.0.0': raise ValueError('Supported WCS version: 1.0.0')
        url=escape(str(request.url).split('?')[0],{'"':'&quot;'})
        offerings=''.join(f'<CoverageOfferingBrief><name>{escape(m["key"])}</name><label>{escape(m["name"])}</label><lonLatEnvelope srsName="urn:ogc:def:crs:OGC:1.3:CRS84"><gml:pos>{m["bounds"][0]} {m["bounds"][1]}</gml:pos><gml:pos>{m["bounds"][2]} {m["bounds"][3]}</gml:pos></lonLatEnvelope></CoverageOfferingBrief>' for m in catalog.entries.values())
        if op=='getcapabilities':
            operations=''.join(f'<{name}><DCPType><HTTP><Get><OnlineResource xlink:href="{url}?"/></Get></HTTP></DCPType></{name}>' for name in ['GetCapabilities','DescribeCoverage','GetCoverage'])
            return xml(f'<WCS_Capabilities version="1.0.0" xmlns="http://www.opengis.net/wcs" xmlns:gml="http://www.opengis.net/gml" xmlns:xlink="http://www.w3.org/1999/xlink"><Service><name>OceanTwin</name><label>Bounded archive coverage service</label></Service><Capability><Request>{operations}</Request></Capability><ContentMetadata>{offerings}</ContentMetadata></WCS_Capabilities>')
        key=p['COVERAGE']; meta=catalog.resolve(key)
        if op=='describecoverage':
            return xml(f'<CoverageDescription version="1.0.0" xmlns="http://www.opengis.net/wcs" xmlns:gml="http://www.opengis.net/gml"><CoverageOffering><name>{escape(key)}</name><label>{escape(meta["name"])}</label><description>Rectilinear archived field. Use TIME, ELEVATION and BBOX. Max 60000 cells, coordinate-stride sampling explicitly recorded in output. No requested-resolution resampling.</description><lonLatEnvelope srsName="EPSG:4326"><gml:pos>{meta["bounds"][0]} {meta["bounds"][1]}</gml:pos><gml:pos>{meta["bounds"][2]} {meta["bounds"][3]}</gml:pos></lonLatEnvelope><supportedCRSs><requestResponseCRSs>EPSG:4326</requestResponseCRSs></supportedCRSs><supportedFormats nativeFormat="NetCDF"><formats>NetCDF</formats></supportedFormats></CoverageOffering></CoverageDescription>')
        if op!='getcoverage': raise ValueError('Unsupported WCS operation')
        if p.get('CRS','EPSG:4326')!='EPSG:4326' or p.get('FORMAT','NetCDF').lower() not in ('netcdf','application/x-netcdf'): raise ValueError('Only geographic NetCDF coverage supported')
        if any(k in p for k in ['RESX','RESY','WIDTH','HEIGHT']): raise ValueError('Requested-resolution resampling not supported; use bounded source-grid subsetting')
        f=catalog.field(key,p.get('TIME'),float(p['ELEVATION']) if 'ELEVATION' in p else None,bbox=bbox(p) if 'BBOX' in p else None,volume='ELEVATION' not in p,budget=60000)
        ds=xr.Dataset({meta['name']:(('depth','lat','lon'),np.array(f['values'],dtype=float).reshape(f['shape']))},coords={'depth':f['depths'],'lat':f['latitudes'],'lon':f['longitudes']})
        ds.attrs.update({'source':meta['file'],'sampling':f['sampling'],'sampled':str(f['sampled']),'Conventions':'CF-1.8'})
        ds.attrs.update(provenance=meta['provenance'],time_interpretation=meta['time_interpretation'])
        ds.lat.attrs.update(units='degrees_north',standard_name='latitude'); ds.lon.attrs.update(units='degrees_east',standard_name='longitude')
        ds.depth.attrs.update(units='m',positive='down',standard_name='depth'); ds[meta['name']].attrs['units']=meta['units']
        if f['time']:
            ds=ds.expand_dims(time=[np.datetime64(f['time'])]); ds.time.attrs['standard_name']='time'
            if f.get('time_bounds'):
                ds['time_bounds']=(('time','bounds'),np.array([f['time_bounds']],dtype='datetime64[ns]'))
                ds.time.attrs['bounds']='time_bounds'
                for name in ['time','time_bounds']: ds[name].encoding.update(units='seconds since 1970-01-01',calendar='proleptic_gregorian')
        return Response(bytes(ds.to_netcdf(engine='scipy')),media_type='application/x-netcdf',headers={'Content-Disposition':'attachment; filename="coverage.nc"'})
    except (ValueError,KeyError,TypeError) as exc: return error(exc)
