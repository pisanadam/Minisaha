const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {createMatchServer}=require('../server/server.cjs'),{createProfileStore}=require('../server/profiles.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const credentials=()=>({id:crypto.randomBytes(16).toString('hex'),secret:crypto.randomBytes(32).toString('hex')});
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'minisaha-profiles-'));
 const app=createMatchServer({disconnectMs:800,postMs:1500,profiles:createProfileStore({dir,delay:10})});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port,clients=[];
 const post=(p,data,token)=>fetch(base+p,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 async function client(name,profile,mode='random',extra={}){
  const r=await post('/online/join',{team:'superlig_fenerbahce',size:5,version:3,name,mode,profile,...extra});const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));
  const c={token:data.token,room:data.room,joinProfile:data.profile,events:[],abort:new AbortController()};clients.push(c);
  const stream=await fetch(base+'/online/events?token='+c.token,{signal:c.abort.signal}),reader=stream.body.getReader();let text='';
  c.done=(async()=>{try{while(true){const {value,done}=await reader.read();if(done)break;text+=new TextDecoder().decode(value);let at;while((at=text.indexOf('\n\n'))>=0){const frame=text.slice(0,at);text=text.slice(at+2);if(frame.startsWith('data: '))c.events.push(JSON.parse(frame.slice(6)));}}}catch(e){if(e.name!=='AbortError')throw e;}})();return c;
 }
 async function until(test,label='condition'){for(let i=0;i<300;i++){if(test())return;await wait(20);}throw new Error('timed out: '+label);}
 const last=(c,type)=>c.events.filter(e=>e.type===type).at(-1);
 const finish=room=>{for(let i=0;i<60*600&&room.engine.snapshot().state!=='ended';i++)room.engine.step(1/60);assert.equal(room.engine.snapshot().state,'ended');};
 try{
  const pa=credentials(),pb=credentials();
  const a=await client('Ayşe',pa),b=await client('Bora',pb);
  assert.equal(a.joinProfile.rating,1000);
  await until(()=>a.events.some(e=>e.type==='offer')&&b.events.some(e=>e.type==='offer'),'offer');
  await post('/online/accept',{},a.token);await post('/online/accept',{},b.token);
  await until(()=>last(a,'match')&&last(b,'match'),'match');assert.equal(last(a,'match').ranked,true);assert.deepEqual(last(a,'match').ratings,[1000,1000]);
  let room=[...app.rooms][0];
  // Quick chat: fixed messages only, rate limited, delivered to both players.
  assert.equal((await post('/online/chat',{id:99},a.token)).status,400);
  assert.equal((await post('/online/chat',{id:1},a.token)).status,200);assert.equal((await post('/online/chat',{id:2},a.token)).status,429);
  await until(()=>last(a,'chat')&&last(b,'chat'),'chat');assert.equal(last(b,'chat').name,'Ayşe');assert.equal(last(b,'chat').id,1);assert.equal(last(a,'chat').mine,true);
  finish(room);
  await until(()=>last(a,'result')&&last(b,'result')&&last(a,'post')&&last(b,'post'),'result');
  const ra=last(a,'result'),rb=last(b,'result');assert(ra.ranked);assert.equal(ra.profile.played,1);
  assert(Math.abs(ra.rating.delta+rb.rating.delta)<=1);
  const finalScore=room.engine.snapshot().score;if(finalScore.blue===finalScore.red&&!room.engine.snapshot().penaltyResult)assert.equal(ra.rating.delta,0);else assert.notEqual(ra.rating.delta,0);
  assert.equal(app.rooms.size,0);assert(app.sessions.has(a.token)&&app.sessions.has(b.token));
  // Rematch needs both players; the new room starts without another offer screen.
  assert.equal((await post('/online/rematch',{},a.token)).status,200);await until(()=>last(b,'rematch')?.state==='requested','rematch request');
  const matches=a.events.filter(e=>e.type==='match').length;
  assert.equal((await post('/online/rematch',{},b.token)).status,200);
  await until(()=>a.events.filter(e=>e.type==='match').length>matches&&b.events.filter(e=>e.type==='match').length>matches,'rematch match');
  room=[...app.rooms][0];assert.equal(room.phase,'playing');assert.notEqual(last(a,'match').match,ra.match);assert.equal(last(a,'match').side,'red');
  // Leaving a running ranked match forfeits it.
  const winsBefore=last(b,'result').profile.wins;
  await post('/online/leave',{},a.token);await until(()=>b.events.filter(e=>e.type==='result').length===2,'forfeit');
  assert.equal(last(b,'result').forfeit,true);assert.equal(last(b,'result').profile.wins,winsBefore+1);assert(last(b,'result').rating.delta>0);
  await until(()=>last(b,'left'),'left');
  // Leaderboard, own profile and secret protection.
  const board=await (await fetch(base+'/online/leaderboard')).json();assert.equal(board.players.length,2);assert(board.players[0].rating>=board.players[1].rating);assert.equal(board.players[0].name,'Bora');
  assert.equal((await post('/online/profile',pb)).status,200);assert.equal((await post('/online/profile',{id:pb.id,secret:credentials().secret})).status,404);
  const thief=await client('Hırsız',{id:pb.id,secret:credentials().secret});assert.equal(thief.joinProfile,null);await post('/online/leave',{},thief.token);
  // Friendly rooms count statistics but never change the rating.
  const h=await client('Ev',pa,'host',{title:'Dostluk',description:''}),g=await client('Misafir',pb,'join',{room:h.room});
  await until(()=>last(h,'offer')&&last(g,'offer'),'friendly offer');await post('/online/accept',{},h.token);await post('/online/accept',{},g.token);await until(()=>last(h,'match'),'friendly match');
  assert.equal(last(h,'match').ranked,false);const before=last(h,'match').ratings;finish([...app.rooms][0]);
  await until(()=>last(h,'result')&&last(g,'result'),'friendly result');assert.equal(last(h,'result').ranked,false);assert.equal(last(h,'result').rating.after,before[0]);
  // Post-match window expires.
  await until(()=>last(h,'left')?.reason==='post','post timeout');assert(!app.sessions.has(h.token));
  // Draining: health reports it, new players wait for the restart.
  const ratingB=app.profiles.view(app.profiles.get(pb.id)).rating;
  app.drain();const health=await (await fetch(base+'/online/health')).json();assert.equal(health.draining,true);assert.equal(health.matches,0);assert.equal(health.version,3);
  const refused=await post('/online/join',{team:'turkiye',size:5,version:3,name:'Geç',profile:credentials()});assert.equal(refused.status,503);assert.equal((await refused.json()).error,'draining');
  app.profiles.flush();
  const reloaded=createProfileStore({dir});assert.equal(reloaded.view(reloaded.get(pb.id)).rating,ratingB);assert.equal(reloaded.size,2);
  assert(!fs.readFileSync(path.join(dir,'profiles.json'),'utf8').includes(pb.secret));
  console.log('PASS anonymous profiles, ranked ELO, friendly no-rating, forfeits, leaderboard, secret protection, persistence, quick chat limits, rematch and post-match expiry, update draining');
 }finally{for(const c of clients)c.abort.abort();app.close();await Promise.all(clients.map(c=>c.done));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
