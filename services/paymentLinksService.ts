/**
 * Stripe Payment Links Service
 * 
 * This service uses Stripe Payment Links - no backend required!
 * Just create payment links in Stripe Dashboard and paste them here.
 */

// Payment Links from Stripe Dashboard
// To get these: Stripe Dashboard → Products → Create Payment Link
export const STRIPE_PAYMENT_LINKS: Record<string, { monthly: string; annual: string }> = {
    essential: {
        monthly: 'https://buy.stripe.com/test_5kQ7sLayqdr3fzu7tH77O02', // Paste your Stripe Payment Link here
        annual: 'https://buy.stripe.com/test_eVq6oH9um9aNafa29n77O03',  // Paste your Stripe Payment Link here
    },
    professional: {
        monthly: 'https://buy.stripe.com/test_bJefZheOGev75YUcO177O04', // Paste your Stripe Payment Link here
        annual: 'https://buy.stripe.com/test_5kQ4gzbCu4UxfzubJX77O05',  // Paste your Stripe Payment Link here
    },
};

/**
 * Get the base URL for redirect URLs
 * Uses current origin (your app's URL)
 */
const getRedirectBaseUrl = (): string => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return 'http://localhost:3000'; // Default port (matches vite.config.ts)
};

/**
 * Redirects user to Stripe Payment Link with success/cancel URLs
 * This requires NO backend - just a direct redirect!
 * 
 * After payment, Stripe will redirect back to your site:
 * - Success: ?payment=success&session_id=xxx
 * - Cancel: ?payment=cancelled
 */
export const redirectToPaymentLink = (planId: 'essential' | 'professional', interval: 'month' | 'year'): { error: string | null } => {
    const link = STRIPE_PAYMENT_LINKS[planId]?.[interval === 'month' ? 'monthly' : 'annual'];

    if (!link) {
        return {
            error: `Payment link not configured for ${planId} plan (${interval}ly). Please configure STRIPE_PAYMENT_LINKS in services/paymentLinksService.ts`
        };
    }

    // Store plan info in localStorage BEFORE redirect
    // This ensures we can retrieve it even if Stripe doesn't pass it back
    localStorage.setItem('pending_payment', JSON.stringify({
        planId,
        interval,
        timestamp: Date.now(),
    }));

    // Build redirect URLs
    const baseUrl = getRedirectBaseUrl();
    const successUrl = `${baseUrl}/?payment=success&plan=${planId}&interval=${interval}`;
    const cancelUrl = `${baseUrl}/?payment=cancelled`;

    // Append success and cancel URLs as query parameters
    // Note: Stripe Payment Links redirect URLs should be configured in Dashboard
    // Query params here may not work - but we store in localStorage as backup
    const redirectLink = new URL(link);
    redirectLink.searchParams.set('success_url', successUrl);
    redirectLink.searchParams.set('cancel_url', cancelUrl);

    console.log('🚀 Redirecting to Stripe Payment Link:', {
        planId,
        interval,
        link: redirectLink.toString(),
        storedInLocalStorage: true,
    });

    // Redirect to Stripe Payment Link
    window.location.href = redirectLink.toString();
    return { error: null };
};

/**
 * Check if payment links are configured
 */
export const arePaymentLinksConfigured = (): boolean => {
    return Object.values(STRIPE_PAYMENT_LINKS).every(
        plan => plan.monthly && plan.annual
    );
};

