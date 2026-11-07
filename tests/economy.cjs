const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),ts=require('typescript');
const cache=new Map();
function load(file, overrides={}, globals={}) {
 file=path.resolve(file);
 if (!Object.keys(overrides).length && cache.has(file)) return cache.get(file);
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const req=name=>{
   if(name in overrides)return overrides[name];
   if(name.startsWith('@/'))return load(name.slice(2)+'.ts');
   if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+'.ts');
   return require(name);
 };
 vm.runInNewContext(code,{module,exports:module.exports,require:req,...globals},{filename:file});
 if(!Object.keys(overrides).length)cache.set(file,module.exports);
 return module.exports;
}
const econ=load('lib/economy.ts');
assert.equal(econ.marioReward(0,0,false),0);
assert.equal(econ.marioReward(3200,22,true),62);
assert.equal(econ.brickReward(0,0,false),0);
assert.equal(econ.brickReward(4740,40,true),99);
assert.equal(econ.snakeReward(20,4),60);
assert.equal(econ.ECONOMY.lostTickets.reduce((a,b)=>a+b,0),40);
assert(40<=935*.05);
let bank=new econ.RoundBank();bank.start(0);
assert.equal(bank.update(100,1000),2);
assert.equal(bank.update(100,1000),0);
assert.equal(bank.update(100,3000,true),4);
assert.equal(bank.update(100,100000),0);
bank.start(100000);assert.equal(bank.update(0,110000,true),0);
let total=0;for(let n=0;n<1800;n++){bank.start(n*1000);total+=bank.update(99999,(n+1)*1000,true);}
assert.equal(total,3600);assert(total+40<9350);
const {createGame,stepGame,formation}=load('lib/space-invaders.ts');
const g=createGame();g.phase='playing';
for(let wave=1;wave<=12;wave++){
 g.aliens=[{x:100,y:100,row:0}];g.shots=[{x:100,y:100}];
 assert.equal(stepGame(g,0,{left:false,right:false,fire:false}),1+econ.invaderWaveBonus(wave));
 assert.equal(g.phase,'playing');assert.equal(g.wave,wave+1);
}
assert(formation(1000).every(a=>a.y<374),'Late waves spawn above fail line');
const {ChromaChaseGame}=load('components/games/chroma-chase/engine.ts');
const maze=new ChromaChaseGame();maze.elapseWallTime(300);assert.equal(maze.roundSeconds,180);
maze.start();maze.elapseWallTime(90);maze.togglePause();maze.elapseWallTime(89.5);assert.equal(maze.roundSeconds,.5);
maze.elapseWallTime(.5);assert.equal(maze.status,'gameover');assert.equal(maze.timedOut,true);
assert.equal(maze.drainEvents().filter(e=>e.type==='gameOver').length,1);
maze.elapseWallTime(20);assert.equal(maze.drainEvents().length,0);
const rewards=load('components/games/chroma-chase/rewards.ts',{}, {localStorage:{getItem:()=>null,setItem:()=>{}}});
const rewardTotal=[0,1,2].flatMap(level=>rewards.rewardsForLevelClear('test',level,true)).reduce((sum,r)=>sum+r.amount,0);
assert.equal(rewardTotal+Math.floor(182*3/6),191);

// Run the actual canvas component callbacks with a mock display and virtual clock.
function canvasGame(file) {
 let now=0,frame,refs=[],effects=[],state=[],paid=0;
 const b=new econ.RoundBank();
 const economyHook={startBank:()=>b.start(now), updateBank:(raw,finish=false)=>{paid+=b.update(raw,now,finish);return paid;},banked:0};
 const ctx=new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:0}):()=>{},set:()=>true});
 const canvas={width:640,height:file==='NeonMario'?420:480,getContext:()=>ctx,addEventListener:()=>{},removeEventListener:()=>{}};
 const react={
  useRef:v=>{const ref={current:v};refs.push(ref);return ref;},
  useState:v=>{const i=state.length;state.push(v);return [v,n=>{state[i]=typeof n==='function'?n(state[i]):n;}];},
  useCallback:fn=>fn,useEffect:fn=>effects.push(fn)
 };
 const jsx=(type,props)=>({type,props});
 const Component=load('components/games/'+file+'.tsx',{
  react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':'a','canvas-confetti':()=>{},
  '@/context/TicketContext':{useTickets:()=>({tickets:100,addTickets:()=>{throw Error('Unbalanced direct credit');}})},
  './useCabinetBank':{useCabinetBank:()=>economyHook},'./RoundStatus':{default:'status'}
 },{
  requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>{},
  performance:{now:()=>now},window:{addEventListener:()=>{},removeEventListener:()=>{}},
  localStorage:{getItem:()=>null,setItem:()=>{}}
 });
 const tree=Component.default();
 function find(node,pred){
  if(!node||typeof node!=='object')return;
  if(pred(node))return node;
  const children=node.props?.children;for(const c of(Array.isArray(children)?children:[children])){const v=find(c,pred);if(v)return v;}
 }
 const cv=find(tree,n=>n.type==='canvas');cv.props.ref.current=canvas;effects.forEach(fn=>fn());
 const start=find(tree,n=>n.type==='button'&&JSON.stringify(n.props.children).includes('FREE PLAY'));
 assert(start,file+' start button');start.props.onClick();
 const engine=refs.map(r=>r.current).find(x=>x&&typeof x==='object'&&'running'in x);
 return {engine,frame:(t)=>{now=t;frame(t);},get paid(){return paid;},state};
}
let brick=canvasGame('BrickBreaker');
brick.engine.ball.x=brick.engine.bricks[0].x+10;brick.engine.ball.y=brick.engine.bricks[0].y+10;brick.engine.ball.vx=0;brick.engine.ball.vy=0;
brick.frame(1000);assert.equal(brick.engine.running,true,'Hitting first remaining brick must not clear other bricks');
assert.equal(brick.engine.bricks.filter(b=>b.alive).length,39);
brick.frame(120000);assert.equal(brick.engine.running,false,'Brick round expires at 120s');
let mario=canvasGame('NeonMario');mario.frame(90000);assert.equal(mario.engine.running,false);assert.equal(mario.paid,0,'No zero-score timer reward');
let snake=canvasGame('NeonSnake');snake.engine.food={x:11,y:11};snake.frame(1000);snake.frame(1150);assert.equal(snake.paid,2,'Snake pays while alive');
snake.engine.snake[0]={x:21,y:11};snake.frame(1300);assert.equal(snake.engine.running,false);assert.equal(snake.paid,2,'Death does not pay twice');
snake=canvasGame('NeonSnake');snake.engine.snake[0]={x:21,y:11};snake.frame(1000);snake.frame(1150);assert.equal(snake.paid,0,'Zero-score crash pays zero');
console.log('PASS: all reward formulas, restart rate bound, 30-minute hidden threshold, 12 endless waves, safe high-wave formation, maze timeout incl pause, real brick early-win regression and timeout, mario timeout, snake live pay and zero-score death.');
