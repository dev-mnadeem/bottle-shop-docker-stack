/**
 * Plain anchors for the CTAs: they work before hydration and with JavaScript
 * off, and `scroll-behavior: smooth` in globals.css does the animation. An
 * earlier version shipped the scroll as an inline script that ran on parse, so
 * every visitor was thrown down the page on load.
 */
const FACTS = [
  { value: '24h', label: 'Cold retention, insulated range' },
  { value: '12h', label: 'Hot retention, insulated range' },
  { value: '18/8', label: 'Food-grade stainless steel' },
  { value: 'FSC', label: 'Certified bamboo exteriors' },
];

export function Hero({ productCount }: { productCount: number | null }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-linear-to-b from-brand-tint to-canvas">
      <div className="container grid gap-10 py-12 sm:py-14 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:py-20">
        <div className="rise">
          {productCount !== null && productCount > 0 && (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-surface/70 px-3 py-1 text-xs font-semibold tracking-wider text-brand-strong uppercase">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-clay" />
              {productCount} {productCount === 1 ? 'bottle' : 'bottles'} in the range
            </p>
          )}
          <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-ink sm:text-6xl">
            Drinkware built to be <em className="text-brand italic">refilled</em>, not replaced.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            Borosilicate glass, 18/8 steel and FSC bamboo. Every bottle in the range is dishwasher
            safe, leak tested, and sold with replacement seals so it outlasts the disposable it
            replaced.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#catalogue"
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Browse the catalogue
            </a>
            <a
              href="#enquiry"
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-ink/30"
            >
              Ask about bulk pricing
            </a>
          </div>
        </div>

        <dl className="rise-late grid grid-cols-2 border-t border-l border-line bg-surface/60">
          {FACTS.map((fact) => (
            <div
              key={fact.label}
              className="flex flex-col-reverse border-r border-b border-line p-5 sm:p-6"
            >
              <dt className="mt-1 text-sm leading-snug text-muted">{fact.label}</dt>
              <dd className="font-display text-3xl font-semibold text-brand-strong">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
