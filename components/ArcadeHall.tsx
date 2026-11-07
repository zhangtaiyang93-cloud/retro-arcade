'use client';

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useTickets } from '@/context/TicketContext';
import { formatClock } from '@/lib/night';
import { chipAudio } from '@/lib/chip-audio';
import { getGameBySlug } from '@/lib/games';
import { cameraOffset, clampPosition, HALL_POSITION_KEY, HALL_TARGETS, INTERACTION_MS, LOST_TICKETS, nearestTarget, targetAvailable, stepPosition, WALK_FEET_Y, WORLD_HEIGHT, WORLD_WIDTH, type HallTarget, type PickupId } from '@/lib/hall';
import { ART_WIDTH, floorAt, objectAt } from '@/lib/hall-visuals';
import { HallForeground, HallObjectHighlight, HallTubeLights, useSceneLight } from './HallSceneEffects';
import HallPickupAnimation from './HallPickupAnimation';
import GameCard from './GameCard';
import HallDialog from './HallDialog';
import PrizeShop from './PrizeShop';
import './arcade-hall.css';

type Panel = { kind: 'game'; slug: string } | { kind: 'prizes' } | { kind: 'found'; id: PickupId; amount: number } | { kind: 'help' };
const FRAME_TIMES = [120, 80, 90, 100, 120, 80, 90, 100];
function walkFrame(elapsed: number) {
  let t = elapsed % 780;
  for (let i = 0; i < FRAME_TIMES.length; i++) { if (t < FRAME_TIMES[i]) return i; t -= FRAME_TIMES[i]; }
  return 0;
}

