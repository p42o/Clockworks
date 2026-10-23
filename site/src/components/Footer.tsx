import { Link } from "next-view-transitions";
import LogoMark from "@/components/LogoMark";
import { nav, site } from "@/lib/site";
import { agreementLine, phone, serviceTowns } from "@/lib/copy";

const pages = [
  { href: "/how-it-works/", label: "How it works" },
  { href: "/what-i-do/", label: "The agent team" },
  { href: "/your-own-agent/", label: "Front Desk" },
  { href: "/about/", label: "About Parker" },
  { href: "/book/", label: "Send a note" },
  { href: "/contact/", label: "Contact" },
] as const;

export default function Footer() {
  const beforeTerms = agreementLine.split("Starter Terms")[0];
  return (
    <footer className="bg-ground pb-28 text-paper">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex items-center gap-3">
          <LogoMark tone="paper" className="h-9 w-9" />
          <p className="display text-3xl">
            Clockworks<span className="text-copper">.</span>
          </p>
        </div>
        <p className="mt-4 max-w-md text-[1.02rem] leading-relaxed text-paper/80">
          A real team of AI agents for your business, each with its own job, set up with you on a screen-share call.
        </p>

        <div className="mt-12 grid gap-10 border-t border-white/15 pt-10 sm:grid-cols-3">
          <div>
            <p className="eyebrow mb-4 !text-paper/70">On this page</p>
            <ul className="space-y-2.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-paper/80 hover:text-paper">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4 !text-paper/70">Pages</p>
            <ul className="space-y-2.5">
              {pages.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-paper/80 hover:text-paper">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <a href="/portal/client/" className="text-paper/80 hover:text-paper">
                  Client login
                </a>
              </li>
              <li>
                <Link href="/terms/" className="text-paper/80 hover:text-paper">
                  Starter Terms
                </Link>
              </li>
              <li>
                <a href="/portal/client/#/privacy-notice" className="text-paper/80 hover:text-paper">
                  Privacy Notice
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="eyebrow mb-4 !text-paper/70">Contact</p>
            <ul className="space-y-2.5">
              <li>
                {phone.pending ? <span className="font-medium text-paper">{phone.display}</span> : <a href={phone.tel} className="font-medium text-paper underline decoration-copper underline-offset-4">
                  {phone.display}
                </a>}
              </li>
              <li>
                <a href={`mailto:${site.email}`} className="text-paper/80 underline decoration-white/30 underline-offset-4 hover:text-paper">
                  {site.email}
                </a>
              </li>
              <li>Maple Grove, Minnesota</li>
            </ul>
          </div>
        </div>

        <p className="mt-10 max-w-2xl leading-relaxed text-paper/80">
          {beforeTerms}
          <Link href="/terms/" className="underline decoration-copper underline-offset-4">
            Starter Terms
          </Link>{" "}
          and{" "}
          <a href="/portal/client/#/privacy-notice" className="underline decoration-copper underline-offset-4">
            Privacy Notice
          </a>{" "}
          before you buy.
        </p>
        <p className="mt-4 text-paper/80">Service area: {serviceTowns.join(", ")}, MN. Across Minnesota by phone and screen share.{" "}
          <Link href="/contact/" className="underline decoration-copper underline-offset-4">Contact</Link></p>

        <p className="mt-10 flex items-center gap-2 border-t border-white/15 pt-6 text-[0.85rem] text-paper/70">
          <LogoMark tone="paper" className="h-4 w-4 opacity-70" />
          © {new Date().getFullYear()} MN Clockworks · PGS Ventures LLC
        </p>
      </div>
    </footer>
  );
}
