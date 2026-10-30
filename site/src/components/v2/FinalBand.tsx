import { Link } from "next-view-transitions";
import { chatCta, formHonestLine, phone, primaryCta } from "@/lib/copy";

export default function FinalBand() {
  return (
    <section className="border-t hairline bg-ground text-paper" id="start">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <p className="eyebrow !text-copper">Start here</p>
        <h2 className="display mt-4 max-w-3xl text-5xl sm:text-6xl">
          Call me. Or try the Front Desk.
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper/80">
          The free 30-min phone audit starts with a call to {phone.display}.
        </p>
        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={phone.tel}
            className="btn-press inline-flex min-h-11 items-center justify-center rounded-[3px] bg-copper-deep px-5 py-3 font-medium text-cream-bright hover:bg-paper hover:text-ink"
          >
            {primaryCta}
          </a>
          <a
            href={phone.tel}
            className="btn-press inline-flex min-h-11 items-center justify-center rounded-[3px] border border-paper/30 px-5 py-3 font-medium text-paper hover:border-paper"
          >
            Ask about the $499 package
          </a>
          <button
            type="button"
            data-open-chat
            className="btn-press inline-flex min-h-11 items-center justify-center rounded-[3px] border border-paper/30 px-5 py-3 font-medium text-paper hover:border-paper"
          >
            {chatCta}
          </button>
        </div>
        <p className="mt-6 text-paper/75">
          <Link href="/book/" className="underline decoration-copper underline-offset-4">
            Or send a note on the book page
          </Link>
          . {formHonestLine}
        </p>
      </div>
    </section>
  );
}
