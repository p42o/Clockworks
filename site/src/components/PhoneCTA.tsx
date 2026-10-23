import { Link } from "next-view-transitions";
import { PHONE_ANSWERED_BY_IRIS, irisNotice, phone } from "@/lib/copy";

/**
 * Sprocket 2026-10-23 CTA block. The number comes only from PHONE_DIGITS
 * (lib/copy.ts), never hard-coded. The Iris disclosure renders with it.
 */
export default function PhoneCTA({ button, sub }: { button: string; sub: string }) {
  return (
    <section className="border-t hairline">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <a
          href={phone.tel}
          className="btn-press inline-flex min-h-11 items-center rounded-[3px] bg-copper-deep px-5 py-3 font-medium text-cream-bright hover:bg-ink"
        >
          {button}
        </a>
        <p className="mt-6 text-lg font-medium text-ink">
          {phone.pending ? <span>{phone.display}</span> : <a href={phone.tel} className="link-draw">{phone.display}</a>}
        </p>
        <div className="mt-3 max-w-2xl space-y-2 text-sm leading-relaxed text-ink-soft">
          {PHONE_ANSWERED_BY_IRIS && <p>{irisNotice}</p>}
          {PHONE_ANSWERED_BY_IRIS && (
            <p>
              Prefer not to be recorded? Reach Parker through{" "}
              <Link href="/book/" className="link-draw">mnclockworks.com</Link>.
            </p>
          )}
        </div>
        <p className="mt-6 max-w-2xl leading-relaxed text-ink-soft">{sub}</p>
      </div>
    </section>
  );
}
