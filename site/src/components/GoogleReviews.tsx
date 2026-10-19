"use client";

import { useEffect, useState, useId, useRef } from "react";
import Reveal from "@/components/Reveal";
import { basePath, asset } from "@/lib/site";

type Review = { authorName: string; authorUri: string; authorPhotoUri: string; rating: number; text: string; relativeTime: string; publishTime: string; googleMapsUri: string; flagContentUri: string; translated: boolean; originalLanguage: string };
export type ReviewsData = { enabled: boolean; place?: { name: string; rating: number; userRatingCount: number; googleMapsUri: string }; reviews: Review[] };
const safeUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" ? url.href : undefined; } catch { return undefined; } };

function Stars({ rating, large = false }: { rating: number; large?: boolean }) {
  const id = useId().replace(/:/g, "");
  return <span role="img" aria-label={`${rating} out of 5 stars`} className="inline-flex gap-1 text-copper">{Array.from({ length: 5 }, (_, i) => <svg key={i} width={large ? 22 : 16} height={large ? 22 : 16} viewBox="0 0 24 24" aria-hidden="true"><defs><clipPath id={`${id}-${i}`}><rect width={24 * Math.max(0, Math.min(1, rating - i))} height="24" /></clipPath></defs><path d="m12 2 3 6.3 7 .9-5.1 4.9 1.3 6.9-6.2-3.3L5.8 21l1.3-6.9L2 9.2l7-.9Z" fill="currentColor" opacity=".18" /><path d="m12 2 3 6.3 7 .9-5.1 4.9 1.3 6.9-6.2-3.3L5.8 21l1.3-6.9L2 9.2l7-.9Z" fill="currentColor" clipPath={`url(#${id}-${i})`} /></svg>)}</span>;
}

function ReviewText({ text }: { text: string }) {
  const id = useId();
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(text.length > 280);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      // Check collapsed geometry on resize even while the review is expanded.
      element.classList.add("line-clamp-6");
      if (element.clientHeight > 0) setClamped(element.scrollHeight > element.clientHeight);
      if (expanded) element.classList.remove("line-clamp-6");
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);
  return <><p ref={ref} id={id} className={`mt-3 ${expanded ? "" : "line-clamp-6"} whitespace-pre-line text-sm leading-relaxed text-ink-soft`}>{text}</p>
    {clamped && <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)} className="mt-2 self-start text-xs underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-copper">{expanded ? "Show less" : "Read full review"}</button>}</>;
}

export default function GoogleReviews({ data }: { data?: ReviewsData }) {
  const [loaded, setLoaded] = useState<ReviewsData | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || data) return;
    const controller = new AbortController();
    fetch(`${basePath}/api/reviews.php`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.ok ? r.json() : null).then(setLoaded).catch(() => {});
    return () => controller.abort();
  }, [data]);
  const value = process.env.NODE_ENV !== "production" && data ? data : loaded;
  if (!value?.enabled || !value.place || !Array.isArray(value.reviews) || !value.reviews.length) return null;
  return (
    <section aria-label="Google Maps client reviews" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
      <Reveal className="rounded-[4px] border hairline bg-paper-deep p-6 sm:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><p className="eyebrow">From Google Maps</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">What clients say<span className="text-copper">.</span></h2></div>
          <div style={{ padding: "10px 10px 5px" }}><img src={asset("/media/google-maps/GoogleMaps_Logo_Gray.svg")} alt="Google Maps" width={98} height={18} translate="no" style={{ height: 18, width: 98 }} /></div>
        </div>
        <div className="mt-7 flex items-center gap-5 border-t hairline pt-6">
          <span className="display text-6xl">{value.place.rating}</span>
          <div><Stars rating={value.place.rating} large /><p className="mt-1 text-xs text-ink-soft">Based on {value.place.userRatingCount} Google reviews</p></div>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {value.reviews.slice(0, 5).map((review, i) => (
            <Reveal key={`${review.publishTime}-${i}`} delay={i * 0.07} className="h-full">
              <article className="flex h-full flex-col rounded-[3px] border hairline bg-paper p-5 transition-transform duration-300 motion-safe:hover:-translate-y-1">
                <div className="flex items-center gap-3">
                  {safeUrl(review.authorPhotoUri) ? <img src={safeUrl(review.authorPhotoUri)} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-well font-mono text-xs text-ink">{review.authorName.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join("") || "G"}</span>}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <a href={safeUrl(review.authorUri)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline decoration-copper/50 underline-offset-4 hover:text-copper">{review.authorName}</a>
                    <time dateTime={review.publishTime} className="text-xs text-ink-faint">{review.relativeTime}</time>
                  </div>
                </div>
                <div className="mt-5"><Stars rating={review.rating} /></div>
                {review.text && <ReviewText text={review.text} />}
                {review.translated && <p className="mt-3 text-xs text-ink-faint">Translated by Google</p>}
                <div className="mt-auto flex flex-wrap justify-between gap-3 pt-5 text-xs underline decoration-copper/50 underline-offset-4">
                  {safeUrl(review.googleMapsUri) && <a href={safeUrl(review.googleMapsUri)} target="_blank" rel="noopener noreferrer" className="hover:text-copper">Read on Google Maps</a>}
                  {safeUrl(review.flagContentUri) && <a href={safeUrl(review.flagContentUri)} target="_blank" rel="noopener noreferrer" className="text-ink-faint hover:text-copper">Report</a>}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-7 border-t hairline pt-5">
          <p className="mt-3 text-xs leading-relaxed text-ink-soft">These are up to five reviews from our Google Maps profile, shown in Google&apos;s order (most relevant first). We do not filter or edit them. {safeUrl(value.place.googleMapsUri) ? <a href={safeUrl(value.place.googleMapsUri)} target="_blank" rel="noopener noreferrer" className="underline decoration-copper underline-offset-4">See all reviews on Google Maps</a> : "See all reviews on Google Maps"}.</p>
          <p className="mt-3 text-xs text-ink-soft">Google doesn&apos;t verify reviews but removes fake content when it&apos;s found.</p>
        </div>
      </Reveal>
    </section>
  );
}
