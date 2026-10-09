import {PHI,I4,mul4,mm4,giv,FULL,EPS,get,plane2,projectionGroups,sliceModel,intersectSection,projectionHull} from './geometry.mjs';
import {convexVisibility3} from './visibility.mjs';
import {CuratedRotations} from './curated-rotations.mjs';
import {resolveShape,shapes,defaultColors,colorPresets} from './shapes.mjs';
export {shapes,colorPresets,shapeIconPaths,shapeIconSvg} from './shapes.mjs';

/** Mount one independent interactive stage. Import dimension.css alongside it. */
export function createDimension(host, options={}) {
 if(!host?.ownerDocument)throw new Error('Pass a DOM host element.');
 const document=host.ownerDocument,win=document.defaultView;
 validate(options);
 const stage=document.createElement('div');stage.className='dimension-stage';
 stage.innerHTML=`<div data-part="viewDivider" class="dimension-divider" hidden><span data-part="dividerRule" class="dimension-rule" aria-hidden="true"></span><span data-part="cutThumb" class="dimension-thumb" aria-hidden="true"></span><input data-part="cutPosition" class="dimension-cut" type="range" min="-1" max="1" step="any" value="0" orient="vertical" aria-orientation="vertical" aria-label="Slice position" title="Move the slice up or down"></div><canvas data-part="shadowCanvas" class="dimension-canvas" aria-label="Linked projections"></canvas><div data-part="shadowSourceHit" class="dimension-hit" tabindex="0" role="group" aria-label="Rotate the 4D source" title="Drag to rotate"></div><div data-part="shadowHit" class="dimension-hit" tabindex="0" role="group" aria-label="Drag or use arrow keys to rotate. Home returns to the selected pose." title="Drag to rotate"></div><span data-part="poseStatus" class="dimension-sr" aria-live="polite"></span>`;
 host.appendChild(stage);const parts=Object.fromEntries([...stage.querySelectorAll('[data-part]')].map(el=>[el.dataset.part,el]));const $=key=>parts[key];
 const cleanup=[],subscribers=new Set();let destroyed=false,ready=false,redrawFrame=null,changeAnimation=null,autoEnabled=options.autoRotate!==false,colors={...defaultColors};
 const listen=(el,type,fn,opts)=>{el.addEventListener(type,fn,opts);cleanup.push(()=>el.removeEventListener(type,fn,opts))};
 const requestAnimationFrame=fn=>win.requestAnimationFrame(fn),cancelAnimationFrame=id=>win.cancelAnimationFrame(id),performance=win.performance,devicePixelRatio=win.devicePixelRatio||1;
 const motionPreference=win.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};let reduce=motionPreference.matches;
 function setColors(values={}){for(const [key,value]of Object.entries(values)){if(!(key in defaultColors)||typeof value!=='string')throw new Error('Use supported color names and CSS color strings.');colors[key]=value;stage.style.setProperty('--dimension-'+key,value)}}
 function state(progress=autoPlaying&&!motion?Math.min(1,(performance.now()-holdStart)/HOLD_MS):0){return{shape:resolveShape(sourceNames[dimension]).id,name:pretty(sourceNames[dimension]),dimension,operation,cut:cutPosition,cutBounds:cutLimits(),poseIndex,poses:poseList.map(p=>({id:p.id,label:operation==='slice'&&p.spacing?(p.spacing==='even'?'Even source':'Golden source'):p.label})),playing:autoPlaying,reducedMotion:reduce,transitioning:!!motion,progress,freeOrientation,gaps:{...layerGaps},tilt:planeTilt*180/Math.PI,palette,colors:{...colors}}}
 function notify(progress){if(!ready||destroyed)return;const value=state(progress);for(const fn of subscribers){if(destroyed)break;fn(value)}if(!destroyed)options.onChange?.(value)}
// One selected source and one real rotation drive the entire shadow chain.
let mode='shadows',operation='collapse',dimension=3,cutPosition=0,queued=false,cutPointer=null,cutGrabOffset=0;
const sliceChoices={2:['Square','Triangle'],3:['Cube','Tetra','Octa','Icosa','Dodeca'],4:['Tesseract','5-cell','16-cell']};
const sourceNames={2:'Square',3:'Cube',4:'Tesseract'},orientationIndices={2:0,3:0,4:0},CAMERA_E=.5,CONTEXT_W=.65;
const pretty=n=>FULL[n]||n;
const defaultGaps={2:32,3:8,4:0},layerGaps={...defaultGaps};let planeTilt=17*Math.PI/180;

