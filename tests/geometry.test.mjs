import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sliceModel,intersectSection,mul4,projectionHull} from '../dist/dimension/geometry.mjs';
import {CuratedRotations} from '../dist/dimension/curated-rotations.mjs';
import {shapes,resolveShape,shapeIconSvg,shapeIconPaths} from '../dist/dimension/shapes.mjs';
import {createDimension} from '../dist/dimension/dimension.mjs';

test('vanilla module imports without a browser; every shape has a reusable SVG',()=>{
 assert.equal(typeof createDimension,'function');assert.equal(resolveShape('tetrahedron').key,'Tetra');
 assert.equal(shapes.length,10);for(const s of shapes){assert(shapeIconPaths[s.id]);assert.match(shapeIconSvg(s.id),/^<svg/)}
 assert.throws(()=>resolveShape('unknown'));assert.throws(()=>shapeIconSvg('cube',{size:-1}));
});
test('all curated rotations preserve radius, exact support endpoints and real sections',()=>{
 for(const shape of shapes){const base=sliceModel(shape.key,shape.dimension);for(const pose of CuratedRotations.presetsFor(base)){
  const P=base.rawV.map(v=>mul4(pose.matrix,[...v,...Array(4-v.length).fill(0)]));
  const V=P.map(v=>shape.dimension===3?[v[0],v[2],v[1]]:v.slice(0,shape.dimension));
  const axis=shape.dimension-1,levels=V.map(v=>v[axis]),lo=Math.min(...levels),hi=Math.max(...levels);
  P.forEach(v=>assert(Math.abs(Math.hypot(...v)-1)<1e-12));
  for(const cut of [lo,(lo+hi)/2,hi]){const q=intersectSection({...base,V},cut);assert(q.verts.length);for(const p of q.verts)assert(Math.hypot(...p,cut)<=1+1e-9)}
  if(shape.dimension===4){const h=projectionHull(P);assert.equal(h.vertices.length-h.edges.length+h.facets.length,2)}
 }}
});
