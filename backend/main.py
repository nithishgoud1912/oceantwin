"""OceanTwin scientific API. Responses describe source coverage, never simulated telemetry."""
from __future__ import annotations
import asyncio
import io
import json
import os
import re
import secrets
from contextlib import asynccontextmanager
from pathlib import Path
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from scientific_data import catalog, clean, indices, open_grid, IO_LOCK
from config import PROJECT_ROOT

@asynccontextmanager
async def lifespan(app):
    async def watch():
        # Explicit opt-in local ingestion watcher; no remote fetches or guessed live status.
        while True:
            await asyncio.sleep(max(30,int(os.getenv('OCEANTWIN_REFRESH_SECONDS','300'))))
            await asyncio.to_thread(catalog.refresh)
    task=asyncio.create_task(watch()) if os.getenv('OCEANTWIN_WATCH')=='1' else None
    yield
    if task:
        task.cancel()
        try: await task
        except asyncio.CancelledError: pass

app=FastAPI(title='OceanTwin Scientific Data API',version='3.0.0',lifespan=lifespan,
    description='Archived, file-backed grids and observations. Every field retains source provenance. No operational forecasts or AI advisories are generated.')

@app.exception_handler(ValueError)
async def invalid(request,exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=422,content={'detail':str(exc)})

@app.exception_handler(FileNotFoundError)
async def missing(request,exc):
    from fastapi.responses import JSONResponse
    return JSONResponse(status_code=404,content={'detail':'Source file unavailable; refresh the catalog'})

def parse_bbox(text):
    if not text: return None
    result=[float(v) for v in text.split(',')]
    if len(result)!=4: raise ValueError('bbox requires west,south,east,north')
    return result

@app.get('/api')
def root(): return {'name':app.title,'version':app.version,'docs':'/docs','mode':'source-backed archive'}

@app.get('/api/health')
def health():
    s=catalog.summary()
    return {'status':s['status'],'variables':len(s['variables']),'observation_sources':sum(v['available'] for v in s['sources']),'errors':s['errors'],'mode':s['data_mode']}

@app.get('/api/catalog')
@app.get('/api/variables')
def variables(): return catalog.summary()

@app.get('/api/datasets')
def datasets():
    s=catalog.summary()
    csvs=[{'name':p.stem,'format':'csv','file':p.name} for p in PROJECT_ROOT.glob('*_clean.csv')]
    return {'datasets':s['variables']+csvs,'sources':s['sources'],'errors':s['errors']}

@app.get('/api/variables/{variable}')
def metadata(variable:str): return catalog.resolve(variable)

@app.get('/api/field')
def field(variable:str,time:str|None=None,depth:float|None=None,volume:bool=False,bbox:str|None=None,budget:int=Query(24000,ge=100,le=60000)):
    return catalog.field(variable,time,depth,volume,parse_bbox(bbox),budget)

@app.get('/api/ocean/{variable}')
def ocean(variable:str,time:str|None=None,depth:float|None=None,lat_min:float|None=None,lat_max:float|None=None,lon_min:float|None=None,lon_max:float|None=None,max_points:int=Query(5000,ge=1,le=10000)):
    return catalog.ocean_data(variable,{'time':time,'depth':depth,'lat_min':lat_min,'lat_max':lat_max,'lon_min':lon_min,'lon_max':lon_max},max_points)

@app.get('/api/profile')
def profile(variable:str,latitude:float=Query(...,ge=-90,le=90),longitude:float=Query(...,ge=-180,le=180),time:str|None=None):
    return catalog.model_profile(variable,latitude,longitude,time)

@app.get('/api/fleet')
def fleet(source:str='argo'): return catalog.fleet(source)

@app.get('/api/instrument-profile')
def instrument(source:str,id:str,profile:str|None=None,variable:str='temperature'):
    return catalog.observation_profile(source,id,profile,variable)

@app.get('/api/observations/{source}')
def observations(source:str,max_points:int=Query(5000,ge=1,le=10000)):
    frame=catalog.table(source)
    return clean({'dataset':source,'count':len(frame),'sampled':len(frame)>max_points,'data':frame.iloc[indices(len(frame),max_points)].to_dict('records')})

@app.get('/api/observations/{source}/{id}')
def observation_by_id(source:str,id:str,max_points:int=Query(5000,ge=1,le=10000)):
    from scientific_data import identifier
    frame=catalog.table(source); frame=frame[frame.id==identifier(id)]
    if frame.empty: raise HTTPException(404,'Instrument not found')
    return clean({'dataset':source,'count':len(frame),'data':frame.iloc[indices(len(frame),max_points)].to_dict('records')})

@app.get('/api/comparison')
def comparison(variable:str,source:str,id:str,profile:str|None=None,observed_variable:str='temperature',hours:float=Query(24,ge=0,le=72),km:float=Query(25,gt=0,le=100),depth_tolerance:float=Query(20,ge=0,le=100)):
    return catalog.compare(variable,source,id,profile,observed_variable,hours,km,depth_tolerance)

