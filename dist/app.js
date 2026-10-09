import {createDimension,shapes,colorPresets,shapeIconSvg} from './dimension/dimension.mjs';
const $=id=>document.getElementById(id);
const stage=createDimension($('dimensionHost'));
// This page is a replaceable host. The renderer does not know about these controls.
for(const shape of shapes){const b=document.createElement('button');b.type='button';b.className='icon-button';b.dataset.shape=shape.id;b.setAttribute('aria-label',`${shape.name}, ${shape.dimension}D shape`);b.title=`${shape.name} · ${shape.dimension}D`;b.innerHTML=shapeIconSvg(shape.id)+`<small aria-hidden="true">${shape.dimension}D</small>`;b.onclick=()=>stage.getState().shape===shape.id?stage.nextPose():stage.setShape(shape.id);$('shapeIcons').appendChild(b)}
for(const[id,p]of Object.entries(colorPresets)){const b=document.createElement('button');b.type='button';b.textContent=p.label;b.dataset.palette=id;b.onclick=()=>stage.setPalette(id);$('colorPresets').appendChild(b)}
let lastShape=null;
const off=stage.subscribe(state=>{
 $('shadowTitle').textContent=state.name;
 $('operationSlice').setAttribute('aria-pressed',state.operation==='slice');$('operationCollapse').setAttribute('aria-pressed',state.operation==='collapse');
 for(const b of $('shapeIcons').children)b.setAttribute('aria-pressed',b.dataset.shape===state.shape);
 if(lastShape!==state.shape){lastShape=state.shape;$('poseButtons').replaceChildren();state.poses.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='pose-button';b.onclick=()=>stage.selectPose(i);$('poseButtons').appendChild(b)})}
 for(const[i,b]of [...$('poseButtons').children].entries()){const active=i===state.poseIndex&&(!state.freeOrientation||state.transitioning);b.textContent=state.poses[i].label;b.setAttribute('aria-pressed',active);b.style.setProperty('--progress',i===state.poseIndex&&state.playing?state.progress:0)}
 for(const n of[2,3,4]){$('gapRange'+n).value=state.gaps[n];$('gapValue'+n).textContent=state.gaps[n]+' px';$('gapControl'+n).hidden=state.dimension<n}
 $('tiltRange').value=state.tilt;$('tiltValue').textContent=Math.round(state.tilt)+'°';$('tiltControl').hidden=state.dimension===2;
 for(const b of $('colorPresets').children)b.setAttribute('aria-pressed',b.dataset.palette===state.palette);
 for(const[k,v]of Object.entries(state.colors))document.documentElement.style.setProperty('--'+k,v);
});
for(const n of[2,3,4])$('gapRange'+n).oninput=e=>stage.setView({gap:Number(e.target.value),stage:n});$('tiltRange').oninput=e=>stage.setView({tilt:Number(e.target.value)});
$('operationSlice').onclick=()=>stage.setOperation('slice');$('operationCollapse').onclick=()=>stage.setOperation('collapse');
// Page controls also count as deliberate interaction, without affecting another embedded stage.
for(const event of ['pointerdown','keydown','focusin','wheel'])$('shadowLesson').addEventListener(event,()=>stage.stop(),{capture:true,passive:event==='wheel'});
if(document.modelContext?.registerTool){const life=new AbortController(),reg=t=>{try{Promise.resolve(document.modelContext.registerTool(t,{signal:life.signal})).catch(()=>{})}catch{}};
 reg({name:'set_operation',description:'Choose an exact slice or collapse the whole shape by dropping a coordinate.',inputSchema:{type:'object',properties:{operation:{type:'string',enum:['slice','collapse']}},required:['operation'],additionalProperties:false},execute:i=>{stage.setOperation(i.operation);return stage.readProjection()}});
 reg({name:'set_shape',description:'Choose a shape.',inputSchema:{type:'object',properties:{shape:{type:'string',enum:shapes.map(s=>s.id)}},required:['shape'],additionalProperties:false},execute:i=>{stage.setShape(i.shape);return stage.readProjection()}});
 reg({name:'set_section_position',description:'Move the cutter through the selected shape.',inputSchema:{type:'object',properties:{position:{type:'number'}},required:['position'],additionalProperties:false},execute:i=>{if(stage.getState().operation!=='slice')throw new Error('Choose Slice to move the cut.');stage.setCut(i.position);return stage.readProjection()}});
 reg({name:'read_projection',description:'Read source vertex multiplicities in the projection chain.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>stage.readProjection()});
 window.addEventListener('pagehide',e=>{if(!e.persisted)life.abort()});
}
window.addEventListener('pagehide',e=>{if(e.persisted)stage.stop();else{off();stage.destroy()}});
