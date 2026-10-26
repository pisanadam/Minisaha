const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {run,ids,sandbox,errors}=require('./game-harness.cjs');
(async()=>{
 const tick=()=>new Promise(r=>setImmediate(r));
 // Vibration follows the setting and never runs during fast simulation.
 const pulses=[];sandbox.navigator.vibrate=p=>{pulses.push(p);return true;};
 run("matchSize=5;fullReset();startGame();setPiece=null;goalPause=0;ball.lastPlayer=blue[4];scoreGoal('blue')");
 assert.equal(JSON.stringify(pulses.at(-1)),JSON.stringify([80,50,120]));
 ids.vibrationBtn.trigger('click');assert.equal(ids.vibrationBtn.textContent,'Titreşim: kapalı');const count=pulses.length;
 run("scoringLock=0;scoreGoal('red')");assert.equal(pulses.length,count);
 assert.equal(JSON.parse(sandbox.localStorage.getItem('miniSaha.settings.v2')).vibrationEnabled,false);
 ids.vibrationBtn.trigger('click');
 // Screen wake lock is held while a match runs and released afterwards.
 let requests=0,released=0;sandbox.navigator.wakeLock={request:async()=>{requests++;return {release:async()=>{released++;},addEventListener(){}};}};
 run('syncWakeLock()');await tick();assert.equal(requests,1);run('syncWakeLock()');await tick();assert.equal(requests,1);
 run('endMatch();syncWakeLock()');await tick();assert.equal(released,1);
 ids.wakeLockBtn.trigger('click');run("fullReset();startGame();syncWakeLock()");await tick();assert.equal(requests,1);ids.wakeLockBtn.trigger('click');
 // The 10-goal surprise can be switched off.
 ids.scareBtn.trigger('click');assert.equal(ids.scareBtn.textContent,'Maç sonu sürprizi: kapalı');
 run("fullReset();startGame();score.blue=10;score.red=0;endMatch()");assert.equal(run('victoryScareUsed'),false);
 ids.scareBtn.trigger('click');run("fullReset();startGame();score.blue=10;score.red=0;endMatch()");assert.equal(run('victoryScareUsed'),true);
 // Achievements: unlocked once, stored locally, shown on the result screen and in settings.
 run("achievementState={unlocked:{},matches:0};fullReset();startGame();setPiece=null;goalPause=0");
 run("const p=blue[4];for(let i=0;i<2;i++){ball.lastPlayer=red[4];scoringLock=0;goalPause=0;scoreGoal('red');}for(let i=0;i<5;i++){ball.lastPlayer=p;scoringLock=0;goalPause=0;scoreGoal('blue');}endMatch()");
 const unlocked=Object.keys(run('achievementState.unlocked'));
 for(const id of ['first_win','hat_trick','comeback'])assert(unlocked.includes(id),id);assert(!unlocked.includes('clean_sheet'));assert(!unlocked.includes('big_win'));
 assert.match(ids.achievementInfo.textContent,/Yeni başarım/);assert.equal(ids.achievementInfo.style.display,'block');
 assert.equal(JSON.parse(sandbox.localStorage.getItem('miniSaha.achievements.v1')).matches,run('achievementState.matches'));
 run("fullReset();startGame();score.blue=6;score.red=0;endMatch()");assert(run("!!achievementState.unlocked.big_win&&!!achievementState.unlocked.clean_sheet"));
 const before=run('JSON.stringify(achievementState.unlocked)');run("fullReset();startGame();score.blue=6;score.red=0;endMatch()");assert.equal(run('JSON.stringify(achievementState.unlocked)'),before);assert.equal(ids.achievementInfo.style.display,'none');
 assert.match(ids.achievementCount.textContent,/^\d+ \/ 14$/);assert.equal(ids.achievementList.children.length,14);
 run("matchSize=11;fullReset();startGame();stats.cards.push({team:'blue',id:'x',type:'yellow'});endMatch()");assert(!run('achievementState.unlocked.fair_play'));
 run("fullReset();startGame();endMatch()");assert(run('!!achievementState.unlocked.fair_play'));
 // Online server never touches browser storage or devices.
 run("onlineServer=true;window.n=Object.keys(achievementState.unlocked).length;unlockAchievement('cup_winner');onlineServer=false");assert.equal(run('Object.keys(achievementState.unlocked).length'),run('n'));
 // Installable app files.
 const root=path.join(__dirname,'..','public'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
 assert.equal(manifest.start_url,'./');assert(manifest.icons.every(i=>fs.existsSync(path.join(root,i.src))));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert(html.includes('<link rel="manifest" href="manifest.webmanifest" />'));assert(fs.existsSync(path.join(root,'icons/apple-touch-icon.png')));
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');new vm.Script(sw);
 for(const file of JSON.parse(sw.match(/const CORE = (\[[^\]]+\])/)[1].replace(/'/g,'"')))assert(fs.existsSync(path.join(root,file==='./'?'index.html':file)),file);
 assert(sw.includes("'/online/'"));
 assert.deepEqual(errors,[]);
 console.log('PASS vibration setting, screen wake lock hold/release, surprise toggle, local achievements (win, hat-trick, comeback, clean sheet, fair play, once only), server isolation and installable app files');
})().catch(e=>{console.error(e);process.exitCode=1;});
