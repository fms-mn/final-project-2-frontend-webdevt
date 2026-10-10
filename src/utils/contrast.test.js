import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const css=readFileSync(new URL('../filme.css',import.meta.url),'utf8');
const luminance=hex=>{const channels=(hex.length===4?hex.slice(1).split('').map(c=>c+c).join(''):hex.slice(1)).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;};
const contrast=(a,b)=>{const values=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (values[0]+.05)/(values[1]+.05);};
test('theme text and primary controls meet AA on their solid surfaces',()=>{
  for(const theme of ['light','dark']) {
    const block=theme==='light'?css.slice(0,css.indexOf(":root[data-theme='dark']")):css.slice(css.indexOf(":root[data-theme='dark']"),css.indexOf('html {'));
    const token=name=>block.match(new RegExp('--'+name+':(#[a-fA-F0-9]{3,6})'))?.[1];
    for(const text of ['text-primary','text-secondary','text-muted','accent-primary']) for(const bg of ['bg-primary','bg-card']) assert.ok(contrast(token(text),token(bg))>=4.5,theme+' '+text+' / '+bg);
    assert.ok(contrast('#ffffff',token('filme-coral-fill'))>=4.5,theme+' white button label');
  }
});
