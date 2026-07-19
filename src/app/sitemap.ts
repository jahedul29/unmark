import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://unmark.voltbyte.online/",
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: "https://unmark.voltbyte.online/how-to-remove-a-watermark",
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
