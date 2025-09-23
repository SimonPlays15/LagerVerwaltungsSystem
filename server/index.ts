import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import dotenv from "dotenv";

dotenv.config({
    path: "./.env",
    quiet: true,
});

// Create a first admin user if none exists (DEVELOPMENT ONLY)
// Delete the default admin user if it exists (PRODUCTION ONLY)
async function ensureAdminUser() {
  if (process.env.NODE_ENV === 'production') {
      const { storage } = await import("./storage");
      const users = await storage.getAllUsers();
      if(users.length > 0){
          const devAdminAccountExists = await storage.getUser("development_admin");
          if(devAdminAccountExists)
              await storage.deleteUser("development_admin");
      }
      return; // Never create default admin in production
  }
  
  try {
    const { storage } = await import("./storage");
    const users = await storage.getAllUsers();
    if (users.length === 0) {
      const adminPassword = "admin123";
      const { hashPassword } = await import("./localAuth");
      const passwordHash = await hashPassword(adminPassword);
      await storage.createUser({
        id: "development_admin",
        email: "admin@example.com",
        passwordHash,
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      });
      console.log("🔧 Default admin user created for development: admin@example.com");
      if (!process.env.ADMIN_PASSWORD) {
        console.warn("⚠️  Using default password. Set ADMIN_PASSWORD env for security.");
      }
    }
  } catch (error) {
    console.warn("Failed to create admin user:", error);
  }
}

// Ensure default categories
async function ensureDefaultCategories(){
    const { storage } = await import("./storage");
    const categories = await storage.getCategories();
    if(categories.length === 0) {
        await storage.createCategory({
            name: "Brandmeldetechnik",
            code: "BMA",
            description: "Zentrale, Komponente, Zubehör",
        });
        await storage.createCategory({
            name: "Einbruchmeldetechnik",
            code: "EMA",
            description: "Zentrale, Sensoren, Kameras",
        });
        for (const category of categories) {
            await storage.createSubCategory({
                name: "Zubehör",
                description: "Zubehör",
                categoryId: category.id,
            })
        }
    }
}

// Ensure default Cost Center
async function ensureDefaultCostCenter() {
    const {storage} = await import("./storage");
    const costCenters = await storage.getCostCenters();
    if (costCenters.length === 0) {
        await storage.createCostCenter({
            name: "Default Cost Center",
            description: "Default Cost Center",
            code: "DEF-CHANGE-ME0123",
            isActive: true
        });
    }
}

import { setupVite, serveStatic, log } from "./vite";
import {resetDatabase} from "./db.ts";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
          // remove sensitive data from the response, check if json is an object or array
          if(capturedJsonResponse.passwordHash)
              capturedJsonResponse.passwordHash = '***';
          if(capturedJsonResponse.email)
              capturedJsonResponse.email = '***';


          if(capturedJsonResponse instanceof Array && capturedJsonResponse.forEach){
              capturedJsonResponse.forEach((item: any) => {
                  if (typeof item === 'object') {
                      Object.keys(item).forEach(key => {
                          if (key === 'passwordHash' || key === 'email' || key === 'refreshToken') {
                              item[key] = '***';
                          }
                      });
                  }
              })
          }
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await ensureAdminUser();
  await ensureDefaultCategories();
    await ensureDefaultCostCenter();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly, only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();
