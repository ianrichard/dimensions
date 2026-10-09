import {ATLAS,EVEN3,EVEN4} from "./presets.mjs";
const PHI = (1 + Math.sqrt(5)) / 2;
const dot = (a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub = (a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add = (a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const cross = (a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len = a=>Math.hypot(a[0],a[1],a[2]);
const norm = a=>{const l=len(a);return [a[0]/l,a[1]/l,a[2]/l]};
const mulMV = (M,v)=>[M[0]*v[0]+M[1]*v[1]+M[2]*v[2],M[3]*v[0]+M[4]*v[1]+M[5]*v[2],M[6]*v[0]+M[7]*v[1]+M[8]*v[2]];
const mulMM = (A,B)=>{const C=new Array(9);for(let i=0;i<3;i++)for(let j=0;j<3;j++)C[i*3+j]=A[i*3]*B[j]+A[i*3+1]*B[3+j]+A[i*3+2]*B[6+j];return C};
function rot(ax,t){const [x,y,z]=ax,c=Math.cos(t),s=Math.sin(t),C=1-c;
  return [c+x*x*C,x*y*C-z*s,x*z*C+y*s, y*x*C+z*s,c+y*y*C,y*z*C-x*s, z*x*C-y*s,z*y*C+x*s,c+z*z*C]}
function signKey(d){ // direction up to sign
  let v=d; const f=Math.abs(d[0])>1e-7?d[0]:Math.abs(d[1])>1e-7?d[1]:d[2]; if(f<0)v=[-d[0],-d[1],-d[2]];
  return v.map(x=>(Math.abs(x)<5e-6?0:x).toFixed(5)).join(',');
}
let seed=7; const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
const randUnit=()=>norm([rand()*2-1,rand()*2-1,rand()*2-1]);

// ---------- solids ----------
function raw(name){
  const out=[];
  if(name==='Tetra') return [[1,1,1],[1,-1,-1],[-1,1,-1],[-1,-1,1]];
  if(name==='Octa') return [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  const cube=[];for(const a of[-1,1])for(const b of[-1,1])for(const c of[-1,1])cube.push([a,b,c]);
  if(name==='Cube') return cube;
  const cyc=(A,B)=>{for(const a of[-A,A])for(const b of[-B,B])out.push([0,a,b],[a,b,0],[b,0,a]);};
  if(name==='Icosa'){cyc(1,PHI);return out}
  if(name==='Dodeca'){cyc(1/PHI,PHI);return cube.concat(out)}
  const perms=([a,b,c])=>[[a,b,c],[a,c,b],[b,a,c],[b,c,a],[c,a,b],[c,b,a]];
  const uniq=list=>{const m=new Map();list.forEach(v=>m.set(v.map(x=>x.toFixed(6)).join(','),v));return [...m.values()]};
  const signs=(v)=>{const r=[];for(const a of[-1,1])for(const b of[-1,1])for(const c of[-1,1])r.push([v[0]*a,v[1]*b,v[2]*c]);return r};
  if(name==='Cubocta') return uniq(signs([1,1,0]).flatMap(perms));
  if(name==='TruncOcta') return uniq(signs([0,1,2]).flatMap(perms));
  if(name==='Icosidodeca'){
    const r=[];for(const s of[-1,1])r.push([0,0,s*PHI],[0,s*PHI,0],[s*PHI,0,0]);
    signs([.5,PHI/2,PHI*PHI/2]).forEach(([a,b,c])=>r.push([a,b,c],[b,c,a],[c,a,b]));
    return uniq(r);
  }
}
function build(name){
  const rv=raw(name), r=len(rv[0]), verts=rv.map(v=>v.map(x=>x/r)), n=verts.length;
  let min=Infinity; for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)min=Math.min(min,len(sub(verts[i],verts[j])));
  const edges=[]; for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(len(sub(verts[i],verts[j]))-min)<1e-6)edges.push([i,j]);
  const faces=[], seen=new Set();
  for(let a=0;a<n;a++)for(let b=a+1;b<n;b++)for(let c=b+1;c<n;c++){
    let nn=cross(sub(verts[b],verts[a]),sub(verts[c],verts[a])); if(len(nn)<1e-9)continue; nn=norm(nn);
    if(dot(nn,verts[a])<0)nn=nn.map(x=>-x); const d=dot(nn,verts[a]);
    if(d<1e-6)continue; if(verts.some(v=>dot(nn,v)>d+1e-6))continue;
    const on=[];verts.forEach((v,i)=>{if(Math.abs(dot(nn,v)-d)<1e-6)on.push(i)});
    const key=on.join(','); if(seen.has(key))continue; seen.add(key);
    const ctr=on.reduce((s,i)=>add(s,verts[i]),[0,0,0]).map(x=>x/on.length);
    const u=norm(sub(verts[on[0]],ctr)), w=cross(nn,u);
    on.sort((i,j)=>{const p=sub(verts[i],ctr),q=sub(verts[j],ctr);return Math.atan2(dot(p,w),dot(p,u))-Math.atan2(dot(q,w),dot(q,u))});
    faces.push({idx:on,n:nn});
  }
  const edgeFaces=edges.map(([i,j])=>faces.map((f,k)=>f.idx.includes(i)&&f.idx.includes(j)?k:-1).filter(k=>k>=0));
  const specials={
    vertex: verts.map(v=>v),
    edge: edges.map(([i,j])=>norm(add(verts[i],verts[j]))),
    face: faces.map(f=>f.n)
  };
  return {name,verts,edges,faces,edgeFaces,specials,atlas:loadAtlas(name,verts.length),circles:tieCircles(verts)};
}
function loadAtlas(name,V){
  const list=ATLAS[name].map(e=>({key:e.k,planes:e.p,labels:new Set(e.l),dirs:e.d.map(norm),big:Math.max(...e.k.split(' ').map(Number))}));
  const pts=[];list.forEach(e=>{if(e.planes<=V-2)e.dirs.forEach(d=>pts.push({d,planes:e.planes,big:e.big}))});
  return {list,pts};
}
function tieCircles(verts){const m=new Map();for(let i=0;i<verts.length;i++)for(let j=i+1;j<verts.length;j++){const d=norm(sub(verts[i],verts[j]));m.set(signKey(d),d)}
  return [...m.values()].map(n=>{const a=norm(cross(n,Math.abs(n[0])<.9?[1,0,0]:[0,1,0]));return {a,b:cross(n,a)}})}
function counts(verts,d,tol){
  const xs=verts.map(v=>dot(v,d)).sort((a,b)=>a-b); const c=[1];
  for(let i=1;i<xs.length;i++){ if(xs[i]-xs[i-1]<tol)c[c.length-1]++; else c.push(1); }
  return c;
}
function canon(c){const r=[...c].reverse();for(let i=0;i<c.length;i++){if(c[i]<r[i])return c.join(' ');if(c[i]>r[i])return r.join(' ')}return c.join(' ')}

// ---- 4D polytopes (shared with the page) ----
const P4=(()=>{
const F=(1+Math.sqrt(5))/2;
const signs4=v=>{let out=[[]];for(const x of v)out=out.flatMap(o=>x===0?[[...o,0]]:[[...o,x],[...o,-x]]);return out};
const perms=a=>a.length<=1?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map(p=>[x,...p]));
const parity=p=>{let c=0;for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++)if(p[i]>p[j])c++;return c%2};
const idx=perms([0,1,2,3]), even=idx.filter(p=>!parity(p));
const uniq=l=>{const m=new Map();l.forEach(v=>m.set(v.map(x=>(Math.abs(x)<1e-9?0:x).toFixed(6)).join(','),v));return [...m.values()]};
const allPerm=v=>idx.map(p=>p.map(i=>v[i]));
const evPerm=v=>even.map(p=>p.map(i=>v[i]));
function make(name){
  if(name==='5-cell'){const b=[];const E=[[1,-1,0,0,0],[0,1,-1,0,0],[0,0,1,-1,0],[0,0,0,1,-1]];
    for(const e of E){let v=e.slice();for(const q of b){const d=v.reduce((s,x,i)=>s+x*q[i],0);v=v.map((x,i)=>x-d*q[i])}const l=Math.hypot(...v);b.push(v.map(x=>x/l))}
    return [0,1,2,3,4].map(k=>{const p=[0,0,0,0,0].map((_,i)=>(i===k?1:0)-.2);return b.map(q=>q.reduce((s,x,i)=>s+x*p[i],0))})}
  if(name==='Tesseract')return signs4([1,1,1,1]);
  if(name==='16-cell')return uniq(signs4([1,0,0,0]).flatMap(allPerm));
  if(name==='24-cell')return uniq(signs4([1,1,0,0]).flatMap(allPerm));
  if(name==='600-cell')return uniq([...signs4([1,0,0,0]).flatMap(allPerm),...signs4([.5,.5,.5,.5]),...signs4([F/2,.5,1/(2*F),0]).flatMap(evPerm)]);
  if(name==='120-cell'){const r5=Math.sqrt(5),f2=1/(F*F),fi=1/F;
    return uniq([...signs4([0,0,2,2]).flatMap(allPerm),...signs4([1,1,1,r5]).flatMap(allPerm),...signs4([f2,F,F,F]).flatMap(allPerm),...signs4([fi,fi,fi,F*F]).flatMap(allPerm),
      ...signs4([0,f2,1,F*F]).flatMap(evPerm),...signs4([0,fi,F,r5]).flatMap(evPerm),...signs4([fi,1,F,2]).flatMap(evPerm)])}
}
return {make,F};
})();

// ---------- 4D ----------
const NAMES4=['5-cell','Tesseract','16-cell','24-cell','600-cell','120-cell'];
const CELLS4={'5-cell':'5 tetrahedra','Tesseract':'8 cubes','16-cell':'16 tetrahedra','24-cell':'24 octahedra','600-cell':'600 tetrahedra','120-cell':'120 dodecahedra'};
const dot4=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3];
const nrm4=a=>{const l=Math.hypot(a[0],a[1],a[2],a[3]);return [a[0]/l,a[1]/l,a[2]/l,a[3]/l]};
const I4=()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
const mul4=(M,v)=>[0,1,2,3].map(i=>M[i*4]*v[0]+M[i*4+1]*v[1]+M[i*4+2]*v[2]+M[i*4+3]*v[3]);
function mm4(A,B){const C=new Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++){let s=0;for(let k=0;k<4;k++)s+=A[i*4+k]*B[k*4+j];C[i*4+j]=s}return C}
function giv(i,j,t){const R=I4(),c=Math.cos(t),s=Math.sin(t);R[i*4+i]=c;R[j*4+j]=c;R[i*4+j]=-s;R[j*4+i]=s;return R}
function ortho4(M){const r=[0,1,2,3].map(i=>M.slice(i*4,i*4+4));const o=[];for(let v of r){for(const q of o){const d=dot4(v,q);v=v.map((x,k)=>x-d*q[k])}o.push(nrm4(v))}return o.flat()}
function counts4(V,d){const xs=V.map(v=>dot4(v,d)).sort((a,b)=>a-b);const c=[1];for(let i=1;i<xs.length;i++){if(xs[i]-xs[i-1]<1e-6)c[c.length-1]++;else c.push(1)}return c}
function build4(name){
  let V=P4.make(name);const r=Math.hypot(...V[0]);V=V.map(v=>v.map(x=>x/r));const n=V.length;
  const d2=(a,b)=>{let s=0;for(let k=0;k<4;k++){const t=a[k]-b[k];s+=t*t}return s};
  let mn=Infinity;for(let i=1;i<n;i++)mn=Math.min(mn,d2(V[0],V[i]));
  const edges=[],nb=V.map(()=>[]);for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(d2(V[i],V[j])-mn)<1e-6){edges.push([i,j]);nb[i].push(j);nb[j].push(i)}
  const faces=[];
  for(let s=0;s<Math.min(n,40);s++){let best=null,bl=1e9;
    for(const p of nb[s])for(const q of nb[s])if(q>p){const prev=new Map([[p,-1]]),Q=[p];let h=0;
      while(h<Q.length){const x=Q[h++];if(x===q)break;for(const y of nb[x])if(y!==s&&!prev.has(y)){prev.set(y,x);Q.push(y)}}
      if(!prev.has(q))continue;const path=[];for(let x=q;x!==-1;x=prev.get(x))path.push(x);if(path.length+1<bl){bl=path.length+1;best=[s,...path]}}
    if(best)faces.push(nrm4(best.reduce((a,i)=>a.map((x,k)=>x+V[i][k]),[0,0,0,0])))}
  const specials={vertex:V.map(v=>v.slice()),edge:edges.map(([i,j])=>nrm4(V[i].map((x,k)=>x+V[j][k]))),face:faces};
  const sigs=new Map();
  for(const [lab,list] of Object.entries(specials))for(const d of list){const c=counts4(V,d),key=canon(c);
    if(!sigs.has(key))sigs.set(key,{key,planes:c.length,dirs:[],labels:new Set()});const e=sigs.get(key);if(e.dirs.length<24)e.dirs.push(d);e.labels.add(lab)}
  const list=[...sigs.values()].sort((a,b)=>a.planes-b.planes||a.key.localeCompare(b.key));
  return {name,dim:4,verts:V,edges,specials,atlas:{list,pts:[]}};
}
const SLICE_NAMES={'1,0':'a point','2,1':'a pair','3,3':'a triangle','4,4':'a square','5,5':'a pentagon','6,6':'a hexagon','4,6':'a tetrahedron','6,12':'an octahedron','8,12':'a cube',
  '12,30':'an icosahedron','12,24':'a cuboctahedron','20,30':'a dodecahedron','24,36':'a truncated octahedron','30,60':'an icosidodecahedron'};

