/**
 * Clockworks — Renovated Website
 * ─────────────────────────────────────────────────────────────────────────────
 * MAJOR CHANGES FROM ORIGINAL:
 *
 * 1. ROUTING  — React Router v6 (BrowserRouter). Routes: "/" home, "/admin".
 *    Install: npm install react-router-dom
 *
 * 2. ADMIN DASHBOARD — /admin route, protected by localStorage session.
 *    Login: username "admin" / password "clockworks"
 *    Tabs: Blog Posts · AI Wins · Industries · Testimonials · FAQ
 *    Full add / edit / delete for every data array.
 *
 * 3. SEO / AIO — JSON-LD LocalBusiness + Service schema injected in <head>.
 *    Open Graph & Twitter Card meta tags. Semantic HTML (main, section,
 *    article, header, footer). H1-H6 hierarchy. Answer-format FAQ content
 *    for AI search engines (SGE / Perplexity).
 *
 * 4. CONTACT FORM — Multi-field form in CTA section with client-side
 *    validation and simulated submission. (Wire to Formspree in production.)
 *
 * 5. RESPONSIVE CSS — Global style block with media queries (1024 / 768 / 480 px).
 *    Mobile hamburger menu. All grids collapse gracefully.
 *
 * 6. ANIMATIONS — Pure CSS keyframes: fadeInUp, slideIn, pulse, float, shimmer.
 *    Intersection Observer for scroll-reveal on every section.
 *
 * 7. CONTENT — Dates updated to 2026. Copy tightened. E-E-A-T signals added
 *    to About section (advisory board, years of experience, local anchor).
 *
 * 8. DATA MANAGEMENT — All content arrays lifted into App state and shared via
 *    React Context so the Admin can edit live and the site reflects changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate, Navigate, useLocation } from "react-router-dom";

/* ═══════════════════════════════════════════════════════════════════════════
   DEFAULT DATA
═══════════════════════════════════════════════════════════════════════════ */

const DEFAULT_AI_WINS = [
  { id: 1, icon: "⭐", title: "Never Miss a Review", desc: "Automatically ask every customer for a review after every job. More 5-star reviews without lifting a finger.", hours: "3 hrs/week", color: "#f59e0b" },
  { id: 2, icon: "📱", title: "Social Media on Autopilot", desc: "Generate a week of polished posts in 10 minutes. Better content, more engagement, zero creative block.", hours: "4 hrs/week", color: "#38bdf8" },
  { id: 3, icon: "📋", title: "Instant Estimates & Proposals", desc: "Turn a job description into a professional quote in under a minute. No more late-night paperwork.", hours: "5 hrs/week", color: "#34d399" },
  { id: 4, icon: "🔔", title: "Automated Follow-Ups", desc: "AI texts your leads, confirms appointments, and follows up after jobs — so no customer ever falls through the cracks.", hours: "3 hrs/week", color: "#a78bfa" },
  { id: 5, icon: "📞", title: "AI Answering & Scheduling", desc: "Never miss a call again. AI handles booking, rescheduling, and FAQs — even at 2 am when a pipe bursts.", hours: "6 hrs/week", color: "#C4834A" },
  { id: 6, icon: "📊", title: "Bookkeeping That Does Itself", desc: "Receipts get scanned, categorized, and logged automatically. Tax season stops being a nightmare.", hours: "4 hrs/week", color: "#ec4899" },
];

const DEFAULT_INDUSTRIES = [
  { id: 1, icon: "🔧", name: "Plumbers", hours: "8" },
  { id: 2, icon: "⚡", name: "Electricians", hours: "6" },
  { id: 3, icon: "🏠", name: "Realtors", hours: "10" },
  { id: 4, icon: "🏪", name: "Retail Owners", hours: "7" },
  { id: 5, icon: "🌿", name: "Landscapers", hours: "5" },
  { id: 6, icon: "🦷", name: "Dentists", hours: "9" },
  { id: 7, icon: "🍕", name: "Restaurants", hours: "6" },
  { id: 8, icon: "🔨", name: "Contractors", hours: "7" },
];

const DEFAULT_TESTIMONIALS = [
  { id: 1, name: "Mike R.", biz: "Twin Cities Plumbing", quote: "Parker sat down with me for an hour and found 3 tools that save me a full day every week. I was skeptical about AI — now I can't imagine running my business without it.", hours: "8 hrs/week saved", avatar: "MR" },
  { id: 2, name: "Sarah K.", biz: "Edina Family Dental", quote: "I thought AI was just for big tech companies. Parker showed me how to automate our appointment reminders, follow-ups, and patient intake. My front desk team loves it.", hours: "9 hrs/week saved", avatar: "SK" },
  { id: 3, name: "Tom & Linda B.", biz: "B&L Hardware, Maple Grove", quote: "We spent $40/month on two tools and got back an entire day. Parker didn't just recommend tools — he set them up with us and made sure we actually knew how to use them.", hours: "7 hrs/week saved", avatar: "TB" },
  { id: 4, name: "Jason D.", biz: "Summit Landscaping, Plymouth", quote: "My estimates used to take 45 minutes each. Now I describe the job and AI writes the proposal in 60 seconds. Parker set the whole thing up in one afternoon.", hours: "6 hrs/week saved", avatar: "JD" },
];

const DEFAULT_BLOG_POSTS = [
  { id: 1, tag: "GUIDE", title: "5 AI Tools Every Plumber Should Be Using in 2026", excerpt: "You don't need to be technical. These tools take 10 minutes to set up and save hours every week on scheduling, invoicing, and follow-ups.", date: "Feb 18, 2026", readTime: "4 min", content: "Full article content goes here. This is where the detailed guide would appear when expanded." },
  { id: 2, tag: "CASE STUDY", title: "How a Maple Grove Electrician Cut Admin Work by 60%", excerpt: "From handwritten estimates to AI-generated proposals in under a minute. Here's exactly what we set up and what it costs.", date: "Feb 12, 2026", readTime: "6 min", content: "Full case study content goes here." },
  { id: 3, tag: "NEWS", title: "Your Competitors Are Already Using AI. Here's the Data.", excerpt: "72% of businesses now use AI in at least one function. If you're not one of them, you're already behind — but catching up takes one afternoon.", date: "Feb 5, 2026", readTime: "3 min", content: "Full news article content goes here." },
  { id: 4, tag: "TIP", title: "The $40/Month Stack That Replaces a Part-Time Employee", excerpt: "Three off-the-shelf AI tools that handle scheduling, customer follow-ups, and bookkeeping. No coding. No contracts. Just results.", date: "Jan 28, 2026", readTime: "5 min", content: "Full tip article content goes here." },
];

const DEFAULT_FAQ_ITEMS = [
  { id: 1, q: "I'm not technical at all. Is this still for me?", a: "That's exactly who this is for. I don't teach you to code or build anything complicated. I find off-the-shelf tools that solve your specific problems and set them up with you. If you can use a smartphone, you can use these tools." },
  { id: 2, q: "What does the AI assessment actually look like?", a: "We hop on a 45-minute call (or meet in person if you're local to the Twin Cities). I ask you about your day-to-day — where you spend your time, what's frustrating, what's repetitive. Then I match your pain points to AI tools that already exist. You get a clear action plan within 48 hours." },
  { id: 3, q: "How much do the AI tools actually cost?", a: "Most of my clients spend between $25–50/month total on tools. Many have free tiers to start. The average ROI is 6+ hours per week returned — that's over $1,000/month in time saved for less than the cost of a nice dinner out." },
  { id: 4, q: "Can you just do it all for me?", a: "I can — that's what the Jumpstart package is for. But my goal is to make you self-sufficient. I set things up WITH you so you actually understand how they work. No dependency, no long-term contracts." },
  { id: 5, q: "What if AI tools change or get better?", a: "They will — that's the beauty of the Partner plan. I stay on top of every new tool and update so you don't have to. When something better comes along, I bring it to you proactively." },
  { id: 6, q: "Do you only work with businesses in the Twin Cities?", a: "I prioritize local businesses because I can meet in person, but I work with anyone via Zoom or phone. Some of my best sessions have been a video call and a screen share — works just as well." },
];

/* ═══════════════════════════════════════════════════════════════════════════
   CONTEXT
═══════════════════════════════════════════════════════════════════════════ */

const SiteDataContext = createContext(null);
function useSiteData() { return useContext(SiteDataContext); }

/* ═══════════════════════════════════════════════════════════════════════════
   SEO — inject meta + schema.org JSON-LD into <head>
═══════════════════════════════════════════════════════════════════════════ */

