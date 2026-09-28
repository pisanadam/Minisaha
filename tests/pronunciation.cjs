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
const context2d=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(o,k)=>k in o?o[k]:(()=>{})});ids.game.getContext=()=>context2d;
const energy=new El('i');const store={};const errors=[];
const sandbox={console:{log:console.log,error:(...x)=>errors.push(x.join(' '))},performance:{now:()=>0},Math,Date,JSON,Number,String,Object,Array,Map,Set,Infinity,localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>store[k]=v},navigator:{getGamepads:()=>[]},screen:{},setTimeout:f=>f(),requestAnimationFrame:()=>{},document:{getElementById:id=>ids[id]||null,createElement:t=>new El(t),querySelector:s=>s==='#energy i'?energy:null,querySelectorAll:s=>s==='[data-tactic]'?all.filter(e=>e.dataset.tactic):all.filter(e=>e.dataset.mode),addEventListener(){},hidden:false},devicePixelRatio:1,addEventListener(){},confirm:()=>true};
sandbox.window=sandbox;sandbox.MINISAHA_BUNDLED_VOICE={};
let script=fs.readFileSync(require('path').join(__dirname,'../public/index.html'),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
script=script.replace(/\}\)\(\);\s*$/, 'window.inspect = code => eval(code);})();');
vm.createContext(sandbox);
const html=fs.readFileSync(require('path').join(__dirname,'../public/index.html'),'utf8');
for(const m of html.matchAll(/<script src="([^"]+)"><\/script>/g))vm.runInContext(fs.readFileSync(require('path').join(__dirname,'../public',m[1].split('?')[0]),'utf8'),sandbox);
vm.runInContext(script,sandbox);
const run=sandbox.inspect;
function test(name,f){f();console.log('PASS',name)}
function openPlay(){run("fullReset();startGame();setPiece=null;goalPause=0;ball.owner=null;ball.kicker=null;manualLock=0;clearInput();players.forEach((p,i)=>{p.x=100+i*30;p.y=100;p.vx=0;p.vy=0;p.cooldown=0;p.tackleCD=0;p.recoverTime=0;});selected=blue[1]");}
test('Liverpool pronunciation changes only spoken text',()=>{assert.equal(run("speechCommentaryText('Liverpool 2, Chelsea 0.')"),'Livırpul iki, Çelsi sıfır.');assert.equal(run("cleanCommentaryText('Liverpool 🔴')"),'Liverpool');assert.equal(run("speechCommentaryText('LIVERPOOL 12')"),'Livırpul on iki');});
test('Turkish numbers use correct tens, hundreds and thousands',()=>{for(const [n,text] of [[0,'sıfır'],[9,'dokuz'],[10,'on'],[21,'yirmi bir'],[100,'yüz'],[101,'yüz bir'],[1000,'bin'],[2026,'iki bin yirmi altı'],[1000000,'bir milyon']])assert.equal(run(`turkishNumberWords(${n})`),text);});
test('numbered clubs retain intended leading zero pronunciation',()=>{assert.equal(run("speechCommentaryText('Mainz 05, Schalke 04, SC Paderborn 07.')"),'Maynts sıfır beş, Şalke sıfır dört, Es ce Paderborn sıfır yedi.');assert.equal(run("speechCommentaryText('1. FC Köln')"),'Bir ef ce Köln');});
test('all corrected words have actual embedded MP3 recordings',()=>{const spec=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../audio-source/pronunciations.json'),'utf8'));for(const k of Object.keys(spec.clips)){const clip=sandbox.MINISAHA_BUNDLED_VOICE[k];assert(clip,k);const bytes=Buffer.from(clip,'base64');assert(bytes.length>1000,k);assert(bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255,k);}assert.equal(Object.keys(spec.clips).length,156);});
test('scores beyond 100 compose existing clips rather than skipping numbers',()=>{assert.deepEqual(Array.from(run('bundledNumberKeys(101)')),['100','1']);assert.deepEqual(Array.from(run('bundledNumberKeys(2026)')),['2','1000','26']);assert.deepEqual(Array.from(run('bundledNumberKeys(0)')),['0']);});
test('goal assembly includes real team and both scores',()=>{run("teamChoice.blue=COUNTRY_TEAMS.find(t=>t.name==='Liverpool').key;teamChoice.red=COUNTRY_TEAMS.find(t=>t.name==='Chelsea').key;score.blue=12;score.red=0");const parts=Array.from(run("bundledCommentaryParts('Harika gol!',{team:'blue'},'goal')"));assert.deepEqual(parts.slice(-4),['Liverpool','12','Chelsea','0']);});
test('original goal calls and commentary fragments remain available',()=>{assert(run('GOAL_CALLS.every(s=>BUNDLED_VOICE[bundledAudioKey(s)])'));assert.equal(run('GOAL_CALLS.length'),50);assert.deepEqual(errors,[]);});
test('pronunciation matching respects literal punctuation and word boundaries',()=>{assert.equal(run("speechCommentaryText('1X FC Köln')"),'birX FC Köln');assert.equal(run("speechCommentaryText('Liverpoollu')"),'Liverpoollu');});
test('missing number audio cannot recurse forever',()=>{const old=sandbox.MINISAHA_BUNDLED_VOICE['26'];delete sandbox.MINISAHA_BUNDLED_VOICE['26'];assert.deepEqual(Array.from(run('bundledNumberKeys(26)')),['20','6']);sandbox.MINISAHA_BUNDLED_VOICE['26']=old;});
