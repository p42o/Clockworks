import MagneticButton from "@/components/MagneticButton";
import Reveal from "@/components/Reveal";
import { site } from "@/lib/site";

export default function AuditCTA({
  title = "Find out what your week is hiding.",
  context = "The audit is free, it takes 30 minutes, and you leave with a written plan you can hand to anyone — including somebody who isn't me.",
}: {
  title?: string;
  context?: string;
}) {
  return (
    <section className="border-t hairline bg-paper-deep">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28 text-center">
        <Reveal>
          <p className="eyebrow">The next step</p>
          <h2 className="display mx-auto mt-4 max-w-2xl text-4xl sm:text-6xl">{title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
            {context}
          </p>
          <div className="mt-9 flex flex-col items-center gap-4">
            <MagneticButton href="/book/">{site.cta.label} →</MagneticButton>
            <p className="text-sm text-ink-faint">
              {site.cta.sub} And if I can&rsquo;t find anything worth fixing, the coffee&rsquo;s on me.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
