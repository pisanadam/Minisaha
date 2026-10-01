const WebSocket=global.WebSocket||require('./ws-client.cjs');
const assert=require('node:assert/strict'),{createMatchServer}=require('../server/server.cjs');
(async()=>{
 const app=createMatchServer({offerMs:300,disconnectMs:200,maxRooms:1});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,clients=[];
 const wait=ms=>new Promise(r=>setTimeout(r,ms));async function until(f){for(let i=0;i<120;i++){if(f())return;await wait(10);}throw new Error('timed out');}
 const post=(path,data,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 async function client(name,size=5,extra={}){const r=await post('/online/join',{version:3,name,size,team:'turkiye',mode:'random',...extra});assert.equal(r.status,200);const {token,room}=await r.json(),c={token,room,events:[],seq:0,ws:new WebSocket(base.replace('http','ws')+'/online/socket?token='+token)};clients.push(c);c.ws.addEventListener('message',e=>c.events.push(JSON.parse(e.data)));await new Promise((r,j)=>{c.ws.addEventListener('open',r,{once:true});c.ws.addEventListener('error',j,{once:true});});return c;}
 const send=(c,type,extra={})=>c.ws.send(JSON.stringify({type,...extra}));
 try{
  const host=await client('host',5,{mode:'host',title:'Reserved',description:''});const a=await client('random-A',5),b=await client('random-B',11);
  await until(()=>a.events.some(e=>e.type==='offer')&&b.events.some(e=>e.type==='offer'));const offer=a.events.find(e=>e.type==='offer');assert.equal(offer.size,5);assert.equal(offer.lineups.blue.length,5);assert.equal(offer.lineups.red.length,5);assert.equal(app.rooms.size,1);assert(!a.events.some(e=>e.type==='state'));assert(!host.events.some(e=>e.type==='offer'));
  send(a,'accept');await wait(40);assert(!a.events.some(e=>e.type==='match'));send(b,'accept');await until(()=>b.events.some(e=>e.type==='state'));
  send(a,'ping',{at:123});await until(()=>a.events.some(e=>e.type==='pong'&&e.at===123));
  // A press and release in one socket frame must execute without an HTTP round trip.
  send(a,'input',{seq:++a.seq,inputs:[{x:0,y:0,pass:true},{x:0,y:0,pass:false,power:{pass:.7}}]});await until(()=>a.events.some(e=>e.type==='state'&&e.state.stats.blue.passes===1));
  const room=[...app.rooms][0];assert.equal(room.phase,'playing');const before=room.engine.snapshot();send(b,'input',{seq:++b.seq,inputs:[{x:1,y:0}]});await wait(90);const after=room.engine.snapshot(),i=after.selected[1];assert(after.players[i][0]<before.players[i][0]);
  send(b,'input',{seq:b.seq,inputs:[{x:0,y:0}]});await until(()=>b.events.some(e=>e.type==='error'&&e.error==='input'));
  const pause=await post('/online/pause',{},a.token);assert.equal(pause.status,200);await until(()=>a.events.some(e=>e.type==='state'&&e.state.state==='paused'));const pausedTime=room.engine.snapshot().elapsed;await wait(80);assert.equal(room.engine.snapshot().elapsed,pausedTime);
  const {run}=require('./game-harness.cjs');const inId=run("rosterFor('turkiye').find(c=>!c.positions.includes('GK')&&"+JSON.stringify(room.engine.snapshot().lineupIds)+".indexOf(c.id)<0).id");
  assert.equal((await post('/online/substitute',{index:1,inId},b.token)).status,403);assert.equal((await post('/online/substitute',{index:1,inId},a.token)).status,200);await until(()=>a.events.some(e=>e.type==='state'&&e.state.lineupIds[1]===inId));assert.equal(room.engine.snapshot().substitutions.length,1);assert.equal((await post('/online/resume',{},a.token)).status,200);await wait(40);assert(room.engine.snapshot().elapsed>pausedTime);
  send(a,'leave');await until(()=>b.events.some(e=>e.type==='left'));assert.equal(app.rooms.size,0);
  const c=await client('C',11),d=await client('D',11);await until(()=>c.events.some(e=>e.type==='offer'));send(c,'leave');await until(()=>d.events.some(e=>e.type==='cancelled'));await until(()=>d.events.filter(e=>e.type==='waiting').length>=2);
  const e=await client('E',11);await until(()=>e.events.some(e=>e.type==='offer'));send(d,'accept');await until(()=>e.events.some(e=>e.type==='cancelled'&&e.reason==='expired'));await until(()=>d.events.some(e=>e.type==='waiting'));
  assert.equal(app.rooms.size,0);console.log('PASS real WebSocket mixed-size random offer, exact lineups, host isolation/capacity, both accepts, ping, batched tap, mirrored movement, replay rejection, decline requeue, timeout, shared pause, server-authorized substitution and resume');
 }finally{for(const c of clients)c.ws.close();app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
