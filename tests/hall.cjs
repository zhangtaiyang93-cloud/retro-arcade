const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module, exports: module.exports });
  return module.exports;
}
const hall = load('lib/hall.ts'), games = load('lib/games.ts').ARCADE_GAMES;
assert.equal(hall.HALL_TARGETS.filter(t => t.kind === 'game').length, games.length);
for (const game of games) assert.equal(hall.HALL_TARGETS.filter(t => t.slug === game.slug).length, 1);
for (const target of hall.HALL_TARGETS) {
  assert.equal(hall.nearestTarget(target.x).id, target.id, 'Every target is reachable on foot');
  assert(target.x - target.width / 2 >= 0 && target.x + target.width / 2 <= hall.WORLD_WIDTH);
  let x = 105;
  for (let frame = 0; frame < 600; frame++) x = hall.stepPosition(x, 0, 1 / 60, target.x);
  assert.equal(x, hall.clampPosition(target.x), 'Click-to-walk reaches the walkable target without oscillation');
  assert.equal(hall.stepPosition(x, 0, .05, target.x), x);
}
assert.equal(hall.nearestTarget(105).id, 'exit', 'The entrance is now an exit interaction');
assert.equal(hall.stepPosition(hall.WALK_MIN_X, -1, .05, null), hall.WALK_MIN_X);
assert.equal(hall.stepPosition(hall.WALK_MAX_X, 1, .05, null), hall.WALK_MAX_X);
assert.equal(hall.stepPosition(700, 1, .05, 500), 714.5, 'Manual input overrides a click destination');
let at30 = 400, at60 = 400;
for (let i = 0; i < 30; i++) at30 = hall.stepPosition(at30, 1, 1 / 30, null);
for (let i = 0; i < 60; i++) at60 = hall.stepPosition(at60, 1, 1 / 60, null);
assert(Math.abs(at30 - at60) < 1e-6, 'Walking speed is independent of refresh rate');
assert.equal(hall.stepPosition(400, 1, 1, null), 690, 'Throttled rendering does not turn a walk into a crawl');
assert.equal(hall.cameraOffset(105, 400, .55), 0);
assert.equal(hall.cameraOffset(2057, 400, .55), hall.WORLD_WIDTH * .55 - 400);
assert.equal(hall.cameraOffset(500, 2200, 1), 0);
const sum = Object.values(hall.LOST_TICKETS).reduce((n, p) => n + p.amount, 0);
assert.equal(sum, 40); assert(sum < 935 * .05);
assert(hall.INTERACTION_MS >= 1000 && hall.INTERACTION_MS <= 2000);
console.log('PASS: six correct cabinet routes, all proximity targets reachable, click-to-walk arrival, both boundaries, input override, frame-rate-independent movement, camera bounds, 40-ticket limit and animation duration.');

const visuals = load('lib/hall-visuals.ts');
for (const target of hall.HALL_TARGETS) assert(visuals.OBJECT_SHAPES[target.id], `Traced outline for ${target.id}`);
for (const [px, py, id] of [[350,340,'invaders'],[478,330,'chroma'],[940,335,'bricks'],[1075,340,'plumber'],[1390,340,'snake'],[1520,340,'slots'],[1830,400,'counter'],[420,436,'stool'],[668,370,'trash'],[770,320,'snacks'],[1750,477,'boxes']]) {
  assert.equal(visuals.objectAt(px,py),id);
  assert.equal(visuals.floorAt(px,py),false,'An object click cannot be a walking click');
}
for (const [px,py] of [[600,100],[1500,220],[60,510],[1250,640],[1990,510]]) assert.equal(visuals.floorAt(px,py),false,'Walls and foreground cannot move the player');
for (const [px,py] of [[500,550],[900,565],[1450,550],[1840,550]]) assert.equal(visuals.floorAt(px,py),true,'The open aisle remains walkable');
assert.notEqual(visuals.objectAt(410,465),'stool','Stool gaps pass through to the object behind');
for (let sample=0;sample<1000;sample++) {
  const steps = visuals.makeLightCycle();
  assert(steps.some(step=>step.level<.6),'Each fault is noticeably darker than the artwork');
  assert(steps.every(step=>step.level>=.34 && step.level<=1),'Never brighter than approved art');
  assert(steps.every(step=>step.ms>=140),'No zero-delay flicker loops');
  assert.equal(steps[0].level,1); assert.equal(steps.at(-1).level,1);
}
console.log('PASS: contour hit tests, stool gaps, road-only movement, foreground exclusion, randomized light bounds and recovery.');

for (const [id,px,py] of [['bricks',1016,445],['plumber',1180,398],['snake',1350,470],['slots',1485,445],['snacks',830,390]]) {
 assert.notEqual(visuals.objectAt(px,py),id,'Props in front cannot select a cabinet behind them');
 assert.equal(visuals.floorAt(px,py),false);
}
console.log('PASS: foreground props occlude cabinet selection.');

for (const target of hall.HALL_TARGETS.filter(t=>t.pickup)) {
 assert.equal(hall.targetAvailable(target,[target.pickup]),false);
 assert.equal(hall.nearestTarget(target.x,[target.pickup]),undefined,'A collected pickup cannot become the E target or fall through to a cabinet');
 assert.equal(hall.targetAvailable(target,[]),true);
}
for (const [x,y,id] of [[270,340,'invaders'],[545,340,'chroma'],[876,340,'bricks'],[1015,255,'plumber'],[1338,340,'snake'],[1480,250,'slots'],[860,250,'snacks']]) {
 assert.equal(visuals.objectAt(x,y),id,'Complete cabinet sides belong to their object');
}
for (const [x,y] of [[180,620],[230,540],[1200,600],[1900,550]]) assert.equal(visuals.foregroundAt(x,y),false,'Open floor gaps must never cover the character');
console.log('PASS: collected pickup lockout, full cabinet side panels, foreground gaps.');
