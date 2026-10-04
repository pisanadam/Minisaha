const assert=require('node:assert/strict'),{createMatchServer}=require('../server/server.cjs');
(async()=>{
 const app=createMatchServer();await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port,clients=[];
 const post=(path,data,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 async function join(name,team){const r=await post('/online/join',{name,team,size:11,version:3,mode:'random'});assert.equal(r.status,200);const c={token:(await r.json()).token,events:[],abort:new AbortController()};clients.push(c);const stream=await fetch(base+'/online/events?token='+c.token,{signal:c.abort.signal});const reader=stream.body.getReader();let text='';c.done=(async()=>{try{while(true){const v=await reader.read();if(v.done)return;text+=new TextDecoder().decode(v.value);let at;while((at=text.indexOf('\n\n'))>=0){const f=text.slice(0,at);text=text.slice(at+2);if(f.startsWith('data: '))c.events.push(JSON.parse(f.slice(6)));}}}catch(e){if(e.name!=='AbortError')throw e;}})();return c;}
 async function until(test){for(let i=0;i<100;i++){if(test())return;await new Promise(r=>setTimeout(r,20));}throw new Error('Timed out');}
 try{
  const a=await join('Efsane1','alltime_turkiye'),b=await join('Efsane2','alltime_laliga_barcelona');await until(()=>a.events.some(e=>e.type==='offer')&&b.events.some(e=>e.type==='offer'));
  const offer=a.events.find(e=>e.type==='offer');assert.equal(offer.blue,'alltime_turkiye');assert(offer.lineups.blue.some(p=>p.name==='Lefter Küçükandonyadis'));assert(offer.lineups.red.some(p=>p.name==='Lionel Messi'));assert.equal(offer.lineups.blue.length,11);
  await post('/online/accept',{},a.token);await post('/online/accept',{},b.token);await until(()=>a.events.some(e=>e.type==='state')&&b.events.some(e=>e.type==='state'));
  const state=a.events.find(e=>e.type==='state').state;assert.equal(state.lineupIds.length,22);assert(state.lineupIds.some(id=>id.startsWith('legend-')));assert(state.players.every(p=>p.slice(0,4).every(Number.isFinite)));
  await post('/online/leave',{},a.token);await until(()=>b.events.some(e=>e.type==='left'));assert.equal(app.rooms.size,0);
  console.log('PASS real HTTP clients pair with all-time squads, see historical best XI, accept together and receive authoritative legend IDs');
 }finally{for(const c of clients)c.abort.abort();app.close();await Promise.all(clients.map(c=>c.done));}
})().catch(e=>{console.error(e);process.exitCode=1});
