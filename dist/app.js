import {createDimension,shapes,colorPresets,shapeIconSvg} from './dimension/dimension.mjs';
const $=id=>document.getElementById(id);
const stage=createDimension($('dimensionHost'));
const stories={2:['A shape leaves a simpler trace.','A line can hide the difference between two very different shapes.'],3:['How much can a shadow reveal?','A solid becomes a silhouette, then a line. Each step preserves something and loses something.'],4:['One more direction, many possible shapes.','A 4D object can cast a 3D shadow. A slice reveals only what meets the cutting space.']};
// This page is a replaceable host. The renderer does not know about these controls.
let shownDimension=null;const selectedByDimension={2:'square',3:'cube',4:'tesseract'};
function shapeButtons(dimension){if(shownDimension===dimension)return false;shownDimension=dimension;$('shapeIcons').replaceChildren();for(const shape of shapes.filter(s=>s.dimension===dimension)){const b=document.createElement('button');b.type='button';b.className='icon-button';b.dataset.shape=shape.id;b.setAttribute('aria-label',shape.name);b.title=shape.name;b.innerHTML=shapeIconSvg(shape.id);b.onclick=()=>{if(stage.getState().requestedDemo!==shape.id)stage.setShape(shape.id)};$('shapeIcons').appendChild(b)}return true}
for(const b of $('dimensionOptions').children)b.onclick=()=>{const n=+b.dataset.dimension;if(shapes.find(s=>s.id===stage.getState().requestedDemo).dimension!==n)stage.setShape(selectedByDimension[n])};
for(const[id,p]of Object.entries(colorPresets)){const b=document.createElement('button');b.type='button';b.textContent=p.label;b.dataset.palette=id;b.onclick=()=>stage.setPalette(id);$('colorPresets').appendChild(b)}
let lastShape=null;
const off=stage.subscribe(state=>{
 const requested=shapes.find(s=>s.id===state.requestedDemo)||shapes.find(s=>s.id===state.shape);const changedGroup=shapeButtons(requested.dimension);selectedByDimension[requested.dimension]=requested.id;for(const b of $('dimensionOptions').children)b.setAttribute('aria-pressed',+b.dataset.dimension===requested.dimension);
 $('shapeTitle').textContent=state.name;
 $('operationSlice').setAttribute('aria-pressed',state.operation==='slice');$('operationCollapse').setAttribute('aria-pressed',state.operation==='collapse');
 for(const b of $('shapeIcons').children){const selected=b.dataset.shape===requested.id;b.setAttribute('aria-pressed',selected);if(changedGroup&&selected)$('shapeIcons').scrollLeft=Math.max(0,b.offsetLeft-($('shapeIcons').clientWidth-b.offsetWidth)/2)}
 if(lastShape!==state.shape){lastShape=state.shape;$('poseButtons').replaceChildren();state.poses.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='pose-button';b.onclick=()=>stage.selectPose(i);$('poseButtons').appendChild(b)})}
 for(const[i,b]of [...$('poseButtons').children].entries()){const active=i===state.poseIndex&&(!state.freeOrientation||state.transitioning);b.disabled=state.swapping;b.textContent=state.poses[i].label;b.setAttribute('aria-pressed',active);b.style.setProperty('--progress',i===state.poseIndex&&state.playing?state.progress:0)}
 for(const b of $('colorPresets').children)b.setAttribute('aria-pressed',b.dataset.palette===state.palette);
 const moving=state.playing||state.transitioning;$('playPause').setAttribute('aria-label',moving?'Pause rotation':'Play rotation');$('playPause').title=state.reducedMotion?'Automatic rotation is disabled by your reduced-motion preference':moving?'Pause rotation':'Play rotation';$('playPause').disabled=state.reducedMotion;$('playPause').innerHTML=moving?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z"/></svg>';
 $('storyTitle').textContent=stories[state.dimension][0];$('sceneThought').textContent=stories[state.dimension][1];
 for(const[k,v]of Object.entries(state.colors))document.documentElement.style.setProperty('--'+k,v);
});
$('playPause').onclick=()=>{const s=stage.getState();if(s.playing||s.transitioning)stage.pause();else stage.play()};
$('operationSlice').onclick=()=>stage.setOperation('slice');$('operationCollapse').onclick=()=>stage.setOperation('collapse');
// Page controls also count as deliberate interaction, without affecting another embedded stage.
for(const event of ['pointerdown','keydown','focusin','wheel'])$('shadowLesson').addEventListener(event,e=>{if(!e.target.closest?.('#playPause'))stage.stop()},{capture:true,passive:event==='wheel'});
if(document.modelContext?.registerTool){const life=new AbortController(),reg=t=>{try{Promise.resolve(document.modelContext.registerTool(t,{signal:life.signal})).catch(()=>{})}catch{}};
 reg({name:'set_operation',description:'Choose an exact slice or collapse the whole shape by dropping a coordinate.',inputSchema:{type:'object',properties:{operation:{type:'string',enum:['slice','collapse']}},required:['operation'],additionalProperties:false},execute:i=>{stage.setOperation(i.operation);return stage.readProjection()}});
 reg({name:'set_shape',description:'Choose a shape.',inputSchema:{type:'object',properties:{shape:{type:'string',enum:shapes.map(s=>s.id)}},required:['shape'],additionalProperties:false},execute:i=>{stage.setShape(i.shape);const state=stage.getState();return{...stage.readProjection(),requestedDemo:state.requestedDemo,swapping:state.swapping}}});
 reg({name:'set_section_position',description:'Move the cutter through the selected shape.',inputSchema:{type:'object',properties:{position:{type:'number'}},required:['position'],additionalProperties:false},execute:i=>{if(stage.getState().operation!=='slice')throw new Error('Choose Slice to move the cut.');stage.setCut(i.position);return stage.readProjection()}});
 reg({name:'read_projection',description:'Read source vertex multiplicities in the projection chain.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>stage.readProjection()});
 window.addEventListener('pagehide',e=>{if(!e.persisted)life.abort()});
}
window.addEventListener('pagehide',e=>{if(e.persisted)stage.stop();else{off();stage.destroy()}});
