import { pgTable, text, timestamp, boolean, uuid, integer, decimal, jsonb } from 'drizzle-orm/pg-core';
import { v7 as uuidv7 } from 'uuid';

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sessions table for Better Auth
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

// Accounts table for OAuth providers
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

// Verifications table for email verification, password reset, etc.
export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  name: text("name").notNull().unique(),
  stripePriceId: text("stripe_price_id").unique(),
  monthlyUploadLimit: integer("monthly_upload_limit").notNull(),
  features: jsonb("features"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User subscriptions table
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planId: uuid("plan_id")
    .notNull()
    .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  stripeCustomerId: text("stripe_customer_id"),
  status: text("status").notNull(), // active, past_due, canceled
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Images table
export const images = pgTable("images", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // original, processed, thumbnail
  storageKey: text("storage_key").notNull(),
  filename: text("filename").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System styles/presets table
export const systemStyles = pgTable("system_styles", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  description: text("description"),
  aiPrompt: text("ai_prompt").notNull(),
  blendingParams: jsonb("blending_params"),
  exampleImageUrl: text("example_image_url"),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Processing jobs table
export const processingJobs = pgTable("processing_jobs", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  styleId: uuid("style_id")
    .notNull()
    .references(() => systemStyles.id),
  intensity: decimal("intensity", { precision: 5, scale: 2 }).default("1.00").notNull(),
  status: text("status").notNull().default("queued"), // queued, processing, completed, failed
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Usage tracking table
export const usageTracking = pgTable("usage_tracking", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  uploadCount: integer("upload_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit logging table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().$defaultFn(() => uuidv7()),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: uuid("resource_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  error: text("error"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Export all tables
export const schema = {
  users,
  sessions,
  accounts,
  verifications,
  subscriptionPlans,
  userSubscriptions,
  projects,
  images,
  systemStyles,
  processingJobs,
  usageTracking,
  auditLogs,
};
