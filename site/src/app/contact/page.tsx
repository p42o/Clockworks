import type { Metadata } from "next";
import { Link } from "next-view-transitions";
import CopyPending from "@/components/CopyPending";
import { formHonestLine, phone, serviceTowns } from "@/lib/copy";
import { pageSocial } from "@/lib/site";

const title = "Contact";
const description = "Contact Parker at MN Clockworks in Maple Grove, MN. Service area: the northwest Twin Cities, and Minnesota by phone and screen share.";
export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact/" },
  ...pageSocial(title, description, "/contact/"),
};

export default function Contact() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-36 sm:px-8">
        <h1 className="display mb-6 text-5xl sm:text-7xl">Contact MN Clockworks.</h1>
        {/* COPY PENDING (Sprocket): contact/intro */}
        <CopyPending slot="contact/intro" note="Short welcome line above the contact details." />
        <div className="mt-8 space-y-4 text-lg text-ink-soft">
          <p>{phone.pending ? <span>{phone.display}</span> : <a href={phone.tel} className="link-draw">{phone.display}</a>}</p>
          <p>Based in Maple Grove, Minnesota.</p>
          <p><Link href="/book/" className="link-draw">Send a note instead</Link></p>
          <p>{formHonestLine}</p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <p className="eyebrow section-rule">Service area</p>
        <h2 className="display mt-4 text-4xl sm:text-5xl">Towns I serve</h2>
        <ul className="mt-6 grid list-inside list-disc grid-cols-2 gap-3 sm:grid-cols-3">
          {serviceTowns.map((town) => <li key={town}>{town}, MN</li>)}
        </ul>
        <p className="mt-6 text-ink-soft">Across Minnesota by phone and screen share.</p>
      </section>
    </>
  );
}
