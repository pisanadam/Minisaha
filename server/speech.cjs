'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process'),readline=require('node:readline');
function createSpeechService({catalog,pronounce}){
 const python=process.env.MINISAHA_VOICE_PYTHON,model=process.env.MINISAHA_VOICE_MODEL,cache=process.env.MINISAHA_VOICE_CACHE||'/var/cache/minisaha-voice';
 let child=null,ready=false,closed=false,busy=false,id=0;const queue=[],jobs=new Map();
 function fail(error){ready=false;for(const j of jobs.values()){clearTimeout(j.timer);j.reject(error);}jobs.clear();queue.length=0;busy=false;}
 function pump(){if(!ready||busy||!queue.length)return;const j=queue.shift();busy=true;j.timer=setTimeout(()=>{child?.kill();fail(new Error('voice timeout'));},30000);child.stdin.write(JSON.stringify({id:j.id,text:j.text})+'\n');}
 if(python&&model){
  fs.mkdirSync(cache,{recursive:true});child=spawn(python,[path.join(__dirname,'voice-worker.py')],{env:{...process.env,OMP_NUM_THREADS:'1'},stdio:['pipe','pipe','pipe']});
  readline.createInterface({input:child.stdout}).on('line',async line=>{try{const m=JSON.parse(line);if(m.ready){ready=true;pump();return;}const j=[...jobs.values()].find(j=>j.id===m.id);if(!j)return;clearTimeout(j.timer);busy=false;jobs.delete(j.hash);if(m.error)j.reject(new Error(m.error));else{const audio=Buffer.from(m.audio,'base64');await fs.promises.writeFile(j.file,audio);j.resolve(audio);}pump();}catch(e){fail(e);}});
  child.stderr.on('data',()=>{});child.on('error',()=>fail(new Error('voice unavailable')));child.on('exit',()=>{child=null;if(!closed)fail(new Error('voice stopped'));});
 }
 return {get ready(){return ready;},async get(key){
  if(!catalog.has(key))throw Object.assign(new Error('unknown voice key'),{status:404});
  if(!python||!model||!child||closed)throw Object.assign(new Error('voice unavailable'),{status:503});
  const text=pronounce(key),hash=crypto.createHash('sha256').update('v4|'+text).digest('hex'),file=path.join(cache,hash+'.mp3');
  try{return await fs.promises.readFile(file);}catch{}
  if(jobs.has(hash))return jobs.get(hash).promise;if(jobs.size>=48)throw Object.assign(new Error('voice busy'),{status:503});
  const j={id:++id,hash,file,text,timer:null};j.promise=new Promise((resolve,reject)=>Object.assign(j,{resolve,reject}));jobs.set(hash,j);queue.push(j);pump();return j.promise;
 },close(){closed=true;fail(new Error('voice closed'));child?.kill();}};
}
module.exports={createSpeechService};
