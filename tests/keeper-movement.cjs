const assert=require('node:assert/strict'),{run,errors}=require('./game-harness.cjs');
for(const size of [5,11])for(const side of ['blue','red']){
 run(`MINISAHA_ENGINE.boot({blue:'turkiye',red:'norway',size:${size}});setPiece=null;gainPossession(${side}[0]);window.startKeeper={x:${side}[0].x,y:${side}[0].y};MINISAHA_ENGINE.input('${side}',{x:1,y:1});for(let i=0;i<60;i++)MINISAHA_ENGINE.step(1/60)`);
 assert(run(`ball.owner===${side}[0]&&ball.held&&${side}[0].y>startKeeper.y`));
 for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1]]){
  run(`MINISAHA_ENGINE.input('${side}',{x:${x},y:${y}});for(let i=0;i<240;i++)MINISAHA_ENGINE.step(1/60)`);
  assert(run(`(()=>{const p=${side}[0];return p.x>=FIELD.l+p.r&&p.x<=FIELD.r-p.r&&p.y>=FIELD.cy-122+p.r&&p.y<=FIELD.cy+122-p.r&&(${side==='blue'?'p.x<=FIELD.l+142-p.r':'p.x>=FIELD.r-142+p.r'})&&ball.owner===p&&ball.held&&ball.z===12&&Math.abs(ball.y-p.y)<.01})()`));
 }
 run(`MINISAHA_ENGINE.input('${side}',{x:0,y:0,pass:true});MINISAHA_ENGINE.input('${side}',{x:0,y:0,pass:false,target:2});MINISAHA_ENGINE.step(1/60)`);assert(run(`ball.owner===null&&passAssist.target===${side}[2]&&passAssist.handThrow`));
}
run("onlineServer=false;net.active=false;matchSize=5;fullReset();startGame();setPiece=null;gainPossession(blue[0]);window.keeperStart=blue[0].y;keys.ArrowDown=true;for(let i=0;i<60;i++)updateGame(1/60);keys.ArrowDown=false");
assert(run('blue[0].y>keeperStart&&ball.owner===blue[0]&&ball.held'));
assert.deepEqual(errors,[]);console.log('PASS held keeper movement, own penalty-area bounds, ball remains in hand and high throw after moving on both sides/sizes and local keyboard');
