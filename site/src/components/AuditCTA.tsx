import Reveal from "@/components/Reveal";
import { phone, primaryCta } from "@/lib/copy";

export default function AuditCTA({
  title = "Start with a phone call.",
  context = `The audit is a free 30-min phone call. Call ${phone.display}.`,
}: {
  title?: string;
  context?: string;
}) {
  return (
    <section className="border-t hairline bg-paper-deep">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8 sm:py-28">
        <Reveal>
          <p className="eyebrow">The next step</p>
          <h2 className="display mx-auto mt-4 max-w-2xl text-4xl sm:text-6xl">{title}</h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
            {context}
          </p>
          <div className="mt-9 flex flex-col items-center gap-4">
            <a
              href={phone.tel}
              className="btn-press inline-flex min-h-11 items-center rounded-[3px] bg-copper-deep px-6 py-3 font-medium text-cream-bright hover:bg-ink"
            >
              {primaryCta}
            </a>
            <p className="text-sm text-ink-soft">{phone.display}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
