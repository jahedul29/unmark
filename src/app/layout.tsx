import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Unmark — watermark remover",
  description:
    "Remove watermarks in your browser. Paint over the mark, hit Run, and it fills. Nothing is uploaded.",
  applicationName: "Unmark",
  authors: [{ name: "voltbyte" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f1218",
};

const themeInit = `(function(){try{var t=localStorage.getItem('unmark-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