// ---------- symmetric collapse steps ----------
const POLY_NAMES={3:'triangle',4:'square',5:'pentagon',6:'hexagon',7:'heptagon',8:'octagon',9:'nonagon',10:'decagon',12:'dodecagon',9:'nonagon',10:'decagon',12:'dodecagon',14:'14-gon',16:'16-gon',18:'18-gon',20:'20-gon',24:'24-gon',30:'30-gon'};
const SHELL_NAMES={'4,6':'tetrahedron','6,12':'octahedron','8,12':'cube','12,30':'icosahedron','12,24':'cuboctahedron','20,30':'dodecahedron','24,36':'truncated octahedron','30,60':'icosidodecahedron','14,24':'rhombic dodecahedron','14,36':'rhombic dodecahedron','32,60':'rhombic triacontahedron','32,90':'rhombic triacontahedron'};
const perpTo=(v,basis)=>{let w=v.slice();for(const b of basis){const d=dot4(w,b);w=w.map((x,i)=>x-d*b[i])}return w};
const uniqPts=Q=>{const m=new Map();Q.forEach(p=>m.set(p.map(x=>Math.round(x*1e4)).join(','),p));return [...m.values()]};
const dist4=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2],a[3]-b[3]);
function complement(basis,k){ // k orthonormal vectors orthogonal to basis
  const out=[];for(let t=0;t<k;t++){let best=null,bl=-1;
    for(const e of [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]){const w=perpTo(e,basis.concat(out));const l=Math.hypot(...w);if(l>bl){bl=l;best=w}}
    out.push(nrm4(best))}return out}
