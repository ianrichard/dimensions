import test from 'node:test';import assert from 'node:assert/strict';
import {sliceModel,intersectSection,mul4} from '../dist/dimension/geometry.mjs';
import {CuratedRotations} from '../dist/dimension/curated-rotations.mjs';
import {mergeGuideSegments} from '../dist/dimension/guides.mjs';
test('regular hexagon has honest point/side extrema and exact projection relationships',()=>{
 const m=sliceModel('Hexagon',2);assert.equal(m.rawV.length,6);assert.equal(m.E.length,6);
 for(const[a,b]of m.E)assert(Math.abs(Math.hypot(...m.rawV[a].map((x,i)=>x-m.rawV[b][i]))-1)<1e-12);
 const poses=CuratedRotations.presetsFor(m);assert.equal(poses.length,2);
 for(const p of poses){const P=m.rawV.map(v=>mul4(p.matrix,[...v,0,0])),V=P.map(v=>v.slice(0,2)),levels=CuratedRotations.projectedLevels(P),gaps=levels.slice(1).map((v,i)=>v.value-levels[i].value),unit=Math.min(...gaps),lo=Math.min(...V.map(v=>v[1])),hi=Math.max(...V.map(v=>v[1]));
  assert.deepEqual(levels.map(v=>v.count),p.id==='vertex-first'?[2,2,2]:[1,2,2,1]);assert.deepEqual(gaps.map(v=>Math.round(v/unit)),p.id==='vertex-first'?[1,1]:[1,2,1]);
  for(const cut of[lo,hi]){const q=intersectSection({...m,V},cut);assert.equal(q.verts.length,p.id==='vertex-first'?1:2)}
 }
});
test('coincident correspondence segments are drawn once without joining real gaps',()=>{
 const s=(x,a,b,selected=false)=>({a:[x,a],b:[x,b],selected});
 const merged=mergeGuideSegments([s(10,0,10),s(10,10,0),s(10,5,20),s(10,30,40),s(11,0,20)]);
 assert.deepEqual(merged,[s(10,0,20),s(10,30,40),s(11,0,20)]);
 assert.equal(mergeGuideSegments([s(1,0,10),s(1,0,10,true)]).length,2);assert.throws(()=>mergeGuideSegments([{a:[0,0],b:[1,10]}]));
});
