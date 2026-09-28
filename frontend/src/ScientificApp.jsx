import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { get, query, download } from './services/scienceApi';
import { palettes, color } from './science';
import ProfilePlot from './components/ProfilePlot';
import './scientific.css';
const Scene=lazy(()=>import('./components/ScientificScene'));

function useData(path, params, enabled=true) {
  const [state,setState]=useState({data:null,error:'',loading:false});
  const key=JSON.stringify(params);
  useEffect(()=>{
    if(!enabled){setState({data:null,error:'',loading:false});return;}
    const controller=new AbortController();setState({data:null,error:'',loading:true});
    get(path,JSON.parse(key),controller.signal).then(data=>{if(!controller.signal.aborted)setState({data,error:'',loading:false});}).catch(e=>{
      if(e.name!=='AbortError')setState({data:null,error:e.message,loading:false});
    });return()=>controller.abort();
  },[path,key,enabled]);return state;
}
function Status({resource}) {return resource.error?<p role="alert" className="error">{resource.error}</p>:resource.loading?<p className="muted" role="status">Reading source data…</p>:null;}
const fmt=n=>n==null?'—':Number(n).toLocaleString(undefined,{maximumFractionDigits:3});
function FieldSelect({label,value,onChange,children,...rest}){return <label className="control">{label}<select value={value} onChange={e=>onChange(e.target.value)} {...rest}>{children}</select></label>;}