let rotation=I4(),baseModel=null,freeOrientation=false,selectedCell=0,poseList=[],poseIndex=0;
let autoPlaying=false,motion=null,motionFrame=null,holdStart=0;const HOLD_MS=5000,TURN_MS=1200;
function determinant4(m){let out=0;for(let a=0;a<4;a++)for(let b=0;b<4;b++)for(let c=0;c<4;c++)for(let d=0;d<4;d++){const p=[a,b,c,d];if(new Set(p).size<4)continue;let inversions=0;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)if(p[i]>p[j])inversions++;out+=(inversions%2?-1:1)*m[a]*m[4+b]*m[8+c]*m[12+d]}return out}
let css={};
function readCss(){const s=win.getComputedStyle(stage);for(const k of Object.keys(defaultColors))css[k]=s.getPropertyValue('--dimension-'+k).trim()||defaultColors[k]}
function orientationFor(model,n){
 let M=I4();const B=model.basis;for(let i=0;i<n;i++)for(let j=0;j<n;j++)M[i*4+j]=B[n===3?(i===1?2:i===2?1:i):i][j];
 if(determinant4(M)<0){const row=n===2?0:2;for(let j=0;j<4;j++)M[row*4+j]*=-1;}
 if(n===4)M=mm4(giv(1,2,.18),mm4(giv(0,2,.32),M));return M;
}
function resetOrientation(){
 baseModel=sliceModel(sourceNames[dimension],dimension,0);poseList=CuratedRotations.presetsFor(baseModel);poseIndex=Math.max(0,Math.min(poseList.length-1,orientationIndices[dimension]||0));rotation=poseList[poseIndex].matrix.slice();baseModel.orientationName=poseList[poseIndex].label;baseModel.orientationCount=poseList.length;freeOrientation=false;selectedCell=0;
}
function sharedSource(){
 const V=baseModel.rawV.map(v=>[...v,...Array(4-v.length).fill(0)]),P=V.map(v=>mul4(rotation,v));
 const F=dimension===3?get(baseModel.name).F:null;
 return{S:{name:baseModel.name,dim:dimension,V,E:baseModel.E,F,cells:baseModel.cells},P};
}
function selectedModel(n=dimension){
 if(n!==dimension)return sliceModel(sourceNames[n],n,orientationIndices[n]);
 const V=sharedSource().P.map(v=>dimension===3?[v[0],v[2],v[1]]:v.slice(0,dimension));
 const levels=V.map(v=>v[dimension-1]).sort((a,b)=>a-b),criticalLevels=[];for(const v of levels)if(!criticalLevels.length||Math.abs(v-criticalLevels.at(-1))>1e-12)criticalLevels.push(v);
 return{...baseModel,V,criticalLevels};
}
function sliceData(n=dimension,s=cutPosition){if(![2,3,4].includes(n)||!Number.isFinite(s)||s< -1.2||s>1.2)throw new Error('Choose a shape and a cut position from -1.2 to 1.2.');return intersectSection(selectedModel(n),s)}
function chooseDimension(n){if(![2,3,4].includes(n))throw new Error('Choose a listed dimension.');if(n!==dimension)chooseShape(sourceNames[n])}
function chooseMode(next){if(next!=='shadows')return;mode=next;syncUi();draw()}
function chooseOperation(next){stopAuto();if(next==='project')next='collapse';if(!['slice','collapse'].includes(next))throw new Error('Choose Slice or Collapse.');operation=next;cutPointer=null;shadow.clearSelection();syncUi();draw()}
function chooseShape(name){const n=[2,3,4].find(n=>sliceChoices[n].includes(name));if(!n)throw new Error('Choose a listed shape.');stopAuto();dimension=n;sourceNames[n]=name;orientationIndices[n]=0;cutPosition=0;cutPointer=null;resetOrientation();syncUi();shadow.clearSelection();openSelection();if(!destroyed&&!reduce){changeAnimation?.cancel();changeAnimation=stage.animate?.([{opacity:.65},{opacity:1}],{duration:180,easing:'ease-out'});changeAnimation?.finished?.catch(()=>{})}}
function rotateSlice(){selectPose((poseIndex+1)%poseList.length)}
function rotateShared(dx,dy){stopAuto();if(dimension===2)rotation=mm4(giv(0,1,(dx-dy)*.01),rotation);else{if(dx)rotation=mm4(giv(0,dimension===4?3:2,-dx*.01),rotation);if(dy)rotation=mm4(giv(1,2,dy*.01),rotation)}freeOrientation=true;shadow.clearSelection();updateRotateLabel();redraw()}
function cutLimits(){const P=sharedSource().P,axis=dimension===4?3:1,values=P.map(p=>p[axis]);return{min:Math.min(...values),max:Math.max(...values)}}
function clampCut(){const limits=cutLimits();cutPosition=Math.max(limits.min,Math.min(limits.max,cutPosition));return limits}
function setCutPosition(s){stopAuto();if(!Number.isFinite(s))throw new Error('Choose a finite cut position.');const limits=cutLimits();cutPosition=Math.max(limits.min,Math.min(limits.max,s));$('cutPosition').value=cutPosition;const q=sliceData();draw();return q}
function buildPoseButtons(){notify()}
function updateRotateLabel(){notify()}
function stopAuto(){
 if(!autoPlaying&&!motion&&motionFrame===null)return;
 const interrupted=!!motion;autoPlaying=false;motion=null;if(motionFrame!==null)cancelAnimationFrame(motionFrame);motionFrame=null;if(interrupted)freeOrientation=true;buildPoseButtons();$('poseStatus').textContent='Rotation stopped.';
}
function beginPose(index,automatic){
 poseIndex=((index%poseList.length)+poseList.length)%poseList.length;orientationIndices[dimension]=poseIndex;baseModel.orientationName=poseList[poseIndex].label;const target=poseList[poseIndex].matrix;
 if(reduce){rotation=target.slice();freeOrientation=false;motion=null;clampCut();buildPoseButtons();draw();return}
 motion={path:CuratedRotations.rotationPath(rotation,target,dimension),target:target.slice(),start:performance.now(),automatic};freeOrientation=true;buildPoseButtons();
}
function selectPose(index){stopAuto();beginPose(index,false);if(motion&&motionFrame===null)motionFrame=requestAnimationFrame(runMotion)}
function randomOrientation(){let M=I4();for(let i=0;i<dimension;i++)for(let j=i+1;j<dimension;j++)M=mm4(giv(i,j,(Math.random()*2-1)*Math.PI),M);return M}
function openSelection(){
 if(destroyed)return;
 if(reduce||!autoEnabled){draw();return}
 rotation=randomOrientation();freeOrientation=true;autoPlaying=true;beginPose(0,true);draw();
 if(!destroyed&&autoPlaying&&motionFrame===null)motionFrame=requestAnimationFrame(runMotion);
}
function startAuto(){
 if(reduce||!autoEnabled||destroyed)return;autoPlaying=true;holdStart=performance.now();
 if(freeOrientation&&!motion)beginPose(poseIndex,true);else buildPoseButtons();
 if(destroyed||!autoPlaying)return;$('poseStatus').textContent=pretty(sourceNames[dimension])+'. '+poseList[poseIndex].label+'.';
 if(motionFrame===null)motionFrame=requestAnimationFrame(runMotion);
}
function runMotion(now){
 if(destroyed)return;motionFrame=null;const current=motion;
 if(current){const t=Math.max(0,Math.min(1,(now-current.start)/TURN_MS)),eased=t*t*(3-2*t);rotation=current.path.at(eased);clampCut();draw();
  if(destroyed||motion!==current)return;
  if(t>=1){rotation=current.target.slice();freeOrientation=false;motion=null;holdStart=now;buildPoseButtons();if(destroyed)return;$('poseStatus').textContent=poseList[poseIndex].label+'.';draw()}
 }else if(autoPlaying){const progress=Math.max(0,Math.min(1,(now-holdStart)/HOLD_MS));notify(progress);if(destroyed)return;if(autoPlaying&&!motion&&progress>=1)beginPose((poseIndex+1)%poseList.length,true)}
 if(!destroyed&&(autoPlaying||motion)&&motionFrame===null)motionFrame=requestAnimationFrame(runMotion);
}
let palette='teal';
function choosePalette(id){if(!colorPresets[id])throw new Error('Choose a listed color scheme.');stopAuto();palette=id;setColors(colorPresets[id].values);draw();notify()}
function setViewOptions({gap,stage=dimension,tilt}={}){stopAuto();
 if(gap!==undefined){if(![2,3,4].includes(stage)||!Number.isFinite(gap)||gap< -256||gap>64)throw new Error('Choose a dimension gap from −256–64 pixels.');layerGaps[stage]=gap}
 if(tilt!==undefined){if(!Number.isFinite(tilt)||tilt<5||tilt>90)throw new Error('Tilt must be 5–90 degrees.');planeTilt=tilt*Math.PI/180}
 syncViewControls();draw();
}
function syncViewControls(){notify()}
function syncUi(){const four=dimension===4,slicing=operation==='slice';$('viewDivider').hidden=!slicing;$('shadowSourceHit').hidden=!four;$('cutPosition').setAttribute('aria-label',`${dimension-1}D slice position`);notify()}

