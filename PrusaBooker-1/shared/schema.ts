import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credentials/Training types
export const credentialTypes = pgTable("credential_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User credentials
export const userCredentials = pgTable("user_credentials", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialTypeId: integer("credential_type_id").notNull().references(() => credentialTypes.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").defaultNow(),
});

// Training videos
export const trainingVideos = pgTable("training_videos", {
  id: serial("id").primaryKey(),
  credentialTypeId: integer("credential_type_id").notNull().references(() => credentialTypes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  videoUrl: text("video_url").notNull(),
  duration: integer("duration"), // in seconds
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User video progress
export const userVideoProgress = pgTable("user_video_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  videoId: integer("video_id").notNull().references(() => trainingVideos.id, { onDelete: "cascade" }),
  watchedDuration: integer("watched_duration").default(0), // in seconds
  completed: boolean("completed").default(false),
  lastWatchedAt: timestamp("last_watched_at").defaultNow(),
});

// Printers
export const printers = pgTable("printers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  model: varchar("model", { length: 255 }).default("Prusa Mini"),
  location: varchar("location", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("available"), // available, in_use, maintenance, offline
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Bookings
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  printerId: integer("printer_id").notNull().references(() => printers.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  duration: integer("duration").notNull(), // in minutes
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, active, completed, cancelled, failed
  plaConfirmed: boolean("pla_confirmed").default(false),
  printProgress: real("print_progress").default(0), // 0-100
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Issues/Reports
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  printerId: integer("printer_id").notNull().references(() => printers.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  severity: varchar("severity", { length: 50 }).default("medium"), // low, medium, high, critical
  status: varchar("status", { length: 50 }).default("open"), // open, in_progress, resolved, closed
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).default("info"), // info, success, warning, error
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  credentials: many(userCredentials),
  videoProgress: many(userVideoProgress),
  bookings: many(bookings),
  issues: many(issues),
  notifications: many(notifications),
}));

export const credentialTypesRelations = relations(credentialTypes, ({ many }) => ({
  userCredentials: many(userCredentials),
  trainingVideos: many(trainingVideos),
}));

export const userCredentialsRelations = relations(userCredentials, ({ one }) => ({
  user: one(users, { fields: [userCredentials.userId], references: [users.id] }),
  credentialType: one(credentialTypes, { fields: [userCredentials.credentialTypeId], references: [credentialTypes.id] }),
}));

export const trainingVideosRelations = relations(trainingVideos, ({ one, many }) => ({
  credentialType: one(credentialTypes, { fields: [trainingVideos.credentialTypeId], references: [credentialTypes.id] }),
  userProgress: many(userVideoProgress),
}));

export const userVideoProgressRelations = relations(userVideoProgress, ({ one }) => ({
  user: one(users, { fields: [userVideoProgress.userId], references: [users.id] }),
  video: one(trainingVideos, { fields: [userVideoProgress.videoId], references: [trainingVideos.id] }),
}));

export const printersRelations = relations(printers, ({ many }) => ({
  bookings: many(bookings),
  issues: many(issues),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  printer: one(printers, { fields: [bookings.printerId], references: [printers.id] }),
  issues: many(issues),
}));

export const issuesRelations = relations(issues, ({ one }) => ({
  printer: one(printers, { fields: [issues.printerId], references: [printers.id] }),
  user: one(users, { fields: [issues.userId], references: [users.id] }),
  booking: one(bookings, { fields: [issues.bookingId], references: [bookings.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCredentialTypeSchema = createInsertSchema(credentialTypes).omit({ id: true, createdAt: true });
export const insertUserCredentialSchema = createInsertSchema(userCredentials).omit({ id: true });
export const insertTrainingVideoSchema = createInsertSchema(trainingVideos).omit({ id: true, createdAt: true });
export const insertUserVideoProgressSchema = createInsertSchema(userVideoProgress).omit({ id: true });
export const insertPrinterSchema = createInsertSchema(printers).omit({ id: true, createdAt: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true }).extend({
  duration: z.number().min(15).max(480),
  plaConfirmed: z.boolean(),
});
export const insertIssueSchema = createInsertSchema(issues).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type CredentialType = typeof credentialTypes.$inferSelect;
export type InsertCredentialType = z.infer<typeof insertCredentialTypeSchema>;
export type UserCredential = typeof userCredentials.$inferSelect;
export type InsertUserCredential = z.infer<typeof insertUserCredentialSchema>;
export type TrainingVideo = typeof trainingVideos.$inferSelect;
export type InsertTrainingVideo = z.infer<typeof insertTrainingVideoSchema>;
export type UserVideoProgress = typeof userVideoProgress.$inferSelect;
export type InsertUserVideoProgress = z.infer<typeof insertUserVideoProgressSchema>;
export type Printer = typeof printers.$inferSelect;
export type InsertPrinter = z.infer<typeof insertPrinterSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
