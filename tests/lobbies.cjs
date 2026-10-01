const assert=require('node:assert/strict'),{createMatchServer}=require('../server/server.cjs');
(async()=>{
 const app=createMatchServer({disconnectMs:250});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,streams=[];
 const pause=ms=>new Promise(r=>setTimeout(r,ms));
 const post=(data,token,path='/online/join')=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 const data=(name,extra={})=>({name,version:3,size:5,team:'turkiye',...extra});
 async function events(token){const abort=new AbortController();streams.push(abort);const r=await fetch(base+'/online/events?token='+token,{signal:abort.signal}),reader=r.body.getReader(),out=[];let text='';const done=(async()=>{try{while(true){const v=await reader.read();if(v.done)return;text+=new TextDecoder().decode(v.value);let at;while((at=text.indexOf('\n\n'))>=0){const f=text.slice(0,at);text=text.slice(at+2);if(f.startsWith('data: '))out.push(JSON.parse(f.slice(6)));}}}catch(e){if(e.name!=='AbortError')throw e;}})();return {out,abort,done};}
 const list=async()=> (await (await fetch(base+'/online/rooms')).json()).rooms;
 try{
  const hostData=data('Akif',{mode:'host',title:'A'.repeat(20),description:'B'.repeat(50)}),host=await (await post(hostData)).json();assert(host.token);const hs=await events(host.token);
  assert.equal((await post(data('akif'))).status,409);assert.equal((await post(data('too-long',{mode:'host',title:'A'.repeat(21),description:''}))).status,400);assert.equal((await post(data('long-desc',{mode:'host',title:'Valid',description:'B'.repeat(51)}))).status,400);
  assert.equal((await list())[0].id,host.room);
  const random=await (await post(data('Random'))).json();await events(random.token);await pause(50);assert(!hs.out.some(e=>e.type==='match'));
  const guest=await (await post(data('Guest',{mode:'join',room:host.room}))).json();const gs=await events(guest.token);await pause(50);assert(hs.out.some(e=>e.type==='offer'));assert(!hs.out.some(e=>e.type==='match'));await post({},host.token,'/online/accept');await post({},guest.token,'/online/accept');await pause(150);
  assert.equal(hs.out.find(e=>e.type==='match').match,gs.out.find(e=>e.type==='match').match);assert(gs.out.some(e=>e.type==='state'));assert.equal((await list()).length,0);
  await post({},host.token,'/online/leave');await pause(30);assert(gs.out.some(e=>e.type==='left'));
  assert.equal((await post(data('Akif'))).status,200);await post({},random.token,'/online/leave');
  const abandoned=await (await post(data('Abandoned',{mode:'host',title:'Test',description:''}))).json();const stream=await events(abandoned.token);stream.abort.abort();await pause(400);assert.equal((await list()).length,0);assert.equal((await post(data('Abandoned'))).status,200);
  console.log('PASS host/join shared match, random isolation, duplicate names, field limits, leave/reuse and disconnect cleanup');
 }finally{for(const s of streams)s.abort();app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