/* Self-contained 3D convex hull for the unit-radius projection explorer.
 * Incremental triangular hull; merges coplanar triangles into real facets.
 * Returns indices into the original input, ordered facet polygons, true edges,
 * and unit outward facet normals. No sampled directions or guessed edges.
 */
function convexHull3(points, eps = 1e-8) {
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const norm = a => { const l=Math.hypot(...a); return a.map(x=>x/l); };
  const key = (a,b) => a<b ? a+','+b : b+','+a;
  const P=[], source=[];
  points.forEach((p,i)=>{
    if (!p.every(Number.isFinite)) throw new Error('Non-finite hull point');
    if (!P.some(q=>Math.hypot(...sub(p,q))<eps)) { P.push(p); source.push(i); }
  });
  if(P.length<4) throw new Error('A 3D hull requires four non-coplanar points');
  const a=0;
  let b=-1,c=-1,d=-1,best=-1;
  for(let i=1;i<P.length;i++){const v=sub(P[i],P[a]),s=dot(v,v);if(s>best){best=s;b=i;}}
  const ab=sub(P[b],P[a]); best=-1;
  for(let i=0;i<P.length;i++){const v=cross(ab,sub(P[i],P[a])),s=dot(v,v);if(s>best){best=s;c=i;}}
  if(best<eps*eps) throw new Error('Hull points are collinear');
  const abc=norm(cross(ab,sub(P[c],P[a]))); best=-1;
  for(let i=0;i<P.length;i++){const s=Math.abs(dot(abc,sub(P[i],P[a])));if(s>best){best=s;d=i;}}
  if(best<eps) throw new Error('Hull points are coplanar');
  const inside=[0,1,2].map(k=>(P[a][k]+P[b][k]+P[c][k]+P[d][k])/4);
  function triangle(i,j,k){
    let n=cross(sub(P[j],P[i]),sub(P[k],P[i]));
    const l=Math.hypot(...n); if(l<eps*eps) return null;
    n=n.map(x=>x/l);
    if(dot(n,sub(inside,P[i]))>0){[j,k]=[k,j];n=n.map(x=>-x);}
    return {ids:[i,j,k],n,h:dot(n,P[i])};
  }
  let faces=[[a,b,c],[a,d,b],[a,c,d],[b,d,c]].map(f=>triangle(...f));
  const seed=new Set([a,b,c,d]);
  for(let i=0;i<P.length;i++){
    if(seed.has(i)) continue;
    const visible=new Set();
    faces.forEach((f,j)=>{if(dot(f.n,P[i])-f.h>eps)visible.add(j);});
    if(!visible.size) continue;
    const horizon=new Map();
    for(const j of visible){const ids=faces[j].ids;
      for(let e=0;e<3;e++){const u=ids[e],v=ids[(e+1)%3],k=key(u,v);if(horizon.has(k))horizon.delete(k);else horizon.set(k,[u,v]);}
    }
    faces=faces.filter((_,j)=>!visible.has(j));
    for(const [u,v] of horizon.values()){const f=triangle(u,v,i);if(f)faces.push(f);}
  }
  // Coalesce supporting planes, then use a 2D hull to discard triangulation
  // vertices that became collinear with an edge or interior to a planar face.
  const planes=[];
  for(const f of faces){
    let g=planes.find(g=>dot(g.n,f.n)>1-1e-10 && Math.abs(g.h-f.h)<eps*16);
    if(!g){g={n:f.n,h:f.h,ids:new Set()};planes.push(g);}
    f.ids.forEach(i=>g.ids.add(i));
  }
  const facets=planes.map(g=>{
    const k=[0,1,2].reduce((m,i)=>Math.abs(g.n[i])<Math.abs(g.n[m])?i:m,0);
    const axis=[0,0,0];axis[k]=1;
    const u=norm(cross(g.n,axis)),v=cross(g.n,u);
    const p=P.map((p,i)=>({i,p})).filter(q=>Math.abs(dot(g.n,q.p)-g.h)<eps*16)
      .map(q=>({i:q.i,x:Math.round(dot(q.p,u)/eps)*eps,y:Math.round(dot(q.p,v)/eps)*eps})).sort((a,b)=>a.x-b.x||a.y-b.y);
    const turn=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const lo=[],hi=[];
    for(const q of p){while(lo.length>1 && turn(lo.at(-2),lo.at(-1),q)<=eps)lo.pop();lo.push(q);}
    for(const q of p.slice().reverse()){while(hi.length>1 && turn(hi.at(-2),hi.at(-1),q)<=eps)hi.pop();hi.push(q);}
    const ids=lo.slice(0,-1).concat(hi.slice(0,-1)).map(q=>source[q.i]);
    return {ids,normal:g.n,offset:g.h};
  }).filter(f=>f.ids.length>=3);
  const edges=new Map(),vertices=new Set();
  for(const f of facets){for(let j=0;j<f.ids.length;j++){
    const a=f.ids[j],b=f.ids[(j+1)%f.ids.length];vertices.add(a);edges.set(key(a,b),[a,b]);
  }}
  return {vertices:[...vertices], edges:[...edges.values()], facets};
}

/* Integration adapter: relies only on the existing complement, dot4 and nrm4
 * helpers. It can replace shellAxes directly. All directions are 4D vectors
 * in the retained 3D subspace. "Face" now means a true hull-facet normal.
 */
function projectedHullAxes(Q,basis) {
  const B=complement(basis,3);
  const points=Q.map(p=>B.map(b=>dot4(p,b)));
  const hull=convexHull3(points);
  const lift=v=>B[0].map((_,k)=>B.reduce((s,b,j)=>s+b[k]*v[j],0));
  const valid=vs=>vs.filter(v=>v.every(Number.isFinite));
  return {
    vertex:valid(hull.vertices.map(i=>nrm4(Q[i]))),
    edge:valid(hull.edges.map(([i,j])=>nrm4(Q[i].map((x,k)=>x+Q[j][k])))),
    face:hull.facets.map(f=>lift(f.normal)),
    n:hull.vertices.length,
    name:solidNameFromHull(points,hull),
    hull
  };
}


/* Deliberately conservative naming. Vertex count alone never assigns a name. */
function solidNameFromHull(points,hull,tol=1e-6) {
  const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
  const mean=ids=>[0,1,2].map(k=>ids.reduce((s,i)=>s+points[i][k],0)/ids.length);
  const equal=xs=>Math.max(...xs)-Math.min(...xs)<tol;
  const lengths=hull.edges.map(([a,b])=>distance(points[a],points[b]));
  if(!equal(lengths))return null;
  const hist={};for(const f of hull.facets)hist[f.ids.length]=(hist[f.ids.length]||0)+1;
  const signature=Object.entries(hist).sort((a,b)=>+a[0]-b[0]).map(([a,b])=>a+':'+b).join(',');
  const V=hull.vertices.length,E=hull.edges.length,F=hull.facets.length;
  if(V===14 && E===24 && F===12 && signature==='4:12') {
    const diagonals=hull.facets.map(f=>{
      const [a,b,c,d]=f.ids.map(i=>points[i]);
      const ds=[distance(a,c),distance(b,d)].sort((a,b)=>a-b);
      return ds[1]/ds[0];
    });
    if(diagonals.every(r=>Math.abs(r-Math.SQRT2)<tol))return 'rhombic dodecahedron';
  }
  const center=mean(hull.vertices);
  if(!equal(hull.vertices.map(i=>distance(points[i],center))))return null;
  if(!hull.facets.every(f=>{const c=mean(f.ids);return equal(f.ids.map(i=>distance(points[i],c)));}))return null;
  const names={
    '4/6/4/3:4':'tetrahedron',
    '6/12/8/3:8':'octahedron',
    '8/12/6/4:6':'cube',
    '12/30/20/3:20':'icosahedron',
    '20/30/12/5:12':'dodecahedron',
    '12/24/14/3:8,4:6':'cuboctahedron',
    '24/36/14/4:6,6:8':'truncated octahedron',
    '30/60/32/3:20,5:12':'icosidodecahedron'
  };
  return names[[V,E,F,signature].join('/')]||null;
}


