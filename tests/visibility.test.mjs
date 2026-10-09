import assert from 'node:assert/strict';
import {convexVisibility3} from '../dist/dimension/visibility.mjs';
import {get, sliceModel, intersectSection, projectionHull, giv, mm4, mul4} from '../dist/dimension/geometry.mjs';
const close = (a,b,tol=1e-11) => assert(Math.abs(a-b)<tol, `${a} != ${b}`);
const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
const meshFor = name => {const s=get(name);return {verts:s.V,edges:s.E,facets:s.F};};
const cube = meshFor('Cube');
const snapshot = JSON.stringify(cube);
const result = convexVisibility3(cube);
assert.equal(JSON.stringify(cube),snapshot,'helper must never mutate geometry');
assert.equal(result.faces.length,6);
assert.equal(result.edges.length,12);
assert.equal(result.faces.filter(f=>f.facing>1e-10).length,2);
assert.equal(result.faces.filter(f=>f.facing< -1e-10).length,2);
assert.equal(result.edges.filter(e=>e.front===1).length,7);
assert.equal(result.edges.filter(e=>e.front===0).length,5);
assert(result.edges.every(e=>e.adjacent.length===2));
// Reversing every face and translating the object must not change visibility.
const reversed = convexVisibility3({...cube,facets:cube.facets.map(f=>[...f].reverse())});
const translated = convexVisibility3({...cube,verts:cube.verts.map(v=>v.slice(0,3).map((x,k)=>x+[21,-7,4][k]))});
for(let i=0;i<12;i++){close(result.edges[i].alpha,reversed.edges[i].alpha);close(result.edges[i].alpha,translated.edges[i].alpha);}
// Facing agrees with the convex supporting half-space, including all shipped solids.
let meshes = 0, faces = 0, edges = 0;
function check(mesh){
  const v=convexVisibility3(mesh);meshes++;faces+=v.faces.length;edges+=v.edges.length;
  for(const f of v.faces){
    close(Math.hypot(...f.normal),1);
    const offset=dot(f.normal,mesh.verts[f.ids[0]]);
    for(const p of mesh.verts)assert(dot(f.normal,p)<=offset+2e-8,'normal must point outward');
    assert(f.front>=0&&f.front<=1);
  }
  for(const e of v.edges){assert.equal(e.adjacent.length,2);assert(e.alpha>=.1&&e.alpha<=.92000000001);assert(Number.isFinite(e.width));}
}
for(const name of ['Cube','Tetra','Octa','Icosa','Dodeca'])for(let t=0;t<12;t++){
  const mesh=meshFor(name),M=mm4(giv(0,2,t*.17),giv(1,2,t*.23));
  mesh.verts=mesh.verts.map(v=>mul4(M,[...v,0]).slice(0,3));check(mesh);
}
for(const name of ['Tesseract','5-cell','16-cell'])for(let t=0;t<5;t++){
  const base=sliceModel(name,4),M=mm4(giv(0,3,t*.19),mm4(giv(1,3,t*.11),giv(1,2,t*.23)));
  const V=base.rawV.map(v=>mul4(M,v)),model={...base,V};
  for(const s of[-.35,0,.2,.5]){const q=intersectSection(model,s);if(q.kind==='polyhedron')check(q);}
  const verts=V.map(v=>v.slice(0,3)),hull=projectionHull(verts);if(hull.facets.length)check({verts,edges:hull.edges,facets:hull.facets});
}
// Positive-only smoothstep has zero derivative at tangency and becomes fully
// visible at ~4.6 degrees. No binary normal-sign flip enters alpha or width.
let largestJump=0,last=null;
for(let i= -1000;i<=1000;i++){
  const a=i*1e-5,v=convexVisibility3(cube,[Math.sin(a),0,Math.cos(a)]);
  if(last)for(let j=0;j<v.edges.length;j++)largestJump=Math.max(largestJump,Math.abs(v.edges[j].alpha-last.edges[j].alpha));
  last=v;
}
assert(largestJump<.0002,'grazing transition should respect its smoothstep slope bound');
const grazing0=convexVisibility3(cube,[0,0,1]),grazingNear=convexVisibility3(cube,[1e-6,0,1]);
for(let i=0;i<12;i++)assert(Math.abs(grazing0.edges[i].alpha-grazingNear.edges[i].alpha)<1e-8);
const tiny=convexVisibility3({...cube,verts:cube.verts.map(p=>p.map(v=>v*1e-8))});
for(let i=0;i<12;i++)close(result.edges[i].alpha,tiny.edges[i].alpha);
console.log(JSON.stringify({pass:true,meshes,faces,edges,grazingLargestJump:largestJump}));
