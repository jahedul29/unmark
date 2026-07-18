"use client";

import { useId, useRef, useState, type ReactNode } from "react";

export default function InfoDot({ label, children }: { label: string; children: ReactNode }) {
  const [pos, setPos] = useState<{ right: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  const show = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ right: window.innerWidth - r.left + 8, top: r.top + r.height / 2 });
  };
  const hide = () => setPos(null);

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        className="infodot grid h-[15px] w-[15px] cursor-help place-items-center rounded-full border border-line2 bg-transparent p-0 font-serif text-[10px] font-bold italic leading-none text-txt3 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent"
        aria-label={`About ${label}`}
        aria-expanded={!!pos}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => (pos ? hide() : show())}
      >
        i
      </button>
      {pos ? (
        <span
          role="tooltip"
          id={id}
          className="tip fixed z-[60] w-[220px] -translate-y-1/2 rounded-[9px] border border-line bg-bg2 px-3 py-[10px] text-left text-[11.5px] font-normal normal-case leading-normal tracking-normal text-txt2 shadow-[var(--shadow)] [&_b]:font-semibold [&_b]:text-txt"
          style={{ right: pos.right, top: pos.top }}
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
