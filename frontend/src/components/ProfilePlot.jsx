import React from 'react';
export default function ProfilePlot({ rows = [], valueKey='value', units='', label='Profile', pairs=[] }) {
  const valid=rows.filter(r=>r[valueKey]!=null&&Number.isFinite(r.depth)&&Number.isFinite(r[valueKey]));
  const series=[{name:label,color:'#79e3c4',values:valid.map(r=>({x:r[valueKey],y:r.depth}))}];
  if(pairs.length)series.push({name:'Matched model',color:'#f8c17c',values:pairs.map(r=>({x:r.model,y:r.depth}))});
  const all=series.flatMap(s=>s.values);
  if(!all.length)return <p className="empty">No finite profile samples at this selection.</p>;
  const xs=all.map(v=>v.x),ys=all.map(v=>v.y);let min=Math.min(...xs),max=Math.max(...xs),deep=Math.max(...ys,1);
  const pad=Math.max((max-min)*0.1,0.1);min-=pad;max+=pad;
  const x=v=>58+(v-min)/(max-min)*320,y=v=>45+v/deep*235;
  return <figure className="profile-figure"><figcaption>{label} · {units} versus depth (m)</figcaption>
    <svg viewBox="0 0 420 325" role="img" aria-label={`${label}: depth increases downward, values in ${units}`}>
      {[0,1,2,3,4].map(i=>{const d=deep*i/4,v=min+(max-min)*i/4;return <g key={i}><line x1="58" x2="378" y1={y(d)} y2={y(d)} stroke="#284456"/><text x="50" y={y(d)+4} textAnchor="end">{d.toFixed(0)}</text><text x={x(v)} y="27" textAnchor="middle">{v.toFixed(1)}</text></g>;})}
      <text transform="translate(14 180) rotate(-90)" textAnchor="middle">Depth (m)</text>
      {series.map(s=><g key={s.name} fill={s.color}>{s.values.filter((_,i)=>i%Math.max(1,Math.floor(s.values.length/1200))===0).map((p,i)=><circle key={i} cx={x(p.x)} cy={y(p.y)} r="1.9"><title>{`${s.name}: ${p.x.toFixed(3)} ${units}, ${p.y.toFixed(1)} m`}</title></circle>)}</g>)}
      {series.map((s,i)=><g key={s.name}><circle cx={68+i*165} cy="310" r="4" fill={s.color}/><text x={78+i*165} y="314">{s.name}</text></g>)}
    </svg></figure>;
}
