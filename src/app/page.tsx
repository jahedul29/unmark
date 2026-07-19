import Link from "next/link";
import { IconBrush, IconDownload, IconRun, IconSparkles, IconUpload } from "@/components/icons";

const STEPS = [
  { n: "1", title: "Open an image", body: "Drag in a JPG, PNG, or WebP — or pick one. It never leaves your device.", Icon: IconUpload },
  { n: "2", title: "Mask the mark", body: "Brush, box, or lasso over the watermark. Or let auto-suggest find the text for you.", Icon: IconBrush },
  { n: "3", title: "Run & download", body: "AI fills the area in full resolution. Compare before/after, then save or copy.", Icon: IconRun },
];

const FEATURES = [
  { title: "AI eraser", body: "MI-GAN generative fill reconstructs texture instead of smearing — no blurry patches." },
  { title: "Precise by hand", body: "Brush, rectangle, and lasso feed one mask. Undo, redo, and iterate as many passes as you like." },
  { title: "Auto-suggest text", body: "Detects text watermarks and pre-fills the mask so you only confirm." },
  { title: "Private & offline", body: "Everything runs in your browser. Nothing is uploaded — the model is downloaded once, then cached." },
  { title: "Full resolution", body: "Only the masked area changes; every other pixel stays byte-for-byte the original." },
  { title: "Works everywhere", body: "Phone, tablet, or desktop — draw with a finger, pen, or mouse." },
];

export default function Landing() {
  return (
    <main className="min-h-[100dvh] bg-bg0 text-txt">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-[9px] text-lg font-[680] tracking-[-0.01em]">
          <span className="glyph relative h-7 w-7 shrink-0 rounded-lg bg-[conic-gradient(from_210deg,var(--accent),var(--mask))]" aria-hidden="true" />
          Unmark
        </div>
        <Link
          href="/editor"
          className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-[620] text-onaccent transition-colors hover:bg-accent-hi"
        >
          Open editor
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-2 lg:gap-14 lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-bg1 px-3 py-1 text-[12px] font-[550] text-txt2">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Runs in your browser · nothing uploaded
          </span>
          <h1 className="mt-5 text-balance text-4xl font-[720] leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
            Erase watermarks<span className="text-accent">.</span> Keep the quality<span className="text-accent">.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-txt2 sm:text-base">
            Unmark removes watermarks right on your device. Paint over the mark and an on-device AI fills
            it back in at full resolution — every untouched pixel stays exactly as it was.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/editor"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-[15px] font-[680] text-onaccent shadow-[0_6px_24px_var(--accent-glow)] transition-colors hover:bg-accent-hi [&_svg]:h-[18px] [&_svg]:w-[18px]"
            >
              <IconSparkles /> Open the editor
            </Link>
            <a
              href="#how"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-bg1 px-6 text-[15px] font-[560] text-txt transition-colors hover:bg-bg2"
            >
              How it works
            </a>
          </div>
          <p className="mt-5 text-[12.5px] text-txt3">Free · no account · JPG, PNG &amp; WebP</p>
        </div>

        <div className="relative" aria-hidden="true">
          <div className="overflow-hidden rounded-2xl border border-line bg-bg1 p-3 shadow-[var(--shadow)]">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[radial-gradient(120%_90%_at_75%_15%,#ffd27a_0%,#ff9d5c_24%,#f2704e_44%,#5b3670_92%)]">
              <div className="absolute inset-0 grid place-items-center">
                <span className="rotate-[-14deg] text-2xl font-[800] tracking-[0.2em] text-white/45 sm:text-4xl">© WATERMARK</span>
              </div>
              <div className="absolute left-[14%] top-[42%] h-[26%] w-[62%] rotate-[-14deg] rounded-[40%_55%_48%_52%] bg-mask/55" />
            </div>
            <div className="mt-3 flex items-center justify-between px-1 pb-1">
              <span className="text-[12px] text-txt3">masked · ready to Run</span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-[620] text-onaccent [&_svg]:h-3.5 [&_svg]:w-3.5">
                <IconRun /> Run
              </span>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="border-t border-line bg-bg1/40 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <h2 className="text-2xl font-[680] tracking-[-0.01em] sm:text-3xl">Three steps</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {STEPS.map(({ n, title, body, Icon }) => (
              <div key={n} className="rounded-2xl border border-line bg-bg1 p-6">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent [&_svg]:h-[18px] [&_svg]:w-[18px]">
                    <Icon />
                  </span>
                  <span className="mono text-sm text-txt3">{n}</span>
                </div>
                <h3 className="mt-4 text-lg font-[620]">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-txt2">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <h2 className="text-2xl font-[680] tracking-[-0.01em] sm:text-3xl">Why Unmark</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-bg1 p-6">
                <h3 className="text-[15px] font-[640]">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-txt2">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 rounded-3xl border border-line bg-[linear-gradient(135deg,var(--bg1),color-mix(in_srgb,var(--accent)_10%,var(--bg1)))] px-6 py-14 text-center">
          <h2 className="text-balance text-2xl font-[700] tracking-[-0.01em] sm:text-4xl">Clean up your image now</h2>
          <p className="max-w-md text-[14.5px] text-txt2">No upload, no sign-up. It all happens in this tab.</p>
          <Link
            href="/editor"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-7 text-[15px] font-[680] text-onaccent shadow-[0_6px_24px_var(--accent-glow)] transition-colors hover:bg-accent-hi [&_svg]:h-[18px] [&_svg]:w-[18px]"
          >
            <IconDownload /> Open the editor
          </Link>
        </div>
      </section>

      <footer className="border-t border-line px-5 py-8 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-[12.5px] text-txt3 sm:flex-row">
          <span>Unmark — a voltbyte tool.</span>
          <Link href="/editor" className="text-txt2 hover:text-txt">
            Open the editor →
          </Link>
        </div>
      </footer>
    </main>
  );
}
