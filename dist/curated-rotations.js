/* Exact-direction rotation stops for Dimension Collapse. No geometry is rewritten.
 * Matrices are row-major, act on column vectors, and belong to SO(4).
 * The active SO(2)/SO(3) block is embedded in SO(4); unused axes stay fixed.
 * For 3D the world cutter coordinate is y; for 2D it is y; for 4D it is w.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CuratedRotations = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const PHI = (1 + Math.sqrt(5)) / 2;
  const DIMENSIONS = Object.freeze({Square:2,Triangle:2,Cube:3,Tetra:3,Octa:3,Icosa:3,Dodeca:3,Tesseract:4,'5-cell':4,'16-cell':4});
  const dot = (a,b) => a.reduce((s,x,i) => s+x*b[i],0);
  const unit = v => {const s=Math.hypot(...v);if (!(s>1e-14)) throw new Error('Direction is zero.');return v.map(x=>x/s);};
  const identity = () => [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  const transpose = a => Array.from({length:16},(_,k)=>a[(k%4)*4+Math.floor(k/4)]);
  const multiply = (a,b) => Array.from({length:16},(_,k)=>{const i=Math.floor(k/4),j=k%4;return [0,1,2,3].reduce((s,q)=>s+a[4*i+q]*b[4*q+j],0);});
  const transform = (a,v) => [0,1,2,3].map(i=>[0,1,2,3].reduce((s,j)=>s+a[i*4+j]*(v[j]||0),0));
  function determinant(a,n=4) {
    if (n===1) return a[0];
    let out=0;
    for (let j=0;j<n;j++) {const minor=[];for(let i=1;i<n;i++)for(let k=0;k<n;k++)if(k!==j)minor.push(a[i*n+k]);out+=(j%2?-1:1)*a[j]*determinant(minor,n-1);}
    return out;
  }
  function givens(i,j,angle) {
    const a=identity(),c=Math.cos(angle),s=Math.sin(angle);
    a[4*i+i]=a[4*j+j]=c;a[4*i+j]=-s;a[4*j+i]=s;return a;
  }
  const cutAxis = n => n===4?3:1;
  function reject(v,rows) {
    v=v.slice();
    // Reorthogonalize once to avoid cancellation in a nearly aligned hint.
    for(let pass=0;pass<2;pass++)for(const r of rows){const t=dot(v,r);v=v.map((x,j)=>x-t*r[j]);}
    return v;
  }
  function tangent(hint,normal) {
    let v=reject(hint,[normal]);
    if(Math.hypot(...v)<1e-10){const n=normal.length,candidates=Array.from({length:n},(_,i)=>reject(Array.from({length:n},(_,j)=>+(i===j)),[normal]));v=candidates.reduce((best,p)=>Math.hypot(...p)>Math.hypot(...best)?p:best);}
    return unit(v);
  }
  function completeFrame(n,first,cut) {
    const rows=Array(n).fill(null),axis=cutAxis(n);rows[0]=first;rows[axis]=cut;
    for(let i=0;i<n;i++)if(!rows[i]){
      const filled=rows.filter(Boolean),candidates=Array.from({length:n},(_,j)=>reject(Array.from({length:n},(_,k)=>+(j===k)),filled));
      rows[i]=unit(candidates.reduce((best,p)=>Math.hypot(...p)>Math.hypot(...best)?p:best));
    }
    if(determinant(rows.flat(),n)<0){const free=Array.from({length:n},(_,i)=>i).find(i=>i!==0&&i!==axis);rows[free??0]=rows[free??0].map(x=>-x);}
    const matrix=identity();for(let i=0;i<n;i++)for(let j=0;j<n;j++)matrix[i*4+j]=rows[i][j];return matrix;
  }
  function fromX(direction,cutHint) {
    const x=unit(direction),n=x.length;
    const cut=n===2?[-x[1],x[0]]:tangent(cutHint||[7,13,19,29].slice(0,n),x);
    return completeFrame(n,x,cut);
  }
  function fromCut(direction,xHint) {
    const cut=unit(direction),n=cut.length;
    const x=n===2?[cut[1],-cut[0]]:tangent(xHint||[2,3,7,17].slice(0,n),cut);
    return completeFrame(n,x,cut);
  }
  function presetsFor(model) {
    const name=model.name,n=DIMENSIONS[name];
    if(!n||model.dimension!==n||!model.rawV?.length)throw new Error('Pass a supported sliceModel with rawV and dimension.');
    const V=model.rawV;
    const pose=(id,label,matrix,extra={})=>({id,label,matrix,...extra});
    const stops=[pose('off-angle','Off angle',fromX([2,3,7,17].slice(0,n)),{generic:true})];
    const even={Square:[1,2],Triangle:[1,0],Cube:[1,2,4],Tetra:[0,1,2],Octa:[1,3,5],Tesseract:[1,2,4,8],'16-cell':[1,3,5,7]};
    // A centered regular simplex has vi·vj=-1/n for i!=j. Thus for
    // d=sum_i (i-n/2)vi, vi·d=(1+1/n)(i-n/2): exact equal spacing.
    if(name==='5-cell')even[name]=Array.from({length:n},(_,j)=>V.reduce((s,v,i)=>s+(i-n/2)*v[j],0));
    if(even[name])stops.push(pose('even-spacing','Even spacing',fromX(even[name]),{spacing:'even',expectedLevels:V.length}));
    if(name==='Icosa'||name==='Dodeca')stops.push(pose('golden-spacing','Golden spacing',fromX([1,0,0]),{spacing:'golden',gapRatios:name==='Icosa'?[1,PHI,PHI,1]:[PHI,1,PHI,PHI,1,PHI]}));
    const specifications={
      Square:[['corner-first','Corner first',[1,1]],['side-first','Side first',[0,1]]],
      Triangle:[['sideways','Sideways',[1,0]]],
      Cube:[['corner-first','Corner first',[1,1,1]],['face-first','Face first',[0,1,0]]],
      Tetra:[['vertex-face','Vertex and face',V[0]],['edge-first','Edge first',[1,0,0]]],
      Octa:[['vertex-first','Vertex first',[1,0,0]],['face-first','Face first',[1,1,1]]],
      Icosa:[['vertex-first','Vertex first',V[0]],['face-first','Face first',[1,1,1]]],
      // With the app's cyclic (0,1/phi,phi) coordinates the dual face
      // normal is (0,phi,1), not (0,1,phi).
      Dodeca:[['vertex-first','Vertex first',V[0]],['face-first','Face first',[0,PHI,1]]],
      Tesseract:[['corner-first','Corner first',[1,1,1,1]],['cell-first','Cell first',[0,0,0,1]]],
      '5-cell':[['vertex-cell','Vertex and cell',V[0]],['edge-face','Edge and face',V[0].map((x,j)=>x+V[1][j])]],
      '16-cell':[['vertex-first','Vertex first',[1,0,0,0]],['cell-first','Cell first',[1,1,1,1]]]
    };
    for(const [id,label,normal] of specifications[name])stops.push(pose(id,label,fromCut(normal)));
    return stops;
  }
  function projectedLevels(vertices,axis=0,tolerance=1e-10) {
    const values=vertices.map(v=>v[axis]).sort((a,b)=>a-b),groups=[];
    for(const value of values){const last=groups[groups.length-1];if(!last||Math.abs(value-last.value)>tolerance)groups.push({value,count:1});else last.count++;}
    return groups;
  }
  function cutterBounds(vertices,n) {
    if(!vertices.length||![2,3,4].includes(n))throw new Error('Provide rotated world vertices and dimension.');
    const axis=cutAxis(n),values=vertices.map(v=>v[axis]),min=Math.min(...values),max=Math.max(...values);
    const epsilon=64*Number.EPSILON*Math.max(1,...vertices.flat().map(Math.abs));
    const at=value=>values.map((v,i)=>Math.abs(v-value)<=epsilon?i:-1).filter(i=>i>=0);
    // min/max are actual support values, never rounded or padded. Only the
    // descriptive support-index grouping uses the sectioner's machine epsilon.
    return {min,max,axis,minIndices:at(min),maxIndices:at(max)};
  }
  function cutAtFraction(bounds,t) {
    if(t<=0)return bounds.min;if(t>=1)return bounds.max;
    return bounds.min+t*(bounds.max-bounds.min);
  }
  function orientedModel(model,matrix) {
    const n=model.dimension,P=model.rawV.map(v=>transform(matrix,v));
    const V=P.map(v=>n===3?[v[0],v[2],v[1]]:v.slice(0,n));
    return {...model,V,criticalLevels:projectedLevels(V,n-1,1e-12).map(g=>g.value)};
  }
  function rotationPath(from,to,n) {
    if(![2,3,4].includes(n))throw new Error('Choose dimension 2, 3 or 4.');
    // QR factorization by plane rotations: E_m ... E_1 R = I,
    // hence R=E_1^-1 ... E_m^-1. Scaling each fixed plane angle supplies
    // a continuous SO(n) path even at 180 degrees, without matrix lerp.
    let remaining=multiply(to,transpose(from));const steps=[];
    for(let i=0;i<n-1;i++)for(let j=n-1;j>i;j--){
      const a=remaining[i*4+i],b=remaining[j*4+i];
      if(Math.hypot(a,b)<1e-14||(Math.abs(b)<1e-15&&a>=0))continue;
      const angle=Math.atan2(-b,a);remaining=multiply(givens(i,j,angle),remaining);steps.push({i,j,angle:-angle});
    }
    return {steps,at(t){
      if(t<=0)return from.slice();if(t>=1)return to.slice();
      let relative=identity();for(const s of steps)relative=multiply(relative,givens(s.i,s.j,s.angle*t));
      return multiply(relative,from);
    }};
  }
  return {PHI,DIMENSIONS,identity,transpose,multiply,transform,determinant,givens,cutAxis,fromX,fromCut,presetsFor,projectedLevels,cutterBounds,cutAtFraction,orientedModel,rotationPath};
});