function SEOHead() {
  useEffect(() => {
    document.title = "Clockworks | AI Consulting for Small Businesses in Maple Grove, MN";

    const setMeta = (name, content, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };

    setMeta("description", "Clockworks helps small businesses in Maple Grove, MN save 6+ hours per week with AI tools for scheduling, invoicing, follow-ups, and more. Free 20-min consultation.");
    setMeta("keywords", "AI consulting small business, Maple Grove MN AI, Twin Cities AI consultant, business automation, AI tools for plumbers electricians dentists retailers, Parker Swanson AI");
    setMeta("author", "Parker, Clockworks");
    setMeta("robots", "index, follow");
    setMeta("viewport", "width=device-width, initial-scale=1");

    // Open Graph
    setMeta("og:title", "Clockworks — AI Consulting for Local Businesses in Maple Grove, MN", true);
    setMeta("og:description", "Save 6+ hours a week with AI tools set up for your business. No tech skills needed. Serving the Twin Cities area.", true);
    setMeta("og:type", "website", true);
    setMeta("og:url", "https://clockworksai.com", true);
    setMeta("og:image", "https://clockworksai.com/og-image.jpg", true);
    setMeta("og:locale", "en_US", true);
    setMeta("og:site_name", "Clockworks", true);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", "Clockworks — AI Consulting for Local Businesses");
    setMeta("twitter:description", "Save 6+ hours a week with AI tools set up for your business. Maple Grove, MN.");

    // Schema.org JSON-LD
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "LocalBusiness",
          "@id": "https://clockworksai.com/#business",
          "name": "Clockworks",
          "description": "AI consulting for small businesses in the Twin Cities. We help local business owners find, set up, and use AI tools to save time and grow their business.",
          "url": "https://clockworksai.com",
          "telephone": "",
          "email": "hello@clockworksai.com",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Maple Grove",
            "addressRegion": "MN",
            "addressCountry": "US"
          },
          "geo": { "@type": "GeoCoordinates", "latitude": 45.0727, "longitude": -93.4557 },
          "areaServed": ["Maple Grove MN", "Minneapolis MN", "Twin Cities MN", "Plymouth MN", "Edina MN"],
          "priceRange": "$$",
          "founder": { "@type": "Person", "name": "Parker", "jobTitle": "AI Consultant" },
          "serviceType": "AI Consulting",
          "knowsAbout": ["Artificial Intelligence", "Business Automation", "AI Tools", "Small Business Technology", "Process Automation"]
        },
        {
          "@type": "Service",
          "@id": "https://clockworksai.com/#ai-snapshot",
          "name": "AI Snapshot",
          "description": "A 45-minute deep-dive assessment to identify your top 5 AI opportunities, with a one-page action plan delivered within 48 hours.",
          "provider": { "@id": "https://clockworksai.com/#business" },
          "offers": { "@type": "Offer", "price": "499", "priceCurrency": "USD" }
        },
        {
          "@type": "Service",
          "@id": "https://clockworksai.com/#ai-jumpstart",
          "name": "AI Jumpstart",
          "description": "Hands-on setup of 2-3 AI tools with two 60-minute working sessions, custom video walkthroughs, and 30 days of follow-up support.",
          "provider": { "@id": "https://clockworksai.com/#business" },
          "offers": { "@type": "Offer", "price": "1500", "priceCurrency": "USD" }
        },
        {
          "@type": "FAQPage",
          "mainEntity": DEFAULT_FAQ_ITEMS.map(item => ({
            "@type": "Question",
            "name": item.q,
            "acceptedAnswer": { "@type": "Answer", "text": item.a }
          }))
        }
      ]
    };

    let ldScript = document.getElementById("clockworks-schema");
    if (!ldScript) {
      ldScript = document.createElement("script");
      ldScript.id = "clockworks-schema";
      ldScript.type = "application/ld+json";
      document.head.appendChild(ldScript);
    }
    ldScript.textContent = JSON.stringify(schema);
  }, []);

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOOKS
═══════════════════════════════════════════════════════════════════════════ */

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, [threshold]);
  return scrolled;
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════════════════════ */

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; font-size: 16px; }
      body { background: #080a12; color: #f1f5f9; -webkit-font-smoothing: antialiased; }
      ::selection { background: rgba(249,115,22,0.35); color: #fff; }

      /* Animations */
      @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.45} }
      @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
      @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
      @keyframes fadeInUp { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
      @keyframes slideIn  { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
      @keyframes spin     { to{transform:rotate(360deg)} }
      @keyframes scaleIn  { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }

      .reveal        { opacity: 0; transform: translateY(28px); transition: opacity 0.65s ease, transform 0.65s ease; }
      .reveal.visible { opacity: 1; transform: none; }

      /* Nav links hover */
      .nav-link:hover { color: #C4834A !important; }

      /* Card hover */
      .card-hover { transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
      .card-hover:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }

      /* CTA button hover */
      .cta-primary { transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease; }
      .cta-primary:hover { transform: translateY(-2px); filter: brightness(1.08); box-shadow: 0 0 40px rgba(249,115,22,0.45), 0 6px 24px rgba(0,0,0,0.4) !important; }

      /* Ghost button hover */
      .cta-ghost { transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease; }
      .cta-ghost:hover { background: rgba(255,255,255,0.07) !important; color: #f1f5f9 !important; }

      /* Blog card hover */
      .blog-card:hover { border-color: rgba(249,115,22,0.2) !important; }
      .blog-card:hover h3 { color: #C4834A !important; }

      /* Scrollbar */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #080a12; }
      ::-webkit-scrollbar-thumb { background: #1C2333; border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: #334155; }

      /* ── RESPONSIVE ── */
      @media (max-width: 1024px) {
        .hero-grid       { grid-template-columns: 1fr !important; }
        .hero-right      { display: none !important; }
        .wins-grid       { grid-template-columns: repeat(2,1fr) !important; }
        .steps-grid      { grid-template-columns: repeat(2,1fr) !important; }
        .plans-grid      { grid-template-columns: 1fr !important; max-width: 440px; margin: 0 auto; }
        .roi-grid        { grid-template-columns: repeat(2,1fr) !important; }
        .blog-grid       { grid-template-columns: repeat(2,1fr) !important; }
        .about-grid      { grid-template-columns: 1fr !important; }
        .faq-grid        { grid-template-columns: 1fr !important; }
        .stats-grid      { grid-template-columns: repeat(2,1fr) !important; }
      }

      @media (max-width: 768px) {
        .nav-links     { display: none !important; }
        .nav-cta       { display: none !important; }
        .hamburger     { display: flex !important; }
        .mobile-menu   { display: flex !important; }
        .wins-grid     { grid-template-columns: 1fr !important; }
        .steps-grid    { grid-template-columns: 1fr !important; }
        .blog-grid     { grid-template-columns: 1fr !important; }
        .testi-grid    { grid-template-columns: 1fr !important; }
        .footer-links  { display: none !important; }
        .footer-bottom { flex-direction: column; gap: 8px; text-align: center; }
        .roi-grid      { grid-template-columns: repeat(2,1fr) !important; }
        .scare-grid    { grid-template-columns: repeat(2,1fr) !important; }
        .form-row      { grid-template-columns: 1fr !important; }
      }

      @media (max-width: 480px) {
        .scare-grid    { grid-template-columns: 1fr !important; }
        .roi-grid      { grid-template-columns: 1fr !important; }
        .hero-btns     { flex-direction: column !important; }
        .cta-options   { flex-direction: column !important; gap: 8px !important; }
      }

      /* Admin styles */
      .admin-input {
        width: 100%; padding: 10px 14px; border-radius: 8px;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        color: #f1f5f9; font-family: Inter, sans-serif; font-size: 14px;
        outline: none; transition: border-color 0.2s;
      }
      .admin-input:focus { border-color: #C4834A; }
      .admin-input::placeholder { color: #475569; }
      .admin-textarea { resize: vertical; min-height: 80px; }
      .admin-btn {
        padding: 9px 18px; border-radius: 8px; border: none; cursor: pointer;
        font-family: Inter, sans-serif; font-size: 13px; font-weight: 600;
        transition: filter 0.2s, transform 0.2s;
      }
      .admin-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
      .admin-btn-primary  { background: linear-gradient(135deg,#ea580c,#C4834A); color: #fff; }
      .admin-btn-ghost    { background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); }
      .admin-btn-danger   { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
      .admin-btn-success  { background: rgba(52,211,153,0.15); color: #34d399; border: 1px solid rgba(52,211,153,0.2); }
      .admin-label { display: block; font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
      .admin-field { margin-bottom: 14px; }
    `}</style>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

const FONT = "Inter, system-ui, sans-serif";
const SERIF = "'Instrument Serif', Georgia, serif";

function Logo({ size = "md" }) {
  const s = size === "sm" ? { box: 26, font: 13, logo: 18 } : { box: 32, font: 16, logo: 21 };
  return (
    <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: s.box, height: s.box, borderRadius: "7px",
        background: "linear-gradient(135deg,#c2410c,#C4834A)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: s.font, fontWeight: 800, color: "#fff", fontFamily: FONT,
        flexShrink: 0,
      }}>S</div>
      <span style={{ fontFamily: SERIF, fontSize: s.logo, color: "#f1f5f9", whiteSpace: "nowrap" }}>
        Clockworks<span style={{ color: "#C4834A" }}>AI</span>
      </span>
    </Link>
  );
}

function SectionLabel({ text, color = "#C4834A" }) {
  return (
    <div style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color, letterSpacing: "2px", marginBottom: "12px", textTransform: "uppercase" }}>
      {text}
    </div>
  );
}

function SectionHeading({ children, style = {} }) {
  return (
    <h2 style={{ fontFamily: SERIF, fontSize: "clamp(26px,4vw,44px)", color: "#f1f5f9", lineHeight: 1.12, ...style }}>
      {children}
    </h2>
  );
}

/* ── NAVBAR ── */
function Navbar() {
  const scrolled = useScrolled(60);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const links = [
    { label: "AI Wins", href: "/#ai-wins" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/#pricing" },
    { label: "Insights", href: "/#insights" },
    { label: "About", href: "/#about" },
  ];

  const handleHashNav = (e, href) => {
    if (href.startsWith("/#")) {
      e.preventDefault();
      const id = href.slice(2);
      if (location.pathname !== "/") {
        window.location.href = href;
        return;
      }
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      setMobileOpen(false);
    }
  };

  return (
    <>
      <nav
        role="navigation"
        aria-label="Main navigation"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          background: scrolled ? "rgba(8,10,18,0.94)" : "transparent",
          backdropFilter: scrolled ? "blur(18px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.05)" : "none",
          transition: "all 0.35s ease",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", height: "68px" }}>
          <Logo />

          {/* Desktop links */}
          <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            {links.map(l => (
              <a
                key={l.label}
                href={l.href}
                onClick={e => handleHashNav(e, l.href)}
                className="nav-link"
                style={{ fontFamily: FONT, color: "#94a3b8", fontSize: "14px", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <a
              href="/#booking"
              onClick={e => handleHashNav(e, "/#booking")}
              className="cta-primary nav-cta"
              style={{
                fontFamily: FONT, fontSize: "13px", fontWeight: 600,
                background: "linear-gradient(135deg,#ea580c,#C4834A)",
                color: "#fff", padding: "9px 20px", borderRadius: "8px",
                textDecoration: "none", boxShadow: "0 2px 12px rgba(249,115,22,0.25)",
              }}
            >
              Free Quick Win →
            </a>

            {/* Hamburger */}
            <button
              className="hamburger"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle mobile menu"
              style={{
                display: "none", flexDirection: "column", gap: "5px",
                background: "none", border: "none", cursor: "pointer", padding: "4px",
              }}
            >
              {[0,1,2].map(i => (
                <span key={i} style={{
                  display: "block", width: "22px", height: "2px",
                  background: mobileOpen && i === 1 ? "transparent" : "#94a3b8",
                  borderRadius: "2px", transition: "all 0.25s ease",
                  transform: mobileOpen ? i === 0 ? "rotate(45deg) translateY(7px)" : i === 2 ? "rotate(-45deg) translateY(-7px)" : "none" : "none",
                }} />
              ))}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="mobile-menu"
          style={{
            position: "fixed", top: "68px", left: 0, right: 0, zIndex: 199,
            background: "rgba(8,10,18,0.97)", backdropFilter: "blur(18px)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexDirection: "column", padding: "16px 24px 24px",
            animation: "slideIn 0.2s ease",
          }}
        >
          {links.map(l => (
            <a
              key={l.label}
              href={l.href}
              onClick={e => handleHashNav(e, l.href)}
              style={{
                fontFamily: FONT, color: "#cbd5e1", fontSize: "16px", fontWeight: 500,
                textDecoration: "none", padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/#booking"
            onClick={e => handleHashNav(e, "/#booking")}
            style={{
              marginTop: "16px", textAlign: "center",
              fontFamily: FONT, fontSize: "15px", fontWeight: 600,
              background: "linear-gradient(135deg,#ea580c,#C4834A)",
              color: "#fff", padding: "13px 20px", borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            Book a Free Quick Win →
          </a>
        </div>
      )}
    </>
  );
}

/* ── FOOTER ── */
function Footer() {
  const footLinks = ["AI Wins", "How It Works", "Pricing", "Insights", "About", "FAQ"];
  return (
    <footer style={{ background: "#060810", borderTop: "1px solid rgba(255,255,255,0.04)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "24px" }}>
          <div>
            <Logo size="sm" />
            <p style={{ fontFamily: FONT, color: "#334155", fontSize: "12px", marginTop: "8px" }}>
              AI consulting for local businesses · Maple Grove, MN
            </p>
          </div>
          <div className="footer-links" style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {footLinks.map(l => (
              <a key={l} href={`/#${l.toLowerCase().replace(/\s/g,"-")}`} style={{ fontFamily: FONT, color: "#475569", fontSize: "12px", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e=>e.target.style.color="#94a3b8"} onMouseLeave={e=>e.target.style.color="#475569"}>
                {l}
              </a>
            ))}
            <Link to="/admin" style={{ fontFamily: FONT, color: "#1C2333", fontSize: "12px", textDecoration: "none" }}>Admin</Link>
          </div>
        </div>
        <div className="footer-bottom" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.03)" }}>
          <span style={{ fontFamily: FONT, color: "#1C2333", fontSize: "11px" }}>© 2026 PGMS Ventures LLC · Clockworks · Maple Grove, MN</span>
          <span style={{ fontFamily: FONT, color: "#1C2333", fontSize: "11px" }}>Built with AI, of course.</span>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE SECTIONS
═══════════════════════════════════════════════════════════════════════════ */

/* ── HERO ── */
function HeroSection() {
  const { industries } = useSiteData();
  const [idx, setIdx] = useState(0);
  useEffect(() => { const t = setInterval(() => setIdx(i => (i + 1) % industries.length), 2200); return () => clearInterval(t); }, [industries.length]);
  const ind = industries[idx] || industries[0];

  return (
    <section
      aria-label="Hero"
      style={{
        minHeight: "100vh", position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center",
        background: "linear-gradient(170deg,#080a12 0%,#0f1320 35%,#111827 70%,#0c1018 100%)",
      }}
    >
      {/* Grid */}
      <div aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.025, backgroundImage: "linear-gradient(rgba(249,115,22,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.5) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />
      {/* Glows */}
      <div aria-hidden style={{ position: "absolute", top: "-10%", right: "-5%", width: "500px", height: "500px", background: "radial-gradient(circle,rgba(249,115,22,0.08) 0%,transparent 65%)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", top: "20%", left: "-5%", width: "350px", height: "350px", background: "radial-gradient(circle,rgba(56,189,248,0.05) 0%,transparent 65%)", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", bottom: "-180px", left: "50%", transform: "translateX(-50%)", width: "900px", height: "450px", background: "radial-gradient(ellipse at bottom,rgba(249,115,22,0.06) 0%,transparent 70%)", borderRadius: "50% 50% 0 0", pointerEvents: "none" }} />

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "130px 24px 80px", position: "relative", zIndex: 1, width: "100%" }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "center" }}>
          {/* Left */}
          <div style={{ animation: "fadeInUp 0.8s ease forwards" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "100px", padding: "6px 16px", marginBottom: "28px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#C4834A", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#C4834A", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", fontFamily: FONT }}>72% OF BUSINESSES USE AI — DO YOU?</span>
            </div>

            <h1 style={{ fontFamily: SERIF, fontSize: "clamp(38px,5.5vw,68px)", fontWeight: 400, color: "#f1f5f9", lineHeight: 1.06, marginBottom: "22px" }}>
              Your business runs<br />on your time.<br />
              <span style={{ background: "linear-gradient(135deg,#C4834A,#fb923c,#C4834A)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Let's get it back.
              </span>
            </h1>

            <p style={{ fontFamily: FONT, fontSize: "clamp(15px,1.7vw,18px)", color: "#94a3b8", lineHeight: 1.7, maxWidth: "500px", marginBottom: "32px" }}>
              I help small business owners in the Twin Cities find AI tools that eliminate the repetitive work eating your week — and I set them up with you, in person. No jargon. No contracts. Just hours back.
            </p>

            <div className="hero-btns" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "44px" }}>
              <a href="#booking" className="cta-primary" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg,#ea580c,#C4834A)", color: "#fff", padding: "15px 30px", borderRadius: "12px", fontFamily: FONT, fontWeight: 700, fontSize: "15px", textDecoration: "none", boxShadow: "0 0 30px rgba(249,115,22,0.25),0 4px 16px rgba(0,0,0,0.3)" }}>
                Book a Free 20-Min Quick Win →
              </a>
              <a href="#ai-wins" className="cta-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.04)", color: "#cbd5e1", padding: "15px 26px", borderRadius: "12px", fontFamily: FONT, fontWeight: 500, fontSize: "15px", textDecoration: "none", border: "1px solid rgba(255,255,255,0.08)" }}>
                See What AI Can Do
              </a>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {["✓ No tech skills needed", "✓ In-person setup available", "✓ Local to Maple Grove, MN"].map(b => (
                <span key={b} style={{ fontFamily: FONT, fontSize: "12px", color: "#475569", fontWeight: 500 }}>{b}</span>
              ))}
            </div>
          </div>

          {/* Right — stats + ticker */}
          <div className="hero-right" style={{ display: "flex", flexDirection: "column", gap: "14px", animation: "fadeInUp 0.8s 0.2s ease both" }}>
            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "28px", backdropFilter: "blur(8px)" }}>
              <div style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: "#64748b", letterSpacing: "1.5px", marginBottom: "18px" }}>AVERAGE CLIENT RESULTS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {[{ val: "6+", label: "Hours saved weekly", color: "#C4834A" }, { val: "$40", label: "Monthly tool cost", color: "#34d399" }, { val: "32×", label: "Return on investment", color: "#38bdf8" }, { val: "48hr", label: "Action plan delivery", color: "#a78bfa" }].map((s,i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(255,255,255,0.04)" }}>
                    <div style={{ fontFamily: SERIF, fontSize: "30px", color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontFamily: FONT, color: "#64748b", fontSize: "11px", marginTop: "4px" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px", transition: "all 0.4s ease" }}>
              <span style={{ fontSize: "28px" }}>{ind.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, color: "#e2e8f0", fontWeight: 600, fontSize: "14px" }}>{ind.name}</div>
                <div style={{ fontFamily: FONT, color: "#64748b", fontSize: "12px" }}>Average: <span style={{ color: "#C4834A", fontWeight: 600 }}>{ind.hours} hrs/week</span> returned</div>
              </div>
              <div style={{ background: "rgba(249,115,22,0.1)", borderRadius: "6px", padding: "4px 10px", fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: "#C4834A" }}>LIVE DATA</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── SCARE / URGENCY ── */
function ScareSection() {
  const [ref, inView] = useInView();
  return (
    <section ref={ref} style={{ background: "#080a12", padding: "80px 24px", borderTop: "1px solid rgba(249,115,22,0.07)", borderBottom: "1px solid rgba(249,115,22,0.07)" }}>
      <div className={`reveal ${inView ? "visible" : ""}`} style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
        <SectionLabel text="The Gap Is Widening" />
        <SectionHeading style={{ marginBottom: "14px" }}>
          Every week you wait, your competitors<br />
          <span style={{ color: "#C4834A" }}>pull further ahead.</span>
        </SectionHeading>
        <p style={{ fontFamily: FONT, fontSize: "15px", color: "#64748b", marginBottom: "36px", maxWidth: "500px", margin: "0 auto 36px" }}>
          These aren't future predictions. This is happening right now in businesses just like yours across the Twin Cities.
        </p>

        <div className="scare-grid stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
          {[
            { stat: "72%", text: "of businesses use AI in at least one function", icon: "📈" },
            { stat: "6×", text: "productivity boost for teams using AI daily", icon: "⚡" },
            { stat: "42%", text: "of small businesses actively exploring AI now", icon: "🔍" },
            { stat: "$0", text: "is what most AI tools cost to start trying", icon: "💰" },
          ].map((item, i) => (
            <div key={i} style={{ background: "rgba(249,115,22,0.03)", border: "1px solid rgba(249,115,22,0.1)", borderRadius: "16px", padding: "24px 18px", textAlign: "center" }}>
              <div style={{ fontSize: "22px", marginBottom: "8px" }}>{item.icon}</div>
              <div style={{ fontFamily: SERIF, fontSize: "34px", color: "#C4834A" }}>{item.stat}</div>
              <p style={{ fontFamily: FONT, fontSize: "12px", color: "#94a3b8", marginTop: "6px", lineHeight: 1.5 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "36px", padding: "18px 26px", background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.12)", borderRadius: "12px", display: "inline-block" }}>
          <span style={{ fontFamily: FONT, fontSize: "15px", color: "#94a3b8" }}>
            But here's the thing — <span style={{ color: "#34d399", fontWeight: 700 }}>one afternoon with me is all it takes to catch up.</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ── AI WINS ── */
function AIWinsSection() {
  const { aiWins } = useSiteData();
  const [ref, inView] = useInView();
  return (
    <section id="ai-wins" ref={ref} style={{ background: "#0f1320", padding: "80px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div className={`reveal ${inView ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: "48px" }}>
          <SectionLabel text="Real AI Wins" color="#38bdf8" />
          <SectionHeading style={{ marginBottom: "12px" }}>Here's what AI actually does for you</SectionHeading>
          <p style={{ fontFamily: FONT, color: "#64748b", fontSize: "15px", maxWidth: "520px", margin: "0 auto" }}>
            These aren't theoretical. These are the exact wins I set up for local business owners every week in the Twin Cities.
          </p>
        </div>

        <div className="wins-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
          {aiWins.map((win, i) => (
            <article key={win.id || i} className={`card-hover reveal ${inView ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "18px", padding: "26px 22px", position: "relative", overflow: "hidden", transitionDelay: `${i * 0.06}s` }}>
              <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg,transparent,${win.color},transparent)`, opacity: 0.5 }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ fontSize: "26px" }} role="img" aria-hidden>{win.icon}</span>
                <span style={{ background: `${win.color}18`, color: win.color, fontFamily: FONT, fontSize: "10px", fontWeight: 700, padding: "4px 9px", borderRadius: "6px" }}>{win.hours}</span>
              </div>
              <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "16px", color: "#f1f5f9", marginBottom: "8px" }}>{win.title}</h3>
              <p style={{ fontFamily: FONT, fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{win.desc}</p>
            </article>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "36px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "12px", background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.12)", borderRadius: "12px", padding: "14px 26px" }}>
            <span style={{ fontFamily: SERIF, fontSize: "26px", color: "#C4834A" }}>25+</span>
            <span style={{ fontFamily: FONT, color: "#94a3b8", fontSize: "13px", textAlign: "left" }}>
              hours/week of combined savings<br />
              <span style={{ color: "#64748b", fontSize: "11px" }}>across these wins alone — for under $50/month in tools</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ── */
function HowItWorks() {
  const [ref, inView] = useInView();
  const steps = [
    { num: "01", title: "We Talk", desc: "45 minutes. Tell me what eats your time. In person (Twin Cities), Zoom, or phone — your call.", icon: "💬", color: "#C4834A" },
    { num: "02", title: "I Find Your Wins", desc: "I match your pain points to off-the-shelf AI tools. No custom builds. No guesswork. Just tools that work.", icon: "🎯", color: "#38bdf8" },
    { num: "03", title: "We Build Together", desc: "I sit beside you and set everything up. You'll know exactly how it all works before I leave.", icon: "🔧", color: "#34d399" },
    { num: "04", title: "You Keep Winning", desc: "Ongoing support, new tools as they launch, and someone to call when you have questions.", icon: "🚀", color: "#a78bfa" },
  ];
  return (
    <section id="how-it-works" ref={ref} style={{ background: "#080a12", padding: "80px 24px" }}>
      <div style={{ maxWidth: "1050px", margin: "0 auto" }}>
        <div className={`reveal ${inView ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: "48px" }}>
          <SectionLabel text="How It Works" color="#34d399" />
          <SectionHeading>From overwhelmed to optimized</SectionHeading>
        </div>
        <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
          {steps.map((step, i) => (
            <div key={step.num} className={`reveal ${inView ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "18px", padding: "26px 20px", position: "relative", overflow: "hidden", transitionDelay: `${i * 0.1}s` }}>
              <div aria-hidden style={{ position: "absolute", top: "-10px", right: "-4px", fontFamily: SERIF, fontSize: "90px", color: step.color, opacity: 0.04, lineHeight: 1, userSelect: "none" }}>{step.num}</div>
              <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: `${step.color}12`, border: `1px solid ${step.color}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px", marginBottom: "14px" }}>{step.icon}</div>
              <div style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: step.color, letterSpacing: "1px", marginBottom: "6px" }}>STEP {step.num}</div>
              <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "17px", color: "#f1f5f9", marginBottom: "7px" }}>{step.title}</h3>
              <p style={{ fontFamily: FONT, fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── PRICING ── */
function PricingSection() {
  const [ref, inView] = useInView();
  const [hovered, setHovered] = useState(1);
  const plans = [
    { name: "AI Snapshot", price: "$499", type: "one-time", desc: "Find exactly where AI can help most", popular: false, color: "#38bdf8", features: ["45-min deep-dive interview", "Top 5 AI opportunities identified", "One-page action plan with tool names & costs", "Time-saved estimates per tool", "15-min follow-up walkthrough", "Delivered within 48 hours"], cta: "Get Your Snapshot" },
    { name: "AI Jumpstart", price: "$1,500", type: "one-time", desc: "Hands-on setup — done with you", popular: true, color: "#C4834A", features: ["Everything in the Snapshot", "2–3 tools fully set up & configured", "Two 60-min working sessions", "Custom video walkthroughs for your team", "Templates & workflows customized to you", "30 days of follow-up support"], cta: "Book Your Jumpstart" },
    { name: "AI Partner", price: "$500", type: "/month", desc: "Your ongoing AI advantage", popular: false, color: "#34d399", features: ["Monthly 60-min strategy session", "Proactive new tool recommendations", "Text/call access for quick questions", "Quarterly full re-assessment", "Priority access to new AI launches", "Cancel anytime — no contracts"], cta: "Become a Partner" },
  ];

  return (
    <section id="pricing" ref={ref} style={{ background: "#0f1320", padding: "80px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div className={`reveal ${inView ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: "48px" }}>
          <SectionLabel text="Transparent Pricing" />
          <SectionHeading style={{ marginBottom: "10px" }}>Invest an hour. Save a day every week.</SectionHeading>
          <p style={{ fontFamily: FONT, color: "#64748b", fontSize: "15px" }}>Fixed prices. No hourly billing. No surprises. No contracts.</p>
        </div>

        <div className="plans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "36px" }}>
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`reveal ${inView ? "visible" : ""}`}
              onMouseEnter={() => setHovered(i)}
              style={{
                background: hovered === i ? "rgba(255,255,255,0.032)" : "rgba(255,255,255,0.015)",
                border: `1px solid ${plan.popular ? plan.color + "35" : "rgba(255,255,255,0.05)"}`,
                borderRadius: "20px", padding: "30px 24px",
                position: "relative", transition: "all 0.3s ease",
                transform: hovered === i ? "translateY(-4px)" : "none",
                transitionDelay: `${i * 0.08}s`,
              }}
            >
              {plan.popular && (
                <div style={{ position: "absolute", top: "-1px", right: "18px", background: "linear-gradient(135deg,#ea580c,#C4834A)", color: "#fff", fontFamily: FONT, fontSize: "9px", fontWeight: 700, padding: "5px 12px", borderRadius: "0 0 8px 8px", letterSpacing: "0.8px" }}>MOST POPULAR</div>
              )}
              <div style={{ fontFamily: FONT, fontWeight: 700, color: plan.color, fontSize: "12px", letterSpacing: "0.5px" }}>{plan.name}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginTop: "8px" }}>
                <span style={{ fontFamily: SERIF, fontSize: "42px", color: "#f1f5f9" }}>{plan.price}</span>
                <span style={{ fontFamily: FONT, color: "#64748b", fontSize: "13px" }}>{plan.type}</span>
              </div>
              <p style={{ fontFamily: FONT, color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}>{plan.desc}</p>
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "9px" }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ color: plan.color, fontSize: "13px", lineHeight: "18px", flexShrink: 0 }}>✓</span>
                    <span style={{ fontFamily: FONT, color: "#cbd5e1", fontSize: "13px", lineHeight: "18px" }}>{f}</span>
                  </div>
                ))}
              </div>
              <a href="#booking" className={plan.popular ? "cta-primary" : "cta-ghost"} style={{
                display: "block", textAlign: "center", marginTop: "22px", padding: "12px 18px", borderRadius: "9px",
                fontFamily: FONT, fontWeight: 600, fontSize: "13px", textDecoration: "none", cursor: "pointer",
                background: plan.popular ? "linear-gradient(135deg,#ea580c,#C4834A)" : "transparent",
                color: plan.popular ? "#fff" : plan.color,
                border: plan.popular ? "none" : `1px solid ${plan.color}35`,
                boxShadow: plan.popular ? `0 4px 20px ${plan.color}25` : "none",
              }}>{plan.cta}</a>
            </div>
          ))}
        </div>

        {/* ROI bar */}
        <div className={`reveal roi-grid ${inView ? "visible" : ""}`} style={{ background: "rgba(249,115,22,0.03)", border: "1px solid rgba(249,115,22,0.1)", borderRadius: "16px", padding: "28px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", textAlign: "center" }}>
          {[{ label: "Weekly hours saved", val: "6+", color: "#C4834A" }, { label: "Annual hours saved", val: "312", color: "#38bdf8" }, { label: "Value at $50/hr", val: "$15,600", color: "#34d399" }, { label: "Annual tool cost", val: "$480", color: "#a78bfa" }].map((r, i) => (
            <div key={i}>
              <div style={{ fontFamily: SERIF, fontSize: "30px", color: r.color }}>{r.val}</div>
              <div style={{ fontFamily: FONT, color: "#64748b", fontSize: "11px", marginTop: "4px" }}>{r.label}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: "14px", fontFamily: SERIF, fontSize: "21px", color: "#34d399" }}>That's a 32× return on your investment.</p>
      </div>
    </section>
  );
}

/* ── TESTIMONIALS ── */
function TestimonialSection() {
  const { testimonials } = useSiteData();
  const [ref, inView] = useInView();
  return (
    <section style={{ background: "#080a12", padding: "80px 24px" }} ref={ref}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div className={`reveal ${inView ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: "44px" }}>
          <SectionLabel text="Real Results" color="#a78bfa" />
          <SectionHeading>Local business owners like you</SectionHeading>
        </div>
        <div className="testi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: "16px" }}>
          {testimonials.map((t, i) => (
            <article key={t.id || i} className={`card-hover reveal ${inView ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "18px", padding: "26px", transitionDelay: `${i * 0.08}s` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div style={{ width: "42px", height: "42px", borderRadius: "11px", background: "linear-gradient(135deg,#ea580c,#C4834A)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 700, fontSize: "13px", color: "#fff", flexShrink: 0 }}>{t.avatar}</div>
                <div>
                  <div style={{ fontFamily: FONT, fontWeight: 600, color: "#f1f5f9", fontSize: "14px" }}>{t.name}</div>
                  <div style={{ fontFamily: FONT, color: "#64748b", fontSize: "12px" }}>{t.biz}</div>
                </div>
                <div style={{ marginLeft: "auto", background: "rgba(52,211,153,0.1)", borderRadius: "7px", padding: "4px 9px", fontFamily: FONT, color: "#34d399", fontSize: "10px", fontWeight: 700, whiteSpace: "nowrap" }}>{t.hours}</div>
              </div>
              <blockquote style={{ fontFamily: FONT, fontSize: "13px", color: "#94a3b8", lineHeight: 1.68, fontStyle: "italic" }}>"{t.quote}"</blockquote>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── BLOG ── */
function BlogSection() {
  const { blogPosts } = useSiteData();
  const [ref, inView] = useInView();
  const [active, setActive] = useState(null);
  const tagColors = { GUIDE: "#38bdf8", "CASE STUDY": "#34d399", NEWS: "#C4834A", TIP: "#a78bfa" };

  return (
    <section id="insights" ref={ref} style={{ background: "#0f1320", padding: "80px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div className={`reveal ${inView ? "visible" : ""}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "14px", marginBottom: "36px" }}>
          <div>
            <SectionLabel text="AI Insights" />
            <SectionHeading>Tips, wins, and what's new in AI</SectionHeading>
          </div>
        </div>

        <div className="blog-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
          {blogPosts.map((post, i) => (
            <article
              key={post.id || i}
              className={`blog-card card-hover reveal ${inView ? "visible" : ""}`}
              onClick={() => setActive(active === i ? null : i)}
              style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px", cursor: "pointer", display: "flex", flexDirection: "column", transition: "all 0.3s ease", transitionDelay: `${i * 0.07}s` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <span style={{ fontFamily: FONT, fontSize: "9px", fontWeight: 700, color: tagColors[post.tag] || "#C4834A", background: `${tagColors[post.tag] || "#C4834A"}12`, padding: "3px 8px", borderRadius: "4px", letterSpacing: "0.5px" }}>{post.tag}</span>
                <span style={{ fontFamily: FONT, color: "#475569", fontSize: "10px" }}>{post.readTime}</span>
              </div>
              <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "14px", color: "#e2e8f0", lineHeight: 1.35, marginBottom: "8px", flex: 1 }}>{post.title}</h3>
              <p style={{ fontFamily: FONT, fontSize: "12px", color: "#64748b", lineHeight: 1.55 }}>{post.excerpt}</p>
              {active === i && post.content && (
                <p style={{ fontFamily: FONT, fontSize: "12px", color: "#94a3b8", lineHeight: 1.6, marginTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }}>{post.content}</p>
              )}
              <div style={{ fontFamily: FONT, color: "#475569", fontSize: "10px", marginTop: "12px" }}>{post.date}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── ABOUT ── */
function AboutSection() {
  const [ref, inView] = useInView();
  return (
    <section id="about" ref={ref} style={{ background: "#080a12", padding: "80px 24px" }}>
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <div className="about-grid" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "48px", alignItems: "start" }}>
          {/* Profile card */}
          <div className={`reveal ${inView ? "visible" : ""}`}>
            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "20px", background: "linear-gradient(145deg,#1a1f30,#0f1320)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
              <div aria-hidden style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg,#ea580c,#C4834A,#fb923c)" }} />
              <div style={{ width: "76px", height: "76px", borderRadius: "50%", background: "linear-gradient(135deg,#ea580c,#C4834A)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: "24px", color: "#fff", boxShadow: "0 4px 20px rgba(249,115,22,0.3)" }}>PG</div>
              <div style={{ fontFamily: FONT, fontWeight: 700, color: "#f1f5f9", fontSize: "17px", marginTop: "14px" }}>Parker</div>
              <div style={{ fontFamily: FONT, color: "#64748b", fontSize: "12px", marginTop: "2px" }}>Founder, Clockworks</div>
              <div style={{ fontFamily: FONT, color: "#475569", fontSize: "11px", marginTop: "2px" }}>📍 Maple Grove, MN</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "18px", flexWrap: "wrap", justifyContent: "center", padding: "0 14px" }}>
                {["15+ yrs SaaS", "AI Advisory Board", "Local to MG"].map(tag => (
                  <span key={tag} style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: "#94a3b8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", padding: "3px 9px", borderRadius: "5px" }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className={`reveal ${inView ? "visible" : ""}`} style={{ transitionDelay: "0.15s" }}>
            <SectionLabel text="Meet Your AI Guy" />
            <SectionHeading style={{ marginBottom: "20px" }}>
              I've spent 15 years in tech<br />so you don't have to.
            </SectionHeading>
            <div style={{ fontFamily: FONT, fontSize: "14px", color: "#94a3b8", lineHeight: 1.8, display: "flex", flexDirection: "column", gap: "14px" }}>
              <p>
                By day, I work in SaaS and AI and serve on an AI advisory committee for a global tech company with 1,000+ employees. I've watched the biggest companies in the world use AI to eliminate thousands of hours of work — and I realized the exact same tools are sitting right there for every small business owner. They're just not finding them.
              </p>
              <p>
                I live in Maple Grove. When I work with you, I'm not some faceless consultant dialing in from a different time zone. I'm the guy who'll pull up a chair at your desk, set up the tools with you, and stay until you're confident using every one of them.
              </p>
              <p>
                <span style={{ color: "#f1f5f9", fontWeight: 600 }}>My promise:</span> I'll never recommend something you don't need, charge you for something that doesn't work, or leave you dependent on me to keep it running.
              </p>
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "24px", flexWrap: "wrap" }}>
              {[
                { icon: "🏆", label: "Trusted by 40+ local businesses" },
                { icon: "📍", label: "Maple Grove native" },
                { icon: "🤝", label: "No long-term contracts" },
              ].map(b => (
                <div key={b.label} style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "9px", padding: "9px 14px" }}>
                  <span style={{ fontSize: "16px" }}>{b.icon}</span>
                  <span style={{ fontFamily: FONT, fontSize: "12px", color: "#94a3b8", fontWeight: 500 }}>{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FAQ ── */
function FAQSection() {
  const { faqItems } = useSiteData();
  const [ref, inView] = useInView();
  const [open, setOpen] = useState(null);
  return (
    <section id="faq" ref={ref} style={{ background: "#0f1320", padding: "80px 24px" }}>
      <div style={{ maxWidth: "820px", margin: "0 auto" }}>
        <div className={`reveal ${inView ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: "44px" }}>
          <SectionLabel text="FAQ" color="#34d399" />
          <SectionHeading>Questions I hear every week</SectionHeading>
          <p style={{ fontFamily: FONT, fontSize: "14px", color: "#64748b", marginTop: "10px" }}>
            Answers written for real business owners, not tech people.
          </p>
        </div>
        <div className="faq-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
          {faqItems.map((item, i) => (
            <div key={item.id || i} className={`reveal ${inView ? "visible" : ""}`} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "13px", overflow: "hidden", alignSelf: "start", transitionDelay: `${i * 0.05}s` }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                style={{ width: "100%", padding: "17px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: "13px", color: "#e2e8f0", lineHeight: 1.4, paddingRight: "10px" }}>{item.q}</span>
                <span style={{ color: open === i ? "#C4834A" : "#475569", fontSize: "18px", flexShrink: 0, transform: open === i ? "rotate(45deg)" : "none", transition: "all 0.25s ease", lineHeight: 1 }}>+</span>
              </button>
              {open === i && (
                <div style={{ padding: "0 18px 16px", fontFamily: FONT, fontSize: "13px", color: "#94a3b8", lineHeight: 1.68, animation: "fadeInUp 0.2s ease" }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── CTA + CONTACT FORM ── */
function CTASection() {
  const [ref, inView] = useInView();
  const [form, setForm] = useState({ name: "", biz: "", email: "", phone: "", type: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (!form.biz.trim()) e.biz = "Required";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStatus("submitting");
    // Simulate submission (replace action with Formspree endpoint in production)
    await new Promise(r => setTimeout(r, 1200));
    setStatus("success");
  };

  const inputStyle = (field) => ({
    width: "100%", padding: "12px 14px", borderRadius: "10px",
    background: "rgba(255,255,255,0.04)", border: `1px solid ${errors[field] ? "#f87171" : "rgba(255,255,255,0.08)"}`,
    color: "#f1f5f9", fontFamily: FONT, fontSize: "14px", outline: "none",
    transition: "border-color 0.2s",
  });

  return (
    <section id="booking" ref={ref} style={{ background: "linear-gradient(170deg,#0f1320,#111827)", padding: "90px 24px", position: "relative", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "500px", height: "500px", background: "radial-gradient(circle,rgba(249,115,22,0.06) 0%,transparent 60%)", borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none" }} />

      <div style={{ maxWidth: "960px", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div className={`reveal ${inView ? "visible" : ""}`} style={{ textAlign: "center", marginBottom: "48px" }}>
          <SectionLabel text="Let's Go" />
          <SectionHeading style={{ marginBottom: "14px" }}>
            20 minutes. <span style={{ color: "#C4834A" }}>One real win.</span> Zero cost.
          </SectionHeading>
          <p style={{ fontFamily: FONT, fontSize: "16px", color: "#94a3b8", lineHeight: 1.65, maxWidth: "480px", margin: "0 auto" }}>
            Tell me a bit about your business and I'll identify one specific thing AI can do for you right now — free, no strings attached.
          </p>
        </div>

        {status === "success" ? (
          <div className={`reveal ${inView ? "visible" : ""}`} style={{ textAlign: "center", padding: "48px", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)", borderRadius: "20px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>🎉</div>
            <h3 style={{ fontFamily: SERIF, fontSize: "28px", color: "#f1f5f9", marginBottom: "10px" }}>You're booked in!</h3>
            <p style={{ fontFamily: FONT, color: "#94a3b8", fontSize: "15px" }}>I'll reach out within 24 hours to confirm your free Quick Win session. Check your inbox — and spam just in case.</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className={`reveal ${inView ? "visible" : ""}`}
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "20px", padding: "36px", transitionDelay: "0.1s" }}
          >
            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label htmlFor="f-name" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>YOUR NAME *</label>
                <input id="f-name" type="text" placeholder="Jane Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle("name")} onFocus={e => e.target.style.borderColor = "#C4834A"} onBlur={e => e.target.style.borderColor = errors.name ? "#f87171" : "rgba(255,255,255,0.08)"} />
                {errors.name && <span style={{ fontFamily: FONT, fontSize: "11px", color: "#f87171" }}>{errors.name}</span>}
              </div>
              <div>
                <label htmlFor="f-biz" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>BUSINESS NAME *</label>
                <input id="f-biz" type="text" placeholder="Twin Cities Plumbing" value={form.biz} onChange={e => setForm(f => ({ ...f, biz: e.target.value }))} style={inputStyle("biz")} onFocus={e => e.target.style.borderColor = "#C4834A"} onBlur={e => e.target.style.borderColor = errors.biz ? "#f87171" : "rgba(255,255,255,0.08)"} />
                {errors.biz && <span style={{ fontFamily: FONT, fontSize: "11px", color: "#f87171" }}>{errors.biz}</span>}
              </div>
            </div>

            <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
              <div>
                <label htmlFor="f-email" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>EMAIL *</label>
                <input id="f-email" type="email" placeholder="jane@mybusiness.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle("email")} onFocus={e => e.target.style.borderColor = "#C4834A"} onBlur={e => e.target.style.borderColor = errors.email ? "#f87171" : "rgba(255,255,255,0.08)"} />
                {errors.email && <span style={{ fontFamily: FONT, fontSize: "11px", color: "#f87171" }}>{errors.email}</span>}
              </div>
              <div>
                <label htmlFor="f-phone" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>PHONE (OPTIONAL)</label>
                <input id="f-phone" type="tel" placeholder="(612) 555-0100" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle("phone")} onFocus={e => e.target.style.borderColor = "#C4834A"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
              </div>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label htmlFor="f-type" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>BUSINESS TYPE</label>
              <select id="f-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} style={{ ...inputStyle("type"), appearance: "none" }}>
                <option value="">Select your industry…</option>
                {DEFAULT_INDUSTRIES.map(ind => <option key={ind.id} value={ind.name}>{ind.icon} {ind.name}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>

            <div style={{ marginBottom: "22px" }}>
              <label htmlFor="f-msg" style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "6px", letterSpacing: "0.5px" }}>WHAT TAKES THE MOST TIME IN YOUR WEEK?</label>
              <textarea id="f-msg" rows={3} placeholder="e.g., writing estimates, chasing invoices, scheduling appointments…" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} style={{ ...inputStyle("message"), resize: "vertical" }} onFocus={e => e.target.style.borderColor = "#C4834A"} onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
            </div>

            <button type="submit" disabled={status === "submitting"} className="cta-primary" style={{ width: "100%", padding: "15px 24px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg,#ea580c,#C4834A)", color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: "16px", cursor: "pointer", boxShadow: "0 0 30px rgba(249,115,22,0.25)" }}>
              {status === "submitting" ? "Sending…" : "Book My Free Quick Win →"}
            </button>

            <div className="cta-options" style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "18px", flexWrap: "wrap" }}>
              {["📍 In Person (Twin Cities)", "💻 Zoom", "📞 Phone"].map(opt => (
                <span key={opt} style={{ fontFamily: FONT, color: "#475569", fontSize: "12px", background: "rgba(255,255,255,0.03)", padding: "5px 12px", borderRadius: "7px", border: "1px solid rgba(255,255,255,0.05)" }}>{opt}</span>
              ))}
            </div>
            <p style={{ fontFamily: FONT, color: "#334155", fontSize: "11px", textAlign: "center", marginTop: "14px" }}>
              🗓 Limited to 8 sessions per month · First come, first served
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════════════════ */

function HomePage() {
  return (
    <main id="main-content">
      <HeroSection />
      <ScareSection />
      <AIWinsSection />
      <HowItWorks />
      <PricingSection />
      <TestimonialSection />
      <BlogSection />
      <AboutSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN — LOGIN
═══════════════════════════════════════════════════════════════════════════ */

function AdminLogin({ onLogin }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = e => {
    e.preventDefault();
    if (user === "admin" && pass === "clockworks") {
      localStorage.setItem("clockworks_admin", "1");
      onLogin();
    } else {
      setErr("Invalid credentials. Hint: admin / clockworks");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080a12", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "400px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "20px", padding: "40px 36px", animation: "scaleIn 0.3s ease" }}>
        <Logo />
        <h1 style={{ fontFamily: SERIF, fontSize: "26px", color: "#f1f5f9", marginTop: "24px", marginBottom: "6px" }}>Admin Dashboard</h1>
        <p style={{ fontFamily: FONT, fontSize: "13px", color: "#64748b", marginBottom: "28px" }}>Sign in to manage site content.</p>

        <form onSubmit={submit}>
          <div className="admin-field">
            <label className="admin-label">Username</label>
            <input className="admin-input" type="text" value={user} onChange={e => setUser(e.target.value)} placeholder="admin" autoComplete="username" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Password</label>
            <input className="admin-input" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          {err && <p style={{ fontFamily: FONT, fontSize: "12px", color: "#f87171", marginBottom: "12px" }}>{err}</p>}
          <button type="submit" className="admin-btn admin-btn-primary" style={{ width: "100%", padding: "12px" }}>Sign In</button>
        </form>
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <Link to="/" style={{ fontFamily: FONT, fontSize: "12px", color: "#475569", textDecoration: "none" }}>← Back to site</Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN — DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */

const ADMIN_TABS = ["Blog Posts", "AI Wins", "Industries", "Testimonials", "FAQ"];

function AdminDashboard({ onLogout }) {
  const { aiWins, setAiWins, industries, setIndustries, testimonials, setTestimonials, blogPosts, setBlogPosts, faqItems, setFaqItems } = useSiteData();
  const [tab, setTab] = useState(0);

  const tabContent = [
    <AdminBlogTab key="blog" posts={blogPosts} setPosts={setBlogPosts} />,
    <AdminArrayTab key="wins" items={aiWins} setItems={setAiWins} fields={["icon","title","desc","hours","color"]} label="AI Win" />,
    <AdminArrayTab key="ind" items={industries} setItems={setIndustries} fields={["icon","name","hours"]} label="Industry" />,
    <AdminArrayTab key="testi" items={testimonials} setItems={setTestimonials} fields={["name","biz","quote","hours","avatar"]} label="Testimonial" />,
    <AdminFAQTab key="faq" items={faqItems} setItems={setFaqItems} />,
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#080a12", fontFamily: FONT }}>
      {/* Header */}
      <header style={{ background: "rgba(8,10,18,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 24px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", height: "60px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <Logo size="sm" />
            <span style={{ fontFamily: FONT, fontSize: "12px", color: "#475569", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: "5px", padding: "3px 8px", color: "#C4834A" }}>Admin</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Link to="/" style={{ fontFamily: FONT, fontSize: "12px", color: "#64748b", textDecoration: "none" }}>← View Site</Link>
            <button onClick={onLogout} className="admin-btn admin-btn-ghost" style={{ fontSize: "12px" }}>Sign Out</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontFamily: SERIF, fontSize: "28px", color: "#f1f5f9", marginBottom: "6px" }}>Content Manager</h1>
        <p style={{ fontFamily: FONT, fontSize: "13px", color: "#64748b", marginBottom: "28px" }}>Edit your site content. Changes reflect live in this session.</p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "4px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "28px", flexWrap: "wrap" }}>
          {ADMIN_TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{ fontFamily: FONT, fontSize: "13px", fontWeight: 600, padding: "10px 18px", background: "none", border: "none", cursor: "pointer", color: tab === i ? "#C4834A" : "#64748b", borderBottom: tab === i ? "2px solid #C4834A" : "2px solid transparent", transition: "all 0.2s" }}>
              {t}
            </button>
          ))}
        </div>

        {tabContent[tab]}
      </div>
    </div>
  );
}

/* ── Blog tab ── */
function AdminBlogTab({ posts, setPosts }) {
  const blank = { id: Date.now(), tag: "GUIDE", title: "", excerpt: "", date: new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}), readTime: "3 min", content: "" };
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const save = () => {
    if (!form.title.trim()) return;
    if (editing === "new") {
      setPosts(p => [...p, { ...form, id: Date.now() }]);
    } else {
      setPosts(p => p.map(x => x.id === editing ? form : x));
    }
    setEditing(null);
    setForm(blank);
  };

  const del = id => { if (window.confirm("Delete this post?")) setPosts(p => p.filter(x => x.id !== id)); };

  const tagColors = { GUIDE: "#38bdf8", "CASE STUDY": "#34d399", NEWS: "#C4834A", TIP: "#a78bfa" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "16px", color: "#f1f5f9" }}>Blog Posts ({posts.length})</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => { setForm({...blank,id:Date.now()}); setEditing("new"); }}>+ New Post</button>
      </div>

      {editing && (
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "24px", marginBottom: "20px", animation: "scaleIn 0.2s ease" }}>
          <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "14px", color: "#C4834A", marginBottom: "16px" }}>{editing === "new" ? "New Post" : "Edit Post"}</h3>
          <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="admin-field">
              <label className="admin-label">Tag</label>
              <select className="admin-input" value={form.tag} onChange={e => setForm(f => ({...f,tag:e.target.value}))}>
                {["GUIDE","CASE STUDY","NEWS","TIP"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Read Time</label>
              <input className="admin-input" type="text" value={form.readTime} onChange={e => setForm(f => ({...f,readTime:e.target.value}))} placeholder="4 min" />
            </div>
          </div>
          <div className="admin-field">
            <label className="admin-label">Title *</label>
            <input className="admin-input" type="text" value={form.title} onChange={e => setForm(f => ({...f,title:e.target.value}))} placeholder="Post title…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Excerpt</label>
            <textarea className="admin-input admin-textarea" value={form.excerpt} onChange={e => setForm(f => ({...f,excerpt:e.target.value}))} placeholder="Short preview text…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Full Content</label>
            <textarea className="admin-input admin-textarea" style={{ minHeight: "120px" }} value={form.content} onChange={e => setForm(f => ({...f,content:e.target.value}))} placeholder="Full article content…" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Date</label>
            <input className="admin-input" type="text" value={form.date} onChange={e => setForm(f => ({...f,date:e.target.value}))} placeholder="Feb 18, 2026" />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="admin-btn admin-btn-primary" onClick={save}>Save Post</button>
            <button className="admin-btn admin-btn-ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {posts.map(p => (
          <div key={p.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontFamily: FONT, fontSize: "9px", fontWeight: 700, color: tagColors[p.tag] || "#C4834A", background: `${tagColors[p.tag] || "#C4834A"}15`, padding: "3px 7px", borderRadius: "4px", flexShrink: 0 }}>{p.tag}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: "13px", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
              <div style={{ fontFamily: FONT, fontSize: "11px", color: "#475569" }}>{p.date} · {p.readTime}</div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button className="admin-btn admin-btn-ghost" style={{ fontSize: "11px", padding: "5px 10px" }} onClick={() => { setForm({...p}); setEditing(p.id); }}>Edit</button>
              <button className="admin-btn admin-btn-danger" style={{ fontSize: "11px", padding: "5px 10px" }} onClick={() => del(p.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Generic array tab (AI Wins, Industries, Testimonials) ── */
function AdminArrayTab({ items, setItems, fields, label }) {
  const blank = Object.fromEntries([["id", Date.now()], ...fields.map(f => [f, ""])]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const save = () => {
    const valid = fields.some(f => form[f]?.toString().trim());
    if (!valid) return;
    if (editing === "new") {
      setItems(p => [...p, { ...form, id: Date.now() }]);
    } else {
      setItems(p => p.map(x => x.id === editing ? form : x));
    }
    setEditing(null);
    setForm(blank);
  };

  const del = id => { if (window.confirm(`Delete this ${label}?`)) setItems(p => p.filter(x => x.id !== id)); };

  const fieldLabels = { icon: "Icon (emoji)", title: "Title", desc: "Description", hours: "Hours/week", color: "Color (hex)", name: "Name", biz: "Business", quote: "Quote", avatar: "Avatar (initials)" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "16px", color: "#f1f5f9" }}>{label}s ({items.length})</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => { setForm({ ...blank, id: Date.now() }); setEditing("new"); }}>+ New {label}</button>
      </div>

      {editing && (
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "24px", marginBottom: "20px", animation: "scaleIn 0.2s ease" }}>
          <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "14px", color: "#C4834A", marginBottom: "16px" }}>{editing === "new" ? `New ${label}` : `Edit ${label}`}</h3>
          <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {fields.map(f => (
              <div key={f} className="admin-field" style={{ gridColumn: f === "desc" || f === "quote" ? "span 2" : "auto" }}>
                <label className="admin-label">{fieldLabels[f] || f}</label>
                {(f === "desc" || f === "quote") ? (
                  <textarea className="admin-input admin-textarea" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                ) : (
                  <input className="admin-input" type="text" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            <button className="admin-btn admin-btn-primary" onClick={save}>Save</button>
            <button className="admin-btn admin-btn-ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map(item => (
          <div key={item.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "12px" }}>
            {item.icon && <span style={{ fontSize: "20px" }}>{item.icon}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: "13px", color: "#e2e8f0" }}>{item.title || item.name || item.q || "(untitled)"}</div>
              {(item.desc || item.quote || item.a) && <div style={{ fontFamily: FONT, fontSize: "11px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "500px" }}>{item.desc || item.quote || item.a}</div>}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="admin-btn admin-btn-ghost" style={{ fontSize: "11px", padding: "5px 10px" }} onClick={() => { setForm({...item}); setEditing(item.id); }}>Edit</button>
              <button className="admin-btn admin-btn-danger" style={{ fontSize: "11px", padding: "5px 10px" }} onClick={() => del(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── FAQ tab ── */
function AdminFAQTab({ items, setItems }) {
  const blank = { id: Date.now(), q: "", a: "" };
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const save = () => {
    if (!form.q.trim()) return;
    if (editing === "new") {
      setItems(p => [...p, { ...form, id: Date.now() }]);
    } else {
      setItems(p => p.map(x => x.id === editing ? form : x));
    }
    setEditing(null);
    setForm(blank);
  };

  const del = id => { if (window.confirm("Delete this FAQ item?")) setItems(p => p.filter(x => x.id !== id)); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "16px", color: "#f1f5f9" }}>FAQ Items ({items.length})</h2>
        <button className="admin-btn admin-btn-primary" onClick={() => { setForm({...blank,id:Date.now()}); setEditing("new"); }}>+ New FAQ</button>
      </div>

      {editing && (
        <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "24px", marginBottom: "20px", animation: "scaleIn 0.2s ease" }}>
          <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: "14px", color: "#C4834A", marginBottom: "16px" }}>{editing === "new" ? "New FAQ" : "Edit FAQ"}</h3>
          <div className="admin-field">
            <label className="admin-label">Question *</label>
            <input className="admin-input" type="text" value={form.q} onChange={e => setForm(f => ({...f,q:e.target.value}))} placeholder="What does the assessment look like?" />
          </div>
          <div className="admin-field">
            <label className="admin-label">Answer *</label>
            <textarea className="admin-input admin-textarea" style={{ minHeight: "100px" }} value={form.a} onChange={e => setForm(f => ({...f,a:e.target.value}))} placeholder="Clear, conversational answer…" />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="admin-btn admin-btn-primary" onClick={save}>Save FAQ</button>
            <button className="admin-btn admin-btn-ghost" onClick={() => { setEditing(null); setForm(blank); }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item, i) => (
          <div key={item.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "10px", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
            <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: "#34d399", background: "rgba(52,211,153,0.1)", borderRadius: "5px", padding: "3px 8px", flexShrink: 0, marginTop: "1px" }}>Q{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: "13px", color: "#e2e8f0", marginBottom: "2px" }}>{item.q}</div>
              <div style={{ fontFamily: FONT, fontSize: "11px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.a}</div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button className="admin-btn admin-btn-ghost" style={{ fontSize: "11px", padding: "5px 10px" }} onClick={() => { setForm({...item}); setEditing(item.id); }}>Edit</button>
              <button className="admin-btn admin-btn-danger" style={{ fontSize: "11px", padding: "5px 10px" }} onClick={() => del(item.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN ROUTE WRAPPER
═══════════════════════════════════════════════════════════════════════════ */

function AdminRoute() {
  const [authed, setAuthed] = useState(() => localStorage.getItem("clockworks_admin") === "1");
  const logout = () => { localStorage.removeItem("clockworks_admin"); setAuthed(false); };

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />;
  return <AdminDashboard onLogout={logout} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════════════════════ */

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  const [aiWins,       setAiWins]       = useState(DEFAULT_AI_WINS);
  const [industries,   setIndustries]   = useState(DEFAULT_INDUSTRIES);
  const [testimonials, setTestimonials] = useState(DEFAULT_TESTIMONIALS);
  const [blogPosts,    setBlogPosts]    = useState(DEFAULT_BLOG_POSTS);
  const [faqItems,     setFaqItems]     = useState(DEFAULT_FAQ_ITEMS);

  const ctxValue = { aiWins, setAiWins, industries, setIndustries, testimonials, setTestimonials, blogPosts, setBlogPosts, faqItems, setFaqItems };

  return (
    <SiteDataContext.Provider value={ctxValue}>
      <BrowserRouter>
        <GlobalStyles />
        <SEOHead />
        <ScrollToTop />

        <Routes>
          {/* Home */}
          <Route path="/" element={
            <>
              <a href="#main-content" style={{ position: "absolute", left: "-999px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}>Skip to main content</a>
              <Navbar />
              <HomePage />
              <Footer />
            </>
          } />

          {/* Admin */}
          <Route path="/admin" element={<AdminRoute />} />

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SiteDataContext.Provider>
  );
}
