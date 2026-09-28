// Shared transfer function and grid geometry. Pure functions are tested independently.
export function fraction(value, min, max, scale = 'linear') {
  if (value == null || !Number.isFinite(value) || !(max > min)) return null;
  if (scale === 'log') {
    if (!(min > 0 && value > 0)) return null;
    return Math.max(0, Math.min(1, Math.log(value / min) / Math.log(max / min)));
  }
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
export const palettes = {
  ocean: [[20, 27, 73], [30, 93, 142], [27, 161, 168], [138, 213, 168], [250, 238, 145]],
  thermal: [[35, 54, 151], [20, 159, 190], [171, 221, 164], [253, 183, 70], [192, 33, 49]],
  viridis: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]],
};
export function color(value, min, max, scale, palette = 'ocean') {
  const t = fraction(value, min, max, scale);
  if (t == null) return null;
  const p = palettes[palette] || palettes.ocean;
  const s = t * (p.length - 1), i = Math.min(p.length - 2, Math.floor(s)), u = s - i;
  return p[i].map((v, k) => (v * (1 - u) + p[i + 1][k] * u) / 255);
}
export function gridIndex(f, k, j, i) { return (k * f.shape[1] + j) * f.shape[2] + i; }
export function localProjection(f, exaggeration) {
  const lo = f.longitudes, la = f.latitudes, de = f.depths;
  const midLat = (la[0] + la.at(-1)) / 2;
  const kmLon = 111.32 * Math.cos(midLat * Math.PI / 180);
  const width = (lo.at(-1) - lo[0]) * kmLon, length = (la.at(-1) - la[0]) * 111.32;
  const divisor = Math.max(width, length, 1) / 10;
  return (lon, lat, depth) => [((lon - lo[0]) * kmLon - width / 2) / divisor,
    -(depth - de[0]) / 1000 * exaggeration / divisor,
    -((lat - la[0]) * 111.32 - length / 2) / divisor];
}
// Six tetrahedra per hexahedral grid cell; interpolate actual physical coordinates.
// Cells containing missing values are omitted instead of bridging land/data gaps.
export function isosurface(f, threshold, exaggeration = 80) {
  const positions = [], project = localProjection(f, exaggeration);
  const corners = [[0,0,0],[0,0,1],[0,1,1],[0,1,0],[1,0,0],[1,0,1],[1,1,1],[1,1,0]];
  const tetra = [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
  const lerp = (a, b, v, p) => {
    const t = (threshold - v[a]) / (v[b] - v[a]);
    return p[a].map((x, q) => x + t * (p[b][q] - x));
  };
  for (let k = 0; k < f.shape[0]-1; k++) for (let j = 0; j < f.shape[1]-1; j++) for (let i = 0; i < f.shape[2]-1; i++) {
    const v = corners.map(([z,y,x]) => f.values[gridIndex(f,k+z,j+y,i+x)]);
    if (v.some(x => x == null || !Number.isFinite(x))) continue;
    const p = corners.map(([z,y,x]) => project(f.longitudes[i+x],f.latitudes[j+y],f.depths[k+z]));
    for (const t of tetra) {
      const inside = t.filter(n => v[n] < threshold), outside = t.filter(n => v[n] >= threshold);
      if (inside.length === 0 || inside.length === 4) continue;
      if (inside.length === 1 || outside.length === 1) {
        const a = inside.length === 1 ? inside[0] : outside[0];
        const rest = inside.length === 1 ? outside : inside;
        for (const b of rest) positions.push(...lerp(a,b,v,p));
      } else {
        const [a,b] = inside, [c,d] = outside;
        const ac=lerp(a,c,v,p), ad=lerp(a,d,v,p), bc=lerp(b,c,v,p), bd=lerp(b,d,v,p);
        positions.push(...ac,...ad,...bc,...ad,...bd,...bc);
      }
    }
  }
  return positions;
}
