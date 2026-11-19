"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { tradeByKey, tradeForBusiness } from "@/lib/business";
import type { Trade } from "@/content/studio";

type Biz = {
  /** The visitor's business name: from a /for/… link, or typed on the page. Empty when unknown. */
  name: string;
  trade: Trade;
  setName: (name: string) => void;
  setTrade: (key: string) => void;
};

const BizContext = createContext<Biz | null>(null);

/** Holds who the page is talking to, so the demo phone, the hero and the contact form agree. */
export function BizProvider({ initialName, children }: { initialName?: string | null; children: ReactNode }) {
  const [name, setName] = useState(initialName ?? "");
  const [tradeKey, setTradeKey] = useState(() => tradeForBusiness(initialName));
  const value = useMemo<Biz>(
    () => ({ name, trade: tradeByKey(tradeKey), setName: (next) => setName(next.slice(0, 40)), setTrade: setTradeKey }),
    [name, tradeKey],
  );
  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
}

export function useBiz() {
  const biz = useContext(BizContext);
  if (!biz) throw new Error("useBiz needs a BizProvider above it");
  return biz;
}
