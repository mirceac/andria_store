import { Buffer } from "buffer";
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { db } from "@db";
import { products, orders, orderItems, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, stripe } from "./stripe";
import type Stripe from "stripe";
import * as express from 'express';
import type { Session } from 'express-session';
import { Router } from 'express';
import { upload } from './upload';  // Import from the new file
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Extend Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Modify the webhook middleware section
  app.use(
    "/api/webhook",
    express.raw({ type: "application/json" }),
    (req: Request, _, next) => {
      console.log("\n=== Webhook Request Received ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Method:", req.method);
      console.log("Headers:", JSON.stringify(req.headers, null, 2));
      console.log("Raw Body Type:", req.rawBody ? typeof req.rawBody : 'undefined');
      console.log("Raw Body Length:", req.rawBody ? req.rawBody.length : 0);
      console.log("=== End Request Info ===\n");

      const rawBody = req.body;
      if (Buffer.isBuffer(rawBody)) {
        req.rawBody = rawBody;
      }
      next();
    }
  );

  // Create admin user route (will be removed in production)
  app.post("/api/create-admin", async (req, res) => {
    try {
      const [existingAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.username, "admin"))
        .limit(1);

      if (existingAdmin) {
        if (!existingAdmin.is_admin) {
          await db
            .update(users)
            .set({ is_admin: true })
            .where(eq(users.id, existingAdmin.id));
        }
        return res.json({ message: "Admin user already exists" });
      }

      const password = "admin";
      const hashedPassword = await hashPassword(password);

      const [admin] = await db
        .insert(users)
        .values({
          username: "admin",
          password: hashedPassword,
          is_admin: true,
        })
        .returning();

      res.json({ message: "Admin user created successfully", admin });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ message: "Failed to create admin user" });
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    try {
      const allProducts = await db.select().from(products);
      const productsWithNumberPrice = allProducts.map(product => ({
        ...product,
        price: Number(product.price)
      }));
      res.json(productsWithNumberPrice);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, parseInt(req.params.id)))
        .limit(1);

      if (!product) return res.status(404).json({ message: "Product not found" });
      
      const productWithNumberPrice = {
        ...product,
        price: Number(product.price)
      };
      res.json(productWithNumberPrice);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.get("/api/products/:id/pdf", async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId)
      });

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      if (product.pdf_data) {
        try {
          // Convert Buffer to string without parameters
          const base64String = product.pdf_data.toString();
          
          // Create a new Buffer from the base64 string
          const pdfBuffer = Buffer.from(base64String, 'base64');
          
          console.log('Decoded PDF buffer details:', {
            originalSize: product.pdf_data.length,
            decodedSize: pdfBuffer.length,
            // Check the first few bytes without parameters
            firstFewBytes: pdfBuffer.slice(0, 5).toString()
          });
      
          // Set headers for the response
          res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': 'inline; filename="document.pdf"'
          });
      
          // Send the decoded buffer
          return res.send(pdfBuffer);
        } catch (error) {
          console.error('Error sending PDF:', error);
          return res.status(500).send('Error processing PDF');
        }
      }

      // Fall back to file system if pdf_file exists
      if (product.pdf_file) {
        try {
          const filePath = path.join(process.cwd(), 'public', product.pdf_file);
          if (!fs.existsSync(filePath)) {
            console.log('PDF file not found:', filePath);
            return res.status(404).json({ message: "PDF file not found" });
          }

          console.log('Serving PDF from file:', filePath);
          return res.sendFile(filePath);
        } catch (err) {
          console.error('Error serving PDF file:', err);
          return res.status(500).json({ message: "Error serving PDF file" });
        }
      }

      return res.status(404).json({ message: "No PDF found for this product" });
    } catch (error) {
      console.error('Error serving PDF:', error);
      return res.status(500).json({ message: "Error serving PDF" });
    }
  });

  // Protected admin routes
  app.post("/api/products", upload.single('pdf_file'), async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.is_admin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      console.log('Request body:', req.body);
      console.log('File:', req.file);

      // Validate required fields
      if (!req.body.name) {
        return res.status(400).json({ message: "Product name is required" });
      }

      // Parse and validate price
      const price = parseFloat(req.body.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({ message: "Valid price is required" });
      }

      // Parse and validate stock
      const stock = parseInt(req.body.stock);
      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({ message: "Valid stock quantity is required" });
      }

      const productData = {
        name: req.body.name,
        description: req.body.description || null,
        price: price.toString(),
        stock: stock,
        pdf_file: null as string | null,
        pdf_data: null as string | null
      };

      if (req.file) {
        console.log('Processing PDF file:', req.file.originalname);
        // Always store as binary now
        productData.pdf_data = req.file.buffer.toString('base64');
        console.log('PDF data length:', productData.pdf_data.length);
      }

      console.log('Inserting product with data:', {
        ...productData,
        pdf_data: productData.pdf_data ? `<${productData.pdf_data.length} bytes>` : null
      });

      const [product] = await db
        .insert(products)
        .values(productData)
        .returning();

      console.log('Product created:', {
        ...product,
        pdf_data: product.pdf_data ? `<${product.pdf_data.length} bytes>` : null
      });

      res.status(201).json({
        ...product,
        price: Number(product.price),
        pdf_data: undefined // Don't send binary data back to client
      });
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ 
        message: "Failed to create product",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.patch("/api/products/:id", upload.single('pdf_file'), async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.is_admin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      console.log('Update request body:', req.body);
      
      const updateData: Record<string, any> = {};

      // Handle basic fields
      if (req.body.name) updateData.name = req.body.name;
      if (req.body.description !== undefined) updateData.description = req.body.description;
      if (req.body.price) updateData.price = req.body.price.toString();
      if (req.body.stock !== undefined) updateData.stock = parseInt(req.body.stock);

      // Handle PDF file
      if (req.file) {
        console.log('Processing PDF file:', {
          name: req.file.originalname,
          size: req.file.size,
          buffer: req.file.buffer ? 'Present' : 'Missing'
        });

        if (!req.file.buffer) {
          return res.status(400).json({ message: "PDF file buffer is missing" });
        }

        try {
          const base64Data = req.file.buffer.toString('base64');
          updateData.pdf_data = base64Data;
          updateData.pdf_file = null; // Clear old file path
          console.log('PDF data processed, length:', base64Data.length);
        } catch (err) {
          console.error('Error processing PDF:', err);
          return res.status(400).json({ message: "Error processing PDF file" });
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      console.log('Updating product with data:', {
        ...updateData,
        pdf_data: updateData.pdf_data ? `<${updateData.pdf_data.length} bytes>` : 'No PDF data'
      });

      const [product] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, parseInt(req.params.id)))
        .returning();

      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log('Product updated:', {
        id: product.id,
        name: product.name,
        hasPdfData: !!product.pdf_data,
        pdfDataLength: product.pdf_data ? product.pdf_data.length : 0
      });

      res.json({
        ...product,
        price: Number(product.price),
        pdf_data: undefined // Don't send binary data back
      });
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ 
        message: "Failed to update product",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  //New Delete Route
  app.delete("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.is_admin) {
      return res.status(403).json({ message: "You are not authorized to delete products." });
    }

    try {
      const productId = parseInt(req.params.id);
      if (isNaN(productId)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      console.log(`Attempting to delete product with ID: ${productId}`);

      // Check if product has any associated orders
      const [orderItem] = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.product_id, productId))
        .limit(1);

      if (orderItem) {
        console.log(`Product ${productId} cannot be deleted - has existing orders`);
        return res.status(400).json({ 
          message: "This product has been ordered by customers and cannot be deleted.  To remove it from sale, set its stock to 0 instead.",
          type: "PRODUCT_HAS_ORDERS"
        });
      }

      const [product] = await db
        .delete(products)
        .where(eq(products.id, productId))
        .returning();

      if (!product) {
        console.log(`Product with ID ${productId} not found`);
        return res.status(404).json({ message: "Product not found" });
      }

      console.log(`Successfully deleted product: ${JSON.stringify(product)}`);
      res.json(product);
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ 
        message: "Something went wrong while deleting the product. Please try again." 
      });
    }
  });

  app.post("/api/upload-pdf", upload.single('pdf_file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No PDF file uploaded" });
    }
    
    const filePath = req.file.path.replace('public/', '/');
    res.json({ path: filePath });
  });

  // Orders routes
  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { items, total } = req.body;
      const [order] = await db
        .insert(orders)
        .values({
          user_id: req.user.id,
          status: "pending",
          total,
        })
        .returning();

      await db.insert(orderItems).values(
        items.map((item: any) => ({
          order_id: order.id,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        }))
      );

      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // First, get basic order info
      const userOrders = await db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          created_at: orders.created_at,
        })
        .from(orders)
        .where(eq(orders.user_id, req.user.id));

      // Then, for each order, get its items with product details
      const ordersWithItems = await Promise.all(
        userOrders.map(async (order) => {
          const items = await db
            .select({
              id: orderItems.id,
              quantity: orderItems.quantity,
              price: orderItems.price,
              product: {
                id: products.id,
                name: products.name,
                pdf_file: products.pdf_file,
              },
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.product_id, products.id))
            .where(eq(orderItems.order_id, order.id));

          return {
            ...order,
            items,
          };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Admin order management routes
  app.get("/api/admin/orders", async (req, res) => {
    console.log("\n=== Admin Orders Request ===");
    console.log("Request headers:", req.headers);
    console.log("Session:", req.session);
    console.log("User:", req.user);
    console.log("Is authenticated:", req.isAuthenticated?.());
    console.log("Is admin:", req.user?.is_admin);
    console.log("=== End Request Info ===\n");

    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!req.user?.is_admin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      // First, get basic order info with user details
      const ordersWithUsers = await db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          created_at: orders.created_at,
          user: {
            id: users.id,
            username: users.username,
          },
        })
        .from(orders)
        .leftJoin(users, eq(orders.user_id, users.id));

      // Then, for each order, get its items with product details
      const ordersWithItems = await Promise.all(
        ordersWithUsers.map(async (order) => {
          const items = await db
            .select({
              id: orderItems.id,
              quantity: orderItems.quantity,
              price: orderItems.price,
              product: {
                id: products.id,
                name: products.name,
                pdf_file: products.pdf_file,
              },
            })
            .from(orderItems)
            .leftJoin(products, eq(orderItems.product_id, products.id))
            .where(eq(orderItems.order_id, order.id));

          return {
            ...order,
            items,
          };
        })
      );

      console.log("Successfully fetched orders:", ordersWithItems.length);
      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching admin orders:", error);
      res.status(500).json({
        message: "Failed to fetch orders",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.patch("/api/admin/orders/:id", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated() || !req.user?.is_admin) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    try {
      const { status } = req.body;
      const [order] = await db
        .update(orders)
        .set({ status })
        .where(eq(orders.id, parseInt(req.params.id)))
        .returning();

      if (!order) return res.status(404).json({ message: "Order not found" });
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Stripe routes
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { items } = req.body;
      const origin = `${req.protocol}://${req.get("host")}`;
      console.log("Creating checkout session for user:", req.user.id);
      console.log("Items:", JSON.stringify(items));

      const session = await createCheckoutSession(
        items,
        `${origin}/checkout/success`,
        `${origin}/cart`,
        req.user.id // Pass user ID as number, not string
      );

      console.log("Checkout session created:", session.id);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Stripe webhook handler
  app.post("/api/webhook", async (req, res) => {
    console.log("\n=== Webhook Request Processing Started ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Raw Body Type:", req.rawBody ? typeof req.rawBody : 'undefined');
    console.log("Raw Body Length:", req.rawBody ? req.rawBody.length : 0);
    console.log("=== End Request Info ===\n");

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("Missing STRIPE_WEBHOOK_SECRET");
      return res.sendStatus(500);
    }

    const sig = req.headers["stripe-signature"];
    if (!sig) {
      console.error("No Stripe signature found in headers");
      return res.sendStatus(400);
    }

    if (!req.rawBody) {
      console.error("No raw body found in request");
      return res.sendStatus(400);
    }

    try {
      console.log("Attempting to verify Stripe signature...");
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
      console.log("Webhook event verified, type:", event.type);
      console.log("Full event data:", JSON.stringify(event, null, 2));

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Processing checkout session:", session.id);
        console.log("Full session data:", JSON.stringify(session, null, 2));

        // Get the user ID from the session metadata
        const userId = session.client_reference_id
          ? parseInt(session.client_reference_id)
          : session.metadata?.userId
            ? parseInt(session.metadata.userId)
            : null;

        if (!userId) {
          console.error("No user ID found in session");
          return res.status(400).json({ error: "Invalid user ID" });
        }

        console.log("Creating order for user:", userId);
        try {
          const [order] = await db
            .insert(orders)
            .values({
              user_id: userId,
              status: "pending",
              total: (session.amount_total || 0) / 100,
            })
            .returning();

          console.log("Created order:", order);

          console.log("Fetching line items for session:", session.id);
          const lineItems = await stripe.checkout.sessions.listLineItems(
            session.id,
            { expand: ["data.price.product"] }
          );
          console.log("Retrieved line items:", lineItems.data.length);

          for (const item of lineItems.data) {
            const product = item.price?.product as Stripe.Product;
            if (!product?.name) {
              console.log("No product name found in line item");
              continue;
            }

            console.log("Looking up product:", product.name);
            const [dbProduct] = await db
              .select()
              .from(products)
              .where(eq(products.name, product.name))
              .limit(1);

            if (!dbProduct) {
              console.log("Product not found in database:", product.name);
              continue;
            }

            console.log("Creating order item for product:", dbProduct.name);
            await db
              .insert(orderItems)
              .values({
                order_id: order.id,
                product_id: dbProduct.id,
                quantity: item.quantity || 1,
                price: (item.amount_total || 0) / 100,
              });
            console.log("Created order item for product:", dbProduct.name);
          }

          console.log("Order processing completed successfully");
          res.json({ received: true });
        } catch (error) {
          console.error("Failed to create order:", error);
          res.status(500).json({ error: "Failed to create order" });
        }
      } else {
        console.log("Unhandled event type:", event.type);
        res.json({ received: true });
      }
    } catch (err) {
      console.error("Webhook error:", err instanceof Error ? err.message : err);
      console.error("Full error object:", err);
      res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}