import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ADMIN_EMAILS } from "./adminConfig";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import { 
  insertBookingSchema,
  insertIssueSchema,
  insertNotificationSchema,
  insertPrinterSchema,
  insertCredentialTypeSchema,
  insertTrainingVideoSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Configure multer for file uploads
  const upload = multer({ storage: multer.memoryStorage() });

  // Helper function to check if user is admin
  const isUserAdmin = (email: string): boolean => {
    return ADMIN_EMAILS.includes(email);
  };

  // Middleware to check admin access
  const requireAdmin = async (req: any, res: any, next: any) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !isUserAdmin(user.email || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      next();
    } catch (error) {
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Add admin status to user object
      const userWithAdmin = {
        ...user,
        isAdmin: isUserAdmin(user.email || '')
      };
      
      res.json(userWithAdmin);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Printer routes
  app.get('/api/printers', isAuthenticated, async (req, res) => {
    try {
      const printers = await storage.getPrinters();
      res.json(printers);
    } catch (error) {
      console.error("Error fetching printers:", error);
      res.status(500).json({ message: "Failed to fetch printers" });
    }
  });

  app.get('/api/printers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const printer = await storage.getPrinter(id);
      if (!printer) {
        return res.status(404).json({ message: "Printer not found" });
      }
      res.json(printer);
    } catch (error) {
      console.error("Error fetching printer:", error);
      res.status(500).json({ message: "Failed to fetch printer" });
    }
  });



  app.post('/api/printers', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const printerData = insertPrinterSchema.parse(req.body);
      const printer = await storage.createPrinter(printerData);
      res.status(201).json(printer);
    } catch (error) {
      console.error("Error creating printer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid printer data", details: error.errors });
      }
      res.status(500).json({ message: "Failed to create printer" });
    }
  });

  app.delete('/api/printers/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePrinter(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting printer:", error);
      res.status(500).json({ message: "Failed to delete printer" });
    }
  });

  app.patch('/api/printers/:id/status', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = z.object({ status: z.string() }).parse(req.body);
      await storage.updatePrinterStatus(id, status);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating printer status:", error);
      res.status(500).json({ message: "Failed to update printer status" });
    }
  });

  // Booking routes
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getUserBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/all', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const bookings = await storage.getBookings();
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check user credentials
      const userCredentials = await storage.getUserCredentials(userId);
      const credentialTypes = await storage.getCredentialTypes();
      const requiredCredentials = credentialTypes.filter(ct => ct.isRequired);
      
      for (const required of requiredCredentials) {
        const hasCredential = userCredentials.some(uc => uc.credentialTypeId === required.id);
        if (!hasCredential) {
          return res.status(403).json({ 
            message: `Missing required credential: ${required.name}` 
          });
        }
      }

      // Parse and transform booking data
      const rawData = req.body;
      const bookingData = {
        userId,
        printerId: rawData.printerId,
        startTime: new Date(rawData.startTime),
        endTime: new Date(rawData.endTime),
        duration: rawData.duration,
        status: 'scheduled',
        plaConfirmed: rawData.plaConfirmed
      };
      
      // Validate the booking data
      insertBookingSchema.parse({
        userId: bookingData.userId,
        printerId: bookingData.printerId,
        startTime: bookingData.startTime.toISOString(),
        endTime: bookingData.endTime.toISOString(),
        duration: bookingData.duration,
        status: bookingData.status,
        plaConfirmed: bookingData.plaConfirmed
      });
      
      // Check for conflicts
      const conflicts = await storage.getPrinterBookings(
        bookingData.printerId,
        bookingData.startTime,
        bookingData.endTime
      );
      
      if (conflicts.length > 0) {
        return res.status(409).json({ message: "Time slot conflicts with existing booking" });
      }

      const booking = await storage.createBooking(bookingData);
      
      // Create notification
      await storage.createNotification({
        userId,
        title: "Booking Confirmed",
        message: `Your booking has been confirmed for ${new Date(booking.startTime).toLocaleString()}`,
        type: "success"
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error("Error creating booking:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid booking data", details: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.patch('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const booking = await storage.updateBooking(id, updates);
      res.json(booking);
    } catch (error) {
      console.error("Error updating booking:", error);
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // Credential routes
  app.get('/api/credentials/types', isAuthenticated, async (req, res) => {
    try {
      const credentialTypes = await storage.getCredentialTypes();
      res.json(credentialTypes);
    } catch (error) {
      console.error("Error fetching credential types:", error);
      res.status(500).json({ message: "Failed to fetch credential types" });
    }
  });

  app.post('/api/credentials/types', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const credentialTypeData = insertCredentialTypeSchema.parse(req.body);
      const credentialType = await storage.createCredentialType(credentialTypeData);
      res.status(201).json(credentialType);
    } catch (error) {
      console.error("Error creating credential type:", error);
      res.status(500).json({ message: "Failed to create credential type" });
    }
  });

  // CSV Import route
  app.post('/api/admin/import-users', isAuthenticated, requireAdmin, upload.single('csvFile'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      const csvData: any[] = [];
      const stream = Readable.from(req.file.buffer.toString());
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => csvData.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      let imported = 0;
      
      // First ensure credential types exist
      const orientationCredential = await storage.createCredentialType({
        name: "Makerspace Orientation",
        description: "Basic safety and equipment orientation for the makerspace",
        isRequired: true
      }).catch(() => null); // Ignore if already exists

      const printingCredential = await storage.createCredentialType({
        name: "3D Printing Basics",
        description: "Fundamental knowledge of 3D printing processes and safety",
        isRequired: true
      }).catch(() => null); // Ignore if already exists

      // Get existing credential types
      const credentialTypes = await storage.getCredentialTypes();
      const orientationTypeId = credentialTypes.find(ct => ct.name === "Makerspace Orientation")?.id;
      const printingTypeId = credentialTypes.find(ct => ct.name === "3D Printing Basics")?.id;

      for (const row of csvData) {
        try {
          // Create or update user
          const userData = {
            id: `csv_${row.email}`, // Use email as unique identifier
            email: row.email,
            firstName: row.firstName,
            lastName: row.lastName,
          };

          const user = await storage.upsertUser(userData);
          
          // Award credentials if specified in CSV
          if (row.orientation === 'true' || row.orientation === '1' || row.orientation === 'yes') {
            if (orientationTypeId) {
              await storage.addUserCredential({
                userId: user.id,
                credentialTypeId: orientationTypeId
              }).catch(() => {}); // Ignore if already exists
            }
          }

          if (row['3dPrintingBasics'] === 'true' || row['3dPrintingBasics'] === '1' || row['3dPrintingBasics'] === 'yes') {
            if (printingTypeId) {
              await storage.addUserCredential({
                userId: user.id,
                credentialTypeId: printingTypeId
              }).catch(() => {}); // Ignore if already exists
            }
          }

          imported++;
        } catch (error) {
          console.error(`Error importing user ${row.email}:`, error);
        }
      }

      res.json({ 
        message: `Successfully imported ${imported} users`,
        imported 
      });
    } catch (error) {
      console.error("Error importing users:", error);
      res.status(500).json({ message: "Failed to import users" });
    }
  });

  app.get('/api/credentials/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const credentials = await storage.getUserCredentials(userId);
      res.json(credentials);
    } catch (error) {
      console.error("Error fetching user credentials:", error);
      res.status(500).json({ message: "Failed to fetch credentials" });
    }
  });

  app.post('/api/credentials/award', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { credentialTypeId } = z.object({ credentialTypeId: z.number() }).parse(req.body);
      
      const credential = await storage.addUserCredential({
        userId,
        credentialTypeId
      });

      // Create notification
      const credentialTypes = await storage.getCredentialTypes();
      const credentialType = credentialTypes.find(ct => ct.id === credentialTypeId);
      
      await storage.createNotification({
        userId,
        title: "Credential Earned",
        message: `Congratulations! You've earned the ${credentialType?.name} credential.`,
        type: "success"
      });

      res.status(201).json(credential);
    } catch (error) {
      console.error("Error awarding credential:", error);
      res.status(500).json({ message: "Failed to award credential" });
    }
  });

  // Training routes
  app.get('/api/training/videos/:credentialTypeId', isAuthenticated, async (req, res) => {
    try {
      const credentialTypeId = parseInt(req.params.credentialTypeId);
      const videos = await storage.getTrainingVideos(credentialTypeId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching training videos:", error);
      res.status(500).json({ message: "Failed to fetch training videos" });
    }
  });

  app.post('/api/training/videos', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const videoData = insertTrainingVideoSchema.parse(req.body);
      const video = await storage.createTrainingVideo(videoData);
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating training video:", error);
      res.status(500).json({ message: "Failed to create training video" });
    }
  });

  app.patch('/api/training/videos/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const video = await storage.updateTrainingVideo(id, updates);
      res.json(video);
    } catch (error) {
      console.error("Error updating training video:", error);
      res.status(500).json({ message: "Failed to update training video" });
    }
  });

  app.delete('/api/training/videos/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTrainingVideo(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting training video:", error);
      res.status(500).json({ message: "Failed to delete training video" });
    }
  });

  app.get('/api/training/progress/:videoId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const videoId = parseInt(req.params.videoId);
      const progress = await storage.getUserVideoProgress(userId, videoId);
      res.json(progress || { watchedDuration: 0, completed: false });
    } catch (error) {
      console.error("Error fetching video progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.post('/api/training/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progressData = { ...req.body, userId };
      const progress = await storage.updateVideoProgress(progressData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating video progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  app.post('/api/training/videos', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const videoData = insertTrainingVideoSchema.parse(req.body);
      const video = await storage.createTrainingVideo(videoData);
      res.status(201).json(video);
    } catch (error) {
      console.error("Error creating training video:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create training video" });
    }
  });

  // Issue routes
  app.get('/api/issues', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const issues = await storage.getIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.post('/api/issues', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const issueData = insertIssueSchema.parse({ ...req.body, userId });
      const issue = await storage.createIssue(issueData);
      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationRead(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // User management routes
  app.get('/api/admin/users', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/admin/users/credentials', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const { userId, credentialTypeId } = req.body;
      const credential = await storage.addUserCredential({
        userId,
        credentialTypeId
      });
      res.status(201).json(credential);
    } catch (error) {
      console.error("Error adding user credential:", error);
      res.status(500).json({ message: "Failed to add credential" });
    }
  });

  app.delete('/api/admin/users/:userId/credentials/:credentialTypeId', isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const { userId, credentialTypeId } = req.params;
      await storage.removeUserCredential(userId, parseInt(credentialTypeId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing user credential:", error);
      res.status(500).json({ message: "Failed to remove credential" });
    }
  });

  // Update printer route
  app.patch('/api/printers/:id', isAuthenticated, requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      

      
      const printer = await storage.updatePrinter(id, updateData);
      res.json(printer);
    } catch (error) {
      console.error("Error updating printer:", error);
      res.status(500).json({ message: "Failed to update printer" });
    }
  });



  const httpServer = createServer(app);
  return httpServer;
}
