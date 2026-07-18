"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "grid", placeItems: "center", height: "100dvh", color: "var(--txt3)" }}>
      Loading Unmark…
    </div>
  ),
});

export default function Page() {
  return <Editor />;
}