function shellAxes(Q,basis){return projectedHullAxes(Q,basis)}
function plane2(Q,basis){ // 2D hull of points living in the plane orthogonal to basis
  const [b1,b2]=complement(basis,2);
  const pts=uniqPts(Q).map(p=>[dot4(p,b1),dot4(p,b2)]);
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=1e-7)lo.pop();lo.push(p)}
  for(const p of [...pts].reverse()){while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=1e-7)up.pop();up.push(p)}
  const hull=lo.slice(0,-1).concat(up.slice(0,-1)),m=hull.length;
  const r=hull.map(p=>Math.hypot(...p)),sides=hull.map((p,i)=>Math.hypot(p[0]-hull[(i+1)%m][0],p[1]-hull[(i+1)%m][1]));
  const eqS=Math.max(...sides)-Math.min(...sides)<1e-3,eqR=Math.max(...r)-Math.min(...r)<1e-3;
  return {b1,b2,hull,regular:eqS&&eqR,eqS,eqR};
}
function polyName(h){const n=h.hull.length;
  if(n<=2)return 'segment';
  if(n===4&&!h.regular)return h.eqS?'rhombus':h.eqR?'rectangle':'quadrilateral';
  if(h.regular&&n===3)return 'equilateral triangle';if(h.regular&&n===4)return 'square';
  return (h.regular?'regular ':'')+(POLY_NAMES[n]||n+'-gon')}
function shellName(Q,basis){
 const h=projectedHullAxes(Q,basis),B=complement(basis,3);
 const radii=Q.map(p=>Math.hypot(...p)),r=Math.max(...radii),outer=Q.filter((p,i)=>radii[i]>r-1e-6),points=outer.map(p=>B.map(b=>dot4(p,b)));
 let shell=null;try{shell=solidNameFromHull(points,convexHull3(points))}catch{}
 return{shell,shellN:outer.length,hull:h.n,hullName:h.name};
}
const uniqDirs=L=>{const m=new Map();L.forEach(d=>{let v=d;const f=Math.abs(d[0])>1e-6?d[0]:Math.abs(d[1])>1e-6?d[1]:Math.abs(d[2])>1e-6?d[2]:d[3];if(f<0)v=d.map(x=>-x);m.set(v.map(x=>Math.round(x*1e4)).join(','),v)});return [...m.values()]};
const nDistinct=(Q,f)=>new Set(Q.map(p=>f(p))).size;
function count1(Q,d){const xs=Q.map(p=>dot4(p,d)).sort((a,b)=>a-b);let c=1;for(let i=1;i<xs.length;i++)if(xs[i]-xs[i-1]>1e-4)c++;return c}
const projectedAxisCache=new Map(),projectedNameCache=new Map();
function makeFlag(S,ch){
  let Q=S.V,d4=[0,0,0,1];
  if(S.dim===4){d4=S.specials[ch.k4][0];Q=S.V.map(v=>perpTo(v,[d4]))}
  const B=[d4],ak=S.name+'|'+(S.dim===4?ch.k4:'3D');
  if(!projectedAxisCache.has(ak))projectedAxisCache.set(ak,shellAxes(Q,B));
  const ax=projectedAxisCache.get(ak);
  let c3=(ax[ch.k3]&&ax[ch.k3].length)?ax[ch.k3]:ax.vertex;c3=uniqDirs(c3).slice(0,48);
  const key2=p=>p.map(x=>Math.round(x*1e3)).join(',');
  let d3=null,b2=1e9;
  for(const c of c3){const d=nrm4(perpTo(c,B));const n=nDistinct(Q,p=>key2(perpTo(p,[d])));if(n<b2-.5){b2=n;d3=d}}
  const Q2=Q.map(v=>perpTo(v,[d3])),B2=[d4,d3],pl=plane2(Q2,B2),h=pl.hull,m=h.length;
  const c2=ch.k2==='side'?h.map((p,i)=>[(p[0]+h[(i+1)%m][0])/2,(p[1]+h[(i+1)%m][1])/2]):h;
  let d1=null,b1=1e9;
  for(const c of c2){const d=nrm4(pl.b1.map((x,i)=>x*c[0]+pl.b2[i]*c[1]));const n=count1(Q2,d);if(n<b1){b1=n;d1=d}}
  const d2=complement([d4,d3,d1],1)[0];
  if(S.dim===4&&!projectedNameCache.has(ak))projectedNameCache.set(ak,shellName(Q,B));
  const sh=S.dim===4?projectedNameCache.get(ak):null;
  return {d1,d2,d3,d4,n3:S.dim===4?nDistinct(Q,key2):S.V.length,n2:b2,n1:b1,poly:polyName(pl),shell:sh};
}

// ---------- shapes as 4D (3D shapes get w = 0) ----------
const NAMES3=['Tetra','Cube','Octa','Icosa','Dodeca','Cubocta','TruncOcta','Icosidodeca'];
const FULL={Tetra:'Tetrahedron',Cube:'Cube',Octa:'Octahedron',Icosa:'Icosahedron',Dodeca:'Dodecahedron',Cubocta:'Cuboctahedron',TruncOcta:'Truncated octahedron',Icosidodeca:'Icosidodecahedron'};
const FAMILIES={'3D':NAMES3,'4D':NAMES4};
const FAM_DEFAULT={'3D':'Cube','4D':'Tesseract'};
const EPS=1e-5;
function projectionGroups(P,axes){
 const tolerance=1e-10;
 const sorted=P.map((p,i)=>i).sort((a,b)=>P[a][axes[0]]-P[b][axes[0]]), groups=[];
 for(const i of sorted){let found=null;for(let j=groups.length-1;j>=0;j--){const g=groups[j];if(P[i][axes[0]]-P[g.idx[0]][axes[0]]>tolerance)break;if(axes.every(k=>Math.abs(P[i][k]-P[g.idx[0]][k])<=tolerance)){found=g;break}}
 if(found)found.idx.push(i);else groups.push({idx:[i]});}
 return groups;
}

