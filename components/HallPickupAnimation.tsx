'use client';

import type { CSSProperties } from 'react';
import { INTERACTION_MS, type PickupId } from '@/lib/hall';
import { ART_HEIGHT, ART_WIDTH } from '@/lib/hall-visuals';

// All animation coordinates share the artwork's coordinate system. The wallet
// is credited by ArcadeHall only after this complete 1.8 second scene.
export default function HallPickupAnimation({ id }: { id: PickupId }) {
  const origins = { stool: [422, 447], trash: [671, 324], snacks: [777, 389], boxes: [1756, 463] };
  const [x, y] = origins[id];
  return <svg className={`hall-pickup-animation pickup-${id}`} data-pickup-animation={id}
    viewBox={`0 0 ${ART_WIDTH} ${ART_HEIGHT}`} style={{ '--pickup-duration': `${INTERACTION_MS}ms` } as CSSProperties}
    role="img" aria-label={{ stool: 'A sticky ticket stretches free from chewing gum under the stool.', trash: 'The lid opens and a raccoon peeks out holding a ticket.', snacks: 'The vending machine shakes and spits tickets out of its return slot.', boxes: 'Cardboard flaps open, dust rises and lost tickets pop out.' }[id]}>
    <defs>
      <clipPath id="pickup-bin-lid"><path d="M637 333L647 328L660 328L660 320L683 320L683 327L694 329L701 335L701 344L637 344Z" /></clipPath>
      <clipPath id="pickup-raccoon-opening"><rect x="613" y="220" width="114" height="117" /></clipPath>
      <clipPath id="pickup-stool-seat"><path d="M391 430L414 425L443 430L450 434L449 443L434 449L393 445Z" /></clipPath>
    </defs>
    {id === 'trash' && <>
      <path className="pickup-bin-mouth" d="M638 331H699V344H638Z" fill="#100c22" stroke="#4c3d65" strokeWidth="3" />
      <g clipPath="url(#pickup-raccoon-opening)"><image className="pickup-raccoon" href="/art/raccoon-peek.png" x="616" y="244" width="108" height="99" /></g>
      <g className="pickup-lid"><image href="/art/hall-background.png" width={ART_WIDTH} height={ART_HEIGHT} clipPath="url(#pickup-bin-lid)" /></g>
      <path className="pickup-surprise" d="M727 266V279M727 284V288M738 274L733 280" fill="none" stroke="#ffe879" strokeWidth="4" />
    </>}
    {id === 'boxes' && <g className="pickup-open-box">
      <path d="M1723 463L1744 451L1776 455L1776 476L1749 482L1723 475Z" fill="#251a2e" stroke="#725046" strokeWidth="2" />
      <path className="pickup-box-left" d="M1723 463L1747 468L1747 482L1722 475Z" fill="#bb7e62" stroke="#654151" strokeWidth="3" />
      <path className="pickup-box-right" d="M1747 468L1776 455L1777 475L1747 482Z" fill="#dfa578" stroke="#815359" strokeWidth="3" />
      <path d="M1723 476L1748 483L1777 476V503L1748 508L1723 502Z" fill="#ba8069" stroke="#6c4554" strokeWidth="2" />
      <path d="M1747 485V505M1730 487H1739" stroke="#edb083" strokeWidth="3" />
    </g>}
    {id === 'stool' && <>
      <g className="pickup-stool-lift"><image href="/art/hall-background.png" width={ART_WIDTH} height={ART_HEIGHT} clipPath="url(#pickup-stool-seat)" /></g>
      <path className="pickup-gum" d="M417 445L420 459L429 471L434 478" fill="none" stroke="#ef77ac" strokeWidth="5" />
      <path className="pickup-gum-glint" d="M418 446L423 459L431 472" fill="none" stroke="#ffb6d8" strokeWidth="2" />
    </>}
    {id === 'snacks' && <g className="pickup-vend-blink"><path d="M756 361H793V381H756Z" fill="#171329" /><path d="M760 364H789V368H760Z" fill="#ffe879" /><path d="M842 241L848 233M846 250H855M842 259L849 265" stroke="#ffe879" strokeWidth="3" /></g>}
    <g transform={`translate(${x} ${y})`}>
      <g className="pickup-dust" fill="#cfb69c"><rect x="-34" y="-15" width="5" height="5" /><rect x="29" y="-6" width="4" height="4" /><rect x="-12" y="-30" width="3" height="3" /></g>
      <g className="pickup-ticket-flight">
        <path d="M-15-6H-8V-9H8V-6H15V6H8V9H-8V6H-15Z" fill="#ffe879" stroke="#81502c" strokeWidth="2" />
        <path d="M-5-5V5M5-5V5" stroke="#bd7936" strokeWidth="1.5" strokeDasharray="2 2" />
        <path d="M0-3L1-1L4-1L2 1L3 4L0 2L-3 4L-2 1L-4-1L-1-1Z" fill="#9b4e32" />
      </g>
    </g>
  </svg>;
}
