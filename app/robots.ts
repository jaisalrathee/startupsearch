import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Disallow noisy detail pages from being crawled in bulk;
        // they're still individually shareable and rank when linked.
        disallow: ["/api/"],
      },
    ],
    sitemap: "https://startupsearch.co.uk/sitemap.xml",
  }
}
