'use strict';
// Anonymous online profiles: the browser keeps a random id + secret, the server
// stores only the secret's hash, the last used name and match statistics.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const COUNTERS=['wins','draws','losses','played','goalsFor','goalsAgainst'];
const hash=text=>crypto.createHash('sha256').update(text).digest('hex');
function valid(p){return !!p&&/^[0-9a-f]{32}$/.test(p.id)&&/^[0-9a-f]{64}$/.test(p.secret)&&typeof p.name==='string'&&p.name.length<=40&&Number.isFinite(p.rating)&&Number.isFinite(p.updatedAt)&&COUNTERS.every(k=>Number.isInteger(p[k])&&p[k]>=0);}
function createProfileStore({dir=process.env.MINISAHA_DATA||null,limit=50000,delay=2000}={}){
 const file=dir?path.join(dir,'profiles.json'):null,profiles=new Map();let timer=null;
 if(file){
  try{const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.version===1&&Array.isArray(data.profiles))for(const p of data.profiles)if(valid(p))profiles.set(p.id,p);}
  catch(e){if(e.code!=='ENOENT')console.error('Profiles could not be read:',e.message);}
 }
 function flush(){
  if(timer){clearTimeout(timer);timer=null;}if(!file)return;
  try{fs.mkdirSync(dir,{recursive:true});const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify({version:1,profiles:[...profiles.values()]}));fs.renameSync(tmp,file);}
  catch(e){console.error('Profiles could not be saved:',e.message);}
 }
 function save(){if(file&&!timer){timer=setTimeout(flush,delay);timer.unref?.();}}
 function prune(){const old=[...profiles.values()].sort((a,b)=>a.updatedAt-b.updatedAt).slice(0,Math.ceil(limit/10));for(const p of old)profiles.delete(p.id);}
 function claim(credentials,name){
  if(!credentials||typeof credentials.id!=='string'||typeof credentials.secret!=='string'||!/^[0-9a-f]{32}$/.test(credentials.id)||!/^[0-9a-f]{64}$/.test(credentials.secret))return null;
  const secret=hash(credentials.secret);let p=profiles.get(credentials.id);
  if(p&&!crypto.timingSafeEqual(Buffer.from(p.secret),Buffer.from(secret)))return null;
  if(!p){if(profiles.size>=limit)prune();p={id:credentials.id,secret,name,rating:1000,...Object.fromEntries(COUNTERS.map(k=>[k,0])),updatedAt:Date.now()};profiles.set(p.id,p);}
  p.name=name;p.updatedAt=Date.now();save();return p;
 }
 // outcome: 1 = first profile won, .5 = draw, 0 = second profile won.
 function record(a,b,goalsA,goalsB,outcome,ranked){
  const before=[a?.rating??null,b?.rating??null];
  if(ranked&&a&&b&&a!==b){
   const expected=1/(1+10**((b.rating-a.rating)/400)),k=p=>p.played<10?40:24,da=k(a)*(outcome-expected),db=k(b)*((1-outcome)-(1-expected));
   a.rating=Math.max(100,a.rating+da);b.rating=Math.max(100,b.rating+db);
  }
  for(const [p,mine,theirs,result] of [[a,goalsA,goalsB,outcome],[b,goalsB,goalsA,1-outcome]]){
   if(!p)continue;p.played++;p.goalsFor+=mine;p.goalsAgainst+=theirs;p[result===1?'wins':result===0?'losses':'draws']++;p.updatedAt=Date.now();
  }
  if(a||b)save();
  return [a,b].map((p,i)=>p?{before:Math.round(before[i]),after:Math.round(p.rating),delta:Math.round(p.rating)-Math.round(before[i]),ranked:!!ranked}:null);
 }
 function rank(p){let n=1;for(const o of profiles.values())if(o.played>0&&o.rating>p.rating)n++;return n;}
 function view(p,withRank=true){return p?{name:p.name,rating:Math.round(p.rating),wins:p.wins,draws:p.draws,losses:p.losses,played:p.played,goalsFor:p.goalsFor,goalsAgainst:p.goalsAgainst,...(withRank?{rank:p.played?rank(p):null}:{})}:null;}
 function leaderboard(n=20){return [...profiles.values()].filter(p=>p.played>0).sort((a,b)=>b.rating-a.rating||b.wins-a.wins||a.updatedAt-b.updatedAt).slice(0,n).map(p=>view(p,false));}
 return {claim,record,view,leaderboard,flush,get:id=>profiles.get(id)||null,get size(){return profiles.size;}};
}
module.exports={createProfileStore};
