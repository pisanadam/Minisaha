'use strict';
const http=require('node:http'),crypto=require('node:crypto'),createEngine=require('./engine.cjs');
const empty={x:0,y:0,pass:false,shoot:false,cross:false,through:false,sprint:false,switch:false};
function createMatchServer({maxRooms=8,disconnectMs=8000}={}){
 const sessions=new Map(),rooms=new Set(),queues={5:[],11:[]},rates=new Map(),catalog=new Set(createEngine().teams());
 function send(s,m){if(!s.stream||s.stream.destroyed)return;if(s.stream.writableLength>256000){s.stream.destroy();return;}s.stream.write('data: '+JSON.stringify(m)+'\n\n');}
 function remove(s){
  if(!sessions.has(s.token))return;
  queues[s.size]=queues[s.size].filter(x=>x!==s);sessions.delete(s.token);
  if(s.room){const room=s.room;rooms.delete(room);for(const other of room.members){other.room=null;if(other!==s){send(other,{type:'left'});sessions.delete(other.token);other.stream?.end();}}}
  s.stream?.end();
 }
 function matchPacket(s){return {type:'match',match:s.room.id,side:s.side,size:s.size,blue:s.room.members[0].team,red:s.room.members[1].team};}
 function match(size){
  const queue=queues[size];
  while(queue.length>=2&&rooms.size<maxRooms){
   // Disconnected waiters retain their token briefly, but cannot consume a match.
   const ready=queue.filter(s=>s.stream&&!s.stream.destroyed);if(ready.length<2)return;
   const [a,b]=ready;queues[size]=queue.filter(s=>s!==a&&s!==b);
   const engine=createEngine(),room={id:crypto.randomUUID(),members:[a,b],engine,ticks:0,last:performance.now(),accumulator:0};
   engine.boot({blue:a.team,red:b.team,size});rooms.add(room);
   for(const [i,s] of [a,b].entries()){s.room=room;s.side=i?'red':'blue';s.seq=-1;s.lastInput=Date.now();s.lastNeutral=0;send(s,matchPacket(s));}
   return match(size);
  }
 }
 function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>8192)throw new Error('size');}return JSON.parse(text||'{}');}
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname,expected=process.env.PUBLIC_ORIGIN;
   if(req.headers.origin&&expected&&req.headers.origin!==expected)return json(res,403,{error:'origin'});
   if(path==='/online/health'&&req.method==='GET')return json(res,200,{ok:true,version:1});
   if(path==='/online/join'&&req.method==='POST'){
    const ip=req.socket.remoteAddress+'|'+(req.headers['x-real-ip']||'');let rate=rates.get(ip);
    if(!rate||Date.now()-rate.at>60000){rate={at:Date.now(),n:0};rates.set(ip,rate);}
    if(++rate.n>12)return json(res,429,{error:'rate'});
    if(sessions.size>=128||rooms.size>=maxRooms)return json(res,503,{error:'full'});
    const data=await body(req);if(data.version!==1||![5,11].includes(data.size)||!catalog.has(data.team))return json(res,400,{error:'selection'});
    const token=crypto.randomBytes(32).toString('hex'),s={token,team:data.team,size:data.size,seen:Date.now(),stream:null,room:null,seq:-1,inputRate:0};
    sessions.set(token,s);return json(res,200,{token});
   }
   const token=path==='/online/events'?url.searchParams.get('token'):(req.headers.authorization||'').replace(/^Bearer /,'');
   const s=sessions.get(token);if(!s)return json(res,401,{error:'session'});
   if(path==='/online/events'&&req.method==='GET'){
    s.stream?.end();s.stream=res;s.seen=Date.now();
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');
    res.on('close',()=>{if(s.stream===res){s.stream=null;s.seen=Date.now();}});
    if(s.room){send(s,matchPacket(s));send(s,{type:'state',match:s.room.id,state:s.room.engine.snapshot()});}
    else{if(!queues[s.size].includes(s))queues[s.size].push(s);send(s,{type:'waiting'});match(s.size);}return;
   }
   if(path==='/online/leave'&&req.method==='POST'){remove(s);return json(res,200,{ok:true});}
   if(path==='/online/input'&&req.method==='POST'){
    if(!s.room)return json(res,409,{error:'not-matched'});
    const now=Date.now();if(!s.rateAt||now-s.rateAt>=1000){s.rateAt=now;s.inputRate=0;}
    if(++s.inputRate>90)return json(res,429,{error:'rate'});
    const data=await body(req);
    if(!Number.isSafeInteger(data.seq)||data.seq<=s.seq||!Array.isArray(data.inputs)||!data.inputs.length||data.inputs.length>24)return json(res,400,{error:'input'});
    for(const packet of data.inputs)if(!packet||!Number.isFinite(packet.x)||!Number.isFinite(packet.y))return json(res,400,{error:'axis'});
    s.seq=data.seq;s.lastInput=now;s.seen=now;
    for(const packet of data.inputs){
     const mag=Math.max(1,Math.hypot(packet.x,packet.y)),sign=s.side==='blue'?1:-1,clean={x:packet.x/mag*sign,y:packet.y/mag*sign};
     for(const key of ['pass','shoot','cross','through','sprint','switch'])clean[key]=packet[key]===true;
     s.room.engine.input(s.side,clean);
    }
    return json(res,200,{ok:true});
   }
   json(res,404,{error:'not-found'});
  }catch(error){if(!res.headersSent)json(res,400,{error:'bad-request'});else res.end();}
 });
 const ticker=setInterval(()=>{
  const now=Date.now();
  for(const room of rooms){try{
   for(const s of room.members)if(now-s.lastInput>350&&now-s.lastNeutral>350){room.engine.input(s.side,{...empty});s.lastNeutral=now;}
   const clock=performance.now();room.accumulator+=Math.min(.1,(clock-room.last)/1000);room.last=clock;
   while(room.accumulator>=1/60){room.engine.step(1/60);room.ticks++;room.accumulator-=1/60;}
   if(room.ticks%3===0){const state=room.engine.snapshot();for(const s of room.members)send(s,{type:'state',match:room.id,state});
    if(state.state==='ended'){rooms.delete(room);for(const s of room.members){s.room=null;sessions.delete(s.token);s.stream?.end();}}
   }
  }catch(error){console.error('Match engine failed:',error.message);for(const s of room.members)send(s,{type:'left'});remove(room.members[0]);}}
  for(const s of sessions.values()){
   if(!s.stream&&now-s.seen>disconnectMs)remove(s);
   else if(s.stream&&!s.room&&now-(s.heartbeat||0)>2000){s.heartbeat=now;send(s,{type:'waiting'});}
   else if(s.room&&now-s.lastInput>20000)remove(s);
  }
  for(const [ip,r] of rates)if(now-r.at>60000)rates.delete(ip);
  match(5);match(11);
 },1000/60);
 server.requestTimeout=10000;server.headersTimeout=10000;
 return {server,sessions,rooms,close(){clearInterval(ticker);for(const s of [...sessions.values()])remove(s);server.close();}};
}
if(require.main===module){const app=createMatchServer();app.server.listen(Number(process.env.PORT)||8787,'127.0.0.1',()=>console.log('Mini Saha online listening'));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{app.close();setTimeout(()=>process.exit(),500).unref();});}
module.exports={createMatchServer};
