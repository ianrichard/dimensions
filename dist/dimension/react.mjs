import {createElement,useEffect,useRef} from 'react';
import {createDimension} from './dimension.mjs';
import {resolveShape,shapeIconPaths} from './shapes.mjs';
/** Import dimension.css in your app once. React only owns the host element. */
export function Dimension({shape='cube',colors,operation='collapse',cut,pose,gaps,tilt,autoRotate=true,onChange,className,style,...hostProps}){
 const host=useRef(null),controller=useRef(null),previous=useRef(null),callback=useRef(onChange);callback.current=onChange;
 useEffect(()=>{const instance=createDimension(host.current,{shape,colors,operation,cut,pose,gaps,tilt,autoRotate,onChange:value=>callback.current?.(value)});controller.current=instance;previous.current={shape,colors,operation,cut,pose,gaps,tilt,autoRotate};return()=>{controller.current=null;instance.destroy()}},[]);
 useEffect(()=>{const next={shape,colors,operation,cut,pose,gaps,tilt,autoRotate},last=previous.current||{},patch={};for(const key of Object.keys(next)){const a=next[key],b=last[key],equal=(key==='colors'||key==='gaps')?JSON.stringify(a)===JSON.stringify(b):a===b;if(!equal)patch[key]=key==='colors'&&a===undefined?{}:a;}if(next.shape!==last.shape){if(cut!==undefined)patch.cut=cut;if(pose!==undefined)patch.pose=pose;}previous.current=next;if(Object.keys(patch).length)controller.current?.setOptions(patch)},[shape,colors,operation,cut,pose,gaps,tilt,autoRotate]);
 return createElement('div',{...hostProps,ref:host,className,style});
}
export function ShapeIcon({shape,size=32,title,strokeWidth=1.35,...props}){const id=resolveShape(shape).id;return createElement('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 32 32',width:size,height:size,fill:'none',stroke:'currentColor',strokeWidth,strokeLinecap:'round',strokeLinejoin:'round',role:title?'img':undefined,'aria-label':title,'aria-hidden':title?undefined:true,...props},title?createElement('title',null,title):null,createElement('path',{d:shapeIconPaths[id]}))}
export const SquareIcon=props=>createElement(ShapeIcon,{...props,shape:'square'});
export const TriangleIcon=props=>createElement(ShapeIcon,{...props,shape:'triangle'});
export const CubeIcon=props=>createElement(ShapeIcon,{...props,shape:'cube'});
export const TetrahedronIcon=props=>createElement(ShapeIcon,{...props,shape:'tetrahedron'});
export const OctahedronIcon=props=>createElement(ShapeIcon,{...props,shape:'octahedron'});
export const IcosahedronIcon=props=>createElement(ShapeIcon,{...props,shape:'icosahedron'});
export const DodecahedronIcon=props=>createElement(ShapeIcon,{...props,shape:'dodecahedron'});
export const TesseractIcon=props=>createElement(ShapeIcon,{...props,shape:'tesseract'});
export const FiveCellIcon=props=>createElement(ShapeIcon,{...props,shape:'5-cell'});
export const SixteenCellIcon=props=>createElement(ShapeIcon,{...props,shape:'16-cell'});
