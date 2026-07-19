import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE = "https://unmark.voltbyte.online";
const DESCRIPTION =
  "Free, browser-based watermark remover. Paint over a watermark and an on-device AI fills it back at full resolution — nothing is uploaded, no account needed.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Unmark — Free watermark remover",
    template: "%s · Unmark",
  },
  description: DESCRIPTION,
  applicationName: "Unmark",
  keywords: [
    "watermark remover",
    "remove watermark",
    "free watermark remover",
    "watermark remover online",
    "AI watermark remover",
    "remove watermark from image",
    "browser watermark remover",
    "no upload watermark remover",
  ],
  authors: [{ name: "voltbyte" }],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "Unmark",
    url: SITE,
    title: "Unmark — Free watermark remover",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Unmark — Free watermark remover",
    description: DESCRIPTION,
  },
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
