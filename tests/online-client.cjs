const assert=require('node:assert/strict'),{run,ids,sandbox,windowEvents}=require('./game-harness.cjs');
(async()=>{
 const requests=[];let resolveJoin;sandbox.AbortController=AbortController;sandbox.clearTimeout=()=>{};
 sandbox.EventSource=class {constructor(){this.closed=false;}close(){this.closed=true;}};
 sandbox.fetch=async(url,options)=>{requests.push({url,options});if(url==='/online/join')return new Promise(r=>resolveJoin=r);return {ok:true,json:async()=>({rooms:[{id:'room',title:'<img src=x>',host:'Friend',description:'hello',size:11}]})};};
 ids.matchmakeBtn.trigger('click');assert.equal(ids.onlineLobbyPanel.style.display,'block');
 await run("joinOnline('random')");assert.equal(requests.length,0);assert.match(ids.onlineStatus.textContent,/oyuncu ad/);
 ids.onlineName.value='Akif';ids.hostOnlineBtn.trigger('click');assert.equal(ids.hostOnlineForm.style.display,'block');ids.onlineTitle.value='Arkadaş';ids.onlineDescription.value='Gel';
 const pending=run("joinOnline('host')");assert.equal(run('net.phase'),'joining');assert.equal(ids.cancelMatchmake.style.display,'inline-block');assert.equal(JSON.parse(requests[0].options.body).mode,'host');
 run('leaveOnline()');resolveJoin({ok:true,json:async()=>({token:'late'})});await pending;assert.equal(run('net.active'),false);assert(requests.some(r=>r.url==='/online/leave'&&r.options.headers.Authorization==='Bearer late'));
 const taken=run("joinOnline('random')");resolveJoin({ok:false,json:async()=>({error:'name-taken'})});await taken;assert.match(ids.onlineStatus.textContent,/Bu ad/);assert.equal(ids.onlineName.disabled,false);
 await run('browseOnline()');const row=ids.onlineRooms.children[0];assert.equal(row.children[0].textContent,'<img src=x> · Friend · 11’e 11 — hello');
 const joined=run("joinOnline('random')");resolveJoin({ok:true,json:async()=>({token:'ok'})});await joined;assert.equal(run('net.phase'),'waiting');
 let frames=0;sandbox.requestAnimationFrame=()=>frames++;run('loop(1)');assert.equal(frames,1);assert.equal(run('net.active'),true);
 for(const fn of windowEvents.pagehide)fn();assert.equal(run('net.active'),false);ids.onlineName.value='restored';for(const fn of windowEvents.pageshow)fn();assert.equal(ids.onlineName.value,'');
 console.log('PASS online menu, name validation, cancellable pending join, late token cleanup, duplicate feedback, safe room text, waiting frames and refresh reset');
})().catch(e=>{console.error(e);process.exitCode=1});