const GOLDEN=new Set(['Icosa','Dodeca','Icosidodeca','600-cell','120-cell']);
const to4=v=>[v[0],v[1],v[2],0];
const famOf=n=>Object.keys(FAMILIES).find(f=>FAMILIES[f].includes(n));
function shape(n){
  if(NAMES4.includes(n)){const s=build4(n);
    return {name:n,dim:4,V:s.verts,E:s.edges,specials:s.specials,list:s.atlas.list,even:EVEN4[n]||[]}}
  const s=build(n);
  return {name:n,dim:3,V:s.verts.map(to4),E:s.edges,F:s.faces.map(f=>f.idx),circles:s.circles,pts:s.atlas.pts,
    specials:{vertex:s.specials.vertex.map(to4),edge:s.specials.edge.map(to4),face:s.specials.face.map(to4)},
    list:s.atlas.list.map(e=>({key:e.key,planes:e.planes,labels:e.labels,dirs:e.dirs.map(to4)})),
    even:(EVEN3[n]||[]).map(e=>({key:e.key,planes:e.planes,dirs:e.dirs.map(to4)}))};
}
const cache={}; const get=n=>cache[n]||(cache[n]=shape(n));
const r2=Math.SQRT2,r3=Math.sqrt(3);
const RAT=[[1,'1'],[PHI,'φ'],[PHI*PHI,'φ²'],[PHI**3,'φ³'],[2,'2'],[3,'3'],[1.5,'3⁄2'],[r2,'√2'],[r3,'√3'],[4,'4']];
const fmtR=v=>{for(const [c,n] of RAT)if(Math.abs(v-c)<2e-3*c)return n;return v.toFixed(2)};

function cornerFirstSection(n, s) {
  if (![2,3,4].includes(n) || !Number.isFinite(s) || s < -1.2 || s > 1.2)
    throw new Error('Use dimension 2, 3 or 4 and a position from -1.2 to 1.2.');
  const eps = 1e-11, halfSide = 1 / Math.sqrt(n);
  const dot = (a,b) => a.reduce((v,x,i) => v+x*b[i],0);
  const minus = (a,b) => a.map((x,i) => x-b[i]);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => {const l=Math.hypot(...a);return a.map(x=>x/l);};
  const retained = [];
  for(let j=1;j<n;j++) retained.push(Array.from({length:n},(_,i)=>i<j ? 1/Math.sqrt(j*(j+1)) : i===j ? -j/Math.sqrt(j*(j+1)) : 0));
  const basis = retained.concat([Array(n).fill(halfSide)]);
  const signs = Array.from({length:1<<n},(_,i)=>Array.from({length:n},(_,k)=>i&(1<<k)?1:-1));
  const original = signs.map(v=>v.map(x=>x*halfSide));
  // This exact arithmetic for the last row also keeps ±1 and ±1/3 stable.
  const baseVerts = original.map((v,i)=>retained.map(b=>dot(b,v)).concat(signs[i].reduce((a,b)=>a+b,0)/n));
  const sourceEdges = [];
  for(let i=0;i<1<<n;i++) for(let k=0;k<n;k++) {const j=i^(1<<k);if(i<j)sourceEdges.push([i,j]);}
  const sourceVerts = baseVerts.map(v=>v.map((x,k)=>x+(k===n-1?s:0)));
  const source = {verts:sourceVerts,baseVerts,edges:sourceEdges,center:Array.from({length:n},(_,i)=>i===n-1?s:0),circumradius:1,halfSide};
  const hits = [];
  function hit(i,j,t) {
    const point = sourceVerts[i].slice(0,n-1).map((x,k)=>x+t*(sourceVerts[j][k]-x));
    let h=hits.find(h=>Math.hypot(...minus(h.point,point))<eps);
    if(!h){h={point,original:original[i].map((x,k)=>x+t*(original[j][k]-x)),onEdges:[]};hits.push(h);}
    h.onEdges.push({edge:[i,j],t});
  }
  // Outside is truly empty, including infinitesimal travel beyond a support.
  if(Math.abs(s)<=1) for(const [i,j] of sourceEdges){
    const a=sourceVerts[i][n-1],b=sourceVerts[j][n-1];
    if(Math.abs(a)<eps) hit(i,j,0);
    if(Math.abs(b)<eps) hit(i,j,1);
    if(a*b<0 && Math.abs(a)>=eps && Math.abs(b)>=eps) hit(i,j,-a/(b-a));
  }
  if(n===2)hits.sort((a,b)=>a.point[0]-b.point[0]);
  if(n===3 && hits.length>2) {
    const center=[0,1].map(k=>hits.reduce((sum,h)=>sum+h.point[k],0)/hits.length);
    hits.sort((a,b)=>Math.atan2(a.point[1]-center[1],a.point[0]-center[0])-Math.atan2(b.point[1]-center[1],b.point[0]-center[0]));
  }
  const verts=hits.map(h=>h.point),facets=[],edgeMap=new Map();
  const addEdge=(a,b)=>{if(a!==b)edgeMap.set(Math.min(a,b)+','+Math.max(a,b),[a,b]);};
  if(n===2 && verts.length===2)addEdge(0,1);
  if(n===3 && verts.length>1) for(let i=0;i<verts.length;i++)addEdge(i,(i+1)%verts.length);
  if(n===4 && verts.length>=4) {
    // Every section facet is the intersection with an original cubic cell.
    // This enumerates all eight supporting half-spaces exactly; no hull
    // heuristics, sampled directions or artificial triangulation edges.
    const seen=new Set();
    for(let axis=0;axis<n;axis++)for(const sign of [-1,1]){
      const ids=hits.map((h,i)=>Math.abs(h.original[axis]-sign*halfSide)<eps?i:-1).filter(i=>i>=0);
      if(ids.length<3)continue;
      const key=ids.slice().sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);
      const normal=unit(retained.map(b=>sign*b[axis]));
      const center=[0,1,2].map(k=>ids.reduce((sum,i)=>sum+verts[i][k],0)/ids.length);
      const u=unit(minus(verts[ids[0]],center)),v=cross(normal,u);
      ids.sort((i,j)=>Math.atan2(dot(minus(verts[i],center),v),dot(minus(verts[i],center),u))-Math.atan2(dot(minus(verts[j],center),v),dot(minus(verts[j],center),u)));
      const offset=dot(normal,verts[ids[0]]);
      facets.push({ids,normal,offset,sourceCell:{axis,sign}});
      for(let i=0;i<ids.length;i++)addEdge(ids[i],ids[(i+1)%ids.length]);
    }
  }
  const edges=[...edgeMap.values()];
  const kind=!verts.length?'empty':verts.length===1?'point':n===2?'segment':n===3?'polygon':'polyhedron';
  const name=kind==='empty'?'no intersection':kind==='point'?'point':n===2?'segment':n===3?(verts.length===3?'triangle':'hexagon'):verts.length===4?'tetrahedron':verts.length===6?'octahedron':'truncated tetrahedron';
  return {dimension:n,position:s,basis,source,kind,name,verts,edges,facets,
    polygon:n===3?verts:null,
    hull:n===4&&verts.length>=4?{vertices:verts.map((_,i)=>i),edges,facets}:null,
    // Provenance is useful for verification, and does not affect rendering.
    intersections:hits};
}

/* Exact edge/hyperplane intersection for convex 2D, 3D and 4D polytopes.
 * baseVerts are ALREADY oriented and contain exactly dimension coordinates.
 * The cutter is x[dimension - 1] = position. No rendering projection is used.
 * Pass the app's existing convexHull3 as options.hull3 (or use its global).
 */
