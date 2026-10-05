const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..','public'),code=fs.readFileSync(path.join(root,'assets/offline-download.js'),'utf8');
async function exercise({offline=false,fail=false}={}){
 const ids={},requests=[],downloads=[];let object;
 for(const id of ['offlineDownloadBtn','offlineDownloadStatus','mainTabOnline'])ids[id]={addEventListener:(name,fn)=>ids[id][name]=fn};
 const sandbox={console:{error(){}},URL:class extends URL{static createObjectURL(blob){object=blob;return 'blob:test'}static revokeObjectURL(){}},Blob,TextEncoder,AbortController,setTimeout:()=>1,clearTimeout(){},FileReader:class{async readAsDataURL(blob){this.result='data:'+blob.type+';base64,'+Buffer.from(await blob.arrayBuffer()).toString('base64');this.onload();}},document:{baseURI:'https://example.test/',documentElement:{hasAttribute:()=>offline},getElementById:id=>ids[id],body:{append(){}},createElement:()=>({click(){downloads.push(this.download)},remove(){}})},fetch:async url=>{
  requests.push(url);const file=path.join(root,new URL(url).pathname);
  if(fail&&url.includes('voice-02'))return {ok:false};
  const bytes=fs.readFileSync(file);return {ok:true,text:async()=>bytes.toString(),blob:async()=>new Blob([bytes],{type:'image/jpeg'})};
 }};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);
 if(!offline)await ids.offlineDownloadBtn.click();
 return {ids,requests,downloads,html:object?await object.text():null};
}
(async()=>{
 const result=await exercise();assert.deepEqual(result.downloads,['Mini-Saha-Cevrimdisi.html']);assert.match(result.html,/<html data-minisaha-offline/);assert(!/<script src="assets\//.test(result.html));assert(!/assets\/[\w.-]+\.(jpg|png|webp)/.test(result.html));
 const context={window:{}};vm.createContext(context);
 for(const m of result.html.matchAll(/<script src="data:text\/javascript;base64,([^"]+)"><\/script>/g)){
  const script=Buffer.from(m[1],'base64').toString();new vm.Script(script);
  if(script.includes('MINISAHA_INIT_FC27')||script.includes('MINISAHA_INIT_ALLTIME'))vm.runInContext(script,context);
 }
 context.window.MINISAHA_INIT_FC27();context.window.MINISAHA_INIT_ALLTIME();assert(context.window.MINISAHA_ROSTERS.laliga_realmadrid.players.some(p=>p.name==='Kylian Mbappé'));assert(context.window.MINISAHA_ROSTERS.alltime_turkiye.players.some(p=>p.legend));
 const failed=await exercise({fail:true});assert.equal(failed.downloads.length,0);assert.equal(failed.ids.offlineDownloadBtn.disabled,false);assert.match(failed.ids.offlineDownloadStatus.textContent,/tamamlanamadı/);
 const local=await exercise({offline:true});assert.equal(local.requests.length,0);assert(local.ids.mainTabOnline.disabled);assert(local.ids.offlineDownloadBtn.hidden);
 console.log('PASS self-contained offline HTML, embedded scripts/images and FC27/all-time data, no partial download, retry and offline menu');
})().catch(e=>{console.error(e);process.exitCode=1});
