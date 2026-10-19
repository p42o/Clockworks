import type { Metadata } from "next";
import PhoneIcon from "@/components/PhoneIcon";
import Reveal from "@/components/Reveal";
import AuditFlow from "@/components/AuditFlow";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get in touch",
  description:
    "Get in touch with MN Clockworks in Maple Grove. In person in the Twin Cities, remote elsewhere. You approve what goes out.",
};

export default function Book() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 sm:px-8">
      <div className="grid gap-14 lg:grid-cols-[1fr_1.5fr]">
        <div>
          <Reveal>
            <p className="eyebrow">Get in touch</p>
            <h1 className="display mt-4 text-5xl sm:text-6xl">
              Tell me about your business
              <span className="text-copper">.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <ul className="mt-8 space-y-5 text-[0.98rem] leading-relaxed text-ink-soft">
              {[
                ["What this is", "A Chief of Staff AI team for your small business. It handles email, quotes, and marketing. You approve what goes out."],
                ["What to share", "A little about your business and what you want help with."],
                ["What happens next", "Every message lands on my phone within minutes, and a real person answers. In person in the Twin Cities, remote elsewhere."],
              ].map(([t, d]) => (
                <li key={t} className="border-l-2 border-copper/50 pl-4">
                  <p className="font-mono text-[0.7rem] tracking-[0.18em] text-copper">{t.toUpperCase()}</p>
                  <p className="mt-1.5">{d}</p>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-ink-faint">
              This form comes to my phone, and I answer it.
            </p>
            <p className="mt-6 text-sm text-ink-soft">Rather talk? <a href={site.phone.href} className="link-draw mt-2 inline-flex items-center gap-2 border-b border-copper/60 pb-1 hover:text-copper"><PhoneIcon className="h-4 w-4" />Call or text <span className="font-mono">{site.phone.display}</span></a>{" "}or email <a href={`mailto:${site.email}`} className="break-all underline decoration-copper/60 underline-offset-4 hover:text-copper">{site.email}</a></p>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="rounded-[4px] border hairline bg-paper-deep/60 p-6 shadow-[0_20px_50px_-36px_rgba(26,25,22,0.35)] sm:p-10">
          <AuditFlow />
        </Reveal>
      </div>
    </section>
  );
}