function selectedShapeSection(baseVerts, sourceEdges, position, options = {}) {
  const n=baseVerts[0]?.length, d=n-1;
  if(![2,3,4].includes(n) || !Number.isFinite(position) ||
     baseVerts.some(p=>p.length!==n || !p.every(Number.isFinite)))
    throw new Error('Use finite oriented vertices of a 2D, 3D or 4D polytope.');
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const sub=(a,b)=>a.map((x,i)=>x-b[i]);
  const distance=(a,b)=>Math.hypot(...sub(a,b));
  const scale=Math.max(1,...baseVerts.flat().map(Math.abs));
  const eps=64*Number.EPSILON*scale;
  const levels=baseVerts.map(p=>p[d]);
  const support=[Math.min(...levels),Math.max(...levels)];
  const source={baseVerts,verts:baseVerts,edges:sourceEdges,
    center:Array(n).fill(0),circumradius:Math.max(...baseVerts.map(p=>Math.hypot(...p)))};
  const result={dimension:n,position,source,support,kind:'empty',name:'',
    rank:-1,verts:[],edges:[],facets:[],intersections:[],polygon:null,hull:null};
  // No tolerance outside the support: just beyond the source is truly empty.
  if(position<support[0] || position>support[1])return result;
  const hits=[];
  function hit(i,j,t){
    const original=baseVerts[i].map((x,k)=>x+t*(baseVerts[j][k]-x));
    const point=original.slice(0,d);
    let h=hits.find(h=>distance(h.point,point)<=eps);
    if(!h){h={point,original,onEdges:[]};hits.push(h);}
    h.onEdges.push({edge:[i,j],t});
  }
  for(const [i,j]of sourceEdges){
    const a=levels[i]-position,b=levels[j]-position;
    const az=Math.abs(a)<=eps,bz=Math.abs(b)<=eps;
    if(az)hit(i,j,0);
    if(bz)hit(i,j,1);
    if(!az&&!bz&&((a<0&&b>0)||(a>0&&b<0)))hit(i,j,-a/(b-a));
  }
  if(!hits.length)return result;
  // Affine rank is relative to section size, so tiny genuine sections survive.
  const origin=hits[0].point,basis=[];
  const diameter=Math.max(...hits.map(h=>distance(h.point,origin)));
  if(diameter>eps){
    for(let k=0;k<d;k++){
      let best=null,length=0;
      for(const h of hits){let v=sub(h.point,origin);
        for(const b of basis){const x=dot(v,b);v=v.map((y,i)=>y-x*b[i]);}
        const l=Math.hypot(...v);if(l>length){length=l;best=v;}
      }
      if(length<=Math.max(eps,diameter*64*Number.EPSILON))break;
      basis.push(best.map(x=>x/length));
    }
  }
  const rank=basis.length;let kept=[];
  result.rank=rank;
  if(rank===0){kept=[0];result.kind='point';result.name='point';}
  else if(rank===1){
    const ordered=hits.map((h,i)=>({i,x:dot(sub(h.point,origin),basis[0])})).sort((a,b)=>a.x-b.x);
    kept=[ordered[0].i,ordered.at(-1).i];result.kind='segment';result.name='line';result.edges=[[0,1]];
  } else if(rank===2){
    const P=hits.map((h,i)=>({i,x:dot(sub(h.point,origin),basis[0])/diameter,
      y:dot(sub(h.point,origin),basis[1])/diameter})).sort((a,b)=>a.x-b.x||a.y-b.y);
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const lo=[],hi=[];
    for(const p of P){while(lo.length>1&&cross(lo.at(-2),lo.at(-1),p)<=Number.EPSILON*8)lo.pop();lo.push(p);}
    for(const p of P.slice().reverse()){while(hi.length>1&&cross(hi.at(-2),hi.at(-1),p)<=Number.EPSILON*8)hi.pop();hi.push(p);}
    kept=lo.slice(0,-1).concat(hi.slice(0,-1)).map(p=>p.i);
    result.kind='polygon';result.edges=kept.map((_,i)=>[i,(i+1)%kept.length]);
  } else if(options.cells){
    // A section facet is the intersection with a genuine source cell.
    // Source-edge incidence decides membership, so arbitrarily small facets
    // are not confused with a neighboring supporting plane.
    kept=hits.map((_,i)=>i);result.kind='polyhedron';const edgeMap=new Map(),seen=new Set();
    const center=Array.from({length:d},(_,k)=>hits.reduce((s,h)=>s+h.point[k],0)/hits.length);
    for(const cell of options.cells){
      const members=new Set(cell);
      const ids=hits.map((h,i)=>h.onEdges.some(({edge:[a,b],t})=>
        (members.has(a)&&members.has(b))||(t===0&&members.has(a))||(t===1&&members.has(b)))?i:-1).filter(i=>i>=0);
      if(ids.length<3)continue;
      const face=sectionFace(hits.map(h=>h.point),ids,center);
      if(!face)continue;
      const key=face.ids.slice().sort((a,b)=>a-b).join(',');if(seen.has(key))continue;seen.add(key);
      result.facets.push(face);
      face.ids.forEach((a,i)=>{const b=face.ids[(i+1)%face.ids.length];edgeMap.set(Math.min(a,b)+','+Math.max(a,b),[a,b]);});
    }
    result.edges=[...edgeMap.values()];
  } else {
    const hull3=options.hull3 || convexHull3;
    // The existing hull uses absolute tolerances. Normalize ONLY its working
    // copy, and retain the original section coordinates for both renderings.
    const working=hits.map(h=>sub(h.point,origin).map(x=>x/diameter));
    const h=hull3(working,1e-10);
    kept=h.vertices;const remap=new Map(kept.map((id,i)=>[id,i]));
    result.kind='polyhedron';
    result.edges=h.edges.map(e=>e.map(i=>remap.get(i)));
    result.facets=h.facets.map(f=>({ids:f.ids.map(i=>remap.get(i)),normal:f.normal,
      offset:dot(f.normal,hits[f.ids[0]].point)}));
  }
  result.intersections=kept.map(i=>hits[i]);result.verts=result.intersections.map(h=>h.point);
  if(rank===2){result.polygon=result.verts;result.name=sectionPolygonName(result.verts);}
  if(rank===3){
    result.hull={vertices:result.verts.map((_,i)=>i),edges:result.edges,facets:result.facets};
    result.name=sectionSolidName(result.verts,result.hull);
  }
  return result;
}

function sectionFace(points,ids,inside){
  const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const origin=points[ids[0]],vectors=ids.map(i=>sub(points[i],origin));
  let u=vectors.reduce((best,v)=>Math.hypot(...v)>Math.hypot(...best)?v:best),size=Math.hypot(...u);
  if(size===0)return null;u=u.map(x=>x/size);
  const residuals=vectors.map(v=>{const t=dot(v,u);return v.map((x,i)=>x-t*u[i]);});
  let v=residuals.reduce((best,p)=>Math.hypot(...p)>Math.hypot(...best)?p:best),height=Math.hypot(...v);
  if(height<size*64*Number.EPSILON)return null;v=v.map(x=>x/height);
  let normal=cross(u,v);
  if(vectors.some(p=>Math.abs(dot(p,normal))>size*1e-7))return null; // Coincident full 3D source cell.
  if(dot(normal,sub(inside,origin))>0){normal=normal.map(x=>-x);v=v.map(x=>-x);}
  const P=ids.map(i=>({i,x:dot(sub(points[i],origin),u)/size,y:dot(sub(points[i],origin),v)/size})).sort((a,b)=>a.x-b.x||a.y-b.y);
  const turn=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),lo=[],hi=[];
  for(const p of P){while(lo.length>1&&turn(lo.at(-2),lo.at(-1),p)<=Number.EPSILON*8)lo.pop();lo.push(p);}
  for(const p of P.slice().reverse()){while(hi.length>1&&turn(hi.at(-2),hi.at(-1),p)<=Number.EPSILON*8)hi.pop();hi.push(p);}
  const boundary=lo.slice(0,-1).concat(hi.slice(0,-1)).map(p=>p.i);
  if(boundary.length<3)return null;
  return {ids:boundary,normal,offset:dot(normal,points[boundary[0]])};
}

