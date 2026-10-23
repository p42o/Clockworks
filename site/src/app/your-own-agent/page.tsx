import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import PhoneCTA from "@/components/PhoneCTA";
import { chatCta, phone } from "@/lib/copy";
import { pageSocial, site } from "@/lib/site";

/* Copy: Sprocket, presence/2026-10-23-offer-pages-copy.md (/your-own-agent/).
 * Phone comes from PHONE_DIGITS only; Sprocket's hard-coded number is not used. */
const title = "Clockworks Answer Line | MN Clockworks";
const description =
  "I\u2019m Parker in Maple Grove. The Clockworks Answer Line answers from approved facts, takes a message and keeps your number and accounts in your name.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/your-own-agent/" },
  ...pageSocial(title, description, "/your-own-agent/"),
};

/* Setup scope is unresolved (PARKER CONFIRM), so the Service omits scope and price. */
const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Clockworks Answer Line",
  serviceType: "AI voice agent for a business phone line",
  url: `${site.url}/your-own-agent/`,
  provider: { "@id": `${site.url}/#business` },
  areaServed: { "@type": "State", name: "Minnesota" },
};

function Section({ n, eyebrow, heading, children }: { n: string; eyebrow: string; heading: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="eyebrow section-rule">{n} / {eyebrow}</p>
      <h2 className="display mb-6 mt-4 text-4xl sm:text-5xl">{heading}</h2>
      <div className="max-w-3xl space-y-4 text-lg leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}

export default function YourOwnAgent() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <section className="mx-auto max-w-6xl px-5 pb-8 pt-36 sm:px-8">
        <p className="eyebrow section-rule">Your own agent</p>
        <h1 className="display mt-4 max-w-3xl text-5xl sm:text-7xl">Clockworks Answer Line</h1>
      </section>
      <Section n="01" eyebrow="Introduction" heading="A line that answers from your facts">
        <p>
          I&apos;m Parker, and I run MN Clockworks in Maple Grove. Iris, the AI voice agent on my own line, answers {phone.display}. The Answer Line sets up the same kind of agent on your business line.
        </p>
      </Section>
      <Section n="02" eyebrow="The call" heading="What happens when someone calls">
        <p>
          Picks up day, night and weekends. No phone tree. No voicemail box. It says up front that it is an AI and that the call is recorded. It answers questions from your approved FAQ facts.
        </p>
        <p>
          It takes a message: name, callback number, business, town and reason. It reads the message back and fixes anything the caller corrects. It records the preferred callback time and method as a request, never a promise.
        </p>
        <p>
          For calls of 10 seconds or longer, a post-call email shows who called, when, how long, how the call ended and a link to the conversation. The email does not include the transcript. Calls are recorded and transcribed. The full transcript and recording are available in the console, kept 30 days. The agent ends the call cleanly.
        </p>
      </Section>
      <Section n="03" eyebrow="Boundaries" heading="What it will not do">
        <p>
          The AI never places outbound calls or sends texts. People do that. It answers only from facts you approve and never claims to be a person. A caller&apos;s requested callback time is not a booking or a commitment from you.
        </p>
        <p>
          Calendar, email inbox, web lookups and job software links can be added later, not as part of setup. Each is scoped, priced and tested with you first. Those connections are separate from the FAQ answers and message taking described here.
        </p>
      </Section>
      <Section n="04" eyebrow="Control" heading="Your settings need your written OK">
        <p>
          I get your written OK for every setting. Your number and accounts are in your business&apos;s name. I work through delegated access. Your AI account is yours.
        </p>
        <p>
          Pick a voice from the built-in set. Set its speed from 0.7x to 1.5x, and set pronunciation for town names, brands and part names.
        </p>
        <p>
          English. Spanish can be turned on and tested before it goes live. Other languages are available. I turn on and test only the ones you approve.
        </p>
      </Section>
      <Section n="05" eyebrow="Provider bills" heading="Running costs, paid directly by you">
        {/* Provider pass-through estimate, Counsel-ruled (voice-agent-onepagers-2026-10-22/COPY.md). Not an MN Clockworks price. */}
        <p>
          Provider bills are in your name. Talk time is about 9 cents a minute, plus 50 cents a month for the number. At 100, 300 or 600 minutes, that&apos;s about $9, $27 or $54 in talk time, plus the number.
        </p>
        <p className="text-base">
          Estimate, not a quote. Provider rates can change. Based on public rates as of Oct 2026. Taxes extra. Optional texting and 911 address service cost extra.
        </p>
      </Section>
      <Section n="06" eyebrow="Setup" heading="Setup is $500 one time">
        {/* PARKER CONFIRM: is the Answer Line inside the $500 deployment or its own scope? */}
        <p data-setup-mode="screen-share">I set it up with you over screen share, test it together and walk you through using it.</p>
      </Section>
      <Section n="07" eyebrow="Text sample" heading="The text version on this site">
        <p>
          The Front Desk chat bubble is the text version: a working sample using MN Clockworks information. Your version uses your business information on your own account.
        </p>
        <div className="flex flex-col items-start gap-3 sm:flex-row">
          <button
            type="button"
            data-open-chat
            className="btn-press inline-flex min-h-11 items-center rounded-[3px] bg-ink px-5 py-3 text-base font-medium text-paper hover:bg-copper-deep"
          >
            {chatCta}
          </button>
          <Link href="/what-i-do/" className="link-draw inline-flex min-h-11 items-center text-base text-ink">
            See the rest of the team
          </Link>
        </div>
      </Section>
      <PhoneCTA button="Hear Iris answer" sub="Ask for the free 15-minute phone audit to discuss your line." />
    </>
  );
}
