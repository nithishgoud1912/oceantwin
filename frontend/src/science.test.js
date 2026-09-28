import test from 'node:test';
import assert from 'node:assert/strict';
import { color, fraction, isosurface, localProjection } from './science.js';
test('colour scale preserves nulls and handles logarithms',()=>{
  assert.equal(fraction(null,0,10),null);
  assert.equal(fraction(10,1,100,'log'),0.5);
  assert.equal(fraction(0,1,10,'log'),null);
  assert.equal(color(2,10,0,'linear'),null);
});
test('isosurface extracts the known depth plane from a linear 3D field',()=>{
  const f={shape:[2,2,2],depths:[0,100],latitudes:[10,11],longitudes:[70,71],values:[0,0,0,0,10,10,10,10]};
  const vertices=isosurface(f,5,100),plane=localProjection(f,100)(70,10,50)[1];
  assert.ok(vertices.length>0);assert.equal(vertices.length%9,0);
  for(let i=1;i<vertices.length;i+=3)assert.ok(Math.abs(vertices[i]-plane)<1e-9);
  f.values[0]=null;assert.equal(isosurface(f,5).length,0);
});
test('vertical exaggeration scales actual depth, not horizontal coordinates',()=>{
  const f={depths:[0,100],latitudes:[10,11],longitudes:[70,71]};
  const a=localProjection(f,1)(71,11,100),b=localProjection(f,50)(71,11,100);
  assert.equal(a[0],b[0]);assert.equal(a[2],b[2]);assert.ok(Math.abs(b[1]-a[1]*50)<1e-10);
});