@app.get('/api/currents')
def currents(u_variable:str='water_u',v_variable:str='water_v',time:str|None=None,depth:float=0,bbox:str|None=None):
    um,vm=catalog.resolve(u_variable),catalog.resolve(v_variable)
    common=sorted(set(um['times'])&set(vm['times']))
    if not common: return {'status':'unavailable','reason':'Current components have no common timestamp; combining them would misrepresent water movement','vectors':[]}
    velocity_units={'m/s','m s-1','m s^-1','meter second-1'}
    if str(um['units']).lower() not in velocity_units or str(vm['units']).lower() not in velocity_units:
        return {'status':'unavailable','reason':'Both current components require declared metres-per-second units','vectors':[]}
    selected=time or common[-1]
    if selected not in common: return {'status':'unavailable','reason':'Choose a timestamp shared by both current components','times':common,'vectors':[]}
    with open_grid(PROJECT_ROOT/um['file']) as uds, open_grid(PROJECT_ROOT/vm['file']) as vds:
        u=catalog.select(uds,um,selected,depth,bbox=parse_bbox(bbox)); v=catalog.select(vds,vm,selected,depth)
        from scientific_data import bounded
        u=bounded(u,1200); v=v.interp(lat=u.lat,lon=u.lon,method='nearest')
        uz=float(u.depth) if 'depth' in u.coords else 0.0
        vz=float(v.depth) if 'depth' in v.coords else 0.0
        if uz!=vz: raise ValueError('Current components selected different depth levels')
        rows=[]
        for j,lat in enumerate(u.lat.values):
            for i,lon in enumerate(u.lon.values):
                a,b=float(u.values[j,i]),float(v.values[j,i])
                if np.isfinite(a) and np.isfinite(b): rows.append({'lat':float(lat),'lon':float(lon),'u':a,'v':b,'speed':float(np.hypot(a,b))})
    return {'status':'available','time':selected,'depth':uz,'units':'m/s','sources':[um['file'],vm['file']],'vectors':rows,'alignment':'v nearest-neighbour on sampled u grid; no extrapolation'}

def queried_table(dataset,search='',depth=None,offset=0,limit=100):
    # Dataset names are catalog entries, never caller-controlled file paths.
    paths={p.stem:p for p in PROJECT_ROOT.glob('*_clean.csv')}
    if dataset in catalog.sources: frame=catalog.table(dataset).copy()
    elif dataset in paths: frame=pd.read_csv(paths[dataset],low_memory=False)
    else: raise ValueError('Unknown table dataset')
    if depth is not None:
        col=next((c for c in ('depth','DEPTH') if c in frame),None)
        if col is None: raise ValueError('No depth column; use normalized observation source for pressure conversion')
        frame=frame[np.isclose(pd.to_numeric(frame[col],errors='coerce'),depth,atol=0.5)]
    if search:
        mask=pd.Series(False,index=frame.index)
        for col in frame.columns: mask|=frame[col].astype(str).str.contains(search,case=False,regex=False,na=False)
        frame=frame[mask]
    return frame,frame.iloc[offset:offset+limit]

@app.get('/api/table')
def table(dataset:str,search:str='',depth:float|None=None,offset:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=10000)):
    all_rows,page=queried_table(dataset,search,depth,offset,limit)
    return clean({'dataset':dataset,'count':len(all_rows),'offset':offset,'columns':list(page.columns),'data':page.to_dict('records')})

@app.get('/api/export.csv')
def export(dataset:str,search:str='',depth:float|None=None,offset:int=Query(0,ge=0),limit:int=Query(100,ge=1,le=10000)):
    _,page=queried_table(dataset,search,depth,offset,limit)
    # Prevent spreadsheet formula execution when external text is opened in Excel.
    for col in page.select_dtypes(include=['object','string']).columns:
        page=page.copy(); page[col]=page[col].map(lambda v:"'"+v if isinstance(v,str) and v.lstrip().startswith(('=','+','-','@')) else v)
    return Response(page.to_csv(index=False),media_type='text/csv',headers={'Content-Disposition':'attachment; filename="oceantwin-selection.csv"'})

def authorize(request):
    key=os.getenv('OCEANTWIN_WRITE_TOKEN')
    if not key: raise HTTPException(403,'Ingestion is read-only. Set OCEANTWIN_WRITE_TOKEN on the server to enable uploads and refresh.')
    if not secrets.compare_digest(request.headers.get('authorization',''),'Bearer '+key): raise HTTPException(401,'Invalid ingestion token')

@app.post('/api/catalog/refresh')
def refresh(request:Request): authorize(request); return catalog.refresh()

