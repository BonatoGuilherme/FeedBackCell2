"use client";

/** "↓ desça pelo prédio": pisca devagar e some depois da primeira rolagem. */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function DicaDescer() {
  const [sumiu, setSumiu] = useState(false);
  useEffect(() => {
    const aoRolar = () => {
      if (window.scrollY > 40) setSumiu(true);
    };
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);
  return (
    <p className={cn("topo__descer", sumiu && "topo__descer--sumiu")}>
      <span aria-hidden="true">↓</span> desça pelo prédio
    </p>
  );
}
