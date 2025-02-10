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
      const rawBody = req.body;
      if (Buffer.isBuffer(rawBody)) {
        req.rawBody = rawBody;
      }
      next();
    }
  );

  // Create admin user route (will be removed in production)
  app.post("/api/create-admin", async (req, res) => {
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.username, "admin"))
      .limit(1);

    if (existingAdmin) {
      // Update existing user to admin if not already
      if (!existingAdmin.isAdmin) {
        await db
          .update(users)
          .set({ isAdmin: true })
          .where(eq(users.id, existingAdmin.id));
      }
      return res.json({ message: "Admin user already exists" });
    }

    // Create new admin user
    const password = "admin"; // In production, this would be more secure
    const hashedPassword = await hashPassword(password);

    const [admin] = await db
      .insert(users)
      .values({
        username: "admin",
        password: hashedPassword,
        isAdmin: true,
      })
      .returning();

    res.json({ message: "Admin user created successfully", admin });
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    const allProducts = await db.query.products.findMany();
    res.json(allProducts);
  });

  app.get("/api/products/:id", async (req, res) => {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, parseInt(req.params.id)))
      .limit(1);

    if (!product) return res.sendStatus(404);
    res.json(product);
  });

  // Protected admin routes
  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);

    const [product] = await db.insert(products).values(req.body).returning();
    res.status(201).json(product);
  });

  app.patch("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);

    const [product] = await db
      .update(products)
      .set(req.body)
      .where(eq(products.id, parseInt(req.params.id)))
      .returning();

    if (!product) return res.sendStatus(404);
    res.json(product);
  });

  // Orders routes
  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { items, total } = req.body;
    const [order] = await db
      .insert(orders)
      .values({
        userId: req.user.id,
        status: "pending",
        total,
      })
      .returning();

    await db.insert(orderItems).values(
      items.map((item: any) => ({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      }))
    );

    res.status(201).json(order);
  });

  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const userOrders = await db.query.orders.findMany({
      where: eq(orders.userId, req.user.id),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    res.json(userOrders);
  });

  // Admin order management routes
  app.get("/api/admin/orders", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);

    const allOrders = await db.query.orders.findMany({
      with: {
        user: true,
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    res.json(allOrders);
  });

  app.patch("/api/admin/orders/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) return res.sendStatus(403);

    const { status } = req.body;
    const [order] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, parseInt(req.params.id)))
      .returning();

    if (!order) return res.sendStatus(404);
    res.json(order);
  });

  // Stripe payment routes
  app.post("/api/create-checkout-session", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { items } = req.body;
      const origin = `${req.protocol}://${req.get("host")}`;
      console.log("Creating checkout session for user:", req.user.id);
      console.log("Items:", JSON.stringify(items));

      const session = await createCheckoutSession(
        items,
        `${origin}/checkout/success`,
        `${origin}/cart`,
        req.user.id
      );

      console.log("Checkout session created:", session.id);
      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Update the webhook handler with more robust error handling
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

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Processing checkout session:", session.id);

        // Try both client_reference_id and metadata for user ID
        const userId = parseInt(session.client_reference_id || session.metadata?.userId || "0");
        console.log("Extracted user ID:", userId);

        if (!userId) {
          console.error("No user ID found in session");
          return res.sendStatus(400);
        }

        // Create order in database
        console.log("Creating order for user:", userId);
        const [order] = await db
          .insert(orders)
          .values({
            userId,
            status: "pending",
            total: (session.amount_total || 0) / 100,
          })
          .returning();

        console.log("Created order:", order);

        // Retrieve line items
        console.log("Fetching line items for session:", session.id);
        const lineItems = await stripe.checkout.sessions.listLineItems(
          session.id,
          { expand: ["data.price.product"] }
        );
        console.log("Retrieved line items:", lineItems.data.length);

        // Create order items
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
          await db.insert(orderItems).values({
            orderId: order.id,
            productId: dbProduct.id,
            quantity: item.quantity || 1,
            price: (item.amount_total || 0) / 100,
          });
          console.log("Created order item for product:", dbProduct.name);
        }

        console.log("Order processing completed successfully");
      }

      res.json({ received: true });
    } catch (err) {
      console.error("Webhook error:", err instanceof Error ? err.message : err);
      console.error("Full error object:", err);
      res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}