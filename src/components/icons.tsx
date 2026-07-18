import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconBrush = (p: P) => (
  <svg {...base(p)}>
    <path d="M15 4 20 9 9.5 19.5a3 3 0 0 1-2 .9l-3.6.3.3-3.6a3 3 0 0 1 .9-2Z" />
    <path d="m13.5 6.5 4 4" />
  </svg>
);
export const IconEraser = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 15.5 11 8.5a2.5 2.5 0 0 1 3.5 0l3 3a2.5 2.5 0 0 1 0 3.5L15 18H8Z" />
    <path d="M8 18h12" />
  </svg>
);
export const IconRect = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="6" width="16" height="12" rx="1" strokeDasharray="3 3" />
  </svg>
);
export const IconLasso = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12c0-4 4-7 8-7s8 3 8 6-3 6-7 6c-2 0-3 1-3 2.5" strokeDasharray="3 3" />
    <circle cx="6" cy="19" r="1.6" />
  </svg>
);
export const IconSparkles = (p: P) => (
  <svg {...base(p)}>
    <path d="m12 3 1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3Z" />
    <path d="M18 15.5 18.7 17.3 20.5 18l-1.8.7L18 20.5 17.3 18.7 15.5 18l1.8-.7Z" />
  </svg>
);
export const IconPixel = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2M11 8v6M8 11h6" />
  </svg>
);
export const IconFit = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
  </svg>
);
export const IconUndo = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3" />
  </svg>
);
export const IconRedo = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3" />
  </svg>
);
export const IconDownload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
);
export const IconCopy = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
export const IconRun = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="m7 5 12 7-12 7Z" />
  </svg>
);
export const IconSun = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconMoon = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);
export const IconReset = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v3h3" />
  </svg>
);
export const IconUpload = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 16V4m0 0-4 4m4-4 4 4" />
    <path d="M5 20h14" />
  </svg>
);
export const IconSliders = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="13" cy="18" r="2" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconAlert = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 22 20H2Z" />
    <path d="M12 10v4" />
    <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
  </svg>
);
export const IconError = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6" />
    <circle cx="12" cy="16.5" r=".6" fill="currentColor" stroke="none" />
  </svg>
);
