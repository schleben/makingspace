import {
  users,
  credentialTypes,
  userCredentials,
  trainingVideos,
  userVideoProgress,
  printers,
  bookings,
  issues,
  notifications,
  type User,
  type UpsertUser,
  type CredentialType,
  type InsertCredentialType,
  type UserCredential,
  type InsertUserCredential,
  type TrainingVideo,
  type InsertTrainingVideo,
  type UserVideoProgress,
  type InsertUserVideoProgress,
  type Printer,
  type InsertPrinter,
  type Booking,
  type InsertBooking,
  type Issue,
  type InsertIssue,
  type Notification,
  type InsertNotification,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  removeUserCredential(userId: string, credentialTypeId: number): Promise<void>;
  
  // Credential operations
  getCredentialTypes(): Promise<CredentialType[]>;
  createCredentialType(credentialType: InsertCredentialType): Promise<CredentialType>;
  getUserCredentials(userId: string): Promise<UserCredential[]>;
  addUserCredential(userCredential: InsertUserCredential): Promise<UserCredential>;
  
  // Training operations
  getTrainingVideos(credentialTypeId: number): Promise<TrainingVideo[]>;
  createTrainingVideo(video: InsertTrainingVideo): Promise<TrainingVideo>;
  updateTrainingVideo(id: number, updates: Partial<TrainingVideo>): Promise<TrainingVideo>;
  deleteTrainingVideo(id: number): Promise<void>;
  getUserVideoProgress(userId: string, videoId: number): Promise<UserVideoProgress | undefined>;
  updateVideoProgress(progress: InsertUserVideoProgress): Promise<UserVideoProgress>;
  
  // Printer operations
  getPrinters(): Promise<Printer[]>;
  getPrinter(id: number): Promise<Printer | undefined>;

  createPrinter(printer: InsertPrinter): Promise<Printer>;
  deletePrinter(id: number): Promise<void>;
  updatePrinter(id: number, updates: Partial<Printer>): Promise<Printer>;
  updatePrinterStatus(id: number, status: string): Promise<void>;
  
  // Booking operations
  getBookings(): Promise<Booking[]>;
  getUserBookings(userId: string): Promise<Booking[]>;
  getPrinterBookings(printerId: number, startTime: Date, endTime: Date): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, updates: Partial<Booking>): Promise<Booking>;
  
  // Issue operations
  getIssues(): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, updates: Partial<Issue>): Promise<Issue>;
  
  // Notification operations
  getUserNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const usersWithCredentials = await db
      .select()
      .from(users)
      .leftJoin(userCredentials, eq(users.id, userCredentials.userId))
      .leftJoin(credentialTypes, eq(userCredentials.credentialTypeId, credentialTypes.id));

    // Group users with their credentials
    const userMap = new Map();
    
    for (const row of usersWithCredentials) {
      const userId = row.users.id;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          ...row.users,
          credentials: []
        });
      }
      
      if (row.user_credentials && row.credential_types) {
        userMap.get(userId).credentials.push({
          ...row.user_credentials,
          credentialType: row.credential_types
        });
      }
    }
    
    return Array.from(userMap.values());
  }

  async removeUserCredential(userId: string, credentialTypeId: number): Promise<void> {
    await db
      .delete(userCredentials)
      .where(
        and(
          eq(userCredentials.userId, userId),
          eq(userCredentials.credentialTypeId, credentialTypeId)
        )
      );
  }

  // Credential operations
  async getCredentialTypes(): Promise<CredentialType[]> {
    return await db.select().from(credentialTypes).orderBy(asc(credentialTypes.name));
  }

  async createCredentialType(credentialType: InsertCredentialType): Promise<CredentialType> {
    const [created] = await db.insert(credentialTypes).values(credentialType).returning();
    return created;
  }

  async getUserCredentials(userId: string): Promise<UserCredential[]> {
    return await db.select().from(userCredentials).where(eq(userCredentials.userId, userId));
  }

  async addUserCredential(userCredential: InsertUserCredential): Promise<UserCredential> {
    const [created] = await db.insert(userCredentials).values(userCredential).returning();
    return created;
  }

  // Training operations
  async getTrainingVideos(credentialTypeId: number): Promise<TrainingVideo[]> {
    return await db
      .select()
      .from(trainingVideos)
      .where(eq(trainingVideos.credentialTypeId, credentialTypeId))
      .orderBy(asc(trainingVideos.order));
  }

  async createTrainingVideo(video: InsertTrainingVideo): Promise<TrainingVideo> {
    const [created] = await db.insert(trainingVideos).values(video).returning();
    return created;
  }

  async updateTrainingVideo(id: number, updates: Partial<TrainingVideo>): Promise<TrainingVideo> {
    const [updatedVideo] = await db
      .update(trainingVideos)
      .set(updates)
      .where(eq(trainingVideos.id, id))
      .returning();
    return updatedVideo;
  }

  async deleteTrainingVideo(id: number): Promise<void> {
    await db
      .delete(trainingVideos)
      .where(eq(trainingVideos.id, id));
  }

  async getUserVideoProgress(userId: string, videoId: number): Promise<UserVideoProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userVideoProgress)
      .where(and(eq(userVideoProgress.userId, userId), eq(userVideoProgress.videoId, videoId)));
    return progress;
  }

  async updateVideoProgress(progress: InsertUserVideoProgress): Promise<UserVideoProgress> {
    const [updated] = await db
      .insert(userVideoProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [userVideoProgress.userId, userVideoProgress.videoId],
        set: {
          watchedDuration: progress.watchedDuration,
          completed: progress.completed,
          lastWatchedAt: new Date(),
        },
      })
      .returning();
    return updated;
  }

  // Printer operations
  async getPrinters(): Promise<Printer[]> {
    return await db.select().from(printers).orderBy(asc(printers.name));
  }

  async getPrinter(id: number): Promise<Printer | undefined> {
    const [printer] = await db.select().from(printers).where(eq(printers.id, id));
    return printer;
  }



  async createPrinter(printer: InsertPrinter): Promise<Printer> {
    const [created] = await db.insert(printers).values(printer).returning();
    return created;
  }

  async deletePrinter(id: number): Promise<void> {
    await db.delete(printers).where(eq(printers.id, id));
  }

  async updatePrinter(id: number, updates: Partial<Printer>): Promise<Printer> {
    const [updatedPrinter] = await db
      .update(printers)
      .set(updates)
      .where(eq(printers.id, id))
      .returning();
    return updatedPrinter;
  }

  async updatePrinterStatus(id: number, status: string): Promise<void> {
    await db.update(printers).set({ status }).where(eq(printers.id, id));
  }

  // Booking operations
  async getBookings(): Promise<Booking[]> {
    return await db.select().from(bookings).orderBy(desc(bookings.startTime));
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.startTime));
  }

  async getPrinterBookings(printerId: number, startTime: Date, endTime: Date): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.printerId, printerId),
          gte(bookings.endTime, startTime),
          lte(bookings.startTime, endTime)
        )
      );
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    const [created] = await db.insert(bookings).values(booking).returning();
    return created;
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking> {
    const [updated] = await db.update(bookings).set(updates).where(eq(bookings.id, id)).returning();
    return updated;
  }

  // Issue operations
  async getIssues(): Promise<Issue[]> {
    return await db.select().from(issues).orderBy(desc(issues.createdAt));
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const [created] = await db.insert(issues).values(issue).returning();
    return created;
  }

  async updateIssue(id: number, updates: Partial<Issue>): Promise<Issue> {
    const [updated] = await db.update(issues).set(updates).where(eq(issues.id, id)).returning();
    return updated;
  }

  // Notification operations
  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
}

export const storage = new DatabaseStorage();
