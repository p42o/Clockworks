import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import CopyPending from "@/components/CopyPending";
import FinalBand from "@/components/v2/FinalBand";
import { assessmentLine, ownershipLine, phone } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "Results";
const description = "What you have when the setup is done: your own AI team, on your own account, and a baseline to compare against later.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/results/" },
  ...pageSocial(title, description, "/results/"),
};

export default function Results() {
  return (
    <>
      {/* COUNSEL GATE: no results, ratings or client stories are published until Counsel clears the exact text. */}
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-36 sm:px-8">
        <p className="eyebrow section-rule">Results</p>
        <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">What you have when we're done.</h1>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">01 / What you keep</p>
        <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">What you keep</h2>
        <p className="max-w-3xl leading-relaxed text-ink-soft">{ownershipLine}</p>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">02 / A baseline to measure from</p>
        <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">A baseline to measure from</h2>
        <p className="max-w-3xl leading-relaxed text-ink-soft">{assessmentLine}</p>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">03 / Client results</p>
        <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">Client results</h2>
        {/* COPY PENDING (Sprocket): results/client-results */}
        <CopyPending slot="results/client-results" note="COUNSEL GATE: no results, ratings or client stories are published until Counsel clears the exact text." />
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">04 / What changes in a normal week</p>
        <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">What changes in a normal week</h2>
        {/* COPY PENDING (Sprocket): results/normal-week */}
        <CopyPending slot="results/normal-week" />
      </section>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-6 px-5 py-12 sm:px-8">
        <Link href="/how-it-works/" className="link-draw">How it works</Link>
        <a href={phone.tel} className="link-draw">{phone.display}</a>
      </div>
      <FinalBand />
    </>
  );
}
