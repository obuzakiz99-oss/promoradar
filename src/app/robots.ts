import type { MetadataRoute } from "next";
export const dynamic = "force-static";
import { SITE } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/" }], sitemap: `https://${SITE.domain}/sitemap.xml` };
}