function sectionPolygonName(points){
  const sub=(a,b)=>a.map((x,i)=>x-b[i]),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
  const v=points.map((p,i)=>sub(points[(i+1)%points.length],p)),lens=v.map(p=>Math.hypot(...p));
  const equal=Math.max(...lens)-Math.min(...lens)<Math.max(...lens)*1e-7;
  const right=v.every((p,i)=>Math.abs(dot(p,v[(i+1)%v.length]))<lens[i]*lens[(i+1)%v.length]*1e-7);
  if(points.length===3)return 'triangle';
  if(points.length===4)return right?(equal?'square':'rectangle'):(equal?'rhombus':'quadrilateral');
  return ({5:'pentagon',6:'hexagon',7:'heptagon',8:'octagon',9:'nonagon',10:'decagon',12:'dodecagon'})[points.length]||`${points.length}-gon`;
}

function sectionSolidName(points,hull){
  const V=points.length,E=hull.edges.length,F=hull.facets.length;
  const hist={};for(const f of hull.facets)hist[f.ids.length]=(hist[f.ids.length]||0)+1;
  const distance=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]));
  const lengths=hull.edges.map(([a,b])=>distance(points[a],points[b]));
  const size=Math.max(...lengths),tol=size*1e-7;
  const equal=xs=>Math.max(...xs)-Math.min(...xs)<tol;
  const center=ids=>points[0].map((_,k)=>ids.reduce((s,i)=>s+points[i][k],0)/ids.length);
  const faceRegular=f=>{const c=center(f.ids);return equal(f.ids.map(i=>distance(points[i],c)));};
  const regular=equal(lengths)&&hull.facets.every(faceRegular);
  if(V===4&&E===6&&F===4&&hist[3]===4)return 'tetrahedron';
  if(V===6&&E===9&&F===5&&hist[3]===2&&hist[4]===3&&
      hull.facets.filter(f=>f.ids.length===4).every(f=>['square','rectangle'].includes(sectionPolygonName(f.ids.map(i=>points[i])))))return 'triangular prism';
  if(V===8&&E===12&&F===6&&hist[4]===6){
    const names=hull.facets.map(f=>sectionPolygonName(f.ids.map(i=>points[i])));
    if(names.every(n=>n==='square'))return 'cube';
    if(names.every(n=>n==='square'||n==='rectangle'))return 'rectangular prism';
  }
  if(regular&&V===6&&E===12&&F===8&&hist[3]===8)return 'octahedron';
  if(regular&&V===12&&E===24&&F===14&&hist[3]===8&&hist[4]===6)return 'cuboctahedron';
  if(V===12&&E===18&&F===8&&hist[3]===4&&hist[6]===4){
    const triangles=hull.facets.filter(f=>f.ids.length===3),triVertexCounts=Array(V).fill(0);
    triangles.forEach(f=>f.ids.forEach(i=>triVertexCounts[i]++));
    const degrees=Array(V).fill(0);hull.edges.forEach(([a,b])=>{degrees[a]++;degrees[b]++;});
    // This names the verified truncation topology, without claiming regularity.
    if(triVertexCounts.every(c=>c===1)&&degrees.every(c=>c===3))return 'truncated tetrahedron';
  }
  return 'polyhedron';
}

// The normal is the last row; preceding rows form an orthonormal cutter basis.
// Equal-coordinate diagonal normals use the same Helmert basis as the existing
// cornerFirstSection, preserving the default square/cube/tesseract appearance.
function sectionBasisForNormal(input){
  const n=input.length,length=Math.hypot(...input),normal=input.map(x=>x/length);
  const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),rows=[];
  if(normal.every(x=>Math.abs(x-1/Math.sqrt(n))<1e-12)){
    for(let j=1;j<n;j++)rows.push(Array.from({length:n},(_,i)=>i<j?1/Math.sqrt(j*(j+1)):i===j?-j/Math.sqrt(j*(j+1)):0));
  }else{
    for(let k=0;k<n&&rows.length<n-1;k++){
      let v=Array.from({length:n},(_,i)=>i===k?1:0);
      for(const b of [normal,...rows]){const d=dot(v,b);v=v.map((x,i)=>x-d*b[i]);}
      const l=Math.hypot(...v);if(l>1e-10)rows.push(v.map(x=>x/l));
    }
  }
  return rows.concat([normal]);
}
function orientSectionVertices(vertices,normal){
  const basis=sectionBasisForNormal(normal);
  return vertices.map(p=>basis.map(b=>b.reduce((s,x,i)=>s+x*p[i],0)));
}

function curatedSectionNormals(name,vertices){
  const n=vertices[0].length,axis=i=>Array.from({length:n},(_,k)=>k===i?1:0);
  const unit=p=>{const l=Math.hypot(...p);return p.map(x=>x/l);};
  const specs={
    Square:[['Corner first',[1,1]],['Side first',[0,1]]],
    Triangle:[['Vertex and side',[0,1]],['Sideways',[1,0]]],
    Cube:[['Corner first',[1,1,1]],['Face first',[0,0,1]],['Edge first',[1,1,0]]],
    Tetra:[['Vertex and face',vertices[0]],['Edge first',[1,0,0]]],
    Octa:[['Vertex first',[0,0,1]],['Face first',[1,1,1]]],
    Icosa:[['Vertex first',vertices[0]],['Face first',get('Icosa').specials.face[0].slice(0,3)]],
    Dodeca:[['Vertex first',vertices[0]],['Face first',get('Dodeca').specials.face[0].slice(0,3)]],
    Tesseract:[['Corner first',[1,1,1,1]],['Cell first',[0,0,0,1]]],
    '5-cell':[['Vertex and cell',vertices[0]],['Edge and face',vertices[0].map((x,i)=>x+vertices[1][i])]],
    '16-cell':[['Vertex first',axis(0)],['Cell first',[1,1,1,1]]]
  };
  return (specs[name]||[]).map(([label,normal])=>({label,normal:unit(normal)}));
}

// App integration: getShape defaults to the app's existing cached get(name).
function sliceModel(name,n,orientationIndex=0,getShape){
  const allowed={2:['Square','Triangle'],3:['Cube','Tetra','Octa','Icosa','Dodeca'],4:['Tesseract','5-cell','16-cell']};
  if(!allowed[n]?.includes(name))throw new Error('Choose a supported shape in this dimension.');
  let vertices,edges;
  if(n===2){
    if(name==='Square'){
      const a=1/Math.sqrt(2);vertices=[[-a,-a],[a,-a],[-a,a],[a,a]];edges=[[0,1],[0,2],[1,3],[2,3]];
    }else{vertices=[[0,1],[-Math.sqrt(3)/2,-.5],[Math.sqrt(3)/2,-.5]];edges=[[0,1],[1,2],[2,0]];}
  }else{const model=(getShape||(typeof get!=='undefined'?get:null))(name);vertices=model.V.map(p=>p.slice(0,n));edges=model.E;}
  const orientations=curatedSectionNormals(name,vertices);
  const index=((orientationIndex%orientations.length)+orientations.length)%orientations.length;
  const {label,normal}=orientations[index],basis=sectionBasisForNormal(normal);
  const V=orientSectionVertices(vertices,normal);
  if(index===0&&['Square','Cube','Tesseract'].includes(name))
    V.forEach((v,i)=>v[n-1]=vertices[i].reduce((sum,x)=>sum+Math.sign(x),0)/n);
  const levels=V.map(p=>p[n-1]).sort((a,b)=>a-b),criticalLevels=[];
  for(const s of levels)if(!criticalLevels.length||Math.abs(s-criticalLevels.at(-1))>1e-10)criticalLevels.push(s);
  let cells=null;
  if(name==='Tesseract'){
    cells=[];for(let k=0;k<4;k++)for(const sign of [-1,1])cells.push(vertices.map((p,i)=>Math.sign(p[k])===sign?i:-1).filter(i=>i>=0));
  }else if(name==='5-cell')cells=vertices.map((_,i)=>vertices.map((_,j)=>j).filter(j=>j!==i));
  else if(name==='16-cell')cells=Array.from({length:16},(_,bits)=>Array.from({length:4},(_,k)=>vertices.findIndex(p=>Math.abs(p[k]-(bits&(1<<k)?1:-1))<1e-9)));
  return {name,dimension:n,V,rawV:vertices,E:edges,cells,basis,normal,orientationIndex:index,
    orientationName:label,orientationCount:orientations.length,criticalLevels};
}
function intersectSection(model,position,hull3){
  return selectedShapeSection(model.V,model.E,position,{hull3,cells:model.cells});
}

