# Email Configuration Guide

## Overview

The application sends emails for:
- **Order Confirmations**: When a customer completes a purchase
- **Password Reset**: When a user requests to reset their password

## Current Status

✅ **Email functionality is fully implemented** with:
- Order confirmation emails (sent after Stripe checkout)
- Password reset emails (sent when user requests password reset)
- Professional HTML email templates
- Comprehensive error logging
- Graceful fallback (app continues working even if email fails)

## Setup Instructions

### 1. Choose an Email Provider

The app uses SMTP to send emails. You can use any SMTP provider:

#### Option A: Gmail (Recommended for Testing)
1. Go to your Google Account: https://myaccount.google.com
2. Enable 2-factor authentication (required)
3. Generate an App Password: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device and give it a name (e.g., "Andria Store")
   - Copy the 16-character password

#### Option B: Other Providers
- **SendGrid**: https://sendgrid.com
- **Mailgun**: https://www.mailgun.com
- **AWS SES**: https://aws.amazon.com/ses/
- **Any other SMTP server**

### 2. Configure Environment Variables

Add these to your `.env` file (create one based on `.env.example`):

```bash
# For Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password

# For SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key

# For Mailgun
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
```

### 3. Test Email Configuration

Start the server and trigger the test:

```bash
npm run dev
```

The server will test the SMTP connection on startup and log the results.

### 4. Verify Email Sending

#### Test Order Confirmation Email:
1. Complete a test purchase using Stripe test card: `4242 4242 4242 4242`
2. Check the server logs for email sending status
3. Check the customer's email inbox

#### Test Password Reset Email:
1. Go to login page
2. Click "Forgot password?"
3. Enter a username (user must have email in their profile)
4. Check the server logs for email sending status
5. Check the user's email inbox

## Troubleshooting

### Email Not Sending

1. **Check Server Logs**: Look for detailed error messages in the console
2. **Verify Configuration**: Make sure all SMTP_* environment variables are set
3. **Test SMTP Connection**: Check the verification logs on server startup

### Common Errors

#### `EAUTH` - Authentication Failed
- **Gmail**: Make sure you're using an App Password, not your regular password
- **Other providers**: Verify your username and password are correct

#### `ECONNREFUSED` - Connection Refused
- Check `SMTP_HOST` and `SMTP_PORT` are correct
- Verify your server can reach the SMTP server (firewall/network issues)

#### `ETIMEDOUT` - Connection Timeout
- SMTP server might be down
- Check network connectivity
- Try a different SMTP port (587 or 465)

### Gmail-Specific Issues

If emails aren't sending with Gmail:
1. Enable "Less secure app access" (if available)
2. Allow access from "Less secure apps" in Gmail settings
3. Check if Gmail is blocking the sign-in: https://accounts.google.com/DisplayUnlockCaptcha

## Email Templates

### Order Confirmation
Includes:
- Order summary with item details
- Order ID and date
- Total amount
- Customer information
- Next steps

### Password Reset
Includes:
- Reset token (prominently displayed)
- Username
- Step-by-step instructions
- Token expiry time (1 hour)
- Security warning

## Development vs Production

### Development Mode
- Emails are sent (if configured)
- Reset tokens are also shown in the UI as fallback
- Detailed logging to console

### Production Mode
- Emails are the primary delivery method
- Consider removing reset token from API response
- Use professional email service (SendGrid, AWS SES, etc.)
- Set up email monitoring and alerts

## Code Reference

- Email service: `server/email.ts`
- Email sending: `server/routes.ts` (order webhook and password reset endpoints)
- Order confirmation: Sent in Stripe webhook handler
- Password reset: Sent in `/api/auth/reset-password-request` endpoint

## Environment Variables Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | Yes | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | Yes | `587` | SMTP server port |
| `SMTP_SECURE` | No | `false` | Use TLS (true for port 465) |
| `SMTP_USER` | Yes | - | SMTP username/email |
| `SMTP_PASS` | Yes | - | SMTP password/API key |

## Notes

- If email configuration is missing, the app will log warnings but continue functioning
- Order confirmations will be attempted but won't fail the order if email fails
- Password reset tokens are shown in UI as fallback if email isn't configured
- All email operations are async and won't block the main application flow
