'use client';
import { useCallback, useRef, useState } from 'react';
import { useTickets } from '@/context/TicketContext';
import { RoundBank } from '@/lib/economy';
export function useCabinetBank(name: string) {
  const { addTickets } = useTickets();
  const award = useRef(addTickets);
  award.current = addTickets;
  const bank = useRef(new RoundBank());
  const [banked, setBanked] = useState(0);
  const startBank = useCallback(() => { bank.current.start(performance.now()); setBanked(0); }, []);
  const updateBank = useCallback((raw: number, finish = false) => {
    const delta = bank.current.update(raw, performance.now(), finish);
    if (delta > 0) { award.current(delta, name); setBanked(bank.current.paid); }
    return bank.current.paid;
  }, [name]);
  return { startBank, updateBank, banked };
}
