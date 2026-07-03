import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export const dynamic = "force-static";

/** New pages + the legacy blog URLs worth keeping in front of Google. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = ["", "what-i-do/", "how-it-works/", "results/", "about/", "book/"].map((p) => ({
    url: `${site.url}/${p}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  const legacy = [
    "resources.html",
    "blog/2026-06/anatomy-of-a-context-vault.html",
    "blog/2026-05/your-ai-doesnt-know-you.html",
    "blog/truck-cab-ai-playbook.html",
    "blog/ai-vs-automation.html",
    "blog/lead-response-workflow.html",
    "blog/email-triage-tip.html",
    "blog/2026-outlook.html",
  ].map((p) => ({
    url: `${site.url}/${p}`,
    lastModified: now,
    changeFrequency: "yearly" as const,
    priority: 0.4,
  }));
  return [...pages, ...legacy];
}