export default function ScientificApp(){
  const [page,setPage]=useState('Explore'),[revision,setRevision]=useState(0);
  const catalog=useData('catalog',{revision});
  const [key,setKey]=useState(''),[time,setTime]=useState(''),[depth,setDepth]=useState(0),[mode,setMode]=useState('slice');
  const [min,setMin]=useState(0),[max,setMax]=useState(35),[palette,setPalette]=useState('ocean'),[scale,setScale]=useState('linear'),[opacity,setOpacity]=useState(0.8),[exaggeration,setExaggeration]=useState(100),[threshold,setThreshold]=useState(20);
  const [showModel,setShowModel]=useState(true),[showSensors,setShowSensors]=useState(true),[showCurrents,setShowCurrents]=useState(false),[playing,setPlaying]=useState(false);
  const [bbox,setBbox]=useState('50,0,100,30'),[draftBox,setDraftBox]=useState('50,0,100,30');
  const [source,setSource]=useState('argo'),[sensor,setSensor]=useState(''),[cycle,setCycle]=useState(''),[obsVariable,setObsVariable]=useState('temperature'),[point,setPoint]=useState(null);
  const [notice,setNotice]=useState('');
  const vars=catalog.data?.variables||[],meta=vars.find(v=>v.key===key);
  useEffect(()=>{if(vars.length&&!vars.some(v=>v.key===key))setKey((vars.find(v=>v.name==='water_temp')||vars[0]).key);},[catalog.data,key]);
  useEffect(()=>{
    if(!meta)return;setTime(meta.times[0]||'');setDepth(meta.depths[0]);setPlaying(false);
    const lo=meta.minimum??0,hi=meta.maximum??1;setMin(lo);setMax(hi>lo?hi:lo+1);setThreshold((lo+hi)/2);setScale('linear');
    if(meta.depths.length<2)setMode('slice');
  },[key,catalog.data]);
  useEffect(()=>{if(!playing||!meta||meta.times.length<2)return;const timer=setTimeout(()=>setTime(t=>meta.times[(meta.times.indexOf(t)+1)%meta.times.length]),1800);return()=>clearTimeout(timer);},[playing,time,meta]);
  const selectionValid=!!meta&&(!meta.times.length||meta.times.includes(time))&&meta.depths.includes(Number(depth));
  const field=useData('field',{variable:key,time,depth,volume:mode!=='slice',bbox,budget:mode==='slice'?20000:12000,revision},selectionValid);
  const fleet=useData('fleet',{source,revision},!!source);
  const allFleet=useData('fleet',{source:'all',revision});
  const sensors=fleet.data?.source===source?fleet.data.sensors:[];
  useEffect(()=>{if(sensors.length&&!sensors.some(s=>s.id===sensor))setSensor(sensors[0].id);},[fleet.data,sensor]);
  const instrument=useData('instrument-profile',{source,id:sensor,profile:cycle,variable:obsVariable,revision},!!sensor);
  const comparison=useData('comparison',{variable:key,source,id:sensor,profile:cycle,observed_variable:obsVariable,revision},!!sensor&&!!meta);
  const modelProfile=useData('profile',{variable:key,latitude:point?.lat,longitude:point?.lon,time,revision},!!point&&selectionValid);
  const currents=useData('currents',{depth,time,bbox,revision},showCurrents&&selectionValid);
  const settings=useMemo(()=>({min:Number(min),max:Number(max),palette,scale,opacity,exaggeration,threshold:Number(threshold)}),[min,max,palette,scale,opacity,exaggeration,threshold]);
  const invalidScale=!Number.isFinite(Number(min))||!Number.isFinite(Number(max))||!(Number(max)>Number(min))||(scale==='log'&&!(Number(min)>0));
  const activeSensor=sensors.find(s=>s.id===sensor);
  const changeSource=value=>{setSource(value);setSensor('');setCycle('');setObsVariable(catalog.data?.sources.find(s=>s.id===value)?.variables[0]||'temperature');};
  const selectSensor=s=>{setSource(s.source);setSensor(s.id);setCycle('');setObsVariable(catalog.data?.sources.find(v=>v.id===s.source)?.variables[0]||'temperature');};
  const onExport=()=>download(query('field',{variable:key,time,depth,volume:mode!=='slice',bbox,budget:mode==='slice'?20000:12000}),'selected-field.json').catch(e=>setNotice(e.message));
  return <div className="scientific-app">
    <header className="app-header"><a className="brand" href="#" onClick={e=>{e.preventDefault();setPage('Explore');}}><span className="brand-mark">◉</span><span>OceanTwin<small>Ocean data workbench</small></span></a>
      <nav aria-label="Main navigation">{['Explore','Data','Ingestion','Learn'].map(p=><button key={p} className={page===p?'active':''} onClick={()=>setPage(p)}>{p}</button>)}</nav>
      <a className="docs-link" href="/docs" target="_blank" rel="noreferrer">API docs ↗</a></header>
    <main><div className="page-title"><div><p className="eyebrow">SOURCE-BACKED SCIENCE</p><h1>{page==='Explore'?'Look beneath the surface':page==='Data'?'Inspect the source records':page==='Ingestion'?'Connect a new source':'Understand the ocean'}</h1></div><span className="archive-badge">Archive mode · no live feed</span></div>
    <Status resource={catalog}/>{notice&&<p role="alert" className="notice">{notice}<button onClick={()=>setNotice('')}>Dismiss</button></p>}
    {catalog.data?.errors&&Object.entries(catalog.data.errors).map(([file,error])=><p className="error" key={file}>{file}: {error}</p>)}
    {page==='Explore'&&<>
      <div className="workbench"><aside className="control-panel"><h2>Ocean field</h2>
        <FieldSelect label="Dataset / variable" value={key} onChange={setKey}>{vars.map(v=><option key={v.key} value={v.key}>{v.dataset} / {v.name} ({v.units})</option>)}</FieldSelect>
        <FieldSelect label="Source timestamp (UTC)" value={time} onChange={setTime} disabled={!meta?.times.length}>{meta?.times.length?meta.times.map(t=><option key={t}>{t}</option>):<option>No time coordinate</option>}</FieldSelect>
        <button disabled={!meta||meta.times.length<2} onClick={()=>setPlaying(!playing)}>{playing?'Pause':'Play available timestamps'}</button>
        {meta?.times.length===1&&<small>One source timestamp. Animation needs a multi-time dataset.</small>}
        <FieldSelect label="Depth (m)" value={depth} onChange={v=>setDepth(Number(v))} disabled={mode!=='slice'}>{meta?.depths.map(d=><option key={d} value={d}>{d} m</option>)}</FieldSelect>
        <FieldSelect label="View" value={mode} onChange={setMode}><option value="slice">Geographic depth slice</option><option value="volume" disabled={meta?.depths.length<2}>Water-column voxels</option><option value="isosurface" disabled={meta?.depths.length<2}>Isosurface</option></FieldSelect>
        <label className="control">Region: west, south, east, north<input value={draftBox} onChange={e=>setDraftBox(e.target.value)}/></label>
        <div className="button-row"><button onClick={()=>setBbox(draftBox)}>Apply region</button><button onClick={()=>{const b=meta?.bounds.join(',')||'';setBbox(b);setDraftBox(b);}}>Full source</button></div>
        <h2>Colour & geometry</h2>
        <FieldSelect label="Palette" value={palette} onChange={setPalette}>{Object.keys(palettes).map(p=><option key={p}>{p}</option>)}</FieldSelect>
        <div className="two-controls"><label className="control">Minimum<input type="number" step="any" value={min} onChange={e=>setMin(e.target.value)}/></label><label className="control">Maximum<input type="number" step="any" value={max} onChange={e=>setMax(e.target.value)}/></label></div>
        <FieldSelect label="Colour scale" value={scale} onChange={setScale}><option value="linear">Linear</option><option value="log">Logarithmic</option></FieldSelect>
        {invalidScale&&<p className="error">Maximum must exceed minimum. Logarithmic scales require a positive minimum.</p>}
        <label className="control">Layer opacity · {Math.round(opacity*100)}%<input type="range" min="0" max="1" step="0.05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label>
        {mode!=='slice'&&<label className="control">Vertical exaggeration · {exaggeration}×<input type="range" min="1" max="300" value={exaggeration} onChange={e=>setExaggeration(Number(e.target.value))}/></label>}
        {mode==='isosurface'&&<label className="control">Isovalue ({meta?.units})<input type="number" step="any" value={threshold} onChange={e=>setThreshold(e.target.value)}/></label>}
        <label className="check"><input type="checkbox" checked={showModel} onChange={e=>setShowModel(e.target.checked)}/>Model field</label>
        <label className="check"><input type="checkbox" checked={showSensors} onChange={e=>setShowSensors(e.target.checked)}/>Historical instruments</label>
        <label className="check"><input type="checkbox" checked={showCurrents} onChange={e=>setShowCurrents(e.target.checked)}/>Aligned current vectors</label>
      </aside><section className="visual-panel"><div className="visual-heading"><div><h2>{meta?.name||'Select a field'}</h2><p>{mode==='slice'?`${field.data?.depths[0]??depth} m`:'Full available water column'} · {field.data?.time||time||'Undated source'}</p></div><span className="tag">{field.data?`${field.data.valid_cells.toLocaleString()} valid cells`:'Waiting for source'}</span></div>
        <Status resource={field}/><Status resource={currents}/>{currents.data?.status==='unavailable'&&showCurrents&&<p className="notice">{currents.data.reason}</p>}
        <Suspense fallback={<p>Loading the 3D viewer…</p>}><Scene field={!invalidScale?field.data:null} fleet={allFleet.data?.sensors||[]} track={instrument.data?.track||[]} profile={instrument.data} focus={activeSensor} vectors={currents.data?.vectors||[]} mode={mode} settings={settings} showModel={showModel} showSensors={showSensors} onSensor={selectSensor} onPoint={setPoint}/></Suspense>
        <div className="legend"><span>{fmt(min)} {meta?.units}</span><div style={{background:`linear-gradient(90deg,${Array.from({length:16},(_,i)=>{const val=scale==='log'&&min>0?Number(min)*Math.pow(max/min,i/15):Number(min)+(max-min)*i/15;const c=color(val,Number(min),Number(max),scale,palette)||[0,0,0];return `rgb(${c.map(v=>Math.round(v*255)).join(',')})`;}).join(',')})`}}/><span>{fmt(max)} {meta?.units}</span></div>
        <p className="provenance">Source: {meta?.file} · {field.data?.sampled?'Sampled grid; gaps are not filled':'Source grid'} · {scale} scale. Instrument markers show their own historical timestamps, not simultaneous measurements.</p>
        <p className="provenance">{meta?.time_interpretation}</p><Status resource={allFleet}/>
        <div className="button-row"><button onClick={onExport} disabled={!field.data}>Download selected field JSON</button><a href={key?`/ogc/wcs?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&COVERAGE=${encodeURIComponent(key)}&FORMAT=NetCDF&TIME=${encodeURIComponent(time)}${mode==='slice'?`&ELEVATION=${depth}`:''}&BBOX=${bbox}`:'#'}>Download selected NetCDF</a></div>
      </section></div>
      <div className="analysis-grid"><section className="panel"><p className="eyebrow">INSTRUMENT OBSERVATIONS</p><h2>Inspect a real profile</h2>
        <div className="two-controls"><FieldSelect label="Observation source" value={source} onChange={changeSource}>{catalog.data?.sources.filter(s=>s.available).map(s=><option key={s.id} value={s.id}>{s.id} · {s.kind}</option>)}</FieldSelect>
        <FieldSelect label="Instrument" value={sensor} onChange={v=>{setSensor(v);setCycle('');}}>{sensors.map(s=><option key={s.id}>{s.id}</option>)}</FieldSelect></div>
        <Status resource={fleet}/><Status resource={instrument}/>
        {fleet.data&&<p className="muted">{fleet.data.count} instruments · {fleet.data.time_min?.slice(0,10)} to {fleet.data.time_max?.slice(0,10)}</p>}
        {instrument.data&&<><div className="two-controls"><FieldSelect label="Profile / sample segment" value={cycle||instrument.data.profile} onChange={setCycle}>{instrument.data.profiles.map(p=><option key={p.profile} value={p.profile}>{p.profile} · {p.time.slice(0,10)}</option>)}</FieldSelect>
        <FieldSelect label="Measured variable" value={obsVariable} onChange={setObsVariable}>{instrument.data.variables.map(v=><option key={v}>{v}</option>)}</FieldSelect></div>
        <ProfilePlot rows={instrument.data.data} valueKey={obsVariable} units={instrument.data.units} label="Observation" pairs={comparison.data?.pairs||[]}/>
        <p className="provenance">{instrument.data.file} · {instrument.data.profile_type} · {instrument.data.depth_method}. {instrument.data.count.toLocaleString()} samples{instrument.data.sampled?' (chart data sampled)':''}. Quality flags are shown in the table; missing flags mean unverified, not passed.</p></>}
      </section><section className="panel"><p className="eyebrow">INDEPENDENT VALIDATION</p><h2>Model versus measurement</h2><Status resource={comparison}/>
        {comparison.data?.metrics?<><div className="metrics">{[['Matched samples',comparison.data.metrics.count],['RMSE',comparison.data.metrics.rmse],['Mean bias',comparison.data.metrics.bias]].map(([name,v])=><div key={name}><small>{name}</small><strong>{fmt(v)}</strong></div>)}</div><p>Difference = model − observation. Units: {comparison.data.units}. Match limits: 24 hours, 25 km, 20 m. {comparison.data.pairs.some(p=>p.qc_status==='unverified')?'Source QC is absent for some matched records.':''}</p></>:<div className="empty"><strong>No valid comparison available</strong><p>{comparison.data?.reason||'Select an instrument and compatible model variable.'}</p><p>The bundled model snapshots are from 2026. Argo data spans 2024–2025; glider data is from 2021. No accuracy percentage is manufactured from these archives.</p></div>}
        {comparison.data?.rejected&&<p className="muted">Rejected samples: {Object.entries(comparison.data.rejected).map(([k,v])=>`${k}: ${v}`).join(' · ')}</p>}
        <h3>Selected model location</h3>{point?<><p>{point.lat.toFixed(3)}°, {point.lon.toFixed(3)}°</p><Status resource={modelProfile}/>{modelProfile.data&&<><ProfilePlot rows={modelProfile.data.data} units={modelProfile.data.variable.units} label="Model"/><p className="provenance">Nearest source cell: {modelProfile.data.latitude.toFixed(3)}°, {modelProfile.data.longitude.toFixed(3)}° · {fmt(modelProfile.data.distance_km)} km away · {modelProfile.data.time}. {modelProfile.data.availability}</p></>}</>:<p className="muted">Select a location on the globe to inspect the model's actual depth profile.</p>}
        <button onClick={()=>window.print()}>Print / save this analysis as PDF</button><p className="muted">Uses the browser's Save as PDF option. Report includes source identifiers and unavailable states.</p>
      </section></div>
    </>}
    {page==='Data'&&<DataExplorer sources={catalog.data?.sources||[]} onError={setNotice}/>}
    {page==='Ingestion'&&<Ingestion onRefresh={()=>setRevision(v=>v+1)}/>}
    {page==='Learn'&&<Learning/>}
    </main><footer>OceanTwin · Archived data exploration · Source quality and coverage remain visible. <a href="/api/capabilities" target="_blank" rel="noreferrer">Capabilities & limitations</a></footer>
  </div>;
}

function DataExplorer({sources,onError}){
  const [dataset,setDataset]=useState('argo'),[search,setSearch]=useState(''),[input,setInput]=useState(''),[depth,setDepth]=useState(''),[offset,setOffset]=useState(0);
  const tables=useData('datasets',{}),params={dataset,search,depth,offset,limit:100};const table=useData('table',params);
  const names=[...new Set([...sources.map(s=>s.id),...(tables.data?.datasets.filter(d=>d.format==='csv').map(d=>d.name)||[])])];
  return <section className="panel"><div className="table-controls"><FieldSelect label="Dataset" value={dataset} onChange={v=>{setDataset(v);setOffset(0);}}>{names.map(n=><option key={n}>{n}</option>)}</FieldSelect>
    <label className="control">Search records<input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){setSearch(input);setOffset(0);}}}/></label><button onClick={()=>{setSearch(input);setOffset(0);}}>Search</button>
    <label className="control">Depth ±0.5 m (optional)<input type="number" value={depth} onChange={e=>{setDepth(e.target.value);setOffset(0);}}/></label>
    <button disabled={!table.data} onClick={()=>download(query('export.csv',params),'selected-records.csv').catch(e=>onError(e.message))}>Export displayed page CSV</button></div>
    <Status resource={table}/><p>{table.data?.count.toLocaleString()||0} matching records · page {Math.floor(offset/100)+1}</p>
    <div className="table-scroll"><table><thead><tr>{table.data?.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{table.data?.data.map((r,i)=><tr key={i}>{table.data.columns.map(c=><td key={c}>{r[c]===null?'—':typeof r[c]==='number'?fmt(r[c]):String(r[c])}</td>)}</tr>)}</tbody></table></div>
    <div className="button-row"><button disabled={!offset} onClick={()=>setOffset(v=>Math.max(0,v-100))}>Previous page</button><button disabled={!table.data||offset+100>=table.data.count} onClick={()=>setOffset(v=>v+100)}>Next page</button></div>
  </section>;
}
function Ingestion({onRefresh}){
  const [token,setToken]=useState(''),[file,setFile]=useState(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
  const [sourceName,setSourceName]=useState('ctd'),[adapter,setAdapter]=useState(JSON.stringify({file:'incoming/ctd.csv',kind:'ctd',columns:{time:'time',lat:'latitude',lon:'longitude',depth:'depth',temperature:'temperature'},units:{temperature:'degC'}},null,2));
  async function register(){setBusy(true);try{
    const body=JSON.parse(adapter);const response=await fetch(`/api/adapters/${encodeURIComponent(sourceName)}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();if(!response.ok)throw new Error(result.detail||'Registration failed');setStatus(`${result.source} registered. Select it in Explore.`);onRefresh();
  }catch(e){setStatus(e.message);}finally{setBusy(false);}}
  async function run(upload){setBusy(true);setStatus('');try{
    const response=await fetch(upload?`/api/ingest/${encodeURIComponent(file.name)}`:'/api/catalog/refresh',{method:upload?'PUT':'POST',headers:{Authorization:`Bearer ${token}`},...(upload?{body:file}:{})});
    const data=await response.json();if(!response.ok)throw new Error(data.detail||'Request failed');setStatus(upload?`${data.file} received. ${data.next_step}`:'Catalog refreshed');onRefresh();
  }catch(e){setStatus(e.message);}finally{setBusy(false);}}
  return <section className="panel ingestion"><h2>Register files without changing the renderer</h2><p>Upload a rectilinear NetCDF model or a delimited observation table. Source fields are discovered from NetCDF coordinates. Sensor tables use a column adapter in sources.json so new CTD, BGC, mooring or ADCP sources can use the same profile workflow.</p>
    <label className="control">Ingestion token<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}/></label><p className="muted">The server administrator sets OCEANTWIN_WRITE_TOKEN. Without it the API remains read-only. Tokens are kept only in this page's memory.</p>
    <label className="control">NetCDF / CSV / TSV (up to 64 MiB)<input type="file" accept=".nc,.nc4,.csv,.tsv" onChange={e=>setFile(e.target.files[0])}/></label><div className="button-row"><button disabled={!file||!token||busy} onClick={()=>run(true)}>Upload versioned source</button><button disabled={!token||busy} onClick={()=>run(false)}>Refresh catalog</button></div><p role="status">{status}</p>
    <h3>Describe a sensor table</h3><p>After uploading a table, give it a unique name and map its column headings. On each line in “columns”, keep the left-hand word and replace the right-hand word with your table’s heading. Dates must be readable timestamps; depth is metres or pressure is dbar. Units must come from the source documentation.</p>
    <label className="control">New observation source name<input value={sourceName} onChange={e=>setSourceName(e.target.value)}/></label>
    <label className="control">Column adapter (JSON)<textarea rows="15" value={adapter} onChange={e=>setAdapter(e.target.value)} spellCheck="false"/></label>
    <button disabled={!token||busy} onClick={register}>Register observation source</button>
    <h3>Interoperability</h3><p><a href="/ogc/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetCapabilities">WMS capabilities</a> · <a href="/ogc/wcs?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCapabilities">WCS capabilities</a></p><p>Geographic WMS maps and bounded NetCDF coverage exports are available as scoped interoperability endpoints. Full OGC certification and curvilinear-grid support are not claimed.</p></section>;
}
function Learning(){return <section className="panel learning"><h2>Start with one question: how does temperature change below the surface?</h2><ol><li>Open Explore and choose the temperature dataset. The timestamp is the time in the source file.</li><li>Choose a depth. The coloured map shows that horizontal layer; missing cells stay transparent.</li><li>Switch to Water-column voxels to see all available depths together. Vertical exaggeration makes a shallow ocean column visible over a large geographic area.</li><li>Choose Isosurface and set a temperature threshold. The surface connects interpolated locations at that value; it is not a coastline or seafloor.</li><li>Select an Argo instrument and cycle. Its profile plots measured values against depth, increasing downward.</li><li>Check the dates before comparing. A model from 2026 cannot establish forecast accuracy against a profile from 2024.</li></ol><div className="glossary">{[['Model','A numerical estimate on a grid of locations, depths and times.'],['Observation','A measurement from an instrument, with its own date, position and quality information.'],['Argo float','An autonomous instrument that records profiles as it moves through the water column.'],['Glider','An underwater platform that measures along a moving path; daily segments may contain several dives.'],['Salinity','A measure of salt content. Preserve source units when comparing measurements.'],['Chlorophyll','A biological indicator commonly measured by satellites and BGC instruments.'],['RMSE','The typical magnitude of differences in matched model–observation pairs. It is not an accuracy percentage.'],['Archive mode','These are supplied historical files. The application does not imply they are live.']].map(([name,desc])=><article key={name}><h3>{name}</h3><p>{desc}</p></article>)}</div></section>;}
