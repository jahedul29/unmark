import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/editor" },
    sitemap: "https://unmark.voltbyte.online/sitemap.xml",
    host: "https://unmark.voltbyte.online",
  };
}
