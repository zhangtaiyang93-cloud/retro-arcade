const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, requireFn = require, globals = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: requireFn, ...globals }, { filename: file });
  return module.exports;
}
const slots = load('lib/slots.ts', require, { crypto: globalThis.crypto });
const counts = new Map();
let total = 0;
for (let roll = 0; roll < slots.ODDS_TOTAL; roll++) {
  const receipt = slots.settleSpin(50, roll);
  counts.set(receipt.outcome.id, (counts.get(receipt.outcome.id) || 0) + 1);
  assert.equal(receipt.after, receipt.outcome.payout);
  assert.equal(receipt.net, receipt.outcome.payout - 50);
  total += receipt.outcome.payout;
}
assert.equal(total / 10000, 47.5);
assert.equal(slots.SLOT_OUTCOMES.reduce((n, o) => n + o.weight, 0), 10000);
for (const outcome of slots.SLOT_OUTCOMES) assert.equal(counts.get(outcome.id), outcome.weight);
for (const balance of [0, 25, 49, -1, NaN, Infinity, 50.5]) assert.equal(slots.settleSpin(balance, 9999), null);
assert.equal(slots.settleSpin(50, 0).after, 0);
assert.equal(slots.settleSpin(50, 9999).after, 10000);
for (const roll of [-1, 10000, 0.5, NaN]) assert.throws(() => slots.outcomeForRoll(roll));
for (let i=0;i<100;i++) { const n=slots.randomSlotRoll(); assert(n>=0&&n<10000&&Number.isInteger(n)); }

// Exercise the real provider through a minimal hook harness, with deterministic draws.
let now = 10000, roll = 0;
const saved = new Map([['retro_arcade_tickets', '100']]);
const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value) };
function mount() {
  const state = [], effects = [];
  let index = 0;
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useContext: () => null,
    useState: initial => { const i=index++; if (!(i in state)) state[i]=initial; return [state[i], v => { state[i]=typeof v==='function'?v(state[i]):v; }]; },
    useRef: initial => { const i=index++; if (!(i in state)) state[i]={current:initial}; return state[i]; },
    useEffect: (fn, deps) => { const i=index++; if (!(i in state) || deps?.some((dep,j)=>dep!==state[i][j])) {state[i]=deps;effects.push(fn);} }
  };
  const wallet = load('context/TicketContext.tsx', name => {
    if (name==='react') return react;
    if (name==='react/jsx-runtime') return {jsx: (type, props)=>props};
    if (name==='@/lib/slots') return {...slots, randomSlotRoll:()=>roll};
    if (name==='@/lib/hall') return load('lib/hall.ts');
    if (name==='@/lib/night') return load('lib/night.ts');
    if (name==='@/lib/prizes') return load('lib/prizes.ts');
    if (name==='@/lib/chip-audio') return {chipAudio:{effect:()=>{}}};
    throw new Error(name);
  }, { localStorage: storage, sessionStorage: {removeItem:()=>{}}, crypto: globalThis.crypto, window:{addEventListener:()=>{},removeEventListener:()=>{}}, document:{addEventListener:()=>{},removeEventListener:()=>{}}, Date: { now:()=>now }, setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>1, clearTimeout:()=>{} });
  const render = () => {index=0;const value=wallet.TicketProvider({children:null}).value; while(effects.length)effects.shift()(); return value;};
  assert.equal(render().spinSlots(), null, 'No spending before storage loads');
  return render;
}
let render=mount(), wallet=render();
assert.equal(wallet.tickets,100,'Legacy wallet is preserved on the title');
assert.equal(wallet.spinSlots(),null,'Intro has not started the campaign');
wallet.startNight(); wallet=render();
assert.equal(wallet.tickets,0,'Starting a new night resets the wallet explicitly');
wallet.addTickets(100);
const miss=wallet.spinSlots();
assert.equal(miss.after,50);
assert.equal(wallet.spinSlots(),null,'Double click blocked before React rerender');
assert.equal(saved.get('retro_arcade_tickets'),'50','Already persisted during reel animation');
assert.equal(wallet.spendTickets(40),true);
assert.equal(wallet.spendTickets(40),false,'Successive spends use latest balance');
assert.equal(saved.get('retro_arcade_tickets'),'10');
now+=slots.SPIN_MS;
assert.equal(render().spinSlots(),null,'Insufficient balance never pays a jackpot');
wallet.addTickets(40);
roll=9999;
assert.equal(render().spinSlots().after,10000);
assert.equal(saved.get('retro_arcade_tickets'),'10000');
render=mount();
assert.equal(render().tickets,10000,'Reload preserves exactly one payout');
assert.equal(saved.get('retro_arcade_tickets'),'10000');
assert.equal(render().spendTickets(500),true,'Prize redemption still works');
assert.equal(render().tickets,9500);
render().resetTickets();
assert.equal(saved.get('retro_arcade_tickets'),'0');
assert.equal(render().claimLostTickets('trash'),10,'Discovery pays once');
assert.equal(render().claimLostTickets('trash'),0,'Double interaction never pays twice');
assert.equal(render().tickets,10);
assert.equal(JSON.parse(saved.get('retro_arcade_wallet_v2')).pickups[0],'trash');
render=mount();
assert.equal(render().claimLostTickets('trash'),0,'Reload keeps the pickup consumed');
assert.equal(render().tickets,10,'Reload restores the matching wallet snapshot');
assert.equal(render().claimLostTickets('stool'),8);
assert.equal(render().claimLostTickets('snacks'),12);
assert.equal(render().claimLostTickets('boxes'),10);
assert.equal(render().tickets,40,'All four discoveries total exactly 40');
assert.equal(render().claimLostTickets('unknown'),0);
render().resetTickets();
assert.equal(render().claimLostTickets('stool'),0,'Resetting balance cannot farm discoveries');
render().addTickets(1000);
assert.equal(render().redeemPrize('sticker'),false,'Unknown prize IDs cannot charge the wallet');
const firstPrize=load('lib/prizes.ts').PRIZES[0];
assert.equal(render().redeemPrize(firstPrize.id),true);
assert.equal(render().redeemPrize(firstPrize.id),false,'Immediate duplicate redemption is blocked');
const snapshot=JSON.parse(saved.get('retro_arcade_wallet_v2'));
assert.equal(snapshot.tickets,1000-firstPrize.cost);
assert.equal(snapshot.prizes[0],firstPrize.name,'Prize and balance persist in one snapshot');
const deadline=render().night.deadline;
render=mount();
assert.equal(render().wonPrizes[0],firstPrize.name);
assert.equal(render().night.deadline,deadline,'Reload does not extend the night');
now=deadline;
const before=render().tickets;
render().addTickets(999);
assert.equal(render().tickets,before,'No reward can race the deadline');
assert.equal(render().redeemPrize(load('lib/prizes.ts').PRIZES[1].id),false);
assert.equal(render().spinSlots(),null);
render().finishNight('exit');
assert.equal(render().night.result.reason,'timeout');
render().finishNight('exit');
assert.equal(render().night.result.tickets,before,'Settlement is idempotent');
render().startNight();
assert.equal(render().wonPrizes.length,0); assert.equal(render().collectedPickups.length,0); assert.equal(render().tickets,0);
assert.equal(render().claimLostTickets('trash'),10,'A genuinely new night reopens discoveries');
console.log('PASS: all 10,000 outcomes, exact 95% return, invalid inputs, zero balance, jackpot, double-click, stale spending, persistence/reload, prize purchase, reset.');
console.log('PASS: campaign start, atomic prize redemption, saved deadline, no late rewards, timeout priority, idempotent settlement, new-night reset.');
