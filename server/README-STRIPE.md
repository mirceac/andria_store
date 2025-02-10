# Stripe Webhook Setup Instructions

To properly handle Stripe payments and create orders in the database, you need to configure a webhook endpoint in your Stripe dashboard. Follow these steps:

1. Get your application's public URL from Replit (the URL shown in your browser when running the app)

2. Go to the Stripe Dashboard:
   - Visit https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"

3. Configure the webhook:
   - Endpoint URL: `https://your-replit-url/api/webhook`
   - Listen to events: Select "checkout.session.completed"
   - Get your webhook signing secret
   - Add it to your Replit secrets as `STRIPE_WEBHOOK_SECRET`

4. Verify the webhook is working:
   - Make a test purchase in your application
   - Check the Stripe Dashboard webhook section for successful delivery
   - Look for logs in your Replit console showing "Received webhook call"

## Troubleshooting

If orders are not being created:

1. Check the Replit console for webhook-related logs:
   - "Received webhook call" - Confirms the webhook reached your endpoint
   - "Webhook event type: checkout.session.completed" - Confirms correct event type
   - "Order processing completed" - Confirms successful order creation

2. Check Stripe Dashboard:
   - Webhooks section for failed delivery attempts
   - Ensure the endpoint URL is correct and accessible
   - Verify the webhook secret matches your Replit secret

3. Common issues:
   - Incorrect webhook URL
   - Missing or incorrect webhook secret
   - Network connectivity issues
   - Application errors in webhook handler

## Testing

To verify the webhook is working:

1. Make a test purchase in your application
2. Monitor the Replit console for webhook logs
3. Check your application's order history
4. Verify the Stripe Dashboard webhook delivery history
