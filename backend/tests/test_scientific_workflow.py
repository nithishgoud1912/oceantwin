"""Acceptance regressions with explicit synthetic fixtures, separate from source-file checks."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import numpy as np
import pandas as pd
import pytest
import xarray as xr
from fastapi.testclient import TestClient
import scientific_data as sd
import main
import ogc

@pytest.fixture
def workbench(tmp_path,monkeypatch):
    times=pd.to_datetime(['2024-01-01','2024-01-02'])
    arr=np.arange(2*3*3*3,dtype=float).reshape(2,3,3,3)
    ds=xr.Dataset({'water_temp':(('time','depth','lat','lon'),arr)},coords={'time':times,'depth':[0.,10.,20.],'lat':[10.,11.,12.],'lon':[70.,71.,72.]})
    ds.water_temp.attrs['units']='degC';ds.to_netcdf(tmp_path/'model.nc4')
    pd.DataFrame({'PLATFORM_NUMBER':[123.0]*3,'CYCLE_NUMBER':[1]*3,'time':['2024-01-01']*3,'latitude':[11.]*3,'longitude':[71.]*3,'PRES':[0.,10.,20.],
        'TEMP':[5.,14.,23.],'PSAL':[35.]*3}).to_csv(tmp_path/'argo_clean.csv',index=False)
    cat=sd.DataCatalog(tmp_path)
    monkeypatch.setattr(main,'catalog',cat);monkeypatch.setattr(ogc,'catalog',cat);monkeypatch.setattr(main,'PROJECT_ROOT',tmp_path)
    return cat,TestClient(main.app,raise_server_exceptions=True)

def test_unsliced_query_is_bounded_and_preserves_actual_time(workbench):
    cat,c=workbench
    response=c.get('/api/ocean/water_temp?max_points=3')
    assert response.status_code==200
    rows=response.json()['data']; assert len(rows)<=3
    assert all(r['time'].startswith('2024-01-01') and r['depth']==0 for r in rows)
    f=cat.field('water_temp',volume=True,budget=9)
    assert np.prod(f['shape'])<=9 and len(f['shape'])==3

def test_real_selected_values_and_unavailable_coverage(workbench):
    cat,c=workbench
    f=cat.field('water_temp',time='2024-01-02',depth=10,budget=100)
    assert f['values'][4]==40 and f['time'].startswith('2024-01-02')
    assert c.get('/api/field?variable=water_temp&depth=6000').status_code==422
    assert c.get('/api/field?variable=water_temp&time=2030-01-01').status_code==422
    assert c.get('/api/profile?variable=water_temp&latitude=80&longitude=71').status_code==422

def test_numeric_instrument_id_and_pressure_conversion(workbench):
    cat,c=workbench
    p=c.get('/api/instrument-profile?source=argo&id=123').json()
    assert p['id']=='123' and len(p['data'])==3
    assert p['data'][1]['depth']!=10 and 'TEOS-10' in p['depth_method']
    assert c.get('/api/observations/argo/123').status_code==200
    assert c.get('/api/observations/argo/999').status_code==404

def test_independent_observation_comparison_and_time_rejection(workbench):
    cat,c=workbench
    result=cat.compare('water_temp','argo','123',depth_tolerance=1)
    assert result['status']=='matched' and result['metrics']['count']==3
    assert result['metrics']['rmse']==pytest.approx(1.)
    assert result['metrics']['bias']==pytest.approx(-1.)
    # Changing independent measurement file must change results; no model-export shortcut.
    path=cat.root/'argo_clean.csv'; frame=pd.read_csv(path);frame['TEMP']+=2;frame.to_csv(path,index=False)
    assert cat.compare('water_temp','argo','123',depth_tolerance=1)['metrics']['rmse']==pytest.approx(3.)
    frame['time']='2021-01-01';frame.to_csv(path,index=False)
    result=cat.compare('water_temp','argo','123')
    assert result['status']=='unavailable' and result['metrics'] is None

def test_profile_and_table_export_are_real(workbench):
    cat,c=workbench
    p=c.get('/api/profile?variable=water_temp&latitude=11&longitude=71').json()
    assert [r['value'] for r in p['data']]==[4,13,22]
    page=c.get('/api/table?dataset=argo&search=123&limit=2').json()
    export=c.get('/api/export.csv?dataset=argo&search=123&limit=2')
    assert len(page['data'])==2 and page['count']==3
    assert len(export.text.strip().splitlines())==3

def test_current_time_mismatch_is_unavailable(workbench):
    cat,c=workbench
    for name,date in [('water_u','2024-01-01'),('water_v','2024-01-02')]:
        a=xr.Dataset({name:(('time','depth','lat','lon'),np.ones((1,1,2,2)))},coords={'time':pd.to_datetime([date]),'depth':[0.],'lat':[10.,11.],'lon':[70.,71.]})
        a.to_netcdf(cat.root/f'{name}.nc4')
    cat.refresh()
    result=c.get('/api/currents').json(); assert result['status']=='unavailable' and result['vectors']==[]

def test_current_vectors_use_matching_source_components(workbench):
    cat,c=workbench
    for name,value in [('water_u',3.),('water_v',4.)]:
        a=xr.Dataset({name:(('time','depth','lat','lon'),np.full((1,1,2,2),value))},coords={'time':pd.to_datetime(['2024-01-01']),'depth':[0.],'lat':[10.,11.],'lon':[70.,71.]})
        a[name].attrs['units']='m/s'
        a.to_netcdf(cat.root/f'{name}.nc4')
    cat.refresh(); result=c.get('/api/currents').json()
    assert result['status']=='available' and all(v['speed']==5 for v in result['vectors'])

def test_ogc_outputs(workbench):
    cat,c=workbench
    response=c.get('/ogc/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=water_temp&SRS=EPSG:4326&BBOX=70,10,72,12&WIDTH=64&HEIGHT=64&FORMAT=image/png')
    assert response.headers['content-type']=='image/png' and response.content.startswith(b'\x89PNG')
    response=c.get('/ogc/wcs?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&COVERAGE=water_temp&FORMAT=NetCDF&BBOX=70,10,72,12&ELEVATION=10')
    assert response.status_code==200 and response.content[:3]==b'CDF'
    import io
    with xr.open_dataset(io.BytesIO(response.content)) as ds:
        assert ds.water_temp.sel(lat=11,lon=71).item()==13

def test_no_legacy_demo_success_and_read_only_ingestion(workbench,monkeypatch):
    _,c=workbench;monkeypatch.delenv('OCEANTWIN_WRITE_TOKEN',raising=False)
    assert c.get('/api/anomalies').status_code==410
    assert c.post('/api/catalog/refresh').status_code==403

def test_table_adapter_and_upload_validation(workbench,monkeypatch):
    cat,c=workbench;monkeypatch.setenv('OCEANTWIN_WRITE_TOKEN','test-token')
    headers={'Authorization':'Bearer test-token'}
    assert c.put('/api/ingest/new.csv',content='time,lat,lon,depth,temp\n2024-01-01,11,71,0,5',headers=headers).status_code==200
    assert c.put('/api/ingest/new.csv',content='x',headers=headers).status_code==409
    assert c.put('/api/ingest/broken.nc',content='not a netcdf',headers=headers).status_code==422
    import json
    (cat.root/'sources.json').write_text(json.dumps({'ctd':{'file':'incoming/new.csv','kind':'ctd','columns':{'time':'time','lat':'lat','lon':'lon','depth':'depth','temperature':'temp'},'units':{'temperature':'degC'}}}))
    cat.refresh(); assert cat.fleet('ctd')['count']==1
    assert cat.observation_profile('ctd','ctd')['data'][0]['temperature']==5

def test_masked_cells_remain_missing(workbench):
    cat,c=workbench
    with xr.open_dataset(cat.root/'model.nc4') as source: ds=source.load()
    ds.water_temp.values[:,:,:,1]=np.nan;ds.to_netcdf(cat.root/'model.nc4',mode='w');cat.refresh()
    f=cat.field('water_temp',depth=0,budget=100)
    assert f['values'][4] is None


def test_adapter_registration_and_containment(workbench,monkeypatch):
    cat,c=workbench;monkeypatch.setenv('OCEANTWIN_WRITE_TOKEN','test-token')
    headers={'Authorization':'Bearer test-token'}
    spec={'file':'argo_clean.csv','kind':'ctd','columns':{'time':'time','lat':'latitude','lon':'longitude','pressure':'PRES','temperature':'TEMP'},'units':{'temperature':'degC'}}
    assert c.post('/api/adapters/ctd',json=spec).status_code==401
    assert c.post('/api/adapters/ctd',json=spec,headers=headers).status_code==200
    assert cat.fleet('all')['count']==2
    assert c.post('/api/adapters/ctd',json=spec,headers=headers).status_code==409
    spec['file']='../outside.csv'
    assert c.post('/api/adapters/outside',json=spec,headers=headers).status_code==422


def test_cf_auxiliary_coordinate_dimensions(workbench):
    cat,c=workbench
    ds=xr.Dataset({'oxygen':(('y','x'),[[1.,2.],[3.,4.]])},coords={'latitude':('y',[11.,10.]),'longitude':('x',[350.,351.])})
    ds.oxygen.attrs['units']='umol/kg';ds.to_netcdf(cat.root/'bgc.nc')
    cat.refresh();f=cat.field('bgc:oxygen')
    assert f['latitudes']==[10.,11.] and f['longitudes']==[-10.,-9.]
    assert f['values']==[3.,4.,1.,2.]


def test_satellite_sequence_preserves_composite_intervals(workbench):
    cat,c=workbench
    sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
    from ocean_analysis.ingest import satellite
    paths=[]
    for day in [1,2]:
        p=cat.root/f'raw_{day}.nc'
        ds=xr.Dataset({'chlor_a':(('lat','lon'),np.full((2,2),day,dtype=float))},coords={'lat':[11.,10.],'lon':[70.,71.]})
        ds.chlor_a.attrs['units']='mg m^-3'
        ds.attrs.update(time_coverage_start=f'2024-01-0{day}T00:00:00Z',time_coverage_end=f'2024-01-0{day}T23:59:00Z')
        ds.to_netcdf(p);paths.append(p)
    satellite(paths,cat.root/'sequence.nc')
    cat.refresh()
    assert cat.field('sequence:chlor_a',time='2024-01-02')['values']==[2.]*4
    result=c.get('/ogc/wcs?REQUEST=GetCoverage&COVERAGE=sequence:chlor_a&TIME=2024-01-02')
    import io
    with xr.open_dataset(io.BytesIO(result.content)) as exported:
        assert str(exported.time_bounds.values[0,1]).startswith('2024-01-02T23:59')
    with xr.open_dataset(cat.root/'sequence.nc') as ds:
        assert ds.time.attrs['bounds']=='time_bounds' and ds.time_bounds.shape==(2,2)


def test_current_export_refuses_unmatched_files(workbench):
    cat,c=workbench
    sys.path.insert(0,str(Path(__file__).resolve().parents[2]))
    from ocean_analysis.ingest import export_currents
    files=[]
    for name,day in [('water_u',1),('water_v',2)]:
        p=cat.root/f'{name}.nc'
        ds=xr.Dataset({name:(('time','depth','lat','lon'),np.ones((1,1,2,2)))},coords={'time':pd.to_datetime([f'2024-01-0{day}']),'depth':[0.],'lat':[10.,11.],'lon':[70.,71.]})
        ds.to_netcdf(p);files.append(p)
    out=cat.root/'currents.csv'
    with pytest.raises(ValueError,match='shared timestamp'): export_currents(*files,out)
    assert not out.exists()
