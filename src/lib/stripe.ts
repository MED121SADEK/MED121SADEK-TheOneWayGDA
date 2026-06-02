import Stripe from 'stripe'

/**
 * Stripe server-side client singleton.
 *
 * Uses the latest Stripe API version. Ensure STRIPE_SECRET_KEY is set in .env.
 * For pricing, the following price IDs are expected:
 *   NEXT_PUBLIC_STRIPE_PRICE_PRO        — Pro plan ($19/mo)
 *   NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE — Enterprise plan (custom)
 */

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

/** Lazy alias for backward compatibility */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return Reflect.get(getStripe(), prop)
  },
})

/** Map internal plan names → Stripe Price IDs */
export const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO,
  enterprise: process.env.NEXT_PUBLIC_STRIPE_PRICE_ENTERPRISE,
}

/** Internal plan name → human-readable label (sent as metadata) */
export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
}
