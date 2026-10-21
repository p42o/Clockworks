import Reveal from "@/components/Reveal";
import { steps } from "@/lib/copy";

export default function HowTimeline() {
  return (
    <ol className="relative space-y-5 border-l-2 border-copper/40 pl-6 sm:pl-8">
      {steps.map((step, index) => (
        <Reveal as="li" key={step.n} delay={index * 0.05} variant="rise" className="relative">
          <span className="absolute -left-[1.95rem] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-copper-deep font-mono text-[0.75rem] text-cream-bright sm:-left-[2.45rem]">
            {step.n}
          </span>
          <h3 className="display text-3xl sm:text-4xl">{step.title}</h3>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-soft">{step.body}</p>
        </Reveal>
      ))}
    </ol>
  );
}
