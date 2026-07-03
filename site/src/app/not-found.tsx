import { Link } from "next-view-transitions";

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-dvh max-w-6xl flex-col items-start justify-center px-5 sm:px-8">
      <p className="eyebrow">404 — Lost time</p>
      <h1 className="display mt-4 max-w-2xl text-6xl sm:text-8xl">
        This page stopped ticking<span className="text-copper">.</span>
      </h1>
      <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">
        Whatever used to be here has been reclaimed — which, to be fair, is the business model.
      </p>
      <Link
        href="/"
        className="mt-9 rounded-[3px] bg-ink px-6 py-3 font-medium text-paper transition-colors hover:bg-copper"
      >
        ← Back to the shop
      </Link>
    </section>
  );
}
