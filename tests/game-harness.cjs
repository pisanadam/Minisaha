const fs=require('fs'),vm=require('vm'),assert=require('assert');
const all=[], ids={};
class El{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.style={};this.dataset={};this.children=[];this.events={};this.textContent='';this.value='';this.options=[];const c=new Set();this.classList={add:x=>c.add(x),remove:x=>c.delete(x),toggle:(x,f)=>{f??=!c.has(x);f?c.add(x):c.delete(x)},contains:x=>c.has(x)};}
 addEventListener(k,f){(this.events[k]??=[]).push(f)}
 trigger(k){for(const f of this.events[k]||[])f({target:this,preventDefault(){},pointerId:1})}
 append(...xs){this.children.push(...xs);for(const x of xs){x.parent=this;if(this.tagName==='SELECT')this.options.push(...(x.tagName==='OPTION'?[x]:x.children));}}
 replaceChildren(...x){this.children=[];this.options=[];this.append(...x)}
 setAttribute(k,v){this[k]=v}setPointerCapture(){} getBoundingClientRect(){return {left:0,top:0,width:136,height:136}}
 set innerHTML(t){this.html=t;if(this.tagName==='SELECT'){this.options=[...t.matchAll(/<option value="([^"]+)"[^>]*>(.*?)<\/option>/g)].map(m=>({value:m[1],textContent:m[2]}));this.value=this.options[0]?.value||'';}}
 get innerHTML(){return this.html||''}
}
for(const d of JSON.parse(fs.readFileSync(require('path').join(__dirname,'dom-fixture.json')))){const e=new El(d.tag);Object.assign(e,{id:d.id,dataset:d.dataset,textContent:d.text,value:d.value,options:d.options});if(d.options.length)e.value=(d.options.find(o=>o.selected)||d.options[0]).value;all.push(e);if(d.id)ids[d.id]=e;}
for(const id of ['keyBindingRows','keyBindingStatus','keyboardHelp','keyboardSettings','resetKeyBindings','commentaryProfileSelect','commentaryVoiceSelect','commentaryStatus','commentaryBtn','menuCommentaryBtn','commentaryTestBtn']){if(!ids[id])ids[id]=new El();}
for(const id of ['pauseMenu','pauseMatchInfo','pauseResume','pauseWatch','pauseFinish','pauseMainMenu','simReturn','simProgress'])ids[id]=new El();
for(const id of ['matchmakeBtn','cancelMatchmake','onlineStatus','onlineMatchBar','victoryScare','victoryScareImage','closeVictoryScare'])ids[id]=new El();
const context2d=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});ids.game.getContext=()=>context2d;
const timers=[],windowEvents={};
const energy=new El('i');const store={};const errors=[];
const sandbox={console:{log:console.log,error:(...x)=>errors.push(x.join(' '))},performance:{now:()=>0},Math,Date,JSON,Number,String,Object,Array,Map,Set,Infinity,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},navigator:{getGamepads:()=>[]},screen:{},setTimeout:f=>timers.push(f),requestAnimationFrame:()=>{},document:{getElementById:id=>ids[id]||null,createElement:t=>new El(t),querySelector:s=>s==='#energy i'?energy:null,querySelectorAll:s=>s==='[data-tactic]'?all.filter(e=>e.dataset.tactic):all.filter(e=>e.dataset.mode),addEventListener(){},hidden:false},devicePixelRatio:1,addEventListener(k,f){(windowEvents[k]??=[]).push(f)},confirm:()=>true};
sandbox.window=sandbox;sandbox.MINISAHA_BUNDLED_VOICE={};
let script=fs.readFileSync(require('path').join(__dirname,'../public/index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
script=script.replace(/\}\)\(\);\s*$/, 'window.inspect = code => eval(code);})();');
vm.createContext(sandbox);
for(const name of fs.readdirSync(require('path').join(__dirname,'../public/assets')).filter(n=>n.startsWith('rosters-')))vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../public/assets',name),'utf8'),sandbox);
vm.runInContext(script,sandbox);
const run=sandbox.inspect;

module.exports={run,ids,sandbox,errors,timers,windowEvents};
