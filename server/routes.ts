import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { products, orders, orderItems } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

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

  const httpServer = createServer(app);
  return httpServer;
}
