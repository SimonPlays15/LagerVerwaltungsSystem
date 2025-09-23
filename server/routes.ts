import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, DependencyConflictError } from "./storage";
import {
  setupAuth,
  isAuthenticated,
  registerUser,
  loginUser,
  changePassword,
} from "./localAuth";
import {
  registerUserSchema,
  loginUserSchema,
  changePasswordSchema,
} from "../shared/schema";
import {
  insertArticleSchema,
  insertCategorySchema,
  insertSubCategorySchema,
  insertCostCenterSchema,
  insertStockMovementSchema,
  insertInventoryCountSchema,
  insertInventoryCountItemSchema,
  insertUserSchema,
} from "@shared/schema";
import type { UpsertUser } from "@shared/schema";
import { z } from "zod";
import { reportExporter } from "./utils/exportUtils";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
    setupAuth(app);

    app.get("/api/firstlaunch", async (req, res) => {
        const users = await storage.getAllUsers();
        if(users.length > 0){
            return res.status(308).json({firstLaunch: false});
        }
        return res.status(200).json({firstLaunch: true});
    })
  // Local Auth routes
  app.post("/api/register", async (req, res) => {
    try {
        const users = await storage.getAllUsers();
        if(users.length > 0){
            return res.status(403).json({message: "User registration not allowed"});
        }
      const userData = registerUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      }

      const user = await registerUser(userData);
      req.session.userId = user.id;

      res.json({
        message: "Registration successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
      try {
          const credentials = loginUserSchema.parse(req.body);
          const user = await loginUser(credentials);

          req.session.userId = user.id;

          res.json({
              message: "Login successful",
              user: {
                  id: user.id,
                  email: user.email,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  role: user.role,
                  forcePasswordChange: user.forcePasswordChange,
              },
          });
      } catch (error) {
          if (error instanceof z.ZodError) {
              return res
                  .status(400)
                  .json({ message: "Invalid data", errors: error.errors });
          }

          // Ausführliche Fehlerprotokolle für Entwicklung
          console.error("Login error details:", error);

          if ((error as Error).message === "Invalid credentials") {
              return res.status(401).json({ message: "Ungültige E-Mail oder Passwort" });
          }

          // Prüfen auf spezielle Fehlermeldungen
          if ((error as Error).message.includes("locked")) {
              return res.status(403).json({ message: (error as Error).message });
          }
          // Account deaktiviert
          if ((error as Error).message.includes("Account is disabled")) {
              return res.status(401).json({ message: "Account deaktiviert. Bitte kontaktiere den Support." });
          }

          res.status(500).json({
              message: "Login fehlgeschlagen",
              detail: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
          });
      }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user; // User ist bereits im middleware gesetzt
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Change password route
  app.post("/api/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const passwordData = changePasswordSchema.parse(req.body);

      await changePassword(
        req.user.id,
        passwordData.currentPassword,
        passwordData.newPassword,
      );

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      if (
        error instanceof Error &&
        error.message === "Current password is incorrect"
      ) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get(
    "/api/dashboard/recent-movements",
    isAuthenticated,
    async (req, res) => {
      try {
        const movements = await storage.getStockMovements(10);
        res.json(movements);
      } catch (error) {
        console.error("Error fetching recent movements:", error);
        res.status(500).json({ message: "Failed to fetch recent movements" });
      }
    },
  );

  app.get("/api/dashboard/low-stock", isAuthenticated, async (req, res) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  // Category routes
  app.get("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.get("/api/subcategories", isAuthenticated, async (req, res) => {
    try {
      const categoryId = req.query.categoryId as string;
      const subCategories = await storage.getSubCategories(categoryId);
      res.json(subCategories);
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      res.status(500).json({ message: "Failed to fetch subcategories" });
    }
  });

  app.post("/api/subcategories", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const subCategoryData = insertSubCategorySchema.parse(req.body);
      const subCategory = await storage.createSubCategory(subCategoryData);
      res.json(subCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating subcategory:", error);
      res.status(500).json({ message: "Failed to create subcategory" });
    }
  });

  app.put("/api/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const categoryData = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(
        req.params.id,
        categoryData,
      );
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin role
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteCategory(req.params.id);
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error deleting category:", error);
      if (error instanceof DependencyConflictError) {
        return res.status(409).json({
          message: error.message,
          code: error.code,
          dependencyType: error.dependencyType,
          dependencyCount: error.dependencyCount,
        });
      }
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.put("/api/subcategories/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const subCategoryData = insertSubCategorySchema.partial().parse(req.body);
      const subCategory = await storage.updateSubCategory(
        req.params.id,
        subCategoryData,
      );
      res.json(subCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating subcategory:", error);
      res.status(500).json({ message: "Failed to update subcategory" });
    }
  });

  app.delete(
    "/api/subcategories/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        // Check if user has admin role
        const user = await storage.getUser(req.user.id);
        if (!user || user.role !== "admin") {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        await storage.deleteSubCategory(req.params.id);
        res.json({ message: "Subcategory deleted successfully" });
      } catch (error) {
        console.error("Error deleting subcategory:", error);
        if (error instanceof DependencyConflictError) {
          return res.status(409).json({
            message: error.message,
            code: error.code,
            dependencyType: error.dependencyType,
            dependencyCount: error.dependencyCount,
          });
        }
        res.status(500).json({ message: "Failed to delete subcategory" });
      }
    },
  );

  // Cost center routes
  app.get("/api/cost-centers", isAuthenticated, async (req, res) => {
    try {
      const costCenters = await storage.getCostCenters();
      res.json(costCenters);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
      res.status(500).json({ message: "Failed to fetch cost centers" });
    }
  });

  app.get("/api/cost-centers/active", isAuthenticated, async (req, res) => {
    try {
      const activeCostCenters = await storage.getActiveCostCenters();
      res.json(activeCostCenters);
    } catch (error) {
      console.error("Error fetching active cost centers:", error);
      res.status(500).json({ message: "Failed to fetch active cost centers" });
    }
  });

  app.post("/api/cost-centers", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const costCenterData = insertCostCenterSchema.parse(req.body);
      const costCenter = await storage.createCostCenter(costCenterData);
      res.json(costCenter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating cost center:", error);
      res.status(500).json({ message: "Failed to create cost center" });
    }
  });

  app.put("/api/cost-centers/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const costCenterData = insertCostCenterSchema.partial().parse(req.body);
      const costCenter = await storage.updateCostCenter(
        req.params.id,
        costCenterData,
      );
      res.json(costCenter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating cost center:", error);
      res.status(500).json({ message: "Failed to update cost center" });
    }
  });

  app.delete(
    "/api/cost-centers/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        // Check if user has admin or projektleiter role
        const user = await storage.getUser(req.user.id);
        if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
          return res.status(403).json({ message: "Insufficient permissions" });
        }

        await storage.deleteCostCenter(req.params.id);
        res.json({ message: "Cost center deleted successfully" });
      } catch (error) {
        console.error("Error deleting cost center:", error);
        if (error instanceof DependencyConflictError) {
          return res.status(409).json({
            message: error.message,
            code: error.code,
            dependencyType: error.dependencyType,
            dependencyCount: error.dependencyCount,
          });
        }
        res.status(500).json({ message: "Failed to delete cost center" });
      }
    },
  );

  // User management routes
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin role (only admin can manage users)
      const user = req.user;
      if (!user || user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Admin privileges required to manage users" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin role (only admin can create users)
      const user = req.user;
      if (!user || user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Admin privileges required to create users" });
      }

      const userData = insertUserSchema.parse(req.body);
      // Use registerUser for proper password hashing
      const { password, forcePasswordChange = true, ...userInfo } = req.body;
      if (!password) {
        return res
          .status(400)
          .json({ message: "Password is required for user creation" });
      }
      const newUser = await registerUser({
        password,
        forcePasswordChange,
        ...userInfo,
      });
      res.json(newUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin role (only admin can update users)
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Admin privileges required to update users" });
      }

      const userData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(req.params.id, userData);
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin role (only admin can delete users)
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Admin privileges required to delete users" });
      }

      // Prevent self-deletion
      if (req.params.id === req.user.id) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      if (error instanceof DependencyConflictError) {
        return res.status(409).json({
          message: error.message,
          code: error.code,
          dependencyType: error.dependencyType,
          dependencyCount: error.dependencyCount,
        });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Article routes
  app.get("/api/articles", isAuthenticated, async (req, res) => {
    try {
      const articles = await storage.getArticles();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get(
    "/api/articles/by-number/:articleNumber",
    isAuthenticated,
    async (req, res) => {
      try {
        const article = await storage.getArticleByNumber(
          req.params.articleNumber,
        );
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        res.json(article);
      } catch (error) {
        console.error("Error fetching article:", error);
        res.status(500).json({ message: "Failed to fetch article" });
      }
    },
  );

  app.get(
    "/api/articles/by-barcode/:barcode",
    isAuthenticated,
    async (req, res) => {
      try {
        const article = await storage.getArticleByBarcode(req.params.barcode);
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        res.json(article);
      } catch (error) {
        console.error("Error fetching article:", error);
        res.status(500).json({ message: "Failed to fetch article" });
      }
    },
  );

  app.post("/api/articles", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const articleData = insertArticleSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      const article = await storage.createArticle(articleData);
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating article:", error);
      res.status(500).json({ message: "Failed to create article" });
    }
  });

  app.put("/api/articles/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const articleData = insertArticleSchema.partial().parse(req.body);
      const article = await storage.updateArticle(req.params.id, articleData);
      res.json(article);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating article:", error);
      res.status(500).json({ message: "Failed to update article" });
    }
  });

  app.delete("/api/articles/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Check if user has admin or projektleiter role
      const user = await storage.getUser(req.user.id);
      if (!user || (user.role !== "admin" && user.role !== "projektleiter")) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteArticle(req.params.id);
      res.json({ message: "Article deleted successfully" });
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ message: "Failed to delete article" });
    }
  });

  // Stock movement routes
  app.post("/api/stock-movements", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(403).json({ message: "User not found" });
      }

      const movementData = insertStockMovementSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      // Validate cost center requirement for checkout
      if (movementData.type === "checkout" && !movementData.costCenterId) {
        return res
          .status(400)
          .json({ message: "Cost center is required for checkout operations" });
      }

      const movement = await storage.createStockMovement(movementData);
      res.json(movement);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating stock movement:", error);
      res.status(500).json({ message: "Failed to create stock movement" });
    }
  });

  app.get("/api/stock-movements", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const movements = await storage.getStockMovements(limit);
      res.json(movements);
    } catch (error) {
      console.error("Error fetching stock movements:", error);
      res.status(500).json({ message: "Failed to fetch stock movements" });
    }
  });

  app.get(
    "/api/stock-movements/article/:articleId",
    isAuthenticated,
    async (req, res) => {
      try {
        const movements = await storage.getStockMovementsByArticle(
          req.params.articleId,
        );
        res.json(movements);
      } catch (error) {
        console.error("Error fetching article stock movements:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch article stock movements" });
      }
    },
  );

  // Reporting routes
  app.get("/api/reports/inventory", isAuthenticated, async (req, res) => {
    try {
        console.log(req.query)
      const filters = {
          dateFrom: req.query.dateFrom as string | "",
          dateTo: req.query.dateTo as string | "",
          categoryId: req.query.categoryId as string | "",
          subCategoryId: req.query.subCategoryId as string | "",
          articleId: req.query.articleId as string | "",
      };
      const report = await storage.getInventoryReport(filters);
      res.json(report);
    } catch (error) {
      console.error("Error generating inventory report:", error);
      res.status(500).json({ message: "Failed to generate inventory report" });
    }
  });

  app.get("/api/reports/stock-movements", isAuthenticated, async (req, res) => {
    try {
      const filters = {
          dateFrom: req.query.dateFrom as string | "",
          dateTo: req.query.dateTo as string | "",
          categoryId: req.query.categoryId as string | "",
          subCategoryId: req.query.subCategoryId as string | "",
          costCenterId: req.query.costCenterId as string | "",
          articleId: req.query.articleId as string | "",
          userId: req.query.userId as string | "",
        movementType: req.query.movementType as
          | "checkin"
          | "checkout"
          | "adjustment"
          | "transfer"
          | undefined,
      };
      const report = await storage.getStockMovementReport(filters);
      res.json(report);
    } catch (error) {
      console.error("Error generating stock movement report:", error);
      res
        .status(500)
        .json({ message: "Failed to generate stock movement report" });
    }
  });

  app.get("/api/reports/categories", isAuthenticated, async (req, res) => {
    try {
      const report = await storage.getCategoryReport();
      res.json(report);
    } catch (error) {
      console.error("Error generating category report:", error);
      res.status(500).json({ message: "Failed to generate category report" });
    }
  });

  // Export routes
  app.get(
    "/api/reports/inventory/export/excel",
    isAuthenticated,
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
          categoryId: req.query.categoryId as string | undefined,
          subCategoryId: req.query.subCategoryId as string | undefined,
          articleId: req.query.articleId as string | undefined,
        };

        const report = await storage.getInventoryReport(filters);
        const excelBuffer = await reportExporter.exportInventoryToExcel(
          report,
          "Lagerbestand Bericht",
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="lagerbestand_${new Date().toISOString().split("T")[0]}.xlsx"`,
        );
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.send(excelBuffer);
      } catch (error) {
        console.error("Error exporting inventory to Excel:", error);
        res.status(500).json({ message: "Failed to export inventory report" });
      }
    },
  );

  app.get(
    "/api/reports/inventory/export/pdf",
    isAuthenticated,
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
          categoryId: req.query.categoryId as string | undefined,
          subCategoryId: req.query.subCategoryId as string | undefined,
          articleId: req.query.articleId as string | undefined,
        };

        const report = await storage.getInventoryReport(filters);
        const pdfBuffer = await reportExporter.exportToPDF(
          "Lagerbestand Bericht",
          report,
          "inventory",
        );

        res.setHeader(
          "Content-Disposition",
          `inline; filename="lagerbestand_${new Date().toISOString().split("T")[0]}.html"`,
        );
        res.setHeader("Content-Type", "text/html");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error exporting inventory to PDF:", error);
        res.status(500).json({ message: "Failed to export inventory report" });
      }
    },
  );

  app.get(
    "/api/reports/stock-movements/export/excel",
    isAuthenticated,
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
          categoryId: req.query.categoryId as string | undefined,
          subCategoryId: req.query.subCategoryId as string | undefined,
          costCenterId: req.query.costCenterId as string | undefined,
          articleId: req.query.articleId as string | undefined,
          userId: req.query.userId as string | undefined,
          movementType: req.query.movementType as
            | "checkin"
            | "checkout"
            | "adjustment"
            | "transfer"
            | undefined,
        };

        const report = await storage.getStockMovementReport(filters);
        const excelBuffer = await reportExporter.exportStockMovementsToExcel(
          report,
          "Lagerbewegungen Bericht",
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="lagerbewegungen_${new Date().toISOString().split("T")[0]}.xlsx"`,
        );
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.send(excelBuffer);
      } catch (error) {
        console.error("Error exporting stock movements to Excel:", error);
        res
          .status(500)
          .json({ message: "Failed to export stock movements report" });
      }
    },
  );

  app.get(
    "/api/reports/stock-movements/export/pdf",
    isAuthenticated,
    async (req, res) => {
      try {
        const filters = {
          dateFrom: req.query.dateFrom as string | undefined,
          dateTo: req.query.dateTo as string | undefined,
          categoryId: req.query.categoryId as string | undefined,
          subCategoryId: req.query.subCategoryId as string | undefined,
          costCenterId: req.query.costCenterId as string | undefined,
          articleId: req.query.articleId as string | undefined,
          userId: req.query.userId as string | undefined,
          movementType: req.query.movementType as
            | "checkin"
            | "checkout"
            | "adjustment"
            | "transfer"
            | undefined,
        };

        const report = await storage.getStockMovementReport(filters);
        const pdfBuffer = await reportExporter.exportToPDF(
          "Lagerbewegungen Bericht",
          report,
          "movements",
        );

        res.setHeader(
          "Content-Disposition",
          `inline; filename="lagerbewegungen_${new Date().toISOString().split("T")[0]}.html"`,
        );
        res.setHeader("Content-Type", "text/html");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error exporting stock movements to PDF:", error);
        res
          .status(500)
          .json({ message: "Failed to export stock movements report" });
      }
    },
  );

  app.get(
    "/api/reports/categories/export/excel",
    isAuthenticated,
    async (req, res) => {
      try {
        const report = await storage.getCategoryReport();
        const excelBuffer = await reportExporter.exportCategoryToExcel(
          report,
          "Kategorie Übersicht",
        );

        res.setHeader(
          "Content-Disposition",
          `attachment; filename="kategorien_${new Date().toISOString().split("T")[0]}.xlsx"`,
        );
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.send(excelBuffer);
      } catch (error) {
        console.error("Error exporting categories to Excel:", error);
        res.status(500).json({ message: "Failed to export categories report" });
      }
    },
  );

  app.get(
    "/api/reports/categories/export/pdf",
    isAuthenticated,
    async (req, res) => {
      try {
        const report = await storage.getCategoryReport();
        const pdfBuffer = await reportExporter.exportToPDF(
          "Kategorie Übersicht",
          report,
          "categories",
        );

        res.setHeader(
          "Content-Disposition",
          `inline; filename="kategorien_${new Date().toISOString().split("T")[0]}.html"`,
        );
        res.setHeader("Content-Type", "text/html");
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Error exporting categories to PDF:", error);
        res.status(500).json({ message: "Failed to export categories report" });
      }
    },
  );

  // Inventory counting routes
  app.get("/api/inventory-counts", isAuthenticated, async (req, res) => {
    try {
      const counts = await storage.getInventoryCounts();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching inventory counts:", error);
      res.status(500).json({ message: "Failed to fetch inventory counts" });
    }
  });

  app.get("/api/inventory-counts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const count = await storage.getInventoryCountById(id);
      if (!count) {
        return res.status(404).json({ message: "Inventory count not found" });
      }
      res.json(count);
    } catch (error) {
      console.error("Error fetching inventory count:", error);
      res.status(500).json({ message: "Failed to fetch inventory count" });
    }
  });

  app.post("/api/inventory-counts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const validatedData = insertInventoryCountSchema.parse({
        ...req.body,
        createdBy: userId,
      });

      const created = await storage.createInventoryCount(validatedData);

      // Create count items automatically based on filters
      if (req.body.categoryId || req.body.locationFilter) {
        await storage.createInventoryCountItems(created.id, {
          categoryId: req.body.categoryId,
          locationFilter: req.body.locationFilter,
        });
      } else {
        // Create items for all articles if no filters
        await storage.createInventoryCountItems(created.id);
      }

      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error creating inventory count:", error);
      res.status(500).json({ message: "Failed to create inventory count" });
    }
  });

  app.put(
    "/api/inventory-counts/:id/status",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user.id;

        if (
          !["open", "in_progress", "completed", "approved"].includes(status)
        ) {
          return res.status(400).json({ message: "Invalid status" });
        }

        const updated = await storage.updateInventoryCountStatus(
          id,
          status,
          userId,
        );
        res.json(updated);
      } catch (error) {
        console.error("Error updating inventory count status:", error);
        res
          .status(500)
          .json({ message: "Failed to update inventory count status" });
      }
    },
  );

  app.delete("/api/inventory-counts/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteInventoryCount(id);
      res.json({ message: "Inventory count deleted successfully" });
    } catch (error) {
      console.error("Error deleting inventory count:", error);
      res.status(500).json({ message: "Failed to delete inventory count" });
    }
  });

  // Inventory count items routes
  app.get(
    "/api/inventory-counts/:id/items",
    isAuthenticated,
    async (req, res) => {
      try {
        const { id } = req.params;
        const items = await storage.getInventoryCountItems(id);
        res.json(items);
      } catch (error) {
        console.error("Error fetching inventory count items:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch inventory count items" });
      }
    },
  );

  app.put(
    "/api/inventory-count-items/:id",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { id } = req.params;
        const { countedQuantity, notes } = req.body;
        const userId = req.user.id;

        if (typeof countedQuantity !== "number" || countedQuantity < 0) {
          return res.status(400).json({ message: "Invalid counted quantity" });
        }

        const updated = await storage.updateInventoryCountItem(
          id,
          countedQuantity,
          notes,
          userId,
        );
        res.json(updated);
      } catch (error) {
        console.error("Error updating inventory count item:", error);
        res
          .status(500)
          .json({ message: "Failed to update inventory count item" });
      }
    },
  );

  app.get(
    "/api/inventory-counts/:id/deviations",
    isAuthenticated,
    async (req, res) => {
      try {
        const { id } = req.params;
        const deviations = await storage.getDeviationReport(id);
        res.json(deviations);
      } catch (error) {
        console.error("Error fetching deviation report:", error);
        res.status(500).json({ message: "Failed to fetch deviation report" });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}
