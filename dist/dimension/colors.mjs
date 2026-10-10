import {defaultColors} from './shapes.mjs';

const rgb=value=>{const s=value?.trim();if(!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(s||''))throw new Error('Base and accent must be hex colors.');const h=s.length===4?[...s.slice(1)].map(x=>x+x).join(''):s.slice(1);return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));};
const hex=a=>'#'+a.map(n=>Math.round(n).toString(16).padStart(2,'0')).join('');
const mix=(a,b,t)=>a.map((n,i)=>n+(b[i]-n)*t);
export const luminance=a=>a.map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
export const contrast=(a,b)=>{const x=luminance(rgb(a)),y=luminance(rgb(b));return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
function legible(color,base,ratio){const target=luminance(base)<.179?[255,255,255]:[0,0,0];for(let i=0;i<=100;i++){const v=mix(color,target,i/100);const x=luminance(v),y=luminance(base);if((Math.max(x,y)+.05)/(Math.min(x,y)+.05)>=ratio)return v;}return target;}
/** Seed colors are hex; legacy named material overrides remain supported. */
export function deriveColors(values={},theme='dark'){
 if(!['auto','light','dark'].includes(theme))throw new Error('Theme must be auto, light or dark.');
 for(const[k,v]of Object.entries(values))if(!['base','accent',...Object.keys(defaultColors)].includes(k)||typeof v!=='string'||!v.trim())throw new Error('Use base/accent hex colors or supported material color names.');
 const base=rgb(values.base||(/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(values.bg||'')?values.bg:null)||(theme==='light'?'#f5f6f4':'#11191c')),dark=luminance(base)<.35,opposite=dark?[255,255,255]:[0,0,0],accent=rgb(values.accent||'#38b9a3');
 const ink=legible(mix(accent,opposite,.88),base,7),muted=legible(mix(accent,opposite,.4),base,4.5),solid=legible(mix(accent,opposite,dark?.65:.22),base,4.5),lineColor=legible(accent,base,3.2),shadow=mix(accent,opposite,dark?.32:.15);
 const rgba=(c,a)=>`rgba(${c.map(Math.round).join(',')},${a})`;
 const result={bg:hex(base),panel:hex(mix(base,opposite,.045)),ink:hex(ink),muted:hex(muted),line:hex(mix(base,opposite,.16)),plane:hex(mix(base,accent,.16)),planeEdge:hex(muted),m2:hex(legible(accent,base,3.2)),lineColor:hex(lineColor),shadow:hex(shadow),shadowBack:hex(mix(shadow,base,.12)),glass:rgba(solid,dark?.11:.09),solid:hex(solid),source:hex(legible(mix(accent,opposite,dark?.8:.45),base,4.5)),tick:hex(ink)};
 for(const[k,v]of Object.entries(values))if(k in defaultColors)result[k]=v;
 return result;
}
