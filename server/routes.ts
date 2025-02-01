import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { db } from "@db";
import { products, orders, orderItems, users } from "@db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession } from "./stripe";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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

      const session = await createCheckoutSession(
        items,
        `${origin}/checkout/success`,
        `${origin}/checkout/cancel`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}