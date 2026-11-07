'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { HallTarget } from '@/lib/hall';
import { ART_HEIGHT, ART_WIDTH, CABINET_OCCLUDERS, FOREGROUND_SHAPES, makeLightCycle, OBJECT_SHAPES, objectPath, shapePath } from '@/lib/hall-visuals';

export function useSceneLight(enabled: boolean, paused: boolean) {
  const [level, setLevel] = useState(1);
  useEffect(() => {
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const clear = () => { if (timer) clearTimeout(timer); timer = undefined; };
    const restart = () => {
      clear(); setLevel(1);
      if (!enabled || paused || reducedMotion.matches || document.hidden || disposed) return;
      let steps = makeLightCycle(), index = 0;
      const advance = () => {
        if (disposed) return;
        const step = steps[index++]; setLevel(step.level);
        timer = setTimeout(() => {
          if (index >= steps.length) { steps = makeLightCycle(); index = 0; }
          advance();
        }, step.ms);
      };
      advance();
    };
    restart();
    document.addEventListener('visibilitychange', restart);
    reducedMotion.addEventListener('change', restart);
    return () => { disposed = true; clear(); document.removeEventListener('visibilitychange', restart); reducedMotion.removeEventListener('change', restart); };
  }, [enabled, paused]);
  return level;
}

export function HallObjectHighlight({ target, searching = false }: { target: HallTarget; searching?: boolean }) {
  const shape = OBJECT_SHAPES[target.id];
  if (!shape) return null;
  const d = objectPath(target.id), clipId = `object-cutout-${target.id}`;
  const origin = `${target.x * ART_WIDTH / 2172}px ${(target.y + target.height) * ART_WIDTH / 2172}px`;
  const maskId = `object-visible-${target.id}`;
  return <svg className="hall-object-highlight" viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} aria-hidden="true">
    <defs>
      <clipPath id={clipId}><path d={d} clipRule="evenodd" /></clipPath>
      <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={ART_WIDTH} height={ART_HEIGHT}>
        <rect width={ART_WIDTH} height={ART_HEIGHT} fill="white" />
        {(CABINET_OCCLUDERS[target.id] || []).map((points, i) => <path key={i} d={points === OBJECT_SHAPES.stool.outline ? objectPath('stool') : shapePath(points)} fill="black" fillRule="evenodd" stroke="black" strokeWidth="2" />)}
      </mask>
    </defs>
    <g mask={`url(#${maskId})`}>
      {searching && target.id === 'snacks' ? <g className="hall-vending-shake" style={{ transformOrigin: origin } as CSSProperties}>
        <image href="/art/hall-background.png" width={ART_WIDTH} height={ART_HEIGHT} clipPath={`url(#${clipId})`} />
      </g> : !searching && <g className="hall-stable-outline" clipPath={`url(#${clipId})`}>
        <path className="hall-object-halo" d={d} fillRule="evenodd" />
        <path className="hall-object-edge" d={d} fillRule="evenodd" />
      </g>}
    </g>
  </svg>;
}

export function HallForeground() {
  return <svg className="hall-foreground" viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} aria-hidden="true">
    <defs><clipPath id="hall-foreground-cutout">{FOREGROUND_SHAPES.map((shape, index) => <path key={index} d={shapePath(shape)} />)}</clipPath></defs>
    <image href="/art/hall-background.png" width={ART_WIDTH} height={ART_HEIGHT} clipPath="url(#hall-foreground-cutout)" />
  </svg>;
}

// Reuse the painted fixtures at exactly their original coordinates. The tubes
// lose more luminance than the room, and their wall bloom fades with the fault.
export function HallTubeLights({ level }: { level: number }) {
  const tubes = [
    { x: 316, y: 132, w: 146, h: 12 },
    { x: 827, y: 146, w: 126, h: 10 },
    { x: 1374, y: 142, w: 145, h: 10 },
    { x: 1790, y: 130, w: 146, h: 10 },
  ];
  const core = Math.max(.08, level ** 2.5);
  return <svg className="hall-tube-lights" data-light-level={level.toFixed(3)} viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} aria-hidden="true">
    <defs><radialGradient id="tube-bloom-mask"><stop offset="0" stopColor="white" /><stop offset=".55" stopColor="white" stopOpacity=".7" /><stop offset="1" stopColor="white" stopOpacity="0" /></radialGradient>
      {tubes.map((tube, i) => <clipPath key={i} id={`tube-fixture-${i}`}><rect x={tube.x} y={tube.y} width={tube.w} height={tube.h} rx="5" /></clipPath>)}
    </defs>
    {tubes.map((tube, i) => <g key={i}>
      <defs><mask id={`tube-bloom-${i}`}><ellipse cx={tube.x + tube.w / 2} cy={tube.y + tube.h / 2} rx={tube.w * .7} ry="66" fill="url(#tube-bloom-mask)" /></mask></defs>
      <rect x={tube.x - tube.w * .2} y={tube.y - 66} width={tube.w * 1.4} height="160" fill="#060611" opacity={(1 - level) * .8} mask={`url(#tube-bloom-${i})`} />
      <image className="hall-tube-core" href="/art/hall-background.png" width={ART_WIDTH} height={ART_HEIGHT} clipPath={`url(#tube-fixture-${i})`} style={{ filter: `brightness(${core})` }} />
    </g>)}
  </svg>;
}