function projectionHull(points) {
  const P=[],source=[];points.forEach((p,i)=>{const q=p.slice(0,3);if(!P.some(v=>v.every((x,k)=>x===q[k]))){P.push(q);source.push(i);}});const n=P.length;
  const sub=(a,b)=>a.map((v,k)=>v-b[k]),dot=(a,b)=>a.reduce((s,v,k)=>s+v*b[k],0);
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const edgeKey=(a,b)=>a<b?a+','+b:b+','+a;
  const buf=new ArrayBuffer(8),view=new DataView(buf);
  const parts=P.map(p=>p.map(v=>{
    if(!Number.isFinite(v))throw new Error('Non-finite projection');
    if(!v)return [0n,0];view.setFloat64(0,v);
    const b=view.getBigUint64(0),e=Number((b>>52n)&2047n),m=(b&((1n<<52n)-1n))+(e?1n<<52n:0n);
    return [(b>>63n?-1n:1n)*m,e?e-1075:-1074];
  }));
  const exponent=Math.min(...parts.flat().filter(([m])=>m).map(([,e])=>e));
  const Q=parts.map(p=>p.map(([m,e])=>m?m<<BigInt(e-exponent):0n));
  const facets=[],seen=new Set();
  for(let a=0;a<n-2;a++)for(let b=a+1;b<n-1;b++)for(let c=b+1;c<n;c++){
    const raw=cross(sub(P[b],P[a]),sub(P[c],P[a])),length=Math.hypot(...raw);
    let big=null;const exactNormal=()=>big||(big=cross(sub(Q[b],Q[a]),sub(Q[c],Q[a])));
    if(!exactNormal().some(v=>v))continue;
    let side=0,valid=true;const on=[];
    for(let i=0;i<n;i++){
      const d=dot(raw,sub(P[i],P[a]));let s;
      if(Math.abs(d)>Math.max(length*1e-13,1e-14))s=Math.sign(d);
      else{const v=sub(Q[i],Q[a]),q=exactNormal(),d=q[0]*v[0]+q[1]*v[1]+q[2]*v[2];s=d>0n?1:d<0n?-1:0;}
      if(!s)on.push(i);else if(side&&s!==side){valid=false;break;}else side=s;
    }
    if(!valid||!side)continue;
    const faceKey=on.join(',');if(seen.has(faceKey))continue;seen.add(faceKey);
    const q=exactNormal().map(Number),l=Math.hypot(...q),normal=q.map(v=>-side*v/l);
    const drop=[0,1,2].reduce((m,k)=>Math.abs(normal[k])>Math.abs(normal[m])?k:m,0),axes=[0,1,2].filter(k=>k!==drop);
    const sorted=on.slice().sort((i,j)=>P[i][axes[0]]-P[j][axes[0]]||P[i][axes[1]]-P[j][axes[1]]);
    const turn=(i,j,k)=>(Q[j][axes[0]]-Q[i][axes[0]])*(Q[k][axes[1]]-Q[i][axes[1]])-(Q[j][axes[1]]-Q[i][axes[1]])*(Q[k][axes[0]]-Q[i][axes[0]]);
    const lo=[],hi=[];
    for(const i of sorted){while(lo.length>1&&turn(lo.at(-2),lo.at(-1),i)<=0n)lo.pop();lo.push(i);}
    for(const i of sorted.slice().reverse()){while(hi.length>1&&turn(hi.at(-2),hi.at(-1),i)<=0n)hi.pop();hi.push(i);}
    const ids=lo.slice(0,-1).concat(hi.slice(0,-1));
    if(dot(cross(sub(P[ids[1]],P[ids[0]]),sub(P[ids[2]],P[ids[0]])),normal)<0)ids.reverse();
    facets.push({ids,normal,offset:dot(normal,P[ids[0]])});
  }
  // Connect adjacent facets only when every vertex lies on the same plane.
  const parents=facets.map((_,i)=>i),find=i=>parents[i]===i?i:(parents[i]=find(parents[i])),adj=new Map();
  facets.forEach((f,i)=>f.ids.forEach((a,k)=>{const key=edgeKey(a,f.ids[(k+1)%f.ids.length]);if(!adj.has(key))adj.set(key,[]);adj.get(key).push(i);}));
  for(const pair of adj.values())if(pair.length===2){const [i,j]=pair,a=facets[i],b=facets[j];
    if(dot(a.normal,b.normal)>1-1e-12&&b.ids.every(k=>Math.abs(dot(a.normal,P[k])-a.offset)<1e-9)&&a.ids.every(k=>Math.abs(dot(b.normal,P[k])-b.offset)<1e-9))parents[find(j)]=find(i);
  }
  const groups=new Map();facets.forEach((f,i)=>{const k=find(i);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(f);});
  const merged=[];
  for(const group of groups.values()){
    if(group.length===1){merged.push(group[0]);continue;}
    const boundary=new Map();for(const f of group)f.ids.forEach((a,k)=>{const b=f.ids[(k+1)%f.ids.length],key=edgeKey(a,b);if(boundary.has(key))boundary.delete(key);else boundary.set(key,[a,b]);});
    const next=new Map([...boundary.values()]);const first=next.keys().next().value,ids=[];let i=first;
    while(i!==undefined&&!ids.includes(i)){ids.push(i);i=next.get(i);}
    if(i!==first||ids.length!==boundary.size){merged.push(...group);continue;}
    const largest=group.slice().sort((a,b)=>Math.hypot(...cross(sub(P[b.ids[1]],P[b.ids[0]]),sub(P[b.ids[2]],P[b.ids[0]])))-Math.hypot(...cross(sub(P[a.ids[1]],P[a.ids[0]]),sub(P[a.ids[2]],P[a.ids[0]]))))[0];
    merged.push({...largest,ids});
  }
  const vertices=new Set(),edges=new Map();for(const f of merged)f.ids.forEach((a,k)=>{const b=f.ids[(k+1)%f.ids.length];vertices.add(a);edges.set(edgeKey(a,b),[a,b]);});
  if(merged.length<4)throw new Error('The 3D projection has no volume');
  return {vertices:[...vertices].map(i=>source[i]),edges:[...edges.values()].map(e=>e.map(i=>source[i])),facets:merged.map(f=>({...f,ids:f.ids.map(i=>source[i])}))};
}

export {PHI, I4, mul4, mm4, giv, FULL, EPS, get, plane2, projectionGroups, sliceModel, intersectSection, projectionHull};
