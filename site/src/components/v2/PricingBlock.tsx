import { Link } from "next-view-transitions";
import {
  agreementLine,
  phone,
  primaryCta,
  quoteLine,
} from "@/lib/copy";

const cards = [
  {
    kicker: "Start here",
    title: "Free 30-min phone audit",
    body: `A free 30-minute phone call about your workload. Call ${phone.display} and Iris takes a message for Parker.`,
    action: primaryCta,
    href: phone.tel,
  },
  {
    kicker: "The package",
    title: "$499 package",
    body: "Online presence scan, intake, deployment over screen share, and 30 days of support and portal access.",
    action: "Ask about the $499 package",
    href: phone.tel,
  },
  {
    kicker: "After 30 days",
    title: "$99/mo Shop Pass",
    body: "Ongoing portal access and support after your first 30 days, which starts only after you accept its own written terms.",
    action: "Get my free 30-min phone audit",
    href: phone.tel,
  },
] as const;

export default function PricingBlock() {
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="flex flex-col rounded-[4px] border hairline bg-cream-bright p-6">
            <p className="eyebrow">{card.kicker}</p>
            <h3 className="display mt-3 text-3xl">{card.title}</h3>
            <p className="mt-4 flex-1 leading-relaxed text-ink-soft">{card.body}</p>
            <a
              href={card.href}
              className="btn-press mt-6 inline-flex min-h-11 items-center justify-center rounded-[3px] bg-copper-deep px-4 py-3 text-center text-[0.95rem] font-medium text-cream-bright hover:bg-ink"
            >
              {card.action}
            </a>
          </article>
        ))}
      </div>
      <p className="mt-8 max-w-3xl text-[1.05rem] leading-relaxed text-ink">Any other work is agreed separately in writing before it starts.</p>
      <p className="mt-4 max-w-3xl leading-relaxed text-ink-soft">
        {agreementLine.split("Starter Terms")[0]}
        <Link href="/terms/" className="text-copper-deep underline underline-offset-2">
          Starter Terms
        </Link>{" "}
        and{" "}
        <a href="/portal/client/#/privacy-notice" className="text-copper-deep underline underline-offset-2">
          Privacy Notice
        </a>{" "}
        before you buy.
      </p>
      <p className="mt-4 max-w-3xl text-ink-soft">{quoteLine}</p>
    </div>
  );
}
