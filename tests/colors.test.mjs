import test from 'node:test';import assert from 'node:assert/strict';
import {deriveColors,contrast} from '../dist/dimension/colors.mjs';
test('seed palettes remain legible on dark, light and intermediate bases',()=>{
 for(const base of['#11191c','#f5f6f4','#808080','#999999','#222','#fff'])for(const accent of['#38b9a3','#426daf','#c49775']){const c=deriveColors({base,accent});assert(contrast(c.ink,c.bg)>=4.5);assert(contrast(c.muted,c.bg)>=4.45);assert(contrast(c.lineColor,c.bg)>=3.15);assert.equal(c.bg,deriveColors({base,accent}).bg)}
});
test('theme and legacy material overrides preserve the portable contract',()=>{
 assert.notEqual(deriveColors({},'light').bg,deriveColors({},'dark').bg);assert.equal(deriveColors({bg:'white',source:'rebeccapurple'}).bg,'white');assert.equal(deriveColors({source:'rebeccapurple'}).source,'rebeccapurple');assert.throws(()=>deriveColors({base:'white'}));assert.throws(()=>deriveColors({},'other'));
});