function project3(v,f){return[f.ox+f.R*v[0],f.oy-f.R*(v[1]*Math.cos(CAMERA_E)-v[2]*Math.sin(CAMERA_E))]}
// Oblique context projection only; intersections are computed in 4D first.
const context4=v=>[v[0],v[1]+CONTEXT_W*v[3],v[2]];
function projectContext(v,f){return dimension===2?[f.ox+f.R*v[0],f.oy-f.R*v[1]]:project3(dimension===4?context4(v):[v[0],v[2],v[1]],f)}
function projectResult(v,f){return v.length===1?[f.ox+f.R*v[0],f.oy]:v.length===2?[f.ox+f.R*v[0],f.oy-f.R*v[1]]:project3(v,f)}
function path(c,points,closed=false){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));if(closed)c.closePath()}
function graph(c,vertices,edges,project,color,alpha=1,width=1){c.strokeStyle=color;c.globalAlpha=alpha;c.lineWidth=width;c.beginPath();for(const [a,b]of edges){c.moveTo(...project(vertices[a]));c.lineTo(...project(vertices[b]))}c.stroke();c.globalAlpha=1}
function hull2(points){const P=points.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]),turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),lo=[],hi=[];for(const p of P){while(lo.length>1&&turn(lo.at(-2),lo.at(-1),p)<=1e-10)lo.pop();lo.push(p)}for(const p of P.slice().reverse()){while(hi.length>1&&turn(hi.at(-2),hi.at(-1),p)<=1e-10)hi.pop();hi.push(p)}return lo.slice(0,-1).concat(hi.slice(0,-1))}
function fillShape(c,points,edges,facets,project,alpha=.14){
 if(!points.length)return;
 if(points.length===1){c.beginPath();c.arc(...project(points[0]),2.5,0,Math.PI*2);c.fillStyle=css.m2;c.fill();return}
 if(points[0].length===1){graph(c,points,[[0,points.length-1]],project,css.m2,1,4);return}
 c.fillStyle=css.m2;
 if(facets?.length){c.globalAlpha=.07;for(const f of facets){path(c,f.ids.map(i=>project(points[i])),true);c.fill()}}
 else{path(c,hull2(points.map(project)),true);c.globalAlpha=alpha;c.fill()}
 c.globalAlpha=1;graph(c,points,edges,project,css.m2,.82,1.3);
}
function drawSource(f,vertices,edges){const project=v=>projectContext(v,f);if(dimension===2){path(f.c,hull2(vertices.map(project)),true);f.c.fillStyle=css.ink;f.c.globalAlpha=.025;f.c.fill();f.c.globalAlpha=1}for(const [i,j]of edges){const depth=v=>{const p=dimension===4?context4(v):dimension===3?[v[0],v[2],v[1]]:[v[0],v[1],0];return p[1]*Math.sin(CAMERA_E)+p[2]*Math.cos(CAMERA_E)},a=edgeAppearance((depth(vertices[i])+depth(vertices[j]))/2);graph(f.c,vertices,[[i,j]],project,css.source,a.alpha*(dimension===4?(.34+.32*(Math.max(-1,Math.min(1,(depth(vertices[i])+depth(vertices[j]))/2))+1)/2):.78),a.width*.9)}}

