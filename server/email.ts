import nodemailer from 'nodemailer';
import { SelectOrder, SelectOrderItem, SelectProduct } from '../db/schema.js';

interface OrderWithItems extends SelectOrder {
  items: (SelectOrderItem & { 
    product: SelectProduct & { price: string | number } 
  })[];
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Create reusable transporter object using environment variables
function createTransporter(): nodemailer.Transporter {
  console.log("Creating SMTP transporter with configuration:");
  
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '', // For Gmail, use an App Password
    },
  };

  console.log("SMTP Configuration:");
  console.log("Host:", config.host);
  console.log("Port:", config.port);
  console.log("Secure:", config.secure);
  console.log("Auth User:", config.auth.user);
  console.log("Auth Pass configured:", !!config.auth.pass, config.auth.pass ? `(length: ${config.auth.pass.length})` : '');
  
  // Check for missing required configuration
  const missingConfig = [];
  if (!config.host) missingConfig.push('SMTP_HOST');
  if (!config.auth.user) missingConfig.push('SMTP_USER');
  if (!config.auth.pass) missingConfig.push('SMTP_PASS');
  
  if (missingConfig.length > 0) {
    console.error("⚠️  Missing required email configuration:", missingConfig.join(', '));
    console.error("Please add these environment variables to your .env file");
  }

  const transporter = nodemailer.createTransport(config);
  console.log("✓ SMTP transporter created");
  return transporter;
}

// Generate HTML email template for order confirmation
function generateOrderConfirmationHTML(order: OrderWithItems, customerEmail: string): string {
  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `$${numPrice.toFixed(2)}`;
  };
  const formatDate = (date: Date) => date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const itemsHTML = order.items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.product.name}</strong><br>
        <small style="color: #666;">${item.product.description || ''}</small>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${formatPrice(item.price)}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        ${formatPrice(item.price * item.quantity)}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - Andria Store</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin: 0; text-align: center;">Order Confirmation</h1>
        <p style="text-align: center; margin: 10px 0 0 0; font-size: 18px;">Thank you for your purchase!</p>
      </div>

      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #374151; margin-top: 0;">Order Details</h2>
        <p><strong>Order ID:</strong> #${order.id}</p>
        <p><strong>Order Date:</strong> ${formatDate(order.created_at!)}</p>
        <p><strong>Customer Email:</strong> ${customerEmail}</p>
        <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Confirmed</span></p>
      </div>

      <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #374151; margin-top: 0;">Items Ordered</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f9fafb;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Product</th>
              <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Price</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr style="background-color: #f9fafb;">
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; border-top: 2px solid #e5e7eb;">
                Total Amount:
              </td>
              <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb; border-top: 2px solid #e5e7eb;">
                ${formatPrice(order.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="background-color: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="color: #1d4ed8; margin-top: 0;">What's Next?</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Your digital products are now available for download in your account</li>
          <li>You can access your products anytime by logging into your account</li>
          <li>If you have any questions, please don't hesitate to contact us</li>
        </ul>
      </div>

      <div style="text-align: center; padding: 20px; border-top: 1px solid #e5e7eb; margin-top: 30px; color: #6b7280;">
        <p>Thank you for choosing Andria Store!</p>
        <p style="font-size: 14px;">
          If you have any questions about your order, please contact our support team.
        </p>
      </div>
    </body>
    </html>
  `;
}

// Send order confirmation email
export async function sendOrderConfirmationEmail(
  order: OrderWithItems,
  customerEmail: string
): Promise<void> {
  console.log("\n=== INSIDE sendOrderConfirmationEmail FUNCTION ===");
  console.log("Order ID:", order.id);
  console.log("Customer email:", customerEmail);
  console.log("Order items count:", order.items?.length || 0);
  
  try {
    console.log("Creating email transporter...");
    const transporter = createTransporter();
    console.log("✓ Transporter created successfully");

    // Verify SMTP connection (optional, but good for debugging)
    console.log("Verifying SMTP connection...");
    const verificationResult = await transporter.verify();
    console.log('✓ SMTP server verification result:', verificationResult);
    console.log('✓ SMTP server is ready to take our messages');

    console.log("Generating email HTML content...");
    const htmlContent = generateOrderConfirmationHTML(order, customerEmail);
    console.log("✓ HTML content generated, length:", htmlContent.length);

    const mailOptions = {
      from: `"Andria Store" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: `Order Confirmation #${order.id} - Andria Store`,
      html: htmlContent,
      // Optionally add a plain text version
      text: `
Order Confirmation - Andria Store

Thank you for your purchase!

Order ID: #${order.id}
Order Date: ${order.created_at?.toLocaleDateString()}
Customer Email: ${customerEmail}
Total Amount: $${order.total.toFixed(2)}

Items Ordered:
${order.items.map(item => {
  const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
  return `- ${item.product.name} (Qty: ${item.quantity}) - $${(itemPrice * item.quantity).toFixed(2)}`;
}).join('\n')}

Your digital products are now available for download in your account.

Thank you for choosing Andria Store!
      `.trim(),
    };

    console.log("Mail options prepared:");
    console.log("From:", mailOptions.from);
    console.log("To:", mailOptions.to);
    console.log("Subject:", mailOptions.subject);
    console.log("HTML content length:", mailOptions.html.length);
    console.log("Text content length:", mailOptions.text.length);

    console.log("Sending email via SMTP...");
    const info = await transporter.sendMail(mailOptions);
    console.log('✓ Order confirmation email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Envelope:', info.envelope);
    console.log('Accepted recipients:', info.accepted);
    console.log('Rejected recipients:', info.rejected);
    console.log("=== EMAIL SENDING FUNCTION COMPLETED SUCCESSFULLY ===\n");
  } catch (error) {
    console.error("\n=== EMAIL SERVICE ERROR ===");
    console.error('Failed to send order confirmation email:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    // Log additional details for common email errors
    if (error instanceof Error) {
      if (error.message.includes('EAUTH')) {
        console.error('AUTHENTICATION ERROR: Check your SMTP_USER and SMTP_PASS credentials');
      } else if (error.message.includes('ECONNREFUSED')) {
        console.error('CONNECTION ERROR: Check your SMTP_HOST and SMTP_PORT settings');
      } else if (error.message.includes('ETIMEDOUT')) {
        console.error('TIMEOUT ERROR: SMTP server is not responding');
      }
    }
    
    console.error('Current email configuration:');
    console.error('SMTP_HOST:', process.env.SMTP_HOST);
    console.error('SMTP_PORT:', process.env.SMTP_PORT);
    console.error('SMTP_USER:', process.env.SMTP_USER);
    console.error('SMTP_PASS configured:', !!process.env.SMTP_PASS);
    console.error("=== END EMAIL SERVICE ERROR ===\n");
    
    // Don't throw the error to prevent breaking the order process
    // Just log it and continue
  }
}

// Test email configuration
export async function testEmailConfiguration(): Promise<boolean> {
  console.log("\n=== TESTING EMAIL CONFIGURATION ===");
  try {
    const transporter = createTransporter();
    console.log("Testing SMTP connection...");
    const result = await transporter.verify();
    console.log('✓ Email configuration is valid');
    console.log('Verification result:', result);
    console.log("=== EMAIL CONFIGURATION TEST PASSED ===\n");
    return true;
  } catch (error) {
    console.error("\n=== EMAIL CONFIGURATION TEST FAILED ===");
    console.error('Email configuration test failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error("=== END EMAIL CONFIGURATION TEST ===\n");
    return false;
  }
}