import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const logoDataUri =
  "data:image/svg+xml;base64," +
  readFileSync(join(process.cwd(), "public", "logo.svg")).toString("base64");

export const alt = "Unmark — free watermark remover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "96px",
          background: "#0f1218",
          color: "#e9edf4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 26, marginBottom: 44 }}>
          <img width={92} height={92} src={logoDataUri} alt="" />
          <div style={{ fontSize: 54, fontWeight: 800 }}>Unmark</div>
        </div>
        <div style={{ fontSize: 88, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>
          Free watermark remover
        </div>
        <div style={{ fontSize: 36, color: "#9aa4b2", marginTop: 30 }}>
          In your browser · nothing uploaded · no account
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 52 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#0fb6d4" }} />
          <div style={{ fontSize: 30, color: "#0fb6d4", fontWeight: 700 }}>
            unmark.voltbyte.online
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
