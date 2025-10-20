import {relations, sql} from 'drizzle-orm';
import {boolean, decimal, index, integer, jsonb, pgEnum, pgTable, text, timestamp, varchar,} from "drizzle-orm/pg-core";
import {createInsertSchema} from "drizzle-zod";
import {z} from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
    "sessions",
    {
        sid: varchar("sid").primaryKey(),
        sess: jsonb("sess").notNull(),
        expire: timestamp("expire").notNull(),
    },
    (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['admin', 'projektleiter', 'techniker']);

// Users table for E-Mail/Passwort Auth
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").notNull().unique(),
    passwordHash: varchar("password_hash").notNull(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    role: userRoleEnum("role").notNull().default('techniker'),
    forcePasswordChange: boolean("force_password_change").notNull().default(false),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    disabled: boolean("disabled").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Login attempts tracking (separate from users table for security)
export const loginAttempts = pgTable("login_attempts", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", {length: 255}).notNull().unique(),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    lastAttempt: timestamp("last_attempt").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Main categories
export const categories = pgTable("categories", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", {length: 100}).notNull(),
    code: varchar("code", {length: 10}).notNull().unique(), // BMA, EMA
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Sub-categories
export const subCategories = pgTable("sub_categories", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", {length: 100}).notNull(),
    categoryId: varchar("category_id").notNull().references(() => categories.id),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", {length: 100}).notNull(),
    costCentersIds: jsonb("cost_centers_ids").default({}), // JSON array of cost center IDs
    isActive: boolean("is_active").notNull().default(true),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Cost centers
export const costCenters = pgTable("cost_centers", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    code: varchar("code", {length: 50}).notNull().unique(), // KS-2024-001
    name: varchar("name", {length: 200}).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    customerId: varchar("customer_id").notNull().references(() => customers.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Articles
export const articles = pgTable("articles", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    articleNumber: varchar("article_number", {length: 50}).notNull().unique(),
    name: varchar("name", {length: 200}).notNull(),
    description: text("description"),
    categoryId: varchar("category_id").notNull().references(() => categories.id),
    subCategoryId: varchar("sub_category_id").references(() => subCategories.id),
    barcode: varchar("barcode", {length: 100}),
    qrCode: varchar("qr_code", {length: 100}),
    minimumStock: integer("minimum_stock").notNull().default(0),
    location: varchar("location", {length: 100}), // Lager A-12-3
    unitPrice: decimal("unit_price", {precision: 10, scale: 2}),
    createdBy: varchar("created_by").notNull().references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Current inventory levels
export const inventory = pgTable("inventory", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    articleId: varchar("article_id").notNull().references(() => articles.id),
    currentStock: integer("current_stock").notNull().default(0),
    reservedStock: integer("reserved_stock").notNull().default(0),
    lastUpdated: timestamp("last_updated").defaultNow(),
});

// Stock movement types
export const stockMovementTypeEnum = pgEnum('stock_movement_type', ['checkin', 'checkout', 'adjustment', 'transfer']);

// Inventory count status
export const inventoryCountStatusEnum = pgEnum('inventory_count_status', ['open', 'in_progress', 'completed', 'approved']);

// Stock movements (transactions)
export const stockMovements = pgTable("stock_movements", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    articleId: varchar("article_id").notNull().references(() => articles.id),
    type: stockMovementTypeEnum("type").notNull(),
    quantity: integer("quantity").notNull(),
    costCenterId: varchar("cost_center_id").references(() => costCenters.id), // Required for checkout
    userId: varchar("user_id").notNull().references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Inventory count sessions
export const inventoryCounts = pgTable("inventory_counts", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", {length: 200}).notNull(),
    description: text("description"),
    status: inventoryCountStatusEnum("status").notNull().default('open'),
    categoryId: varchar("category_id").references(() => categories.id), // Optional: count specific category
    locationFilter: varchar("location_filter", {length: 100}), // Optional: count specific location
    createdBy: varchar("created_by").notNull().references(() => users.id),
    approvedBy: varchar("approved_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    completedAt: timestamp("completed_at"),
    approvedAt: timestamp("approved_at"),
});

// Individual article counts within a count session
export const inventoryCountItems = pgTable("inventory_count_items", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    inventoryCountId: varchar("inventory_count_id").notNull().references(() => inventoryCounts.id),
    articleId: varchar("article_id").notNull().references(() => articles.id),
    expectedQuantity: integer("expected_quantity").notNull(), // What the system shows
    countedQuantity: integer("counted_quantity"), // What was physically counted
    deviation: integer("deviation").default(0), // counted – expected
    notes: text("notes"),
    countedBy: varchar("counted_by").references(() => users.id),
    countedAt: timestamp("counted_at"),
    createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const categoriesRelations = relations(categories, ({many}) => ({
    subCategories: many(subCategories),
    articles: many(articles),
}));

export const subCategoriesRelations = relations(subCategories, ({one, many}) => ({
    category: one(categories, {
        fields: [subCategories.categoryId],
        references: [categories.id],
    }),
    articles: many(articles),
}));

export const articlesRelations = relations(articles, ({one, many}) => ({
    category: one(categories, {
        fields: [articles.categoryId],
        references: [categories.id],
    }),
    subCategory: one(subCategories, {
        fields: [articles.subCategoryId],
        references: [subCategories.id],
    }),
    createdByUser: one(users, {
        fields: [articles.createdBy],
        references: [users.id],
    }),
    inventory: one(inventory, {
        fields: [articles.id],
        references: [inventory.articleId],
    }),
    stockMovements: many(stockMovements),
}));

export const inventoryRelations = relations(inventory, ({one}) => ({
    article: one(articles, {
        fields: [inventory.articleId],
        references: [articles.id],
    }),
}));

export const stockMovementsRelations = relations(stockMovements, ({one}) => ({
    article: one(articles, {
        fields: [stockMovements.articleId],
        references: [articles.id],
    }),
    costCenter: one(costCenters, {
        fields: [stockMovements.costCenterId],
        references: [costCenters.id],
    }),
    user: one(users, {
        fields: [stockMovements.userId],
        references: [users.id],
    }),
}));

export const customersRelations = relations(customers, ({many}) => ({
    costCenters: many(costCenters),
}));

export const costCentersRelations = relations(costCenters, ({many}) => ({
    stockMovements: many(stockMovements),
}));

export const usersRelations = relations(users, ({many}) => ({
    createdArticles: many(articles),
    stockMovements: many(stockMovements),
    createdInventoryCounts: many(inventoryCounts),
    approvedInventoryCounts: many(inventoryCounts),
    countedItems: many(inventoryCountItems),
}));

export const inventoryCountsRelations = relations(inventoryCounts, ({one, many}) => ({
    category: one(categories, {
        fields: [inventoryCounts.categoryId],
        references: [categories.id],
    }),
    createdByUser: one(users, {
        fields: [inventoryCounts.createdBy],
        references: [users.id],
    }),
    approvedByUser: one(users, {
        fields: [inventoryCounts.approvedBy],
        references: [users.id],
    }),
    items: many(inventoryCountItems),
}));

export const inventoryCountItemsRelations = relations(inventoryCountItems, ({one}) => ({
    inventoryCount: one(inventoryCounts, {
        fields: [inventoryCountItems.inventoryCountId],
        references: [inventoryCounts.id],
    }),
    article: one(articles, {
        fields: [inventoryCountItems.articleId],
        references: [articles.id],
    }),
    countedByUser: one(users, {
        fields: [inventoryCountItems.countedBy],
        references: [users.id],
    }),
}));

// Insert schemas
// User schemas for authentication
export const insertUserSchema = createInsertSchema(users).omit({
    id: true,
    passwordHash: true,
    createdAt: true,
    updatedAt: true,
});

// Schema for user registration (includes password validation)
export const registerUserSchema = z.object({
    email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben"),
    firstName: z.string().min(1, "Vorname ist erforderlich"),
    lastName: z.string().min(1, "Nachname ist erforderlich"),
    role: z.enum(['admin', 'projektleiter', 'techniker']).default('techniker'),
    forcePasswordChange: z.boolean().optional().default(false),
});

// Schema for user login
export const loginUserSchema = z.object({
    email: z.string().email("Gültige E-Mail-Adresse erforderlich"),
    password: z.string().min(1, "Passwort ist erforderlich"),
});

// Schema for password change
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Aktuelles Passwort ist erforderlich"),
    newPassword: z.string().min(8, "Neues Passwort muss mindestens 8 Zeichen haben"),
    confirmPassword: z.string().min(1, "Passwort-Bestätigung ist erforderlich"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein",
    path: ["confirmPassword"],
});

export const insertCategorySchema = createInsertSchema(categories).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertSubCategorySchema = createInsertSchema(subCategories).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
})

export const insertCostCenterSchema = createInsertSchema(costCenters).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const insertStockMovementSchema = createInsertSchema(stockMovements).omit({
    id: true,
    createdAt: true,
});

export const insertInventoryCountSchema = createInsertSchema(inventoryCounts).omit({
    id: true,
    createdAt: true,
    completedAt: true,
    approvedAt: true,
});

export const insertInventoryCountItemSchema = createInsertSchema(inventoryCountItems).omit({
    id: true,
    createdAt: true,
    countedAt: true,
    deviation: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type PublicUser = Omit<User, 'passwordHash'>; // Sicher für API responses und Relations
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type SubCategory = typeof subCategories.$inferSelect;
export type InsertSubCategory = z.infer<typeof insertSubCategorySchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type CostCenter = typeof costCenters.$inferSelect;
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;
export type Article = typeof articles.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type InsertStockMovement = z.infer<typeof insertStockMovementSchema>;
export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type InsertInventoryCount = z.infer<typeof insertInventoryCountSchema>;
export type InventoryCountItem = typeof inventoryCountItems.$inferSelect;
export type InsertInventoryCountItem = z.infer<typeof insertInventoryCountItemSchema>;

// Composite types for API responses
export type ArticleWithInventory = Article & {
    inventory: Inventory | null;
    category: Category;
    subCategory: SubCategory | null;
    createdByUser: PublicUser;
};

export type StockMovementWithDetails = StockMovement & {
    article: Article;
    costCenter: CostCenter | null;
    user: PublicUser;
};

// Report types
export type ReportFilter = {
    dateFrom?: string;
    dateTo?: string;
    categoryId?: string;
    subCategoryId?: string;
    costCenterId?: string;
    articleId?: string;
    userId?: string;
    movementType?: 'checkin' | 'checkout' | 'adjustment' | 'transfer';
};

export type InventoryReport = {
    articleId: string;
    articleNumber: string;
    articleName: string;
    categoryName: string;
    subCategoryName?: string;
    currentStock: number;
    minimumStock: number;
    unitPrice?: string;
    totalValue?: string;
    location?: string;
    lastMovementDate?: string;
    isLowStock: boolean;
};

export type StockMovementReport = StockMovementWithDetails & {
    categoryName: string;
    subCategoryName?: string;
    stockAfterMovement: number;
};

export type CategoryReport = {
    categoryId: string;
    categoryName: string;
    categoryCode: string;
    totalArticles: number;
    totalStock: number;
    totalValue: string;
    lowStockArticles: number;
};

// Inventory counting types
export type InventoryCountWithDetails = InventoryCount & {
    category?: Category;
    createdByUser: PublicUser;
    approvedByUser?: PublicUser;
    items: InventoryCountItemWithDetails[];
    totalItems: number;
    completedItems: number;
    totalDeviations: number;
    hasDeviations: boolean;
};

export type InventoryCountItemWithDetails = InventoryCountItem & {
    article: Article & {
        category: Category;
        subCategory?: SubCategory;
    };
    countedByUser?: PublicUser;
};
