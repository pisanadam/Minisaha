'use strict';
const http=require('node:http'),crypto=require('node:crypto'),createEngine=require('./engine.cjs'),{upgrade}=require('./socket.cjs'),{createSpeechService}=require('./speech.cjs'),{createProfileStore}=require('./profiles.cjs');
const empty={x:0,y:0,pass:false,shoot:false,cross:false,through:false,sprint:false,switch:false};
const CHAT_MESSAGES=8;
function createMatchServer({maxRooms=8,disconnectMs=8000,offerMs=30000,postMs=30000,profiles=createProfileStore()}={}){
 let draining=false;
 const sessions=new Map(),rooms=new Set(),queues={5:[],11:[]},lobbies=new Map(),names=new Map(),rates=new Map(),meta=createEngine(),catalog=new Set(meta.teams()),speech=createSpeechService({catalog:meta.speechCatalog(),pronounce:meta.speechText});
 const connected=s=>!!(s.ws?.open||s.stream&&!s.stream.destroyed);
 function send(s,m){if(s.ws?.open){s.ws.send(m);return;}if(!s.stream||s.stream.destroyed)return;if(s.stream.writableLength>65536){s.stream.destroy();return;}s.stream.write('data: '+JSON.stringify(m)+'\n\n');}
 function unqueue(s){for(const size of [5,11])queues[size]=queues[size].filter(x=>x!==s);}
 function endSession(s){unqueue(s);sessions.delete(s.token);names.delete(s.nameKey);s.ws?.close();s.stream?.end();}
 // Ranked result once per room; leaving a running match forfeits it.
 function finishRoom(room,state,forfeit=null){
  if(room.rated)return;room.rated=true;
  const score=state?.score||room.engine.snapshot().score,pen=state?.penaltyResult;
  const outcome=forfeit?(forfeit==='blue'?0:1):score.blue>score.red?1:score.blue<score.red?0:pen?.winner==='blue'?1:pen?.winner==='red'?0:.5;
  const [a,b]=room.members,changes=profiles.record(a.profile,b.profile,score.blue,score.red,outcome,room.ranked);
  room.members.forEach((m,i)=>{if(m.profile)send(m,{type:'result',match:room.id,ranked:!!room.ranked,forfeit:!!forfeit,rating:changes[i],profile:profiles.view(m.profile)});});
 }
 function remove(s,reason='left'){
  if(!sessions.has(s.token))return;
  if(s.post){const other=s.post.partner;s.post=null;if(other?.post?.partner===s){other.post.gone=true;send(other,{type:'rematch',state:'declined'});}}
  if(s.room?.phase==='playing')finishRoom(s.room,null,s.side);
  if(s.lobby){const lobby=s.lobby;s.lobby=null;if(lobby.host===s){lobbies.delete(lobby.id);if(lobby.guest){lobby.guest.lobby=null;send(lobby.guest,{type:'left'});endSession(lobby.guest);}}else lobby.guest=null;}
  if(s.room){const room=s.room;rooms.delete(room);for(const other of room.members){other.room=null;if(other!==s){
   if(room.phase==='offered'&&other.mode==='random'){other.accepted=false;queues[other.size].push(other);send(other,{type:'cancelled',reason});send(other,waiting(other));}
   else{send(other,{type:room.phase==='playing'||reason==='left'?'left':'cancelled',reason});endSession(other);}
  }}}
  endSession(s);
 }
 function matchPacket(s){return {type:'match',match:s.room.id,side:s.side,size:s.room.size,blue:s.room.members[0].team,red:s.room.members[1].team,names:s.room.members.map(m=>m.name),ranked:!!s.room.ranked,ratings:s.room.members.map(m=>m.profile?Math.round(m.profile.rating):null)};}
 function offerPacket(s){const r=s.room;return {...matchPacket(s),type:'offer',lineups:r.engine.lineups(),accepted:r.members.map(m=>!!m.accepted),remaining:Math.max(0,Math.ceil((r.deadline-Date.now())/1000))};}
 function startPair(a,b,rematch=false){
  const engine=createEngine(),size=rematch?a.post.size:a.size,room={id:crypto.randomUUID(),members:[a,b],size,phase:'offered',deadline:Date.now()+offerMs,engine,ticks:0,last:performance.now(),lastBroadcast:0,accumulator:0};
  room.ranked=a.mode==='random'&&b.mode==='random'&&!!a.profile&&!!b.profile&&a.profile!==b.profile;
  engine.boot({blue:a.team,red:b.team,size});rooms.add(room);
  for(const [i,s] of [a,b].entries()){s.lobby=null;s.post=null;s.room=room;s.side=i?'red':'blue';s.accepted=rematch;s.seq=-1;s.lastInput=Date.now();s.lastNeutral=0;if(!rematch)send(s,offerPacket(s));}
  if(rematch)accept(a);
 }
 function rematch(s){
  const other=s.post?.partner;if(!s.post||s.room)return {status:409,error:'not-finished'};
  if(s.post.gone||!other||!sessions.has(other.token)||other.post?.partner!==s)return {status:409,error:'rematch-gone'};
  if(draining)return {status:503,error:'draining'};
  s.post.want=true;send(other,{type:'rematch',state:'requested',by:s.name});send(s,{type:'rematch',state:'waiting'});
  // Sides swap, so the other team kicks off the rematch.
  if(other.post.want){if(rooms.size>=maxRooms)return {status:503,error:'full'};const [blue,red]=s.side==='red'?[s,other]:[other,s];startPair(blue,red,true);}
  return {status:200};
 }
 function chat(s,data){
  const id=data?.id;if(!Number.isInteger(id)||id<0||id>=CHAT_MESSAGES)return {status:400,error:'chat'};
  const now=Date.now();if(now-(s.chatAt||0)<1500)return {status:429,error:'rate'};
  const members=s.room?.phase==='playing'?s.room.members:s.post?.partner&&!s.post.gone?[s,s.post.partner]:null;if(!members)return {status:409,error:'not-matched'};
  s.chatAt=now;for(const m of members)send(m,{type:'chat',id,name:s.name,mine:m===s});return {status:200};
 }
 function match(){
  while(!draining&&rooms.size<maxRooms){
   const ready=[...queues[5],...queues[11]].filter(connected).sort((a,b)=>a.queuedAt-b.queuedAt);if(ready.length<2)return;
   const [a,b]=ready;unqueue(a);unqueue(b);startPair(a,b);
  }
 }
 function startLobby(lobby){if(!draining&&lobby.guest&&[lobby.host,lobby.guest].every(connected)&&rooms.size<maxRooms){startPair(lobby.host,lobby.guest);lobbies.delete(lobby.id);}}
 function waiting(s){return s.lobby?{type:'waiting',mode:s.mode,room:s.lobby.id,title:s.lobby.title}:{type:'waiting',mode:'random',size:s.size,waiting:[...queues[5],...queues[11]].filter(connected).length};}
 function accept(s){
  if(!s.room||s.room.phase!=='offered')return {status:409,error:'not-offered'};
  if(Date.now()>s.room.deadline)return {status:409,error:'expired'};
  s.accepted=true;const r=s.room;
  if(r.members.every(m=>m.accepted&&connected(m))){r.phase='playing';r.last=performance.now();r.accumulator=0;for(const m of r.members){m.lastInput=Date.now();send(m,matchPacket(m));send(m,{type:'state',match:r.id,state:r.engine.snapshot()});}}
  else for(const m of r.members)send(m,offerPacket(m));return {status:200};
 }
 function input(s,data){
  if(!s.room||s.room.phase!=='playing')return {status:409,error:'not-matched'};
  const now=Date.now();if(!s.rateAt||now-s.rateAt>=1000){s.rateAt=now;s.inputRate=0;}if(++s.inputRate>120)return {status:429,error:'rate'};
  if(!Number.isSafeInteger(data.seq)||data.seq<=s.seq||!Array.isArray(data.inputs)||!data.inputs.length||data.inputs.length>24)return {status:400,error:'input'};
  for(const p of data.inputs)if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return {status:400,error:'axis'};
  s.seq=data.seq;s.lastInput=now;s.seen=now;
  for(const p of data.inputs){
   const mag=Math.max(1,Math.hypot(p.x,p.y)),sign=s.side==='blue'?1:-1,clean={x:p.x/mag*sign,y:p.y/mag*sign,target:Number.isSafeInteger(p.target)?p.target:-1,cancel:p.cancel===true,power:{}};
   for(const k of ['pass','shoot','cross','through','sprint','switch'])clean[k]=p[k]===true;
   for(const k of ['pass','shoot','cross','through'])if(Number.isFinite(p.power?.[k]))clean.power[k]=Math.min(1,Math.max(0,p.power[k]));
   s.room.engine.input(s.side,clean);
  }return {status:200};
 }
 function action(s,type,data={}){
  const r=s.room;if(!r||r.phase!=='playing')return {status:409,error:'Maç başlamadı.'};
  if(type==='pause'){
   if(r.pause)return {status:409,error:'Rakip oyuncu değiştiriyor.'};if(!r.engine.pause(true))return {status:409,error:'Bu anda duraklatılamaz.'};r.pause={by:s.side,until:Date.now()+45000};
  }else{
   if(!r.pause||r.pause.by!==s.side)return {status:403,error:'Yalnızca maçı duraklatan oyuncu değişiklik yapabilir.'};
   if(type==='resume'){r.engine.pause(false);r.pause=null;r.last=performance.now();r.accumulator=0;}
   else if(type==='formation'){const result=r.engine.formation(s.side,data.key);if(!result.ok)return {status:400,error:result.error};}
   else if(type==='substitute'){const result=r.engine.substitute(s.side,data.index,data.inId);if(!result.ok)return {status:400,error:result.error};}
   else return {status:400,error:'action'};
  }
  return {status:200};
 }
 function roomSnapshot(room){const state=room.engine.snapshot();if(room.pause)state.pause={by:room.pause.by,remaining:Math.max(0,Math.ceil((room.pause.until-Date.now())/1000))};return state;}
 function attach(s){s.seen=Date.now();if(s.post){send(s,{type:'post',remaining:Math.max(0,Math.ceil((s.post.until-Date.now())/1000)),gone:!!s.post.gone});return;}if(s.room){send(s,s.room.phase==='offered'?offerPacket(s):matchPacket(s));if(s.room.phase==='playing')send(s,{type:'state',match:s.room.id,state:roomSnapshot(s.room)});}
  else{if(!s.lobby&&!queues[s.size].includes(s)){s.queuedAt=Date.now();queues[s.size].push(s);}send(s,waiting(s));if(s.lobby)startLobby(s.lobby);else match();}}
 function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(text.length>8192)throw new Error('size');}return JSON.parse(text||'{}');}
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),path=url.pathname,expected=process.env.PUBLIC_ORIGIN;
   if(req.headers.origin&&expected&&req.headers.origin!==expected)return json(res,403,{error:'origin'});
   if(path==='/online/health'&&req.method==='GET')return json(res,200,{ok:true,version:3,transport:'websocket',voiceReady:speech.ready,draining,matches:[...rooms].filter(r=>r.phase==='playing').length,profiles:profiles.size});
   if(path==='/online/leaderboard'&&req.method==='GET')return json(res,200,{players:profiles.leaderboard(20)});
   if(path==='/online/profile'&&req.method==='POST'){const data=await body(req),p=profiles.get(data?.id);return p&&profiles.claim(data,p.name)?json(res,200,{profile:profiles.view(p)}):json(res,404,{error:'profile'});}
   if(path==='/online/voice'&&req.method==='GET'){try{const audio=await speech.get(url.searchParams.get('key'));res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'public,max-age=86400'});res.end(audio);}catch(e){json(res,e.status||503,{error:'voice-unavailable'});}return;}
   if(path==='/online/rooms'&&req.method==='GET')return json(res,200,{rooms:[...lobbies.values()].filter(l=>!l.guest&&connected(l.host)).map(l=>({id:l.id,title:l.title,description:l.description,size:l.host.size,host:l.host.name}))});
   if(path==='/online/join'&&req.method==='POST'){
    const ip=req.socket.remoteAddress+'|'+(req.headers['x-real-ip']||'');let rate=rates.get(ip);if(!rate||Date.now()-rate.at>60000){rate={at:Date.now(),n:0};rates.set(ip,rate);}if(++rate.n>40)return json(res,429,{error:'rate'});
    if(draining)return json(res,503,{error:'draining'});
    if(sessions.size>=128)return json(res,503,{error:'full'});
    const data=await body(req);if(data.version!==3||![5,11].includes(data.size)||!catalog.has(data.team))return json(res,400,{error:'selection'});
    const mode=data.mode||'random',name=typeof data.name==='string'?data.name.normalize('NFKC').trim():'';
    if(!['random','host','join'].includes(mode)||!name||[...name].length>20||/[\p{C}]/u.test(name))return json(res,400,{error:'name'});
    const nameKey=name.toLocaleLowerCase('tr-TR');if(names.has(nameKey))return json(res,409,{error:'name-taken'});
    let lobby;if(mode==='join'){lobby=lobbies.get(data.room);if(!lobby||lobby.guest||!connected(lobby.host))return json(res,404,{error:'room'});if(lobby.host.size!==data.size)return json(res,400,{error:'room-size'});}
    else if(mode==='host'&&lobbies.size>=64)return json(res,503,{error:'full'});
    if(mode==='host'&&(typeof data.title!=='string'||!data.title.trim()||[...data.title.trim()].length>20||typeof data.description!=='string'||[...data.description.trim()].length>50||/[\p{C}]/u.test(data.title+data.description)))return json(res,400,{error:'title'});
    const token=crypto.randomBytes(32).toString('hex'),s={token,name,nameKey,mode,team:data.team,size:data.size,seen:Date.now(),stream:null,ws:null,room:null,lobby:null,post:null,seq:-1,inputRate:0,queuedAt:Date.now(),profile:profiles.claim(data.profile,name)};
    if(mode==='host'){lobby={id:crypto.randomBytes(6).toString('hex'),host:s,guest:null,title:data.title.trim(),description:data.description.trim()};lobbies.set(lobby.id,lobby);}
    if(lobby){s.lobby=lobby;if(mode==='join')lobby.guest=s;}sessions.set(token,s);names.set(nameKey,s);return json(res,200,{token,room:lobby?.id,profile:profiles.view(s.profile)});
   }
   const token=path==='/online/events'?url.searchParams.get('token'):(req.headers.authorization||'').replace(/^Bearer /,'');const s=sessions.get(token);if(!s)return json(res,401,{error:'session'});
   if(path==='/online/events'&&req.method==='GET'){
    s.ws?.close();s.ws=null;s.stream?.end();s.stream=res;s.seen=Date.now();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(': connected\n\n');res.on('close',()=>{if(s.stream===res){s.stream=null;s.seen=Date.now();}});attach(s);return;
   }
   if(path==='/online/leave'&&req.method==='POST'){remove(s,'declined');return json(res,200,{ok:true});}
   if(path==='/online/accept'&&req.method==='POST'){const r=accept(s);return json(res,r.status,r.error?{error:r.error}:{ok:true});}
   if(['/online/pause','/online/resume','/online/substitute','/online/formation'].includes(path)&&req.method==='POST'){const r=action(s,path.split('/').pop(),await body(req));return json(res,r.status,r.error?{error:r.error}:{ok:true});}
   if(path==='/online/rematch'&&req.method==='POST'){const r=rematch(s);return json(res,r.status,r.error?{error:r.error}:{ok:true});}
   if(path==='/online/chat'&&req.method==='POST'){const r=chat(s,await body(req));return json(res,r.status,r.error?{error:r.error}:{ok:true});}
   if(path==='/online/input'&&req.method==='POST'){const r=input(s,await body(req));return json(res,r.status,r.error?{error:r.error}:{ok:true});}
   json(res,404,{error:'not-found'});
  }catch{if(!res.headersSent)json(res,400,{error:'bad-request'});else res.end();}
 });
 server.on('upgrade',(req,socket,head)=>{
  try{const url=new URL(req.url,'http://localhost'),s=sessions.get(url.searchParams.get('token')),expected=process.env.PUBLIC_ORIGIN;
   if(url.pathname!=='/online/socket'||!s||(expected&&req.headers.origin!==expected)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
   const peer=upgrade(req,socket,head,(data,p)=>{if(s.ws!==p||!sessions.has(s.token))return;
    if(data.type==='ping'){s.seen=Date.now();send(s,{type:'pong',at:data.at});return;}
    if(data.type==='leave'){remove(s,'declined');return;}
    const r=data.type==='accept'?accept(s):data.type==='input'?input(s,data):data.type==='rematch'?rematch(s):data.type==='chat'?chat(s,data):{status:400,error:'type'};
    if(r.error)send(s,{type:'error',error:r.error});
   },p=>{if(s.ws===p){s.ws=null;s.seen=Date.now();}});
   if(!peer)return;s.ws?.close();s.stream?.end();s.stream=null;s.ws=peer;attach(s);
  }catch{socket.destroy();}
 });
 const ticker=setInterval(()=>{
  const now=Date.now(),clock=performance.now();
  for(const room of rooms){try{
   if(room.phase==='offered'){
    if(room.members.every(m=>m.accepted&&connected(m))){accept(room.members[0]);continue;}
    if(now>=room.deadline){const decliner=room.members.find(s=>!s.accepted)||room.members[0];send(decliner,{type:'cancelled',reason:'expired'});remove(decliner,'expired');}
    else if(now-(room.heartbeat||0)>1000){room.heartbeat=now;for(const s of room.members)send(s,offerPacket(s));}continue;
   }
   if(room.pause&&now>=room.pause.until){room.engine.pause(false);room.pause=null;room.last=clock;room.accumulator=0;}
   for(const s of room.members)if(now-s.lastInput>700&&now-s.lastNeutral>700){room.engine.input(s.side,{...empty});s.lastNeutral=now;}
   room.accumulator+=Math.min(.1,(clock-room.last)/1000);room.last=clock;while(room.accumulator>=1/60){room.engine.step(1/60);room.ticks++;room.accumulator-=1/60;}
   if(clock-room.lastBroadcast>=1000/30){room.lastBroadcast=clock;const state=roomSnapshot(room);for(const s of room.members)send(s,{type:'state',match:room.id,state,ack:s.seq});
    if(state.state==='ended'){
     finishRoom(room,state);rooms.delete(room);
     // Both players may ask for a rematch with the same teams for a short time.
     const [a,b]=room.members;for(const [s,other] of [[a,b],[b,a]]){s.room=null;s.post={partner:other,size:room.size,until:now+postMs,want:false,gone:false};send(s,{type:'post',remaining:Math.ceil(postMs/1000)});}
    }
   }
  }catch(error){console.error('Match engine failed:',error.message);for(const s of room.members)send(s,{type:'left'});remove(room.members[0]);}}
  for(const s of sessions.values()){
   if(!connected(s)&&now-s.seen>disconnectMs)remove(s);
   else if(s.post){if(now>s.post.until){send(s,{type:'left',reason:'post'});remove(s,'post');}}
   else if(connected(s)&&!s.room&&now-(s.heartbeat||0)>2000){s.heartbeat=now;send(s,waiting(s));}
   else if(s.room?.phase==='playing'&&now-s.lastInput>20000)remove(s);
  }
  for(const [ip,r] of rates)if(now-r.at>60000)rates.delete(ip);for(const l of lobbies.values())startLobby(l);match();
 },1000/60);
 server.requestTimeout=10000;server.headersTimeout=10000;
 return {server,sessions,rooms,profiles,drain(){draining=true;},get draining(){return draining;},close(){speech.close();clearInterval(ticker);for(const s of [...sessions.values()])remove(s);profiles.flush();server.close();}};
}
if(require.main===module){const app=createMatchServer();app.server.listen(Number(process.env.PORT)||8787,'127.0.0.1',()=>console.log('Mini Saha online listening'));for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{app.close();setTimeout(()=>process.exit(),500).unref();});
 // Updates send SIGUSR2 first: no new matches start, running ones finish.
 process.on('SIGUSR2',()=>{app.drain();console.log('Mini Saha online draining');});}
module.exports={createMatchServer};
