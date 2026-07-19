import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { IconSparkles } from "@/components/icons";

const SITE = "https://unmark.voltbyte.online";
const PATH = "/how-to-remove-a-watermark";

export const metadata: Metadata = {
  title: { absolute: "How to Remove a Watermark from a Photo (Free) | Unmark" },
  description:
    "Step-by-step guide to removing a watermark from a photo for free, right in your browser. Mask the mark, let AI fill it at full resolution, and download — no upload, no account.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "How to Remove a Watermark from a Photo (Free)",
    description:
      "A simple, free way to remove watermarks in your browser — mask the mark, let on-device AI fill it, and download.",
    url: SITE + PATH,
  },
};

const STEPS = [
  {
    name: "Open your image",
    text: "Open the editor and drag in a JPG, PNG, or WebP — or tap Choose image. Your file stays on your device; nothing is uploaded.",
  },
  {
    name: "Mask the watermark",
    text: "Brush over the watermark, or use the rectangle or lasso for solid blocks. For text watermarks, tap Auto-suggest to detect and pre-fill the mask, then tidy it up.",
  },
  {
    name: "Pick an engine",
    text: "AI eraser (default) reconstructs texture and is best for photos and edges. Fast is classical fill — instant, good for thin marks on flat areas.",
  },
  {
    name: "Run",
    text: "Hit Run. Unmark fills the masked area at full resolution. Re-mask any leftovers and run again for stubborn marks.",
  },
  {
    name: "Compare and download",
    text: "Hold Before/After to check the result, then Download (same format, full resolution) or Copy to the clipboard.",
  },
];

const TIPS = [
  "Mask a little beyond the watermark's edges — a snug mask leaves faint traces.",
  "Keep the mask off high-contrast edges when using Fast; the AI eraser handles edges far better.",
  "Work in passes: remove the bulk, then re-mask and run again on what's left.",
  "Everything runs on your device — your image is never uploaded.",
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to remove a watermark from a photo",
  description:
    "Remove a watermark from a photo for free in your browser: mask the mark, let on-device AI fill it at full resolution, and download.",
  totalTime: "PT1M",
  supply: [{ "@type": "HowToSupply", name: "An image with a watermark (JPG, PNG, or WebP)" }],
  tool: [{ "@type": "HowToTool", name: "Unmark — free, browser-based watermark remover" }],
  step: STEPS.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
    url: `${SITE}${PATH}#step-${i + 1}`,
  })),
};

export default function Guide() {
  return (
    <main className="min-h-[100dvh] bg-bg0 text-txt">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />

      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-[9px] text-lg font-[680] tracking-[-0.01em]">
          <span className="glyph relative h-7 w-7 shrink-0 rounded-lg bg-[conic-gradient(from_210deg,var(--accent),var(--mask))]" aria-hidden="true" />
          Unmark
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/editor"
            className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-[620] text-onaccent transition-colors hover:bg-accent-hi"
          >
            Open editor
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 sm:px-8">
        <nav className="text-[12.5px] text-txt3">
          <Link href="/" className="hover:text-txt2">
            Home
          </Link>{" "}
          / How to remove a watermark
        </nav>

        <h1 className="mt-4 text-balance text-3xl font-[720] leading-[1.1] tracking-[-0.02em] sm:text-4xl">
          How to remove a watermark from a photo
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-txt2 sm:text-base">
          You can remove a watermark for free, right in your browser — no upload, no account, and no
          watermark added to the result. Unmark lets you paint over the mark and fills it back in with
          on-device AI at full resolution. Here&apos;s the whole process in about a minute.
        </p>

        <Link
          href="/editor"
          className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-[680] text-onaccent shadow-[0_6px_24px_var(--accent-glow)] transition-colors hover:bg-accent-hi [&_svg]:h-[18px] [&_svg]:w-[18px]"
        >
          <IconSparkles /> Open the editor — it&apos;s free
        </Link>

        <h2 className="mt-12 text-xl font-[680] tracking-[-0.01em] sm:text-2xl">Step by step</h2>
        <ol className="mt-6 flex flex-col gap-4">
          {STEPS.map((s, i) => (
            <li id={`step-${i + 1}`} key={s.name} className="flex gap-4 rounded-2xl border border-line bg-bg1 p-5">
              <span className="mono grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent/15 text-sm font-[680] text-accent">
                {i + 1}
              </span>
              <div>
                <h3 className="text-[16px] font-[640]">{s.name}</h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-txt2">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <h2 className="mt-12 text-xl font-[680] tracking-[-0.01em] sm:text-2xl">Tips for a clean result</h2>
        <ul className="mt-6 flex flex-col gap-3">
          {TIPS.map((t) => (
            <li key={t} className="flex gap-3 text-[14px] leading-relaxed text-txt2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              {t}
            </li>
          ))}
        </ul>

        <h2 className="mt-12 text-xl font-[680] tracking-[-0.01em] sm:text-2xl">Formats &amp; quality</h2>
        <p className="mt-4 text-[14px] leading-relaxed text-txt2">
          Unmark works with JPG, PNG, and WebP. Your download keeps the original format at full
          resolution, and every pixel outside the mask is left byte-for-byte identical — only the area
          you painted changes. Metadata (EXIF) is stripped on export.
        </p>

        <h2 className="mt-12 text-xl font-[680] tracking-[-0.01em] sm:text-2xl">Is it legal?</h2>
        <p className="mt-4 text-[14px] leading-relaxed text-txt2">
          Only remove watermarks from images you own or are licensed to edit — for example, your own
          photos, stock you&apos;ve purchased, or previews you have rights to. Don&apos;t strip other
          people&apos;s copyright or attribution marks.
        </p>

        <div className="mt-14 rounded-3xl border border-line bg-[linear-gradient(135deg,var(--bg1),color-mix(in_srgb,var(--accent)_10%,var(--bg1)))] px-6 py-12 text-center">
          <h2 className="text-balance text-2xl font-[700] tracking-[-0.01em]">Try it now — free</h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-txt2">No upload, no sign-up. It all happens in your browser.</p>
          <Link
            href="/editor"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-[15px] font-[680] text-onaccent shadow-[0_6px_24px_var(--accent-glow)] transition-colors hover:bg-accent-hi [&_svg]:h-[18px] [&_svg]:w-[18px]"
          >
            <IconSparkles /> Open the editor
          </Link>
        </div>
      </article>

      <footer className="border-t border-line px-5 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-between gap-3 text-[12.5px] text-txt3 sm:flex-row">
          <span>Unmark — a free voltbyte tool.</span>
          <Link href="/" className="text-txt2 hover:text-txt">
            ← Back home
          </Link>
        </div>
      </footer>
    </main>
  );
}
