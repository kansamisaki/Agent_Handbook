import fs from 'node:fs';
import path from 'node:path';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<!doctype html><html><body></body></html>');
globalThis.window=dom.window;globalThis.document=dom.window.document;
const {default:mermaid}=await import('mermaid');
import {fileURLToPath} from 'node:url';
const base=fileURLToPath(new URL('.',import.meta.url));
mermaid.initialize({startOnLoad:false,securityLevel:'strict'});
const dirs=['docs/chapters','docs/guide','docs/project'];let checked=0,fail=[];
for(const dir of dirs){for(const name of fs.readdirSync(path.join(base,dir))){if(!name.endsWith('.md'))continue;const p=path.join(base,dir,name),s=fs.readFileSync(p,'utf8');let i=0;for(const match of s.matchAll(/```mermaid\s*\n([\s\S]*?)```/g)){i++;try{await mermaid.parse(match[1]);checked++}catch(e){fail.push({file:p,index:i,error:e.message})}}}}
console.log(JSON.stringify({checked,fail},null,2));if(fail.length)process.exit(1)
