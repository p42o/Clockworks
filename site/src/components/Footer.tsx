import { Link } from "next-view-transitions";
import { legacy, nav, site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="bg-ground text-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow !text-copper">The hidden mechanism behind small business</p>
            <p className="display mt-4 max-w-md text-4xl sm:text-5xl">
              Get your evenings <span className="italic">back</span>
              <span className="text-copper">.</span>
            </p>
          </div>
          <Link
            href="/book/"
            className="inline-flex w-fit items-center gap-3 rounded-[3px] bg-copper px-7 py-3.5 font-medium text-cream-bright transition-colors hover:bg-copper-deep"
          >
            {site.cta.label}
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-10 border-t border-white/10 pt-10 text-[0.9rem] sm:grid-cols-4">
          <div>
            <p className="eyebrow mb-4">Pages</p>
            <ul className="space-y-2.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-paper/70 transition-colors hover:text-paper">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/book/" className="text-paper/70 transition-colors hover:text-paper">
                  Book your audit
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4">Notes</p>
            <ul className="space-y-2.5">
              <li>
                <a href={legacy.resources} className="text-paper/70 transition-colors hover:text-paper">
                  Field notes &amp; articles
                </a>
              </li>
              <li>
                <a href={legacy.privacy} className="text-paper/70 transition-colors hover:text-paper">
                  Privacy
                </a>
              </li>
              <li>
                <a href={legacy.terms} className="text-paper/70 transition-colors hover:text-paper">
                  Terms
                </a>
              </li>
            </ul>
          </div>
          <div className="col-span-2">
            <p className="eyebrow mb-4">Contact</p>
            <a
              href={`mailto:${site.email}`}
              className="font-mono text-[0.95rem] text-paper underline decoration-copper/60 underline-offset-4 hover:decoration-copper"
            >
              {site.email}
            </a>
            <p className="mt-3 max-w-xs text-paper/55">
              {site.city}, Minnesota. Serving the Twin Cities metro in person and the rest of the
              country remotely.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-[0.8rem] text-paper/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} MN Clockworks · PGS Ventures LLC</p>
          <p className="font-mono tracking-wide">Built in Minnesota. Runs like clockwork.</p>
        </div>
      </div>
    </footer>
  );
}
