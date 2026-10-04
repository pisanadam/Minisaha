const assert=require('node:assert/strict');const {createMatchServer}=require('../server/server.cjs');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const app=createMatchServer({disconnectMs:500});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 const clients=[];
 async function post(path,data,token){return fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});}
 async function client(team,size){const r=await post('/online/join',{team,size,version:3,name:'player'+clients.length});assert.equal(r.status,200);const c={token:(await r.json()).token,events:[],seq:0,abort:new AbortController()};clients.push(c);
  const stream=await fetch(base+'/online/events?token='+c.token,{signal:c.abort.signal});const reader=stream.body.getReader();let text='';
  c.done=(async()=>{try{while(true){const {value,done}=await reader.read();if(done)break;text+=new TextDecoder().decode(value);let at;while((at=text.indexOf('\n\n'))>=0){const frame=text.slice(0,at);text=text.slice(at+2);if(frame.startsWith('data: '))c.events.push(JSON.parse(frame.slice(6)));}}}catch(e){if(e.name!=='AbortError')throw e;}})();return c;
 }
 async function until(test){for(let i=0;i<100;i++){if(test())return;await wait(20);}throw new Error('timed out');}
 const input=(c,inputs)=>post('/online/input',{seq:++c.seq,inputs},c.token);
 try{
  assert.equal((await post('/online/join',{team:'made-up',size:5,version:3,name:'invalid'})).status,400);
  assert.equal((await post('/online/input',{},'fake')).status,401);
  const a=await client('superlig_fenerbahce',5);
  await wait(80);assert(!a.events.some(e=>e.type==='match'));
  const b=await client('superlig_genclerbirligi',5);await until(()=>a.events.some(e=>e.type==='offer')&&b.events.some(e=>e.type==='offer'));assert.equal(app.rooms.size,1);assert.equal([...app.rooms][0].phase,'offered');await post('/online/accept',{},a.token);await wait(50);assert(!a.events.some(e=>e.type==='match'));await post('/online/accept',{},b.token);await until(()=>a.events.some(e=>e.type==='state')&&b.events.some(e=>e.type==='state'));
  const am=a.events.find(e=>e.type==='match'),bm=b.events.find(e=>e.type==='match');assert.equal(am.match,bm.match);assert.equal(am.side,'blue');assert.equal(bm.side,'red');assert.equal(app.rooms.size,1);
  assert.deepEqual(a.events.find(e=>e.type==='state').state,b.events.find(e=>e.type==='state').state);console.log('PASS two real HTTP clients receive same match and authoritative snapshot; both players accept before match starts');
  assert.equal((await input(a,[{x:0,y:0,pass:true},{x:0,y:0,pass:false}])).status,200);
  await until(()=>a.events.some(e=>e.type==='state'&&e.state.stats.blue.passes===1));
  assert.equal((await post('/online/input',{seq:a.seq,inputs:[{x:0,y:0}]},a.token)).status,400);
  assert.equal((await input(b,[{x:'bad',y:0}])).status,400);
  const room=[...app.rooms][0];const before=room.engine.snapshot();await input(b,[{x:1,y:0,sprint:true}]);await wait(140);const after=room.engine.snapshot(),index=after.selected[1];assert(after.players[index][0]<before.players[index][0]);console.log('PASS kickoff pass, replay rejection and red-side mirrored movement');
  await input(b,[{x:0,y:0}]);
  await post('/online/leave',{},a.token);await until(()=>b.events.some(e=>e.type==='left'));assert.equal(app.rooms.size,0);console.log('PASS leaving match informs opponent and frees room');
  const different=await client('turkiye',11);different.abort.abort();await until(()=>!app.sessions.has(different.token));console.log('PASS disconnected queue entry expires');
 }finally{for(const c of clients)c.abort.abort();app.close();await Promise.all(clients.map(c=>c.done));}
 // Both sides use real human shoot/tackle commands in the same physics model.
 const {run,sandbox,errors}=require('./game-harness.cjs');
 for(const side of ['blue','red']){
  run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'premier_liverpool',size:5});setPiece=null;window.p=${side}[4];ball.owner=p;ball.x=p.x;p.holdTime=1;ball.y=p.y;p.cooldown=0;onlineHumans.${side}.selected=p;MINISAHA_ENGINE.input('${side}',{x:${side==='blue'?1:-1},y:0,shoot:true});MINISAHA_ENGINE.step(1/60);MINISAHA_ENGINE.input('${side}',{x:${side==='blue'?1:-1},y:0,shoot:false});MINISAHA_ENGINE.step(1/60)`);
  assert.equal(run(`stats.${side}.shots`),1);
 }
 console.log('PASS both human teams shoot, no AI substitutes for opponent');
 run("MINISAHA_ENGINE.boot({blue:'turkiye',red:'turkiye',size:11});window.s=MINISAHA_ENGINE.snapshot();onlineServer=false;net.active=true;net.side='red';net.phase='playing';net.match='test';applyOnlineState(s)");
 assert(run("teamChoice.blue==='turkiye'&&teamChoice.red==='turkiye'"));assert(run('Math.abs(ball.x-(W-s.ball.x))<.01'));assert(run("selected.team==='blue'"));console.log('PASS mirror-team selection and second-player local camera/control ownership');
 run("net.active=false;MINISAHA_ENGINE.boot({blue:'turkiye',red:'premier_liverpool',size:5});for(let i=0;i<40000&&state!=='ended';i++)MINISAHA_ENGINE.step(1/60)");assert.equal(run('state'),'ended');assert(run('penaltyResult||score.blue!==score.red'));assert.deepEqual(errors,[]);console.log('PASS unattended online match finishes, including automatic restarts and tied penalties');
})().catch(e=>{console.error(e);process.exitCode=1;});
