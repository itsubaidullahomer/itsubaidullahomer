"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Biz = {
  /** The visitor's business name: from a /for/… link, or typed into the contact form. Empty when unknown. */
  name: string;
  setName: (name: string) => void;
};

const BizContext = createContext<Biz | null>(null);

/** Holds who the page is talking to, so the hero and the contact form agree. */
export function BizProvider({ initialName, children }: { initialName?: string | null; children: ReactNode }) {
  const [name, setName] = useState(initialName ?? "");
  const value = useMemo<Biz>(() => ({ name, setName: (next) => setName(next.slice(0, 40)) }), [name]);
  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
}

export function useBiz() {
  const biz = useContext(BizContext);
  if (!biz) throw new Error("useBiz needs a BizProvider above it");
  return biz;
}
