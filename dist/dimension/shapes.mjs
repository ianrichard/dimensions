export const shapes=Object.freeze([
 {id:'square',name:'Square',dimension:2,key:'Square'}, {id:'triangle',name:'Triangle',dimension:2,key:'Triangle'},
 {id:'cube',name:'Cube',dimension:3,key:'Cube'}, {id:'tetrahedron',name:'Tetrahedron',dimension:3,key:'Tetra'},
 {id:'octahedron',name:'Octahedron',dimension:3,key:'Octa'}, {id:'icosahedron',name:'Icosahedron',dimension:3,key:'Icosa'},
 {id:'dodecahedron',name:'Dodecahedron',dimension:3,key:'Dodeca'}, {id:'tesseract',name:'Tesseract',dimension:4,key:'Tesseract'},
 {id:'5-cell',name:'5-cell',dimension:4,key:'5-cell'}, {id:'16-cell',name:'16-cell',dimension:4,key:'16-cell'}
].map(Object.freeze));
export function resolveShape(value='cube') {const key=String(value).toLowerCase();const shape=shapes.find(s=>[s.id,s.name.toLowerCase(),s.key.toLowerCase()].includes(key));if(!shape)throw new Error('Choose a supported shape.');return shape;}
const iconPaths={Icosa:'m16 2 13 9-5 17H8L3 11Zm0 0L8 28l21-17H3l21 17Zm-13 9 13 9 13-9M8 28l8-8 8 8',Dodeca:'m16 2 11 6 4 12-9 10H10L1 20 5 8Zm0 6 9 7-3 11H10L7 15Zm0-6v6M5 8l2 7M1 20l9 6m12 4v-4m9-6-6-5m2-7-2 7',Square:'M6 6h20v20H6Z',Triangle:'M16 4 29 27H3Z',Cube:'m16 3 12 7v13l-12 7-12-7V10Zm0 0v13M4 10l12 6 12-6M16 16v14',Tetra:'m16 3 13 22H3Zm0 0v18m-13 4 13-4 13 4',Octa:'m16 2 13 14-13 14L3 16Zm0 0v28M3 16l13-5 13 5-13 5Z',Tesseract:'M3 3h26v26H3ZM10 10h12v12H10ZM3 3l7 7m19-7-7 7m7 19-7-7M3 29l7-7','5-cell':'m16 2 14 10-5 16H7L2 12Zm0 0 9 26L2 12l28 0L7 28Zm-14 10 23 16M16 2 7 28','16-cell':'m16 2 14 14-14 14L2 16Zm0 0v28M2 16h28M16 7l9 9-9 9-9-9Zm0 0v18M7 16h18'};
export const shapeIconPaths=Object.freeze(Object.fromEntries(shapes.map(s=>[s.id,iconPaths[s.key]])));
export function shapeIconSvg(shape, {size=32}={}) {const key=resolveShape(shape).id;const n=Number(size);if(!Number.isFinite(n)||n<=0)throw new Error('Icon size must be positive.');return `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${shapeIconPaths[key]}"/></svg>`;}
export const colorPresets={
 teal:{label:'Teal',values:{m2:'#38b9a3',lineColor:'#168675',shadow:'rgba(117,186,174,.82)',shadowBack:'rgba(91,151,143,.82)',glass:'rgba(164,214,202,.085)',solid:'#b5d9d0',source:'#d2e1dc',tick:'#dfebe7'}},
 blue:{label:'Blue',values:{m2:'#7b9fd8',lineColor:'#426daf',shadow:'rgba(143,164,199,.82)',shadowBack:'rgba(104,128,170,.82)',glass:'rgba(176,195,225,.085)',solid:'#bbccdf',source:'#d6dee8',tick:'#e0e6ef'}},
 clay:{label:'Clay',values:{m2:'#c49775',lineColor:'#9e6345',shadow:'rgba(191,159,128,.82)',shadowBack:'rgba(154,119,91,.82)',glass:'rgba(219,195,169,.085)',solid:'#d8c5ae',source:'#e3dacf',tick:'#ede4da'}}
};
export const defaultColors=Object.freeze({bg:'#11191c',panel:'#172226',ink:'#e1ebe8',muted:'#8fa5a3',line:'#2c3b3e',plane:'#293e40',planeEdge:'#587675',...colorPresets.teal.values});