// The highlighted volume is the exact section lifted back into its 4D source.
function cutterFrame(s){const lift=v=>[...v,s];return{lift,project:(v,f)=>projectContext(lift(v),f)}}
function drawCutWindow4(f,s){
 const L=1.02,V=Array.from({length:8},(_,bits)=>[0,1,2].map(k=>(bits&(1<<k)?L:-L))),E=[];
 for(let i=0;i<8;i++)for(let k=0;k<3;k++){const j=i^(1<<k);if(i<j)E.push([i,j])}
 const c=f.c;c.save();c.beginPath();c.rect(64,8,f.w-108,Math.max(1,2*(f.oy-8)));c.clip();c.setLineDash([2,5]);graph(c,V,E,p=>cutterFrame(s).project(p,f),css.muted,.13,.65);c.restore();
}
function drawSliceSource(f,q){
 drawCutWindow4(f,cutPosition);
 drawSource(f,q.source.baseVerts,q.source.edges);
 const lifted=q.verts.map(cutterFrame(cutPosition).lift),project=v=>projectContext(v,f),c=f.c;
 if(q.kind==='polyhedron'){
  c.fillStyle=css.solid;c.globalAlpha=.07;
  for(const face of q.facets){path(c,face.ids.map(i=>project(lifted[i])),true);c.fill()}
  c.globalAlpha=1;
 }else if(q.kind==='polygon'){path(c,hull2(lifted.map(project)),true);c.fillStyle=css.solid;c.globalAlpha=.13;c.fill();c.globalAlpha=1}
 else if(q.kind==='segment')graph(c,lifted,q.edges,project,css.solid,.3,1);
 else if(q.kind==='point'){c.beginPath();c.arc(...project(lifted[0]),1.5,0,Math.PI*2);c.fillStyle=css.solid;c.fill()}
 // The faint box is only a window in the infinite cutting space; the brighter contour is the exact section.
 if(lifted.length>1){c.setLineDash([3,4]);graph(c,lifted,q.edges,project,css.m2,.45,.85);c.setLineDash([])}
}
function drawMesh3(f,mesh){
 const {verts}=mesh,c=f.c,project=v=>project3(v,f),view=convexVisibility3(mesh);
 c.fillStyle=css.glass;
 if(view.faces.length){for(const face of view.faces.slice().sort((a,b)=>a.depth-b.depth)){path(c,face.ids.map(i=>project(verts[i])),true);c.globalAlpha=.18+.82*face.front;c.fill()}}
 else if(verts.length>2){path(c,hull2(verts.map(project)),true);c.globalAlpha=1;c.fill()}
 c.globalAlpha=1;
 for(const {edge,alpha,width}of view.edges)graph(c,verts,[edge],project,css.solid,alpha,width);
}
function drawSliceResult(f,q){if(q.kind==='polyhedron')drawMesh3(f,q);else fillShape(f.c,q.verts,q.edges,q.facets,v=>projectResult(v,f),.18)}
// A whole-object projection uses all source vertices, never a selected cut.
let wholeProjectionCache=null;
function wholeProjection(){
 const {S,P}=sharedSource(),key=JSON.stringify(P);if(wholeProjectionCache?.key===key)return wholeProjectionCache.value;
 const verts=P.map(p=>p.slice(0,3)),hull=projectionHull(verts),value={kind:'polyhedron',rank:3,name:'3D shadow',verts,edges:hull.edges,facets:hull.facets,hull,source:{baseVerts:P,edges:S.E}};
 wholeProjectionCache={key,value};return value;
}
function drawProjectedResult(f,q){drawMesh3(f,q)}
const SAMPLE_POSITIONS=[-.5,-.25,0,.25,.5];
function edgeAppearance(depth){const t=(Math.max(-1,Math.min(1,depth))+1)/2;return{width:.85+.55*t,alpha:.2+.55*t}}
function bindRotation(el){let drag=null;cleanup.push(()=>{if(drag&&el.hasPointerCapture?.(drag.id))el.releasePointerCapture(drag.id);drag=null});listen(el,'pointerdown',e=>{stopAuto();if(e.isPrimary===false||e.button>0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};el.setPointerCapture(e.pointerId);el.focus({preventScroll:true});e.preventDefault()});listen(el,'pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;rotateShared(dx,dy);e.preventDefault()});['pointerup','pointercancel','lostpointercapture'].forEach(t=>listen(el,t,e=>{if(drag?.id===e.pointerId)drag=null}));listen(el,'keydown',e=>{const keys={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};if(e.key==='Home'){e.preventDefault();stopAuto();resetOrientation();syncUi();draw()}else if(keys[e.key]){e.preventDefault();rotateShared(...keys[e.key])}})}
// Strict numerical validation is used only after checking curated provenance.
// These labels describe ratios to the smallest displayed gap, not distances.
function spacingCue({gaps}, {freeOrientation, dimension, cutPosition = 0,
  samplePositions = SAMPLE_POSITIONS, criticalLevels = [], operation = 'slice'}) {
  const tolerance = 1e-9;
  if (freeOrientation !== false || ![2, 3, 4].includes(dimension)) return null;
  if (operation === 'slice' && ![...samplePositions, ...criticalLevels].some(
    position => Number.isFinite(position) && Math.abs(position - cutPosition) <= tolerance)) return null;
  if (gaps.length < 2 || gaps.some(gap => !Number.isFinite(gap) || gap <= 0)) return null;
  const unit = Math.min(...gaps);
  const labels = gaps.map(gap => {
    const ratio = gap / unit;
    return Math.abs(ratio - 1) <= tolerance ? '1'
      : Math.abs(ratio - PHI) <= tolerance ? 'φ' : null;
  });
  if (labels.some(label => label === null)) return null;
  return {labels, kind: labels.includes('φ') ? 'golden' : 'equal', unit};
}


const visualBoundsCache=new Map();
function shapeVisualBounds(name,n,k){
 const key=n+':'+name;let V=visualBoundsCache.get(key);if(!V){V=sliceModel(name,n).rawV;visualBoundsCache.set(key,V)}
 const ce=Math.cos(CAMERA_E),se=Math.sin(CAMERA_E),h=CONTEXT_W*ce;let joint=1+k,first=2;
 if(n>=3){joint=0;first=0;for(const p of V)for(const q of V){const d=Math.max(-1,Math.min(1,p.reduce((sum,x,i)=>sum+x*q[i],0))),cross=Math.sqrt(Math.max(0,1-d*d));joint=Math.max(joint,Math.sqrt(Math.max(0,1+k*k-2*d*k*se+2*k*ce*cross)));first=Math.max(first,Math.sqrt(Math.max(0,2+h*h-2*d+2*h*cross)))}}
 return{source:n===4?Math.hypot(1,h):1,body:1,first,joint};
}
function createShadowExplorer(){
 const cv=$('shadowCanvas'),ctx=cv.getContext('2d'),hit=$('shadowHit');
 let S=null,sel=-1,W=0,H=0,R=100,lay={},compactFrames=null;
 const CE=Math.cos(CAMERA_E),SE=Math.sin(CAMERA_E),col=()=>css.m2;
 const sourceHit=$('shadowSourceHit');
 // Layout depends on viewport, dimension and explicit presentation only.
 // All shapes have unit circumradius; every section remains inside that ball.
 function layout(){
  W=cv.clientWidth||800;const labelX=W>760?24:16;ctx.font='400 13px system-ui, sans-serif';const labelWidth=Math.min(104,Math.max(62,...sliceChoices[S.dim].map(name=>ctx.measureText(pretty(name)).width))),LW=labelX+labelWidth+14,right=40,avail=W-LW-right,k=Math.sin(planeTilt),b=shapeVisualBounds(S.name,S.dim,k);
  R=Math.max(32,Math.min(136,avail/2-8));const o={LW,labelX,labelWidth,ox:LW+avail/2,planeScale:k,planeDepth:0,planeRadius:b.body,bodyBound:b.body,sourceBound:b.source,gaps:{...layerGaps}};
  if(S.dim===4){o.sourceTop=8;o.sourceY=8+b.source*R;o.oy3=o.sourceY+b.first*R+layerGaps[4];o.top3=o.oy3-b.body*R;}
  else{o.top3=16;o.oy3=o.top3+R;}
  o.planeY=o.oy3+b.joint*R+layerGaps[3];o.planeBack=o.planeY-k*R;o.planeFront=o.planeY+k*R;
  o.strip=S.dim===2?o.oy3+R+layerGaps[2]:o.planeFront+layerGaps[2];
  // Experimental negative gaps may reorder or overlap stages. Keep every stage on canvas.
  const minY=Math.min(o.top3,S.dim===4?o.sourceTop:Infinity,S.dim>=3?o.planeBack:Infinity,o.strip-22),shift=Math.max(0,8-minY);
  for(const key of ['sourceTop','sourceY','oy3','top3','planeY','planeBack','planeFront','strip'])if(o[key]!==undefined)o[key]+=shift;
  H=Math.max(o.oy3+R,S.dim===4?o.sourceY+b.source*R:0,S.dim>=3?o.planeFront:0,o.strip+30)+30;return o;
 }
 function resize(){lay=layout();const d=Math.min(2,devicePixelRatio||1);cv.style.height=H+'px';if(cv.width!==Math.round(W*d)||cv.height!==Math.round(H*d)){cv.width=Math.round(W*d);cv.height=Math.round(H*d)}ctx.setTransform(d,0,0,d,0,0);if(S.dim!==4)compactFrames={source:{c:ctx,w:W,h:H,R,ox:lay.ox,oy:lay.oy3},result:{c:ctx,w:W,h:H,R,ox:lay.ox,oy:S.dim===3?lay.planeY:lay.strip},planeY:lay.planeY,H};const side=2*R;hit.style.width=hit.style.height=side+'px';hit.style.left=(lay.ox-side/2)+'px';hit.style.top=(lay.oy3-side/2)+'px';if(S.dim===4){const height=2*lay.sourceBound*R;sourceHit.style.width=side+'px';sourceHit.style.height=height+'px';sourceHit.style.left=(lay.ox-side/2)+'px';sourceHit.style.top=lay.sourceTop+'px'}}
 const PX=x=>lay.ox+R*x,PY=(y,z)=>lay.oy3-R*(y*CE-z*SE),planePoint=(x,z)=>[lay.ox+R*x,lay.planeY+R*lay.planeScale*z],SHY=z=>planePoint(0,z)[1],DEP=(y,z)=>y*SE+z*CE;
function lblock(center,title,lines){
  const source=title===S.dim+'D';lines=source?[pretty(S.name)]:[];
  const total=14+19*lines.length;let y=center-total/2+11;
  ctx.textAlign='left';ctx.fillStyle=css.ink;ctx.font='600 13px system-ui, sans-serif';ctx.fillText(title,lay.labelX,y);y+=19;
  ctx.font='400 13px system-ui, sans-serif';ctx.fillStyle=css.muted;
  for(const text of lines){ctx.fillText(text,lay.labelX,y,lay.labelWidth);y+=19}return y;
}

function compute(){
  const shared=sharedSource();S=shared.S;const V=S.V,n=V.length,P=shared.P;
  const groups=projectionGroups(P,[0]);
  const gOf=new Array(n);let spread=0;
  groups.forEach((g,gi)=>{let s=0,mn=1e9,mx=-1e9;for(const i of g.idx){const x=P[i][0];s+=x;if(x<mn)mn=x;if(x>mx)mx=x;gOf[i]=gi}g.x=s/g.idx.length;spread=Math.max(spread,mx-mn)});
  if(S.dim!==4&&operation!=='slice'&&sel>=groups.length)sel=-1;
  const exact=spread<=EPS;let even=false;
  if(exact&&groups.length>=2){const st=(groups[groups.length-1].x-groups[0].x)/(groups.length-1);even=groups.every((g,i)=>!i||Math.abs(g.x-groups[i-1].x-st)<Math.max(EPS,st*1e-4))}
  const gaps=groups.slice(1).map((g,i)=>g.x-groups[i].x);
  const live=groups.map(g=>g.idx.length);
  return {P,n,groups,gOf,exact,even,gaps,live};
}
 function drawLine(C){
  const {groups}=C;if(!groups.length)return;const cue=spacingCue(C,{freeOrientation,dimension,operation,cutPosition,criticalLevels:operation==='slice'?selectedModel().criticalLevels:[]}),sY=lay.strip;
  ctx.strokeStyle=css.lineColor;ctx.fillStyle=css.lineColor;ctx.lineWidth=3;ctx.globalAlpha=1;ctx.beginPath();ctx.moveTo(PX(groups[0].x),sY);ctx.lineTo(PX(groups.at(-1).x),sY);ctx.stroke();
  if(groups.length===1){ctx.beginPath();ctx.arc(PX(groups[0].x),sY,1.5,0,2*Math.PI);ctx.fill()}
  groups.forEach((g,i)=>{const radius=1.15*Math.sqrt(g.idx.length);ctx.fillStyle=css.tick;ctx.globalAlpha=sel>=0?(sel===i?.5:.12):.19;ctx.beginPath();ctx.arc(PX(g.x),sY-9,radius,0,Math.PI*2);ctx.fill()});ctx.globalAlpha=1;
  if(cue&&layerGaps[2]>=24){const y=sY-18;ctx.strokeStyle=ctx.fillStyle=css.tick;ctx.lineWidth=.6;ctx.font='500 10px ui-monospace, monospace';ctx.textAlign='center';for(let i=1;i<groups.length;i++){const x0=PX(groups[i-1].x)+3,x1=PX(groups[i].x)-3,m=(x0+x1)/2;if(x1-x0<26)continue;ctx.globalAlpha=.13;ctx.beginPath();ctx.moveTo(x0,y);ctx.lineTo(m-7,y);ctx.moveTo(m+7,y);ctx.lineTo(x1,y);ctx.stroke();ctx.globalAlpha=.42;ctx.fillText(cue.labels[i-1],m,y+3)}ctx.globalAlpha=1}
  if(sel>=0&&groups[sel]){const count=groups[sel].idx.length;ctx.fillStyle=css.muted;ctx.textAlign='center';ctx.font='400 11px ui-monospace, monospace';ctx.fillText(`${count} ${operation==='slice'?'slice ':dimension===4?'source ':''}${count===1?'vertex':'vertices'}`,PX(groups[sel].x),sY+22)}
  return{cue,radii:groups.map(g=>1.15*Math.sqrt(g.idx.length))};
 }
function planeFill(){const back=planePoint(0,-lay.planeRadius),front=planePoint(0,lay.planeRadius),gradient=ctx.createLinearGradient(...back,...front);gradient.addColorStop(0,css.shadowBack);gradient.addColorStop(1,css.shadow);return gradient}
function paintSilhouette(points){if(points.length<3)return;path(ctx,points.map(p=>planePoint(p[0],p[2])),true);ctx.globalAlpha=1;ctx.fillStyle=css.bg;ctx.fill();ctx.fillStyle=planeFill();ctx.fill()}
function drawThreeBody(C){drawMesh3({c:ctx,w:W,h:H,R,ox:lay.ox,oy:lay.oy3},{verts:C.P,edges:S.E,facets:S.F})}
function drawLowerSlice(sourceData){
 const C=sectionProjection(),q=C.section,{P,groups}=C,f=compactFrames.source;
 ctx.clearRect(0,0,W,H);if(sel>=groups.length)sel=-1;
 // A bounded drawing window in the infinite cutter. It never clips the geometry.
 ctx.save();ctx.beginPath();ctx.rect(lay.LW,lay.top3-4,W-lay.LW-44,2*R+8);ctx.clip();
 const lift=cutterFrame(cutPosition),project=p=>lift.project(p,f);
 ctx.setLineDash([3,5]);ctx.strokeStyle=css.muted;ctx.globalAlpha=.26;ctx.lineWidth=.8;
 if(dimension===2){const a=project([-1.12]),b=project([1.12]);path(ctx,[a,b]);ctx.stroke()}
 else{const window=[[-3,-.55],[3,-.55],[3,1.1],[-3,1.1]];path(ctx,window.map(project),true);ctx.fillStyle=css.solid;ctx.globalAlpha=.025;ctx.fill()}
 ctx.restore();
 if(dimension===3)drawThreeBody(sourceData);else{const xy=p=>[PX(p[0]),lay.oy3-R*p[1]];path(ctx,hull2(sourceData.P.map(xy)),true);ctx.fillStyle=css.shadow;ctx.fill();graph(ctx,sourceData.P,S.E,xy,css.solid,.16,1)}
 if(q.verts.length){
  const sourcePoints=q.verts.map(project);ctx.fillStyle=css.solid;ctx.globalAlpha=.1;if(q.verts.length>2){path(ctx,sourcePoints,true);ctx.fill()}ctx.globalAlpha=1;
  ctx.setLineDash([3,4]);graph(ctx,q.verts,q.edges,project,dimension===2?css.lineColor:css.m2,dimension===2?1:.7,dimension===2?1.8:1.1);ctx.setLineDash([]);
  if(q.verts.length===1){ctx.beginPath();ctx.arc(...sourcePoints[0],2,0,Math.PI*2);ctx.fillStyle=css.m2;ctx.fill()}
  const target=p=>dimension===3?planePoint(p[0],p[1]):[PX(p[0]),lay.strip];
  ctx.strokeStyle=css.solid;ctx.globalAlpha=.22;ctx.lineWidth=.85;ctx.setLineDash([3,4]);q.verts.forEach(p=>{ctx.beginPath();ctx.moveTo(...project(p));ctx.lineTo(...target(p));ctx.stroke()});
  if(dimension===3){const unique=hull2(q.verts),zFront=x=>{let z=-Infinity;for(let i=0;i<unique.length;i++){const a=unique[i],b=unique[(i+1)%unique.length];if(x>=Math.min(a[0],b[0])-EPS&&x<=Math.max(a[0],b[0])+EPS){const t=Math.abs(b[0]-a[0])<EPS?0:(x-a[0])/(b[0]-a[0]);z=Math.max(z,a[1]+t*(b[1]-a[1]),Math.abs(b[0]-a[0])<EPS?b[1]:-Infinity)}}return Number.isFinite(z)?z:q.verts[0][1]};
   groups.forEach(g=>{ctx.beginPath();ctx.moveTo(...planePoint(g.x,zFront(g.x)));ctx.lineTo(PX(g.x),lay.strip);ctx.stroke()});ctx.setLineDash([]);ctx.globalAlpha=1;
   if(q.verts.length>=3){path(ctx,q.verts.map(target),true);ctx.fillStyle=css.bg;ctx.fill();ctx.fillStyle=planeFill();ctx.fill()}else if(q.verts.length===2)graph(ctx,q.verts,[[0,1]],target,css.shadow,1,3);else{ctx.beginPath();ctx.arc(...target(q.verts[0]),2,0,Math.PI*2);ctx.fillStyle=css.shadow;ctx.fill()}
   lblock(lay.planeY,'2D',[]);
  }
  ctx.setLineDash([]);ctx.globalAlpha=1;drawLine(C);lblock(lay.strip,'1D',dimension===2?['slice']:[]);
 }
 lblock(lay.oy3,dimension+'D',[]);$('viewDivider').style.height=(lay.oy3+R)+'px';$('viewDivider').style.top='0px';
 cv.setAttribute('aria-label',`${pretty(S.name)}, ${dimension}D source and its exact ${q.name||'empty'} ${dimension-1}D slice${dimension===3?', followed by its line shadow':''}. The cutter extends beyond its display window. Dot multiplicities: ${C.live.join(', ')}.`);
 $('cutPosition').setAttribute('aria-valuetext',`${cutPosition.toFixed(2)} along the cut direction; ${q.name||'no intersection'}.`);syncCutThumb();return C;
}
function drawFlat(C){const {P,groups,gOf}=C,xy=p=>[PX(p[0]),lay.oy3-R*p[1]];
 ctx.setLineDash([2,4]);ctx.strokeStyle=css.muted;ctx.lineWidth=.8;groups.forEach((g,gi)=>{const low=Math.min(...g.idx.map(i=>P[i][1]));ctx.globalAlpha=sel>=0?(sel===gi?.6:.07):.2;ctx.beginPath();ctx.moveTo(PX(g.x),lay.oy3-R*low);ctx.lineTo(PX(g.x),lay.strip);ctx.stroke()});ctx.setLineDash([]);ctx.globalAlpha=1;
 path(ctx,hull2(P.map(xy)),true);ctx.fillStyle=css.bg;ctx.fill();ctx.fillStyle=css.shadow;ctx.fill();graph(ctx,P,S.E,xy,css.solid,.16,1);drawLine(C);lblock(lay.oy3,'2D',[]);lblock(lay.strip,'1D',[]);ctx.fillStyle=css.muted;ctx.textAlign='left';ctx.font='400 11px ui-monospace, monospace';
}
function sectionProjection(){
 const section=operation==='slice'?sliceData():wholeProjection(),P=section.verts.map(p=>dimension===4?[...p,0]:dimension===3?[p[0],0,p[1],0]:[p[0],0,0,0]),groups=projectionGroups(P,[0]),gOf=[];groups.forEach((g,gi)=>{g.x=g.idx.reduce((v,i)=>v+P[i][0],0)/g.idx.length;g.idx.forEach(i=>gOf[i]=gi)});
 const gaps=groups.slice(1).map((g,i)=>g.x-groups[i].x),even=gaps.length<2||gaps.every(g=>Math.abs(g-gaps[0])<EPS);return{section,P,n:P.length,groups,gOf,gaps,even,exact:true,live:groups.map(g=>g.idx.length)};
}
function drawSectionShadows(){
 const C=sectionProjection(),{P,groups,section:q}=C;resize();ctx.clearRect(0,0,W,H);
 const source={c:ctx,w:W,h:H,R,ox:lay.ox,oy:lay.sourceY},result={c:ctx,w:W,h:H,R,ox:lay.ox,oy:lay.oy3};compactFrames={source,result,planeY:lay.planeY,H,bound4:lay.sourceBound,planeScale:lay.planeScale,planeDepth:lay.planeDepth,gaps:lay.gaps};
 const divider=$('viewDivider');divider.style.height=(lay.sourceY+lay.sourceBound*R)+'px';divider.style.top='0px';
 if(sel>=groups.length)sel=-1;
 // Correspondence links an actual section vertex or the same original source vertex.
 ctx.strokeStyle=css.solid;ctx.lineWidth=.85;ctx.setLineDash([3,4]);ctx.globalAlpha=.23;
 if(P.length){const xs=P.map(p=>p[0]),lo=Math.min(...xs),hi=Math.max(...xs);q.verts.forEach((p,i)=>{if(Math.abs(p[0]-lo)>EPS&&Math.abs(p[0]-hi)>EPS)return;const a=operation==='slice'?cutterFrame(cutPosition).project(p,source):projectContext(q.source.baseVerts[i],source),b=projectResult(p,result);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke()})}ctx.setLineDash([]);ctx.globalAlpha=1;
 if(operation==='slice')drawSliceSource(source,q);else drawSource(source,q.source.baseVerts,q.source.edges);
 if(P.length){
  const unique=[];for(const p of P){const a=[p[0],p[2]];if(!unique.some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<EPS))unique.push(a)}const hull=unique.length===1?unique:hull2(unique),project=p=>planePoint(p[0],p[1]);
  ctx.setLineDash([3,4]);ctx.strokeStyle=css.solid;ctx.globalAlpha=.19;ctx.lineWidth=.85;
  for(const p of P){const a=projectResult(p,result);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...planePoint(p[0],p[2]));ctx.stroke()}
  ctx.globalAlpha=.3;
  for(const g of groups){let front=-Infinity;for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];if(g.x>=Math.min(a[0],b[0])-EPS&&g.x<=Math.max(a[0],b[0])+EPS){const t=Math.abs(b[0]-a[0])<EPS?0:(g.x-a[0])/(b[0]-a[0]);front=Math.max(front,a[1]+t*(b[1]-a[1]),Math.abs(b[0]-a[0])<EPS?b[1]:-Infinity)}}if(!Number.isFinite(front))front=0;ctx.beginPath();ctx.moveTo(...planePoint(g.x,front));ctx.lineTo(PX(g.x),lay.strip);ctx.stroke()}
  ctx.setLineDash([]);ctx.globalAlpha=1;ctx.fillStyle=css.shadow;ctx.strokeStyle=css.muted;ctx.lineWidth=2;
  if(hull.length>=3){path(ctx,hull.map(project),true);ctx.fillStyle=css.bg;ctx.fill();ctx.fillStyle=planeFill();ctx.fill()}else if(hull.length===2){path(ctx,hull.map(project));ctx.stroke()}else{ctx.beginPath();ctx.arc(...planePoint(P[0][0],P[0][2]),2,0,Math.PI*2);ctx.fill()}
  if(operation==='slice')drawSliceResult(result,q);else drawProjectedResult(result,q);drawLine(C);
  lblock(lay.oy3,'3D',[operation==='collapse'?'shadow':q.rank===3?'slice':'section']);lblock(lay.planeY,'2D',[]);lblock(lay.strip,'1D',[]);
 }
 lblock(lay.sourceY,'4D',['projected']);
 cv.setAttribute('aria-label',operation==='slice'?`Projected ${pretty(S.name)} and its actual ${q.name||'empty'} slice, followed by shadows of that slice. The faint box outlines a finite window of the infinite 3D cutting space. Dot area represents coincident slice vertices: ${C.live.join(', ')}.`:`Projected ${pretty(S.name)}, its whole-object 3D shadow, then 2D and 1D shadows. Dot area represents original source vertices at each line position: ${C.live.join(', ')}.`);
 $('cutPosition').setAttribute('aria-valuetext',`${cutPosition.toFixed(2)} along the fourth spatial direction; ${q.name||'no intersection'}.`);if(operation==='slice')syncCutThumb();return C;
}

