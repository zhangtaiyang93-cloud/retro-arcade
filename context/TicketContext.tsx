'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface TicketContextType {
  tickets: number;
  addTickets: (amount: number, reason?: string) => void;
  spendTickets: (amount: number, reason?: string) => boolean;
  resetTickets: () => void;
  lastTransactionMessage: string | null;
}

const STORAGE_KEY = 'retro_arcade_tickets';
const INITIAL_TICKETS = 25; // Starter tickets so players can try spending immediately!

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export function TicketProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<number>(INITIAL_TICKETS);
  const [lastTransactionMessage, setLastTransactionMessage] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          setTickets(parsed);
        }
      } else {
        localStorage.setItem(STORAGE_KEY, INITIAL_TICKETS.toString());
      }
    } catch {
      // localStorage fallback if unavailable
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save to localStorage whenever tickets change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(STORAGE_KEY, tickets.toString());
    } catch {
      // ignore storage errors
    }
  }, [tickets, isInitialized]);

  // Flash toast message helper
  const notify = (msg: string) => {
    setLastTransactionMessage(msg);
    setTimeout(() => {
      setLastTransactionMessage((current) => (current === msg ? null : current));
    }, 3200);
  };

  /**
   * Add tickets earned from games or bonuses
   */
  const addTickets = (amount: number, reason?: string) => {
    if (amount <= 0) return;
    setTickets((prev) => {
      const next = prev + amount;
      notify(`+${amount} Tickets! ${reason ? `(${reason})` : '🎉'}`);
      return next;
    });
  };

  /**
   * Spend tickets at prize counter.
   * Returns false if insufficient tickets.
   * Ticket count NEVER drops below zero.
   */
  const spendTickets = (amount: number, reason?: string): boolean => {
    if (amount <= 0) return true;
    if (tickets < amount) {
      notify(`❌ Not enough tickets! Need ${amount}, but you have ${tickets}.`);
      return false;
    }

    setTickets((prev) => {
      if (prev < amount) return prev; // Safety guard
      const next = Math.max(0, prev - amount);
      notify(`-${amount} Tickets spent! ${reason ? `(${reason})` : '🛍️'}`);
      return next;
    });
    return true;
  };

  const resetTickets = () => {
    setTickets(INITIAL_TICKETS);
    notify(`Ticket wallet reset to ${INITIAL_TICKETS} starter tickets.`);
  };

  return (
    <TicketContext.Provider
      value={{
        tickets,
        addTickets,
        spendTickets,
        resetTickets,
        lastTransactionMessage
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets() {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
}