export default function ArcadeHall() {
  const { tickets, isInitialized, claimLostTickets, collectedPickups, night, remainingMs, wonPrizes } = useTickets();
  const [pose, setPose] = useState({ x: 260, frame: 2, facing: 1, moving: false });
  const [viewport, setViewport] = useState({ width: 1200, height: 440 });
  const [panel, setPanel] = useState<Panel | null>(null);
  const [animation, setAnimation] = useState<HallTarget | null>(null);
  const [paused, setPaused] = useState(false);
  const [flicker, setFlicker] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [assetError, setAssetError] = useState(false);
  const prizeCount = wonPrizes.length;
  const [message, setMessage] = useState('Walk up to a cabinet. There is still time for one more game.');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [overFloor, setOverFloor] = useState(false);
  const lightLevel = useSceneLight(flicker && assetsReady, paused);
  const stage = useRef<HTMLDivElement>(null);
  const x = useRef(260);
  const keys = useRef(new Set<string>());
  const touchDirection = useRef(0);
  const destination = useRef<number | null>(null);
  const busy = useRef(false);
  const blocked = useRef(true);
  const animationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchBeat, setSearchBeat] = useState('');
  const collected = useRef(collectedPickups);
  collected.current = collectedPickups;
  const claim = useRef(claimLostTickets);
  claim.current = claimLostTickets;
  blocked.current = paused || !!panel || !!animation || !assetsReady || !isInitialized || night?.status !== 'playing';

  const savePosition = useCallback(() => {
    try { sessionStorage.setItem(HALL_POSITION_KEY, String(x.current)); } catch { /* use current position */ }
  }, []);
  const stop = useCallback(() => {
    keys.current.clear(); touchDirection.current = 0; destination.current = null;
  }, []);
  const closePanel = useCallback(() => {
    stop(); setPanel(null); stage.current?.focus({ preventScroll: true });
  }, [stop]);

  const interact = useRef<(target: HallTarget) => void>(() => {});
  interact.current = target => {
    if (blocked.current || busy.current || !targetAvailable(target, collected.current) || Math.abs(x.current - target.x) > target.radius) return;
    stop(); savePosition(); chipAudio.effect('ui');
    if (target.kind === 'exit') { window.dispatchEvent(new Event('arcade:exit')); return; }
    setMessage(`You’re at ${target.label.toLowerCase()}. Stay for a while.`);
    if (target.kind === 'game') { setPanel({ kind: 'game', slug: target.slug! }); return; }
    if (target.kind === 'prizes') { setPanel({ kind: 'prizes' }); return; }
    const id = target.pickup!;
    busy.current = true;
    setAnimation(target);
    setSearchBeat('Taking a closer look…');
    revealTimer.current = setTimeout(() => setSearchBeat({ trash: 'Oh! The night manager.', boxes: 'Someone forgot to unpack.', snacks: 'That is definitely not a snack.', stool: 'One very stubborn piece of gum.' }[id]), 650);
    setMessage(id === 'trash' ? 'Something is rustling inside…' : 'Let’s take a closer look…');
    animationTimer.current = setTimeout(() => {
      const amount = claim.current(id);
      busy.current = false;
      setAnimation(null);
      if (amount > 0) { setPanel({ kind: 'found', id, amount }); setMessage('A little exploring pays off. Your tickets are safely in your pocket.'); }
      else setMessage('Already searched. Nothing left this time.');
    }, INTERACTION_MS);
  };

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(HALL_POSITION_KEY);
      if (saved !== null) x.current = clampPosition(Number(saved));
      const preference = localStorage.getItem('retro_arcade_hall_lights');
      setFlicker(preference === 'on' || (preference !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches));
    } catch { /* Defaults remain playable with storage disabled. */ }
    setPose(previous => ({ ...previous, x: x.current }));
    const element = stage.current!;
    const observer = new ResizeObserver(() => setViewport({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element);
    window.addEventListener('pagehide', savePosition);
    return () => { observer.disconnect(); window.removeEventListener('pagehide', savePosition); savePosition(); if (animationTimer.current) clearTimeout(animationTimer.current); if (revealTimer.current) clearTimeout(revealTimer.current); };
  }, [savePosition]);

  useEffect(() => {
    let active = true;
    const load = (url: string) => new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = reject; image.src = url; });
    Promise.all(['/art/hall-background.png', '/art/streetwear-walk-sheet.png', '/art/streetwear-idle.png', '/art/raccoon-peek.png'].map(load))
      .then(() => { if (active) setAssetsReady(true); }).catch(() => { if (active) setAssetError(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof HTMLElement && event.target.matches('input, textarea, select'))) return;
      if (blocked.current) return;
      const key = event.key.toLowerCase();
      if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) {
        event.preventDefault(); keys.current.add(key); destination.current = null; setHoveredId(null);
      }
      if (key === 'e' && !event.repeat) {
        event.preventDefault(); const target = nearestTarget(x.current, collected.current);
        if (target) interact.current(target);
        else setMessage('Move a little closer to a cabinet or something worth a look.');
      }
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const loseFocus = () => stop();
    const visibility = () => { if (document.hidden) stop(); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', loseFocus); document.addEventListener('visibilitychange', visibility);
    let request = 0, last = performance.now(), elapsed = 0, facing = 1;
    const tick = (now: number) => {
      const dt = (now - last) / 1000; last = now;
      let moving = false;
      if (stage.current?.closest('[inert]')) stop();
      if (!blocked.current && !document.hidden) {
        const direction = touchDirection.current || (Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft')));
        const next = stepPosition(x.current, direction, dt, destination.current);
        moving = Math.abs(next - x.current) > .001;
        if (moving) { facing = next > x.current ? 1 : -1; elapsed += Math.min(dt, 1) * 1000; }
        x.current = next;
        if (destination.current !== null && Math.abs(next - destination.current) < 1) {
          destination.current = null;
        }
      }
      const roundedX = Math.round(x.current), frame = moving ? walkFrame(elapsed) : 2;
      setPose(previous => previous.x === roundedX && previous.frame === frame && previous.facing === facing && previous.moving === moving ? previous : { x: roundedX, frame, facing, moving });
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(request); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', loseFocus); document.removeEventListener('visibilitychange', visibility); };
  }, [stop]);

  const inspectTarget = (target: HallTarget) => {
    if (blocked.current || !targetAvailable(target, collected.current)) return;
    stop();
    stage.current?.focus({ preventScroll: true });
    if (Math.abs(x.current - target.x) <= target.radius) { interact.current(target); return; }
    setMessage(`Move closer to ${target.label.toLowerCase()} first. Click the floor to walk.`);
  };
  const toggleLights = () => {
    setFlicker(previous => { try { localStorage.setItem('retro_arcade_hall_lights', previous ? 'off' : 'on'); } catch { /* optional preference */ } return !previous; });
  };
  const scale = viewport.height / WORLD_HEIGHT;
  const camera = cameraOffset(pose.x, viewport.width, scale);
  const nearest = nearestTarget(pose.x, collectedPickups);
  const hovered = HALL_TARGETS.find(target => target.id === (hoveredId || focusedId) && targetAvailable(target, collectedPickups));
  const activeTarget = !paused && !panel && assetsReady ? animation?.id === 'snacks' ? animation : hovered : undefined;
  const tooltipTarget = !blocked.current ? hovered : undefined;
  const tooltipDetail = tooltipTarget ? tooltipTarget.kind === 'exit' ? 'LEAVE & SETTLE' : tooltipTarget.kind === 'pickup' ? 'EXAMINE' : tooltipTarget.kind === 'prizes' ? 'REDEEM PRIZES' : tooltipTarget.slug === 'neon-slots' ? '50 TICKETS / SPIN' : 'FREE PLAY' : '';
  const tooltipLeft = tooltipTarget ? Math.max(120, Math.min(viewport.width - 120, tooltipTarget.x * scale - camera)) : 0;
  const scenePoint = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rect.left + camera) / scale * ART_WIDTH / WORLD_WIDTH, y: (event.clientY - rect.top) / scale * ART_WIDTH / WORLD_WIDTH };
  };
  const game = panel?.kind === 'game' ? getGameBySlug(panel.slug) : null;

  return <section className="arcade-hall" aria-label="Interactive arcade hall">
    <div className="hall-heading"><div><p className="hall-eyebrow">ONE LAST ROUND · SIX CABINETS · A POCKET FULL OF POSSIBILITIES</p><h2 className="pixel-text glow-pink">BEFORE CLOSING</h2></div><span className="hall-open-sign pixel-text">CLOSES IN {formatClock(remainingMs)}</span></div>
    <div className="hall-shell">
      <div className="hall-hud">
        <div className="hall-floor-label"><span className="hall-led" /><span className="pixel-text glow-cyan">ARCADE FLOOR</span></div>
        <div className="hall-counters"><span className="hall-wallet"><small>TICKETS</small><strong className="pixel-text glow-yellow">{tickets.toLocaleString()}</strong></span><span><small>PRIZES</small><strong className="pixel-text">{prizeCount}<i>/6</i></strong></span></div>
        <div className="hall-switches"><button onClick={toggleLights} aria-pressed={flicker} aria-label={flicker ? 'Use steady scene lighting' : 'Enable flickering scene lighting'} title="Scene lighting">{flicker ? '◉' : '○'}<span>LIGHTS</span></button><button onClick={() => { stop(); setPaused(value => !value); }} aria-label={paused ? 'Resume walking' : 'Pause walking'} aria-pressed={paused}>{paused ? '▶' : 'Ⅱ'}</button><button onClick={() => { stop(); setPanel({ kind: 'help' }); }} aria-label="How to play">?</button></div>
      </div>

      <div className="hall-viewport" ref={stage} tabIndex={0} aria-label="Arcade scene. A and D or arrow keys to walk. Click only the floor to move. Near an object, click it or press E to interact."
        style={{ cursor: hovered ? 'pointer' : overFloor ? 'crosshair' : 'default' }}
        onPointerMove={event => {
          if (blocked.current || event.pointerType === 'touch' || (event.target as Element).closest('[data-hall-ui]')) { setHoveredId(null); setOverFloor(false); return; }
          const point = scenePoint(event);
          const hit = HALL_TARGETS.find(target => target.id === objectAt(point.x, point.y));
          setHoveredId(hit && targetAvailable(hit, collected.current) ? hit.id : null); setOverFloor(floorAt(point.x, point.y));
        }}
        onPointerLeave={() => { setHoveredId(null); setOverFloor(false); }}
        onClick={event => {
          if (blocked.current) return;
          const point = scenePoint(event);
          const targetId = objectAt(point.x, point.y);
          if (targetId) { const target = HALL_TARGETS.find(item => item.id === targetId); if (target) inspectTarget(target); return; }
          if (!floorAt(point.x, point.y)) return;
          stop(); setHoveredId(null); destination.current = clampPosition(point.x / ART_WIDTH * WORLD_WIDTH);
          stage.current?.focus({ preventScroll: true });
        }}>
        <div className="hall-camera" style={{ width: WORLD_WIDTH, height: WORLD_HEIGHT, transform: `translateX(${-camera}px) scale(${scale})` }}>
          <div className="hall-scene-art" style={{ filter: `brightness(${lightLevel})` }}>
            <img className="hall-background" src="/art/hall-background.png" width={WORLD_WIDTH} height={WORLD_HEIGHT} alt="A worn neon arcade with six cabinets, old stools, a snack machine and a prize counter." draggable={false} />
            <HallTubeLights level={lightLevel} />
            {activeTarget && <HallObjectHighlight key={activeTarget.id} target={activeTarget} searching={!!animation} />}
            {animation?.pickup && <HallPickupAnimation key={animation.pickup} id={animation.pickup} />}
            <div className={`hall-player ${pose.moving ? 'is-walking' : ''} ${animation ? `is-searching ${pose.x < animation.x ? 'search-left' : ''}` : ''}`} style={{ left: pose.x, top: WALK_FEET_Y }} role="img" aria-label={pose.moving ? 'Your character is walking' : 'Your character is standing'}>
              <div className="hall-player-shadow" />
              {pose.moving ? <div className="hall-player-sprite" style={{ backgroundPosition: `${pose.frame % 4 * 100 / 3}% ${Math.floor(pose.frame / 4) * 100}%`, transform: `scaleX(${pose.facing})` }} />
                : <img className="hall-player-idle" src="/art/streetwear-idle.png" alt="" draggable={false} style={{ transform: `scaleX(${pose.facing})` }} />}
            </div>
            <HallForeground />
            <div className="hall-scene-vignette" />
          </div>

          <div className="hall-targets">
            {HALL_TARGETS.filter(target => targetAvailable(target, collectedPickups)).map(target => <button key={target.id} className={`hall-target ${target.kind === 'pickup' ? 'hall-secret' : 'hall-machine'} ${nearest?.id === target.id ? 'is-near' : ''}`} disabled={blocked.current}
              tabIndex={target.x * scale < camera || target.x * scale > camera + viewport.width ? -1 : 0}
              style={{ left: target.x - target.width / 2, top: target.y, width: target.width, height: target.height }}
              aria-label={`${target.kind === 'pickup' ? 'Examine' : target.kind === 'prizes' ? 'Visit' : 'Open'} ${target.label}`}
              onFocus={() => setFocusedId(target.id)} onBlur={() => setFocusedId(null)}
              onClick={event => { event.stopPropagation(); inspectTarget(target); }} />)}
          </div>
        </div>
        {!assetsReady && <div className="hall-stage-overlay"><strong className="pixel-text glow-cyan">{assetError ? 'THE LIGHTS ARE OUT' : 'WARMING UP THE TUBES…'}</strong><p>{assetError ? 'The scene could not load. Please refresh to try again.' : 'Loading the arcade floor'}</p>{assetError && <button className="arcade-btn" onClick={event => { event.stopPropagation(); window.location.reload(); }}>RETRY</button>}</div>}
        {paused && <div className="hall-stage-overlay"><strong className="pixel-text glow-pink">TAKE A BREATHER</strong><button className="arcade-btn" onClick={event => { event.stopPropagation(); setPaused(false); }}>BACK TO THE FLOOR</button></div>}
        {tooltipTarget && <div className="hall-hover-tooltip" role="tooltip" style={{ left: tooltipLeft, top: Math.max(14, tooltipTarget.y * scale - 72) }}>
          <strong className="pixel-text">{tooltipTarget.label}</strong><span>{tooltipDetail}</span>
          <small>{Math.abs(pose.x - tooltipTarget.x) <= tooltipTarget.radius ? 'CLICK / E' : 'MOVE CLOSER'}</small>
        </div>}
        {nearest && !tooltipTarget && !paused && !panel && !animation && assetsReady && <button data-hall-ui className="hall-near-prompt" onClick={event => { event.stopPropagation(); interact.current(nearest); }}><kbd>E</kbd><span>{nearest.kind === 'pickup' ? `EXAMINE · ${nearest.label}` : nearest.label}</span></button>}
        {animation && <span className="hall-search-label" role="status">{searchBeat}</span>}
      </div>

      <div className="hall-controls">
        <div className="hall-movement">
          {([-1, 1] as const).map(direction => <button key={direction} className="hall-move-button" aria-label={direction === -1 ? 'Walk left' : 'Walk right'} disabled={!!panel || !!animation || paused || !assetsReady}
            onPointerDown={event => { if (blocked.current) return; stop(); event.currentTarget.setPointerCapture(event.pointerId); touchDirection.current = direction; }}
            onPointerUp={() => { touchDirection.current = 0; }} onPointerCancel={() => { touchDirection.current = 0; }} onLostPointerCapture={() => { touchDirection.current = 0; }}
            onKeyDown={event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!blocked.current) { stop(); touchDirection.current = direction; } } }}
            onKeyUp={() => { touchDirection.current = 0; }} onBlur={() => { touchDirection.current = 0; }}>{direction === -1 ? '←' : '→'}</button>)}
          <span><kbd>A</kbd><kbd>D</kbd> MOVE</span>
        </div>
        <button className="hall-interact-button" disabled={!nearest || !!panel || !!animation || paused || !assetsReady} onClick={() => { if (nearest) interact.current(nearest); }}><kbd>E</kbd> INTERACT</button>
        <span className="hall-click-hint">CLICK FLOOR TO WALK · E TO INTERACT</span>
        <span className="hall-free-play">5 FREE GAMES <i>·</i> 1 TICKET SLOT</span>
      </div>
    </div>
    <div className="hall-below"><p role="status">{message}</p><span>Some corners have stories. Look closer.</span></div>

    {panel && <HallDialog title={panel.kind === 'game' ? 'CABINET SELECT' : panel.kind === 'prizes' ? 'PRIZE COUNTER' : panel.kind === 'found' ? 'A LITTLE LUCK' : 'WELCOME, NIGHT OWL'} wide={panel.kind === 'prizes'} onClose={closePanel}>
      {game && <GameCard game={game} onEnter={savePosition} />}
      {panel.kind === 'prizes' && <PrizeShop />}
      {panel.kind === 'found' && <div className="hall-found"><div className="hall-ticket-art" aria-hidden="true">★</div><p className="hall-eyebrow">{LOST_TICKETS[panel.id].title}</p><h3 className="pixel-text glow-yellow">+{panel.amount} TICKETS</h3><p>{LOST_TICKETS[panel.id].message}</p><span>Already tucked safely into your wallet.</span><button className="arcade-btn arcade-btn-yellow" onClick={closePanel}>POCKET IT & KEEP GOING</button></div>}
      {panel.kind === 'help' && <div className="hall-help"><h3 className="pixel-text glow-cyan">MAKE YOURSELF AT HOME.</h3><p><kbd>A</kbd> <kbd>D</kbd> or arrow keys to walk. <kbd>E</kbd> to interact when you are close.</p><p>Only the floor moves your character. Walk close to a cabinet or counter, then click it or press E. Read the game card before choosing START GAME. On a phone, hold the arrow buttons or tap the floor.</p><p>Hover over an object for its name and a short hint. Light follows the complete object when you hover over it. Searched objects no longer react.</p><p>Five games are free. NEON LUCK costs 50 tickets per spin. Trade your tickets at the counter.</p><p>There may be something under a stool or in a forgotten corner. Ordinary objects keep their secrets until you check.</p><p>Find all six prizes and leave through the EXIT before closing. The 30-minute clock keeps running during games, menus and walking pauses. The LIGHTS switch keeps the scene steady whenever you prefer. It never changes the surrounding controls.</p><button className="arcade-btn" onClick={closePanel}>LET’S LOOK AROUND</button></div>}
    </HallDialog>}
  </section>;
}