function draw(){
  const C=compute();if(S.dim===4)return drawSectionShadows();resize();if(operation==='slice')return drawLowerSlice(C);
  const {P,n,groups,gOf,exact,even,gaps}=C,big=n>100,huge=n>300;
  const q=x=>Math.round(x*1e5),groups3=projectionGroups(P,[0,1,2]),groups2=projectionGroups(P,[0,2]),map2=new Map();
  groups2.forEach((g,i)=>{const p=P[g.idx[0]];map2.set(q(p[0])+','+q(p[2]),{x:p[0],z:p[2],c:g.idx.length,g:gOf[g.idx[0]]})});
  const n3=groups3.length,n2=groups2.length,n1=groups.length;
  cv.setAttribute('aria-label',`${FULL[S.name]||S.name}. ${S.dim===4?'4D source diagram, then its 3D shadow':S.dim===3?'3D source':'2D source'}, then ${S.dim>2?'a 2D shadow and ':''}a line. ${n3} positions in 3D, ${n2} in 2D, ${n1} on the line. Dot area represents coincident vertices: ${groups.map(g=>g.idx.length).join(', ')} from left to right.`);
  const gcol=i=>col(groups[gOf[i]].idx.length),off=i=>sel>=0&&gOf[i]!==sel;
  ctx.clearRect(0,0,W,H);
  if(S.dim===2){drawFlat(C);return C;}

  // ---- plane + shadow ----
  const pl=plane2([...map2.values()].map(e=>[e.x,0,e.z,0]),[[0,1,0,0],[0,0,0,1]]);
  const hullKeys=new Set();let silhouette=[];
  if(pl&&pl.hull.length>2){const H2=pl.hull.map(h=>{const v=[0,0,0,0];for(let k=0;k<4;k++)v[k]=pl.b1[k]*h[0]+pl.b2[k]*h[1];return v});
    silhouette=H2;H2.forEach(v=>hullKeys.add(q(v[0])+','+q(v[2])));
    paintSilhouette(H2)}
  // 2D -> 1D: one straight drop per line point, from the far end of its column
  ctx.setLineDash([2,3]);
  groups.forEach((g,gi)=>{let zfront=-Infinity;for(let j=0;j<silhouette.length;j++){const a=silhouette[j],b=silhouette[(j+1)%silhouette.length];if(g.x>=Math.min(a[0],b[0])-EPS&&g.x<=Math.max(a[0],b[0])+EPS){const t=Math.abs(b[0]-a[0])<EPS?0:(g.x-a[0])/(b[0]-a[0]);zfront=Math.max(zfront,a[2]+t*(b[2]-a[2]),Math.abs(b[0]-a[0])<EPS?b[2]:-Infinity)}}if(!Number.isFinite(zfront))zfront=Math.max(...g.idx.map(i=>P[i][2]));const hi=sel===gi;
    ctx.strokeStyle=hi?css.ink:css.muted;ctx.globalAlpha=sel>=0?(hi?.85:.07):huge?.12:.3;ctx.beginPath();ctx.moveTo(...planePoint(g.x,zfront));ctx.lineTo(PX(g.x),lay.strip);ctx.stroke()});
  ctx.setLineDash([]);ctx.globalAlpha=1;
  // ---- 3D: drops, glass body, edges, corners ----
  ctx.setLineDash([3,4]);
  for(let i=0;i<n;i++){const p=P[i];if(off(i)&&big)continue;ctx.strokeStyle=css.solid;ctx.globalAlpha=(sel>=0)&&!off(i)?.6:huge?.04:big?.07:.19;
    const X=PX(p[0]);ctx.beginPath();ctx.moveTo(X,PY(p[1],p[2]));ctx.lineTo(...planePoint(p[0],p[2]));ctx.stroke()}
  ctx.setLineDash([]);ctx.globalAlpha=1;
  paintSilhouette(silhouette);
  drawThreeBody(C);
  drawLine(C);

  const sY=lay.strip;
  // Each projection is labeled once; data stays alongside the line.
  lblock(lay.oy3,'3D',[]);
  lblock(lay.planeY,'2D',[]);
  lblock(sY,'1D',[]);
  ctx.fillStyle=css.muted;ctx.font='400 11px ui-monospace, monospace';ctx.textAlign='left';


}


 bindRotation(hit);bindRotation(sourceHit);
 listen(cv,'click',e=>{stopAuto();const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(Math.abs(y-lay.strip)<32){let best=-1,dist=22;(dimension===4||operation==='slice'?sectionProjection():compute()).groups.forEach((g,i)=>{const d=Math.abs(PX(g.x)-x);if(d<dist){dist=d;best=i}});sel=best===sel?-1:best}else sel=-1;draw()});
 return{draw,planePoint,frames:()=>compactFrames,setShape:chooseShape,turn:rotateShared,reset:()=>{resetOrientation();syncUi();draw()},clearSelection:()=>{sel=-1},inspect:()=>({...compute(),S,M:rotation,lay,R,sel,resultChain:dimension===4||operation==='slice'?sectionProjection():null,sectionChain:operation==='slice'?sectionProjection():null})};
}
function draw(){if(destroyed)return;readCss();clampCut();const result=shadow.draw();notify();return result}
function redraw(){if(destroyed||queued)return;queued=true;redrawFrame=requestAnimationFrame(()=>{redrawFrame=null;queued=false;if(!destroyed)draw()})}
function cutControlGeometry(){const f=$('shadowCanvas').getBoundingClientRect(),d=$('viewDivider').getBoundingClientRect(),m=shadow.frames().source;return{centerY:f.top+m.oy,scale:m.R*(dimension===2?1:Math.cos(CAMERA_E)*(dimension===4?CONTEXT_W:1)),dividerTop:d.top,centerX:d.left+d.width/2}}
function syncCutThumb(){const g=cutControlGeometry(),limits=clampCut(),top=g.centerY-g.dividerTop-g.scale*limits.max,height=g.scale*(limits.max-limits.min);for(const el of[$('dividerRule'),$('cutPosition')]){el.style.top=top+'px';el.style.height=height+'px'}$('cutPosition').min=limits.min;$('cutPosition').max=limits.max;$('cutPosition').value=cutPosition;$('cutThumb').style.top=(g.centerY-g.dividerTop-g.scale*cutPosition)+'px'}
function cutFromY(y){const g=cutControlGeometry(),limits=cutLimits(),value=Math.max(limits.min,Math.min(limits.max,(g.centerY-y)/g.scale)),nearest=selectedModel().criticalLevels.reduce((best,s)=>Math.abs(s-value)<Math.abs(best-value)?s:best,Infinity);return Math.abs(nearest-value)*g.scale<=3?nearest:value}
const input=$('cutPosition');
listen(input,'pointerdown',e=>{stopAuto();if(operation!=='slice'||e.isPrimary===false||e.button>0||cutPointer!==null)return;const g=cutControlGeometry(),y=g.centerY-g.scale*cutPosition,grab=Math.abs(e.clientX-g.centerX)<=10&&Math.abs(e.clientY-y)<=10;cutGrabOffset=grab?e.clientY-y:0;cutPointer=e.pointerId;input.focus({preventScroll:true});input.setPointerCapture(e.pointerId);e.preventDefault();if(!grab)setCutPosition(cutFromY(e.clientY))});
listen(input,'pointermove',e=>{if(cutPointer!==e.pointerId)return;e.preventDefault();setCutPosition(cutFromY(e.clientY-cutGrabOffset))});
['pointerup','pointercancel','lostpointercapture'].forEach(t=>listen(input,t,e=>{if(cutPointer===e.pointerId){cutPointer=null;cutGrabOffset=0}}));
listen(input,'input',e=>setCutPosition(Number(e.target.value)));
listen(input,'keydown',e=>{const steps={ArrowUp:.01,ArrowRight:.01,ArrowDown:-.01,ArrowLeft:-.01,PageUp:.1,PageDown:-.1};if(e.key==='Home'||e.key==='End'||e.key in steps){e.preventDefault();const limits=cutLimits(),target=e.key==='Home'?limits.min:e.key==='End'?limits.max:Math.max(limits.min,Math.min(limits.max,cutPosition+steps[e.key])),dir=Math.sign(target-cutPosition),crossed=selectedModel().criticalLevels.filter(s=>dir*(s-cutPosition)>1e-10&&dir*(target-s)>=0).sort((a,b)=>dir*(a-b));setCutPosition((e.key==='Home'||e.key==='End')?target:crossed[0]??target)}});


 const observer=new win.ResizeObserver(()=>redraw());observer.observe(stage);
 const shape=resolveShape(options.shape);dimension=shape.dimension;sourceNames[dimension]=shape.key;
 if(options.operation!==undefined){if(!['slice','collapse'].includes(options.operation))throw new Error('Choose Slice or Collapse.');operation=options.operation}
 setColors({...defaultColors,...options.colors});readCss();resetOrientation();const shadow=createShadowExplorer();
 if(options.gaps)for(const[n,gap]of Object.entries(options.gaps))setViewOptions({stage:Number(n),gap});
 if(options.tilt!==undefined)setViewOptions({tilt:options.tilt});
 if(options.cut!==undefined){if(!Number.isFinite(options.cut))throw new Error('Cut must be finite.');cutPosition=options.cut}
 if(options.pose!==undefined){if(!Number.isInteger(options.pose)||!poseList[options.pose])throw new Error('Choose a listed pose.');poseIndex=options.pose;orientationIndices[dimension]=poseIndex;rotation=poseList[poseIndex].matrix.slice()}
 syncUi();draw();ready=true;
 for(const event of['pointerdown','keydown','focusin','wheel'])listen(stage,event,stopAuto,{capture:true,passive:event==='wheel'});
 listen(document,'visibilitychange',()=>{if(document.hidden)stopAuto()});
 if(motionPreference.addEventListener)listen(motionPreference,'change',e=>{reduce=e.matches;if(reduce)stopAuto();notify()});
 if(options.pose===undefined)openSelection();else startAuto();notify();
 function validate(next){
  const model=resolveShape(next.shape??options.shape??'cube');
  if(next.operation!==undefined&&!['slice','collapse'].includes(next.operation))throw new Error('Choose Slice or Collapse.');
  if(next.cut!==undefined&&!Number.isFinite(next.cut))throw new Error('Cut must be finite.');
  if(next.tilt!==undefined&&(!Number.isFinite(next.tilt)||next.tilt<5||next.tilt>90))throw new Error('Tilt must be 5–90 degrees.');
  if(next.gaps)for(const[n,g]of Object.entries(next.gaps))if(![2,3,4].includes(+n)||!Number.isFinite(g)||g< -256||g>64)throw new Error('Dimension gaps must be −256–64 pixels.');
  if(next.colors)for(const[k,v]of Object.entries(next.colors))if(!(k in defaultColors)||typeof v!=='string'||!v.trim())throw new Error('Use supported color names and CSS color strings.');
  if(next.pose!==undefined){const poses=CuratedRotations.presetsFor(sliceModel(model.key,model.dimension));if(!Number.isInteger(next.pose)||!poses[next.pose])throw new Error('Choose a listed pose.');}
 }
 function assertAlive(){if(destroyed)throw new Error('This Dimension instance was destroyed.')}
 const api={
  getState:()=>state(),
  setOptions(next={}){assertAlive();validate({...next,shape:next.shape??sourceNames[dimension]});const changedShape=next.shape!==undefined&&resolveShape(next.shape).key!==sourceNames[dimension];
   const resume=next.autoRotate===true&&!autoEnabled;if(next.autoRotate!==undefined){autoEnabled=!!next.autoRotate;if(!autoEnabled)stopAuto()}
   if(changedShape)chooseShape(resolveShape(next.shape).key);
   if(next.operation!==undefined&&next.operation!==operation)chooseOperation(next.operation);
   if(next.colors!==undefined){const values={...defaultColors,...next.colors};if(Object.keys(values).some(k=>values[k]!==colors[k])){setColors(values);draw()}}
   if(next.gaps)for(const[n,gap]of Object.entries(next.gaps))if(layerGaps[n]!==gap)setViewOptions({stage:Number(n),gap});
   if(next.tilt!==undefined&&Math.abs(next.tilt-planeTilt*180/Math.PI)>1e-10)setViewOptions({tilt:next.tilt});
   if(next.cut!==undefined&&next.cut!==cutPosition)setCutPosition(next.cut);
   if(next.pose!==undefined&&next.pose!==poseIndex)selectPose(next.pose);
   if(resume)startAuto();return state();
  },
  setShape(value){assertAlive();chooseShape(resolveShape(value).key)},setOperation(value){assertAlive();chooseOperation(value)},setCut(value){assertAlive();return setCutPosition(value)},
  selectPose(index){assertAlive();if(!Number.isInteger(index)||!poseList[index])throw new Error('Choose a listed pose.');selectPose(index)},nextPose(){assertAlive();rotateSlice()},
  rotate(dx,dy){assertAlive();if(!Number.isFinite(dx)||!Number.isFinite(dy))throw new Error('Rotation deltas must be finite.');rotateShared(dx,dy)},
  setView(value){assertAlive();setViewOptions(value)},setPalette(value){assertAlive();choosePalette(value)},play(){assertAlive();autoEnabled=true;startAuto()},pause(){assertAlive();stopAuto()},stop(){assertAlive();stopAuto()},
  subscribe(fn){assertAlive();if(typeof fn!=='function')throw new Error('Pass a listener.');subscribers.add(fn);fn(state());return()=>subscribers.delete(fn)},
  readProjection(){assertAlive();const q=shadow.inspect(),p=q.resultChain||q;return{shape:state().shape,dimension,operation,vertices:p.n,positions:p.groups.length,multiplicities:p.live||p.groups.map(g=>g.idx.length)}},
  destroy(){if(destroyed)return;destroyed=true;stopAuto();changeAnimation?.cancel();if(redrawFrame!==null)cancelAnimationFrame(redrawFrame);observer.disconnect();for(const off of cleanup)off();for(const el of Object.values(parts)){if(el.hasPointerCapture?.(cutPointer))el.releasePointerCapture(cutPointer)}subscribers.clear();stage.remove()}
 };
 return api;
}
