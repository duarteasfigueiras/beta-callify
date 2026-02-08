import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../db/supabase';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth';

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

// Map plan names to product IDs
const PLAN_PRODUCTS: Record<string, string> = {
  starter: process.env.STRIPE_PRODUCT_STARTER || '',
  medium: process.env.STRIPE_PRODUCT_MEDIUM || '',
  pro: process.env.STRIPE_PRODUCT_PRO || '',
  master: process.env.STRIPE_PRODUCT_MASTER || '',
};

// Cache for price IDs (looked up from products)
const priceCache: Record<string, string> = {};

// Helper: Get the default price for a product
async function getPriceForProduct(productId: string): Promise<string> {
  if (priceCache[productId]) {
    return priceCache[productId];
  }

  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    limit: 1,
  });

  if (prices.data.length === 0) {
    throw new Error(`No active price found for product ${productId}`);
  }

  priceCache[productId] = prices.data[0].id;
  return prices.data[0].id;
}

// Helper: Get or create Stripe customer for a company
async function getOrCreateCustomer(companyId: number, email: string): Promise<string> {
  // Check if company already has a Stripe customer
  const { data: company } = await supabase
    .from('companies')
    .select('stripe_customer_id')
    .eq('id', companyId)
    .single();

  if (company?.stripe_customer_id) {
    return company.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: { company_id: String(companyId) },
  });

  // Save customer ID to company
  await supabase
    .from('companies')
    .update({ stripe_customer_id: customer.id })
    .eq('id', companyId);

  return customer.id;
}

// ============================================
// POST /api/stripe/create-checkout-session
// Creates a Stripe Checkout session for a plan
// ============================================
router.post('/create-checkout-session', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body;
    const userId = req.user!.userId;
    const companyId = req.user!.companyId;

    if (!plan || !PLAN_PRODUCTS[plan]) {
      res.status(400).json({ error: 'Invalid plan. Must be one of: starter, medium, pro, master' });
      return;
    }

    if (!companyId) {
      res.status(400).json({ error: 'User must belong to a company to subscribe' });
      return;
    }

    // Get user email
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(companyId, user.username);

    // Get the price ID for this plan's product
    const productId = PLAN_PRODUCTS[plan];
    const priceId = await getPriceForProduct(productId);

    // Determine frontend URL for return
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Create Embedded Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      ui_mode: 'embedded',
      payment_method_collection: 'always',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      return_url: `${frontendUrl}/settings?tab=payment&session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        company_id: String(companyId),
        plan,
      },
    });

    res.json({ clientSecret: session.client_secret });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

// ============================================
// POST /api/stripe/customer-portal
// Creates a Stripe Customer Portal session
// ============================================
router.post('/customer-portal', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'User must belong to a company' });
      return;
    }

    // Get the company's Stripe customer ID
    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single();

    if (!company?.stripe_customer_id) {
      res.status(400).json({ error: 'No active subscription found' });
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${frontendUrl}/settings?tab=payment`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message || 'Failed to create portal session' });
  }
});

// ============================================
// GET /api/stripe/subscription-status
// Gets the current subscription status
// ============================================
router.get('/subscription-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    if (!companyId) {
      res.status(400).json({ error: 'User must belong to a company' });
      return;
    }

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id, stripe_subscription_id, subscription_status, subscription_plan')
      .eq('id', companyId)
      .single();

    if (!company) {
      res.json({ status: 'none', plan: null });
      return;
    }

    res.json({
      status: company.subscription_status || 'none',
      plan: company.subscription_plan || null,
      hasCustomer: !!company.stripe_customer_id,
    });
  } catch (error: any) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ error: error.message || 'Failed to get subscription status' });
  }
});

// ============================================
// POST /api/stripe/webhook
// Handles Stripe webhook events
// ============================================
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const companyId = session.metadata?.company_id;
        const plan = session.metadata?.plan;

        if (companyId && session.subscription) {
          await supabase
            .from('companies')
            .update({
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              subscription_plan: plan || null,
            })
            .eq('id', Number(companyId));

          console.log(`Subscription activated for company ${companyId}: plan=${plan}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find company by customer ID
        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (company) {
          // Determine plan from product
          let plan: string | null = null;
          const productId = (subscription.items.data[0]?.price as Stripe.Price)?.product as string;
          for (const [planName, prodId] of Object.entries(PLAN_PRODUCTS)) {
            if (prodId === productId) {
              plan = planName;
              break;
            }
          }

          await supabase
            .from('companies')
            .update({
              subscription_status: subscription.status,
              subscription_plan: plan,
            })
            .eq('id', company.id);

          console.log(`Subscription updated for company ${company.id}: status=${subscription.status}, plan=${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (company) {
          await supabase
            .from('companies')
            .update({
              subscription_status: 'canceled',
              subscription_plan: null,
              stripe_subscription_id: null,
            })
            .eq('id', company.id);

          console.log(`Subscription canceled for company ${company.id}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`Payment succeeded for invoice ${invoice.id}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const { data: company } = await supabase
          .from('companies')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (company) {
          await supabase
            .from('companies')
            .update({ subscription_status: 'past_due' })
            .eq('id', company.id);

          console.log(`Payment failed for company ${company.id}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
