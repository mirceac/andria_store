# Email Configuration

To enable order confirmation emails, you need to configure the following environment variables:

## SMTP Configuration

Add these variables to your `.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com        # This is the SENDER email (your business email)
SMTP_PASS=your-app-password           # App password for the sender email account
```

## Gmail Setup Instructions

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to your Google Account settings
   - Navigate to Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this app password as your `SMTP_PASS`

**Important**: The `SMTP_USER` email will appear as the sender of all order confirmation emails. Customers will see emails coming from this address, so use your business email (e.g., `orders@yourbusiness.com` or `noreply@yourbusiness.com`).

## Other Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### Custom SMTP
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
```

## Testing Email Configuration

The email service includes a test function. You can test your configuration by running:

```javascript
import { testEmailConfiguration } from './server/email.js';
await testEmailConfiguration();
```

## Email Features

- **Order Confirmation**: Sent automatically after successful payment
- **HTML Templates**: Rich HTML emails with order details
- **Customer Information**: Includes customer email from Stripe checkout
- **Product Details**: Lists all purchased items with quantities and prices
- **Professional Design**: Responsive email template with company branding

## Email Content

The confirmation email includes:
- Order ID and date
- Customer email address
- Complete list of purchased items
- Individual and total prices
- Order status confirmation
- Professional HTML layout

## Error Handling

Email failures will not break the checkout process. If email sending fails:
- The error is logged to the console
- The order is still created successfully
- The webhook continues to process normally
- Customers can still access their orders through their account