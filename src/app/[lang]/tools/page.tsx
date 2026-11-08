import { redirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

// audit 08.11: "Інструменти" is gone from the menu — its tools live in the sections now; old links land on the home page
export default async function Tools({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  redirect(`/${isLocale(lang) ? lang : "uk"}/`);
}
