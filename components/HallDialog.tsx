'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export default function HallDialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    element.showModal();
    closeButton.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = oldOverflow; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className={`hall-dialog ${wide ? 'hall-dialog-wide' : ''}`} aria-label={title}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="hall-dialog-bar"><span className="pixel-text">{title}</span><button ref={closeButton} onClick={onClose} aria-label="Close and return to the hall">×</button></div>
    {children}
  </dialog>;
}
