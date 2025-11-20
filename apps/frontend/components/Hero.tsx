'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The CTA scrolls to the enquiry form. The previous version shipped that scroll
 * as an inline `dangerouslySetInnerHTML` script, which ran the moment the
 * document parsed — so every visitor was thrown down the page on load instead of
 * on click, and the button itself did nothing.
 */
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Hero({ productCount }: { productCount: number }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-line bg-linear-to-b from-brand-tint to-canvas">
      <div className="container grid gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:py-16">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="mb-4 inline-flex items-center rounded-full border border-brand/25 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-strong">
            {productCount} bottles in stock
          </p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Drinkware built to be refilled, not replaced.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
            Borosilicate glass, 18/8 steel and FSC bamboo. Every bottle in the range is dishwasher
            safe, leak tested, and sold with replacement seals so it outlasts the disposable it
            replaced.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() => scrollTo('catalogue')}
              className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-brand-strong"
            >
              Browse the catalogue
            </button>
            <button
              onClick={() => scrollTo('enquiry')}
              className="inline-flex items-center justify-center rounded-full border border-line bg-white px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-canvas"
            >
              Ask about bulk pricing
            </button>
          </div>
        </motion.div>

        <motion.dl
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
          className="grid grid-cols-2 gap-4"
        >
          {[
            { value: '24h', label: 'Cold retention, insulated range' },
            { value: '12h', label: 'Hot retention, insulated range' },
            { value: '18/8', label: 'Food-grade stainless steel' },
            { value: 'FSC', label: 'Certified bamboo exteriors' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-line bg-white/80 p-5 backdrop-blur"
            >
              <dt className="text-2xl font-bold text-brand-strong">{stat.value}</dt>
              <dd className="mt-1 text-sm leading-snug text-muted">{stat.label}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </section>
  );
}
