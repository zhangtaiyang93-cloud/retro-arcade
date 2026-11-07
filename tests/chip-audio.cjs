const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript'),crypto=require('node:crypto');
const timers=new Map(),nodes=[];let timerId=0,context,preferences={music:true,effects:true};
const document={hidden:false};
class Param {setValueAtTime(v,t){assert(Number.isFinite(v)&&Number.isFinite(t));}linearRampToValueAtTime(v,t){this.setValueAtTime(v,t);}exponentialRampToValueAtTime(v,t){assert(v>0);this.setValueAtTime(v,t);}setTargetAtTime(v,t){this.setValueAtTime(v,t);}}
class Node {constructor(){this.gain=new Param();this.frequency=new Param();}connect(){}disconnect(){}start(t){assert(t>=context.currentTime);}stop(){this.stopped=true;}}
class AudioContext {constructor(){context=this;this.currentTime=0;this.state='suspended';this.destination={};}resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}createGain(){return new Node();}createOscillator(){const n=new Node();nodes.push(n);return n;}}
class Recording {constructor(){this.volume=1;this.paused=true;this.muted=false;this.currentTime=0;this.plays=0;}play(){this.plays++;this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
function load(file,req=()=>{}){const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module:m,exports:m.exports,require:req,window:{},document,localStorage:{getItem:()=>JSON.stringify(preferences)},AudioContext,setInterval:fn=>{const id=++timerId;timers.set(id,fn);return id;},clearInterval:id=>timers.delete(id)});return m.exports;}
const music=load('lib/music.ts'),{chipAudio:a}=load('lib/chip-audio.ts',name=>{assert.equal(name,'./music');return music;});
function finishFade(){for(let i=0;i<12;i++)for(const fn of [...timers.values()])fn();}
(async()=>{
 const recording=new Recording();a.attachMusic(recording);a.play('hall');
 assert.equal(recording.plays,0,'No autoplay before a gesture');assert.equal(recording.loop,true);
 a.effect('door');assert.equal(nodes.length,0);
 await a.unlock();finishFade();
 assert.equal(recording.plays,1);assert.equal(recording.volume,.22);
 assert.equal(nodes.length,0,'Music never synthesizes extra oscillators');
 recording.currentTime=42;
 for(const cue of ['intro','game','complete','closing','owner','hall']){a.play(cue);finishFade();assert.equal(recording.currentTime,42);assert.equal(recording.plays,1,'Scenes cannot restart or layer music');}
 a.play('game');finishFade();assert.equal(recording.volume,.13,'Games lower the background mix');
 a.settings(false,true);assert(recording.paused&&recording.muted);assert.equal(timers.size,0);
 a.effect('key');assert.equal(nodes.length,5,'SFX works independently of music OFF');
 a.settings(true,false);await Promise.resolve();await Promise.resolve();finishFade();
 assert(!recording.paused&&!recording.muted);assert.equal(recording.currentTime,42);
 const muted=nodes.length;a.effect('prize');assert.equal(nodes.length,muted);
 preferences.effects=false;a.settings(true,true);a.effect('door');assert.equal(nodes.length,muted,'Global SFX preference is respected');
 document.hidden=true;a.suspend();assert(recording.paused&&recording.muted);assert.equal(context.state,'suspended');assert.equal(timers.size,0);
 document.hidden=false;await a.unlock();finishFade();assert(!recording.paused);assert.equal(recording.currentTime,42);
 a.suspend();
 // A delayed play promise must not resurrect music after mute.
 let release;const delayed=new Recording();delayed.play=function(){this.plays++;return new Promise(resolve=>{release=()=>{this.paused=false;resolve();};});};
 a.attachMusic(delayed);await a.unlock();a.settings(false,true);release();await Promise.resolve();await Promise.resolve();
 assert(delayed.paused&&delayed.muted,'Mute wins over an in-flight play request');a.suspend();
 const mp3=fs.readFileSync('public'+music.SOUNDTRACK.src);
 assert(mp3.length>1000000&&mp3.subarray(0,3).toString()==='ID3','Recording is bundled, not an HTML download error');
 const hash=crypto.createHash('sha256').update(mp3).digest('hex');
 assert(fs.readFileSync('public/audio/CREDITS.txt','utf8').includes(hash));
 assert.equal(music.SOUNDTRACK.artist,'Eric Skiff');assert.equal(music.SOUNDTRACK.license,'CC BY 4.0');
 console.log('PASS: licensed recording integrity, gesture gating, one continuous player across scenes, lower game mix, independent mute, hidden-tab suspension, resume and late-play race.');
})().catch(error=>{console.error(error);process.exitCode=1;});
