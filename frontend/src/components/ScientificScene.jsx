import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { color, gridIndex, localProjection, isosurface } from '../science';

function sphere(lon, lat, r = 5) {
  const phi = (90 - lat) * Math.PI / 180, theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}
export default function ScientificScene({ field, fleet = [], track = [], profile, focus, vectors = [], mode, settings, showModel, showSensors, onSensor, onPoint }) {
  const mount = useRef(null), view = useRef(null), callback = useRef({ onSensor, onPoint });
  callback.current = { onSensor, onPoint };
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  useEffect(() => {
    const host = mount.current; if (!host) return;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setError('WebGL is unavailable. Data tables and profiles remain accessible.'); return; }
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#081725');
    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 1000);
    camera.position.copy(sphere(78, 13, 16));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); host.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    controls.minDistance = 6; controls.maxDistance = 35;
    const light = new THREE.HemisphereLight(0xffffff, 0x254153, 2.3); scene.add(light);
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(5, 8, 10); scene.add(sun);
    const texture = new THREE.TextureLoader().load('/earth_daymap.jpg'); texture.colorSpace = THREE.SRGBColorSpace;
    const earth = new THREE.Mesh(new THREE.SphereGeometry(5, 80, 64), new THREE.MeshPhongMaterial({ map: texture })); scene.add(earth);
    const layers = new THREE.Group(); scene.add(layers);
    const ray = new THREE.Raycaster(); let start = null;
    const down = e => { start = [e.clientX, e.clientY]; };
    const up = e => {
      if (!start || Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 6) return;
      start = null;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1, -(e.clientY-r.top)/r.height*2+1), camera);
      const hits = ray.intersectObjects(layers.children, true);
      const ground = earth.visible ? ray.intersectObject(earth)[0] : null;
      const sensor = hits.find(h => h.object.userData.sensor && (!ground || h.distance < ground.distance + 0.05));
      if (sensor) { callback.current.onSensor(sensor.object.userData.sensor); return; }
      if (ground) {
        const p = ground.point.clone().normalize();
        let lon = Math.atan2(p.z, -p.x)*180/Math.PI-180; if(lon < -180) lon+=360;
        callback.current.onPoint({ lat: Math.asin(p.y)*180/Math.PI, lon });
      }
    };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up);
    const resize = new ResizeObserver(() => { const w=host.clientWidth,h=host.clientHeight; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h); }); resize.observe(host);
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene,camera); });
    view.current = { scene, camera, renderer, controls, earth, layers, mode: 'slice' };
    return () => {
      renderer.setAnimationLoop(null); resize.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown',down); renderer.domElement.removeEventListener('pointerup',up);
      scene.traverse(o => { o.geometry?.dispose(); if(o.material) for(const m of [o.material].flat()) { m.map?.dispose(); m.dispose(); } });
      renderer.dispose(); renderer.domElement.remove(); view.current=null;
    };
  }, []);

  useEffect(() => {
    const v = view.current; if(!v) return;
    while(v.layers.children.length) {
      const child=v.layers.children[0]; child.traverse(o=>{o.geometry?.dispose(); if(o.material) for(const m of [o.material].flat()) m.dispose();}); v.layers.remove(child);
    }
    const globe = mode === 'slice'; v.earth.visible = globe;
    if(v.mode!==mode) {
      v.camera.position.copy(globe?sphere(78,13,16):new THREE.Vector3(10,9,12));
      v.controls.target.set(0,0,0); v.controls.minDistance=globe?6:1; v.controls.maxDistance=40; v.controls.update(); v.mode=mode;
    }
    setMessage('');
    if(field && showModel) {
      const { min, max, scale, palette, opacity, exaggeration, threshold } = settings;
      const rgb = value => color(value,min,max,scale,palette);
      if(globe) {
        const positions=[],colors=[];
        for(let j=0;j<field.shape[1]-1;j++) for(let i=0;i<field.shape[2]-1;i++) {
          const corners=[[j,i],[j,i+1],[j+1,i+1],[j+1,i]];
          const c=corners.map(([y,x])=>rgb(field.values[gridIndex(field,0,y,x)]));
          if(c.some(x=>x===null)) continue;
          for(const q of [0,1,2,0,2,3]) { const [y,x]=corners[q]; positions.push(...sphere(field.longitudes[x],field.latitudes[y],5.012).toArray()); colors.push(...c[q]); }
        }
        const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
        v.layers.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false})));
        // Retain isolated valid samples (common in cloud-masked satellite data).
        const samplePositions=[],sampleColors=[];
        for(let j=0;j<field.shape[1];j++) for(let i=0;i<field.shape[2];i++) {
          const c=rgb(field.values[gridIndex(field,0,j,i)]); if(!c) continue;
          samplePositions.push(...sphere(field.longitudes[i],field.latitudes[j],5.016).toArray());sampleColors.push(...c);
        }
        const points=new THREE.BufferGeometry();points.setAttribute('position',new THREE.Float32BufferAttribute(samplePositions,3));points.setAttribute('color',new THREE.Float32BufferAttribute(sampleColors,3));
        v.layers.add(new THREE.Points(points,new THREE.PointsMaterial({vertexColors:true,size:0.023,transparent:true,opacity,depthWrite:false})));
      } else if(field.shape[0]<2) {
        setMessage('This variable has a single depth. Select a multi-depth field for a water-column view.');
      } else {
        const project=localProjection(field,exaggeration);
        if(mode==='isosurface') {
          const positions=isosurface(field,threshold,exaggeration);
          const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();
          const c=rgb(threshold)||[0.3,0.8,0.8];
          v.layers.add(new THREE.Mesh(g,new THREE.MeshPhongMaterial({color:new THREE.Color(...c),side:THREE.DoubleSide,transparent:true,opacity})));
          setMessage(positions.length?`${(positions.length/9).toLocaleString()} triangles • interpolated between source cells`:'No isosurface crosses valid cells at this threshold.');
        } else {
          const samples=[];
          for(let k=0;k<field.shape[0];k++)for(let j=0;j<field.shape[1];j++)for(let i=0;i<field.shape[2];i++) {
            const c=rgb(field.values[gridIndex(field,k,j,i)]); if(c) samples.push({k,j,i,c});
          }
          const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:opacity*0.48,depthWrite:false}),samples.length);
          const transform=new THREE.Object3D();
          samples.forEach(({k,j,i,c},n)=>{
            const p=project(field.longitudes[i],field.latitudes[j],field.depths[k]);
            const next=(arr,n)=>arr[Math.min(n+1,arr.length-1)]-arr[Math.max(0,n-1)];
            const dx=Math.abs(project(field.longitudes[i]+next(field.longitudes,i)/2,field.latitudes[j],field.depths[k])[0]-p[0]);
            const dz=Math.abs(project(field.longitudes[i],field.latitudes[j]+next(field.latitudes,j)/2,field.depths[k])[2]-p[2]);
            const dy=Math.abs(project(field.longitudes[i],field.latitudes[j],field.depths[k]+next(field.depths,k)/2)[1]-p[1]);
            transform.position.set(...p);transform.scale.set(Math.max(dx,0.025),Math.max(dy,0.008),Math.max(dz,0.025));transform.updateMatrix();mesh.setMatrixAt(n,transform.matrix);mesh.setColorAt(n,new THREE.Color(...c));
          }); v.layers.add(mesh);
          setMessage(`${samples.length.toLocaleString()} source samples shown as translucent voxels • depth spacing preserved`);
        }
        const a=project(field.longitudes[0],field.latitudes[0],field.depths[0]);
        const b=project(field.longitudes.at(-1),field.latitudes.at(-1),field.depths.at(-1));
        const box=new THREE.Box3().setFromPoints([new THREE.Vector3(...a),new THREE.Vector3(...b)]);
        v.layers.add(new THREE.Box3Helper(box,0x4c6c7f));
      }
    }
    if(!globe && field && showSensors && profile) {
      const project=localProjection(field,settings.exaggeration);
      const points=profile.data.filter(p=>p.lon>=field.longitudes[0]&&p.lon<=field.longitudes.at(-1)&&p.lat>=field.latitudes[0]&&p.lat<=field.latitudes.at(-1)&&p.depth>=field.depths[0]&&p.depth<=field.depths.at(-1));
      const geometry=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...project(p.lon,p.lat,p.depth))));
      v.layers.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffca76,size:0.06,depthTest:false})));
      if(points.length) setMessage(text=>`${text} • ${points.length} historical instrument samples in amber (independent dates)`);
    }
    if(globe && showSensors) {
      for(const sensor of fleet) {
        const mesh=new THREE.Mesh(new THREE.SphereGeometry(0.045,10,8),new THREE.MeshBasicMaterial({color:sensor.kind==='glider'?0xffca76:0x8bf2cc}));
        mesh.position.copy(sphere(sensor.lon,sensor.lat,5.035));mesh.userData.sensor=sensor;v.layers.add(mesh);
      }
      if(track.length>1) {
        const geo=new THREE.BufferGeometry().setFromPoints(track.map(p=>sphere(p.lon,p.lat,5.04)));
        v.layers.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffca76})));
      }
    }
    if(globe) for(const row of vectors) {
      if(row.speed===0) continue;
      const pos=sphere(row.lon,row.lat,5.04), normal=pos.clone().normalize();
      const east=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),normal).normalize();
      const north=new THREE.Vector3().crossVectors(normal,east).normalize();
      const dir=east.multiplyScalar(row.u).add(north.multiplyScalar(row.v)).normalize();
      v.layers.add(new THREE.ArrowHelper(dir,pos,Math.min(0.3,0.06+row.speed*0.15),0xffffff,0.04,0.025));
    }
  }, [field,fleet,track,profile,vectors,mode,settings,showModel,showSensors]);
  useEffect(()=>{const v=view.current;if(v&&focus&&mode==='slice'){v.camera.position.copy(sphere(focus.lon,focus.lat,16));v.controls.target.set(0,0,0);v.controls.update();}},[focus?.id,focus?.source,mode]);
  const reset=()=>{const v=view.current;if(!v)return;v.camera.position.copy(mode==='slice'?sphere(78,13,16):new THREE.Vector3(10,9,12));v.controls.target.set(0,0,0);v.controls.update();};
  return <div className="scene-wrap"><div className="science-scene" ref={mount} role="img" aria-label={mode==='slice'?'Interactive globe with source-data layers and instrument markers':'Three-dimensional water column from sampled model cells'}/>
    <div className="scene-toolbar"><button onClick={reset}>Reset view</button><button onClick={()=>{const v=view.current;if(v)v.camera.position.multiplyScalar(0.85);}}>Zoom in</button><button onClick={()=>{const v=view.current;if(v)v.camera.position.multiplyScalar(1.15);}}>Zoom out</button></div>
    <div className="scene-caption">{error||message||(mode==='slice'?'Drag to rotate · scroll/pinch to zoom · select an instrument or ocean location':'Drag to orbit the water column')}<br/>{mode!=='slice'&&'Local equirectangular layout • east → right, north → back, depth → down'}</div></div>;
}
