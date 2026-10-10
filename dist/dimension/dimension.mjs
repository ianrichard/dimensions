import {createStage} from './stage.mjs';
import {deriveColors} from './colors.mjs';
import {sliceModel} from './geometry.mjs';
import {CuratedRotations} from './curated-rotations.mjs';
import {resolveShape,colorPresets} from './shapes.mjs';
export {shapes,colorPresets,shapeIconPaths,shapeIconSvg} from './shapes.mjs';
export {deriveColors} from './colors.mjs';

/** Host-sized stage; dimensional swaps replace its private renderer at zero opacity. */
export function createDimension(host,options={}){
 if(!host?.ownerDocument)throw new Error('Pass a DOM host element.');
 const initialDemo=resolveShape(options.demo??options.shape).id;
 const win=host.ownerDocument.defaultView,shell=host.ownerDocument.createElement('div');shell.className='dimension-root';host.append(shell);
 let settings={...options,shape:initialDemo},current=null,off=null,destroyed=false,frame=null,swap=null,autoAllowed=options.autoRotate!==false;
 delete settings.demo;delete settings.onChange;
 const listeners=new Set(),media=win.matchMedia?.('(prefers-reduced-motion: reduce)')||{matches:false};
 function duration(value=settings.swapDuration??500){if(!Number.isFinite(value)||value<0)throw new Error('swapDuration must be a nonnegative number of milliseconds.');return media.matches?0:value;}
 try{duration()}catch(error){shell.remove();throw error}
 function poses(value=settings.shape){const model=resolveShape(value);return CuratedRotations.presetsFor(sliceModel(model.key,model.dimension));}
 function validate(next,target=next.demo??next.shape??settings.shape){resolveShape(target);if(next.colors||next.theme!==undefined)deriveColors(next.colors||{},next.theme||settings.theme||'auto');if(next.operation!==undefined&&!['slice','collapse'].includes(next.operation))throw new Error('Choose Slice or Collapse.');if(next.cut!==undefined&&!Number.isFinite(next.cut))throw new Error('Cut must be finite.');if(next.tilt!==undefined&&(!Number.isFinite(next.tilt)||next.tilt<5||next.tilt>90))throw new Error('Tilt must be 5–90 degrees.');if(next.gaps)for(const[n,g]of Object.entries(next.gaps))if(![2,3,4].includes(+n)||!Number.isFinite(g)||g< -256||g>64)throw new Error('Dimension gaps must be −256–64 pixels.');if(next.pose!==undefined&&(!Number.isInteger(next.pose)||!poses(target)[next.pose]))throw new Error('Choose a listed pose.');}
 const requested=()=>resolveShape(settings.shape).id;
 const state=()=>({...current.getState(),requestedDemo:requested(),swapping:!!swap});
 function publish(){if(destroyed||!current)return;const s=state();for(const fn of listeners){if(destroyed)break;fn(s)}if(!destroyed)options.onChange?.(s);}
 function mount(){off?.();current?.destroy();current=createStage(shell,settings);off=current.subscribe(publish);}
 function cancelFrame(){if(frame!==null)win.cancelAnimationFrame(frame);frame=null;}
 function tick(now){
  frame=null;if(destroyed||!swap)return;const job=swap,t=job.duration?Math.min(1,(now-job.start)/job.duration):1;
  shell.style.opacity=String(job.phase==='out'?job.opacity*(1-t):t);
  if(t>=1){if(job.phase==='out'){mount();if(destroyed)return;swap={phase:'in',start:now,duration:duration(),opacity:0};shell.style.opacity='0';publish();}else{swap=null;shell.style.opacity='1';shell.style.pointerEvents='';publish();return}}
  if(!destroyed&&swap)frame=win.requestAnimationFrame(tick);
 }
 function change(next){
  const model=resolveShape(next),previous=current.getState();settings.shape=model.id;delete settings.cut;delete settings.pose;
  if(!swap&&model.dimension===previous.dimension){current.setShape(model.id);publish();return;}
  current.stop();
  if(!duration()){cancelFrame();swap=null;mount();shell.style.opacity='1';shell.style.pointerEvents='';publish();return;}
  const opacity=Number(shell.style.opacity||1);cancelFrame();swap={phase:'out',start:win.performance.now(),duration:duration()*opacity,opacity};shell.style.pointerEvents='none';publish();frame=win.requestAnimationFrame(tick);
 }
 function alive(){if(destroyed)throw new Error('This Dimension instance was destroyed.');}
 function stop(){alive();if(swap)settings.autoRotate=false;current.stop();}
 const reduceSwap=()=>{if(media.matches&&swap){cancelFrame();swap=null;mount();shell.style.opacity='1';shell.style.pointerEvents='';publish()}};
 const interactions=['pointerdown','keydown','focusin','wheel'],stopPending=()=>{if(swap){settings.autoRotate=false;current.stop()}};
 for(const event of interactions)shell.addEventListener(event,stopPending,{capture:true,passive:event==='wheel'});
 media.addEventListener?.('change',reduceSwap);
 try{mount()}catch(error){media.removeEventListener?.('change',reduceSwap);shell.remove();throw error}
 const api={
  getState:state,
  setOptions(next={}){alive();validate(next);duration(next.swapDuration??settings.swapDuration??500);const target=next.demo??next.shape;if(target!==undefined)resolveShape(target);const old=settings;if(next.autoRotate!==undefined)autoAllowed=next.autoRotate!==false;settings={...settings,...next};delete settings.demo;delete settings.onChange;
   if(target!==undefined&&resolveShape(target).id!==resolveShape(old.shape).id){settings.autoRotate=autoAllowed;if(!swap&&resolveShape(target).dimension===current.getState().dimension)current.setOptions({autoRotate:settings.autoRotate});change(target);if(next.cut!==undefined)settings.cut=next.cut;if(next.pose!==undefined)settings.pose=next.pose;if(swap?.phase!=='out')current.setOptions(next);}
   else if(swap?.phase!=='out')current.setOptions(next);
   return state();
  },
  setShape(value){alive();settings.autoRotate=autoAllowed;change(value)},
  setOperation(value){alive();validate({operation:value});settings.operation=value;stop();current.setOperation(value)},
  setCut(value){alive();validate({cut:value});settings.cut=value;stop();return current.setCut(value)},
  selectPose(index){alive();validate({pose:index});settings.pose=index;stop();if(swap?.phase!=='out')current.selectPose(index)},nextPose(){alive();if(swap?.phase==='out')api.selectPose(((settings.pose??0)+1)%poses().length);else{stop();current.nextPose()}},
  rotate(dx,dy){alive();stop();current.rotate(dx,dy)},setView(value){alive();stop();current.setView(value);const s=current.getState();settings.gaps=s.gaps;settings.tilt=s.tilt},
  setPalette(value){alive();if(!colorPresets[value])throw new Error('Choose a listed color scheme.');settings.colors={...settings.colors,accent:colorPresets[value].values.m2};stop();current.setPalette(value)},
  play(){alive();autoAllowed=true;settings.autoRotate=true;current.play()},pause:stop,stop,
  subscribe(fn){alive();if(typeof fn!=='function')throw new Error('Pass a listener.');listeners.add(fn);fn(state());return()=>listeners.delete(fn)},
  readProjection(){alive();return current.readProjection()},
  destroy(){if(destroyed)return;destroyed=true;cancelFrame();swap=null;media.removeEventListener?.('change',reduceSwap);for(const event of interactions)shell.removeEventListener(event,stopPending,{capture:true});off?.();current.destroy();listeners.clear();shell.remove()}
 };
 return api;
}
