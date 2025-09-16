import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  timestamp, 
  doublePrecision, 
  varchar, 
  numeric,
  decimal
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  is_admin: boolean("is_admin").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(), // Digital price
  stock: integer('stock').default(0), // Physical stock only
  category_id: integer('category_id').references(() => categories.id),
  // Existing media fields - keep these!
  image_file: text('image_file'),
  image_data: text('image_data'),
  pdf_file: text('pdf_file'),
  pdf_data: text('pdf_data'),
  storage_url: text('storage_url'),
  // New variant fields
  has_physical_variant: boolean('has_physical_variant').default(false),
  physical_price: decimal('physical_price', { precision: 10, scale: 2 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  status: text("status").notNull(),
  total: doublePrecision("total").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  order_id: integer("order_id").references(() => orders.id).notNull(),
  product_id: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(),
  variant_type: text("variant_type").notNull().default('digital'), // 'digital' or 'physical'
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.user_id], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.order_id], references: [orders.id] }),
  product: one(products, { fields: [orderItems.product_id], references: [products.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  orderItems: many(orderItems),
  category: one(categories, {
    fields: [products.category_id],
    references: [categories.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

export const insertCategorySchema = createInsertSchema(categories);
export const selectCategorySchema = createSelectSchema(categories);
export type InsertCategory = typeof categories.$inferInsert;
export type SelectCategory = typeof categories.$inferSelect;

export const insertProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.number().min(0), // Digital price
  stock: z.number().min(0), // Physical stock only
  category_id: z.number().nullable(),
  image_file: z.string().nullable(),
  image_data: z.string().nullable(),
  pdf_file: z.string().nullable(),
  pdf_data: z.string().nullable(),
  storage_url: z.string().nullable(),
  has_physical_variant: z.boolean().default(false),
  physical_price: z.number().min(0).nullable(),
});

export type SelectProduct = {
  id: number;
  name: string;
  description: string | null;
  price: string; // Digital price - Decimal comes as string from DB
  stock: number; // Physical stock only
  category_id: number | null;
  image_file: string | null;
  image_data: string | null;
  pdf_file: string | null;
  pdf_data: string | null;
  storage_url: string | null;
  has_physical_variant: boolean;
  physical_price: string | null; // Decimal comes as string from DB
  created_at: Date | null;
  updated_at: Date | null;
};

export const insertOrderSchema = createInsertSchema(orders);
export const selectOrderSchema = createSelectSchema(orders);
export type InsertOrder = typeof orders.$inferInsert;
export type SelectOrder = typeof orders.$inferSelect;

export const insertOrderItemSchema = createInsertSchema(orderItems);
export const selectOrderItemSchema = createSelectSchema(orderItems);
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type SelectOrderItem = typeof orderItems.$inferSelect;