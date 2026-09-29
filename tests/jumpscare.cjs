const assert=require('assert'),fs=require('fs'),path=require('path');
const {run,ids,timers,windowEvents,errors}=require('./game-harness.cjs');
function test(name,f){f();console.log('PASS',name)}
function finish(blue,red){run(`fullReset();score.blue=${blue};score.red=${red};endMatch()`)}
function loaded(){assert.equal(typeof ids.victoryScareImage.onload,'function');ids.victoryScareImage.onload()}
test('9-goal wins, draws and 10-goal defeats do not trigger',()=>{
 for(const [b,r] of [[9,0],[14,5],[10,10],[0,10]]){
  finish(b,r);assert.equal(run('victoryScareUsed'),false);assert.equal(ids.victoryScare.style.display,'none');
 }
});
test('10 and larger goal margins trigger once at full time in both sizes',()=>{
 for(const size of [5,11])for(const [b,r] of [[10,0],[12,2],[17,3]]){
  run(`matchSize=${size}`);finish(b,r);assert(run('victoryScareUsed'));loaded();
  assert.equal(ids.victoryScare.style.display,'grid');assert.equal(ids.victoryScare['aria-hidden'],'false');
  const job=run('victoryScareJob'),src=ids.victoryScareImage.src;
  run('endMatch()');assert.equal(run('victoryScareJob'),job);assert.equal(ids.victoryScareImage.src,src);
  ids.victoryScare.trigger('click');assert.equal(ids.victoryScare.style.display,'none');
  run('endMatch()');assert.equal(ids.victoryScare.style.display,'none');
 }
});
test('all three selectable assets exist and are JPEGs',()=>{
 const original=run('Math.random');
 for(let i=0;i<3;i++){
  run(`fullReset();Math.random=()=>${(i+.1)/3};state='ended';score.blue=10;score.red=0;showVictoryScare()`);
  assert.equal(ids.victoryScareImage.src,`assets/jumpscare-${i+1}.jpg`);
  const bytes=fs.readFileSync(path.join(__dirname,'../public',ids.victoryScareImage.src));assert.equal(bytes.readUInt16BE(0),0xffd8);
 }
 // Restore the shared Math object used by the VM.
 Math.random=original;
});
test('reset cancels pending image loads and old auto-close callbacks',()=>{
 finish(10,0);const late=ids.victoryScareImage.onload;run('fullReset()');late();
 assert.equal(ids.victoryScare.style.display,'none');assert.equal(run('victoryScareUsed'),false);
 finish(10,0);loaded();const oldTimer=timers[timers.length-1];
 finish(11,0);loaded();oldTimer();assert.equal(ids.victoryScare.style.display,'grid');
 timers[timers.length-1]();assert.equal(ids.victoryScare.style.display,'none');
});
test('Escape closes, failed assets and load timeouts leave results usable',()=>{
 finish(10,0);loaded();
 for(const f of windowEvents.keydown)f({code:'Escape',key:'Escape',preventDefault(){}});
 assert.equal(ids.victoryScare.style.display,'none');assert.equal(ids.endScreen.style.display,'flex');
 finish(10,0);ids.victoryScareImage.onerror();assert.equal(ids.victoryScare.style.display,'none');
 finish(10,0);const late=ids.victoryScareImage.onload;timers[timers.length-1]();late();assert.equal(ids.victoryScare.style.display,'none');
});
test('live matches and the authoritative server never show the overlay',()=>{
 run("fullReset();score.blue=10;state='playing';showVictoryScare()");assert.equal(run('victoryScareUsed'),false);
 run("onlineServer=true;state='ended';showVictoryScare()");assert.equal(run('victoryScareUsed'),false);run('onlineServer=false');
});
assert.deepEqual(errors,[]);
