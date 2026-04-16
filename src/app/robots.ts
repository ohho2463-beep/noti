import type { MetadataRoute } from "next";

function publicBaseUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return undefined;
}

export default function robots(): MetadataRoute.Robots {
  const base = publicBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/dashboard", "/api/", "/invite/"],
    },
    ...(base ? { host: base, sitemap: `${base}/sitemap.xml` } : {}),
  };
}
