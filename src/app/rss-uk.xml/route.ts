import { rssResponse } from "@/lib/rss";
export const dynamic = "force-static";
export const revalidate = 900;
export function GET() { return rssResponse("uk"); }