@app.post('/api/adapters/{name}')
async def register_adapter(name:str,request:Request):
    authorize(request)
    if not re.fullmatch(r'[a-z][a-z0-9_-]{0,39}',name): raise HTTPException(400,'Use a short lowercase source name')
    body=await request.body()
    if len(body)>16384: raise HTTPException(413,'Adapter maximum size is 16 KiB')
    spec=json.loads(body)
    if not isinstance(spec,dict): raise ValueError('Adapter must be a JSON object')
    if set(spec)-{'file','kind','columns','units','delimiter','good_qc'}: raise ValueError('Unknown adapter setting')
    path=(PROJECT_ROOT/str(spec.get('file',''))).resolve()
    if not path.is_relative_to(PROJECT_ROOT.resolve()) or path.suffix not in ('.csv','.tsv') or not path.is_file(): raise ValueError('Choose an existing CSV/TSV inside the data directory')
    mapping=spec.get('columns',{})
    if not isinstance(mapping,dict) or not all(isinstance(k,str) and isinstance(v,str) for k,v in mapping.items()): raise ValueError('Column mapping must contain text names')
    if not {'time','lat','lon'}.issubset(mapping) or not ('depth' in mapping or 'pressure' in mapping): raise ValueError('Map time, lat, lon and depth (m) or pressure (dbar)')
    measurements=set(mapping)-{'id','time','profile','lat','lon','depth','pressure','qc'}
    if not measurements: raise ValueError('Map at least one measured variable')
    if not isinstance(spec.get('units'),dict) or any(not isinstance(spec['units'].get(k),str) for k in measurements): raise ValueError('Declare units for every measured variable; use unknown if unverified')
    delimiter=spec.get('delimiter',',')
    if delimiter not in (',','\t',';','|'): raise ValueError('Supported delimiters: comma, tab, semicolon, pipe')
    columns=pd.read_csv(path,sep=delimiter,nrows=0).columns
    if set(mapping.values())-set(columns): raise ValueError('Mapped columns do not exist in the uploaded table')
    if len(set(mapping.values()))!=len(mapping): raise ValueError('Map each source column only once')
    spec['file']=str(path.relative_to(PROJECT_ROOT))
    with IO_LOCK:
        if name in catalog.sources: raise HTTPException(409,'Source name exists; choose a new versioned name')
        manifest=PROJECT_ROOT/'sources.json'
        existing=json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {}
        existing[name]=spec
        temporary=manifest.with_suffix('.json.partial')
        temporary.write_text(json.dumps(existing,indent=2),encoding='utf-8'); temporary.replace(manifest)
        result=catalog.refresh()
    return {'source':name,'catalog':result}

@app.put('/api/ingest/{filename}')
async def ingest(filename:str,request:Request):
    authorize(request)
    if not re.fullmatch(r'[A-Za-z0-9_-]+\.(nc4|nc|csv|tsv)',filename): raise HTTPException(400,'Use a simple NetCDF/CSV/TSV filename')
    folder=PROJECT_ROOT/'incoming'; folder.mkdir(exist_ok=True); target=folder/filename
    if target.exists(): raise HTTPException(409,'Source exists; upload a versioned filename')
    temp=folder/(filename+'.partial-'+secrets.token_hex(6)); total=0
    try:
        with temp.open('wb') as f:
            async for chunk in request.stream():
                total+=len(chunk)
                if total>64*1024*1024: raise HTTPException(413,'Upload limit is 64 MiB; provision larger data server-side')
                f.write(chunk)
        if filename.endswith(('.nc','.nc4')):
            with open_grid(temp) as ds:
                if not any({'lat','lon'}.issubset(a.dims) for a in ds.data_vars.values()): raise ValueError('No geographic field found')
        else: pd.read_csv(temp,sep='\t' if filename.endswith('.tsv') else ',',nrows=10)
        temp.rename(target)
        result=await asyncio.to_thread(catalog.refresh)
        return {'file':str(target.relative_to(PROJECT_ROOT)),'bytes':total,'catalog':result,'next_step':'For tables, register the column adapter below. NetCDF fields are already available.'}
    finally:
        if temp.exists(): temp.unlink()

@app.get('/api/capabilities')
def capabilities():
    return {'rendering':['georeferenced slice','voxel volume','marching-tetrahedra isosurface'],'grid_support':'rectilinear lat/lon; curvilinear grids must be regridded',
        'standards':{'REST':'OpenAPI /docs','WMS':'1.1.1 geographic GetMap subset /ogc/wms','WCS':'1.0.0 NetCDF GetCoverage subset /ogc/wcs','CF':'coordinate decoding, not certified'},
        'limitations':['No live external feed configured','No operational hazard or AI prediction engine','Scientific QC flags absent in bundled observations','Bundled model timestamps do not overlap bundled instrument timestamps']}

# Old demonstration endpoints intentionally fail explicitly instead of returning invented values.
@app.get('/api/overview')
@app.get('/api/buoys')
@app.get('/api/comparison/detail')
@app.get('/api/model-vs-observation')
@app.get('/api/point-data')
@app.get('/api/anomalies')
@app.get('/api/currents/streamlines')
def retired(): raise HTTPException(410,'Demonstration endpoint retired. Use catalog, field, fleet, profile, comparison or currents; see /docs.')

from ogc import router as ogc_router
app.include_router(ogc_router)
dist=Path(__file__).resolve().parents[1]/'frontend'/'dist'
if dist.exists(): app.mount('/',StaticFiles(directory=str(dist),html=True),name='frontend')
