const assert=require('assert');
const {run,errors}=require('./game-harness.cjs');
function test(name,f){f();run('Math.random=window.__rand');console.log('PASS',name);}
run('window.__rand=Math.random');
function open(size=11){run(`matchSize=${size};formation='433';formation5='5';document.getElementById('duration').value='180';el.blueTeamSelect.value='premier_liverpool';el.redTeamSelect.value='premier_chelsea';fullReset();startGame();setPiece=null;goalPause=0;elapsed=10;simulationMode='manual'`);}
const sim=frames=>run(`for(let i=0;i<${frames}&&(state==='playing'||state==='penalties');i++)updateGame(1/60)`);

test('foul in the box gives a penalty: specialist taker, keeper home, others outside the area',()=>{
 open();run("window.v=blue.find(p=>p.role==='fw');v.x=FIELD.r-80;v.y=FIELD.cy+20;window.o=red[1];o.x=v.x+12;o.y=v.y;commitFoul(o,v,{})");
 assert.equal(run('setPiece.kind'),'penalty');assert.equal(run('setPiece.team'),'blue');
 assert.equal(run('ball.x'),run('FIELD.r-95'));assert.equal(run('ball.y'),run('FIELD.cy'));
 assert(run("setPiece.taker===blue.filter(p=>p.role!=='gk').sort((a,b)=>(b.roster.finishing||b.overall)-(a.roster.finishing||a.overall))[0]"));
 assert(run("players.filter(p=>p!==setPiece.taker&&p.role!=='gk').every(p=>!inPenaltyArea('red',p.x,p.y))"));
 assert.equal(run('stats.red.fouls'),1);
 run("simulationMode='watch';setPiece.age=1");sim(1);
 assert.equal(run('setPiece'),null);assert(run('ball.shotTeam==="blue"&&Math.abs(ball.vx)>200'));
});
test('free kick near goal builds a wall at distance; pass-only restart far away',()=>{
 open();run("window.v=blue.find(p=>p.role==='fw');v.x=FIELD.r-250;v.y=FIELD.cy;window.o=red[1];o.x=v.x-12;o.y=v.y;commitFoul(o,v,{})");
 assert.equal(run('setPiece.kind'),'free-kick');
 const wall=run("red.filter(p=>p.role!=='gk'&&Math.abs(dist(p.x,p.y,ball.x,ball.y)-82)<14).length");assert(wall>=3,'wall '+wall);
 assert(run("red.filter(p=>p.role!=='gk').every(p=>dist(p.x,p.y,ball.x,ball.y)>=70)"));
 open();run("window.v=blue.find(p=>p.role==='def');v.x=FIELD.l+200;v.y=FIELD.cy;window.o=red.find(p=>p.role==='fw');o.x=v.x+12;o.y=v.y;commitFoul(o,v,{})");
 assert.equal(run('setPiece.kind'),'free-kick');assert.equal(run("red.filter(p=>p.role!=='gk'&&Math.abs(dist(p.x,p.y,ball.x,ball.y)-82)<6).length<3"),true);
});
test('human penalty taker can only shoot',()=>{
 open();run("window.v=blue.find(p=>p.role==='fw');v.x=FIELD.r-80;v.y=FIELD.cy;window.o=red[1];commitFoul(o,v,{});setPiece.age=1");
 run("handleActions({passDown:false,passRelease:{player:setPiece.taker,power:.5},x:0,y:0},1/60)");
 assert(run("setPiece&&setPiece.kind==='penalty'"));
 run("handleActions({shootDown:false,shootRelease:{player:setPiece.taker,power:.8},x:0,y:.6},1/60)");
 assert(run("setPiece.released===true&&ball.shotTeam==='blue'"));
});
test('second yellow sends off; slot kept for online indexes; dismissed cannot be replaced or re-enter',()=>{
 open();run('Math.random=()=>0.05');
 run("window.o=red[3];bookings['red:'+o.roster.id]=1;window.v=blue.find(p=>p.role==='mid');v.x=FIELD.cx;v.y=FIELD.cy;commitFoul(o,v,{})");
 run('Math.random=window.__rand');
 assert.equal(run('stats.red.red'),1);assert.equal(run("stats.cards.at(-1).second"),true);
 assert.equal(run('red.length'),10);assert.equal(run('slots.red.length'),11);assert.equal(run('players.length'),21);
 assert.equal(run('onlineSnapshot().players.length'),22);assert.equal(run("onlineSnapshot().players[11+slots.red.indexOf(o)].at(-1)"),true);
 run("resetKickoff('red')");assert.equal(run('red.length'),10);assert(run('!red.includes(o)'));
 run("state='paused'");assert.equal(run("substitutePlayer('red',slots.red.indexOf(o),rosterFor(teamChoice.red).find(c=>!slots.red.some(p=>p.roster.id===c.id)&&!c.positions.includes('GK')).id).ok"),false);
 assert.equal(run("changeFormation('red','442').ok"),false);run("state='playing';setPiece=null");
 sim(600);assert.equal(run('red.length'),10);assert.deepEqual(errors,[]);
});
test('dismissal cap keeps at least seven players in 11v11',()=>{
 open();run("for(const p of red.filter(p=>p.role!=='gk').slice(0,4))dismissPlayer(p)");assert.equal(run('red.length'),7);assert.equal(run("canDismiss('red')"),false);
 run("Math.random=()=>0;setPiece=null;window.v=blue.find(p=>p.role==='fw');v.x=FIELD.cx;commitFoul(red[2],v,{sliding:true,behind:true})");
 assert.equal(run('red.length'),7);assert.equal(run("stats.cards.at(-1).type"),'yellow');
});
test('5v5 futsal red: short-handed 30 s or until conceding, then a bench player completes the team',()=>{
 open(5);run("Math.random=window.__rand;window.o=blue[2];window.id=o.roster.id;dismissPlayer(o)");assert.equal(run('blue.length'),4);
 run('elapsed+=10;updateDismissalReturns()');assert.equal(run('blue.length'),4);
 run("ball.lastPlayer=red[1];scoreGoal('red');updateDismissalReturns()");assert.equal(run('blue.length'),5);
 assert(run('!blue.some(p=>p.roster.id===id)'));assert(run("substitutionLog.at(-1).afterRed===true"));
 run("state='paused'");assert.equal(run("substitutePlayer('blue',2,id).ok"),false);
 open(5);run("dismissPlayer(red[1]);elapsed+=31;updateDismissalReturns()");assert.equal(run('red.length'),5);
});
test('half time pauses play, restores some energy and the other side kicks off',()=>{
 open();run("elapsed=REGULATION_SECONDS/2-.02;players.forEach(p=>p.stamina=.4)");sim(3);
 assert.equal(run('halfTimeDone'),true);assert(run('halfTimePause>0'));const t=run('elapsed');sim(30);assert.equal(run('elapsed'),t);
 sim(140);assert.equal(run("setPiece?.kind"),'kickoff');assert.equal(run('setPiece.team'),'red');assert(run('players.every(p=>p.stamina>=.74)'));
});
test('end screen and mirrored online client show fouls, cards and the sent-off slot',()=>{
 open();run("Math.random=()=>0.05;window.o=red[3];bookings['red:'+o.roster.id]=1;commitFoul(o,blue[4],{});Math.random=window.__rand;window.snap=JSON.parse(JSON.stringify(onlineSnapshot()))");
 run("endMatch()");assert(run("el.statsRows.innerHTML.includes('Kırmızı kart')&&el.statsRows.innerHTML.includes('Faul')"));
 assert(run("document.getElementById('goalTimeline').textContent.includes('KARTLAR')"));
 run("fullReset();net.side='red';matchSize=11;applyOnlineState(snap)");
 assert.equal(run('blue.length'),10);assert.equal(run('red.length'),11);assert.equal(run("stats.cards[0].team"),'blue');assert.equal(run('stats.blue.red'),1);
 run("net.side='blue';net.active=false");
});
assert.deepEqual(errors,[]);
