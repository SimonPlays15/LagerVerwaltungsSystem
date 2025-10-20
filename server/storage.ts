import {
    type Article,
    articles,
    type ArticleWithInventory,
    categories,
    type Category,
    type CategoryReport,
    type CostCenter,
    costCenters,
    Customer,
    customers,
    type InsertArticle,
    type InsertCategory,
    type InsertCostCenter,
    InsertCustomer,
    type InsertInventoryCount,
    type InsertStockMovement,
    type InsertSubCategory,
    inventory,
    type Inventory,
    type InventoryCount,
    type InventoryCountItem,
    inventoryCountItems,
    type InventoryCountItemWithDetails,
    inventoryCounts,
    type InventoryCountWithDetails,
    type InventoryReport,
    loginAttempts,
    type PublicUser,
    type ReportFilter,
    type StockMovement,
    type StockMovementReport,
    stockMovements,
    type StockMovementWithDetails,
    subCategories,
    type SubCategory,
    type UpsertUser,
    type User,
    users,
} from "@shared/schema";
import {db} from "./db";
import {and, asc, desc, eq, gte, like, lt, lte, sql} from "drizzle-orm";

export class DependencyConflictError extends Error {
    public code = "DEPENDENCY_CONFLICT";
    public dependencyType: string;
    public dependencyCount: number;

    constructor(
        dependencyType: string,
        dependencyCount: number,
        message: string,
    ) {
        super(message);
        this.name = "DependencyConflictError";
        this.dependencyType = dependencyType;
        this.dependencyCount = dependencyCount;
    }
}

export interface IStorage {
    // User operations (E-Mail/Passwort Auth)
    getUser(id: string): Promise<User | undefined>;

    getPublicUser(id: string): Promise<PublicUser | undefined>;

    getUserByEmail(email: string): Promise<User | undefined>;

    createUser(user: UpsertUser): Promise<User>;

    upsertUser(user: UpsertUser): Promise<User>;

    getAllUsers(): Promise<User[]>;

    updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;

    deleteUser(id: string): Promise<void>;

    // Anti-Brute-Force operations (secure against user enumeration)
    incrementFailedLoginAttempts(
        email: string,
    ): Promise<{ isLocked: boolean; lockUntil?: Date }>;

    lockUserAccount(email: string, lockDuration: number): Promise<void>;

    isAccountLocked(
        email: string,
    ): Promise<{ isLocked: boolean; lockUntil?: Date }>;

    resetFailedLoginAttempts(email: string): Promise<void>;

    // Category operations
    getCategories(): Promise<Category[]>;

    createCategory(category: InsertCategory): Promise<Category>;

    updateCategory(
        id: string,
        category: Partial<InsertCategory>,
    ): Promise<Category>;

    deleteCategory(id: string): Promise<void>;

    getSubCategories(categoryId?: string): Promise<SubCategory[]>;

    createSubCategory(subCategory: InsertSubCategory): Promise<SubCategory>;

    updateSubCategory(
        id: string,
        subCategory: Partial<InsertSubCategory>,
    ): Promise<SubCategory>;

    deleteSubCategory(id: string): Promise<void>;

    // Customers operations
    getCustomers(): Promise<Customer[]>;

    createCustomer(customer: InsertCustomer): Promise<Customer>;

    updateCustomer(
        id: string,
        customer: Partial<InsertCustomer>,
    ): Promise<Customer>;

    deleteCustomer(id: string): Promise<void>;

    // Cost center operations
    getCostCenters(): Promise<CostCenter[]>;

    getActiveCostCenters(): Promise<CostCenter[]>;

    createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter>;

    updateCostCenter(
        id: string,
        costCenter: Partial<InsertCostCenter>,
    ): Promise<CostCenter>;

    deleteCostCenter(id: string): Promise<void>;

    // Article operations
    getArticles(): Promise<ArticleWithInventory[]>;

    getArticleByNumber(
        articleNumber: string,
    ): Promise<ArticleWithInventory | undefined>;

    getArticleByBarcode(
        barcode: string,
    ): Promise<ArticleWithInventory | undefined>;

    createArticle(article: InsertArticle): Promise<Article>;

    updateArticle(id: string, article: Partial<InsertArticle>): Promise<Article>;

    deleteArticle(id: string): Promise<void>;

    // Inventory operations
    getInventory(): Promise<Inventory[]>;

    getLowStockItems(): Promise<ArticleWithInventory[]>;

    updateStock(articleId: string, newStock: number): Promise<Inventory>;

    // Stock movement operations
    createStockMovement(movement: InsertStockMovement): Promise<StockMovement>;

    getStockMovements(limit?: number): Promise<StockMovementWithDetails[]>;

    getStockMovementsByArticle(
        articleId: string,
    ): Promise<StockMovementWithDetails[]>;

    // Dashboard statistics
    getDashboardStats(): Promise<{
        totalArticles: number;
        lowStockCount: number;
        todayMovements: number;
        activeCostCenters: number;
    }>;

    // Reporting operations
    getInventoryReport(filters?: ReportFilter): Promise<InventoryReport[]>;

    getStockMovementReport(
        filters?: ReportFilter,
    ): Promise<StockMovementReport[]>;

    getCategoryReport(): Promise<CategoryReport[]>;

    // Inventory counting operations
    getInventoryCounts(): Promise<InventoryCountWithDetails[]>;

    getInventoryCountById(
        id: string,
    ): Promise<InventoryCountWithDetails | undefined>;

    createInventoryCount(
        inventoryCount: InsertInventoryCount,
    ): Promise<InventoryCount>;

    updateInventoryCountStatus(
        id: string,
        status: "open" | "in_progress" | "completed" | "approved",
        userId?: string,
    ): Promise<InventoryCount>;

    deleteInventoryCount(id: string): Promise<void>;

    // Inventory count items operations
    getInventoryCountItems(
        inventoryCountId: string,
    ): Promise<InventoryCountItemWithDetails[]>;

    createInventoryCountItems(
        inventoryCountId: string,
        filters?: { categoryId?: string; locationFilter?: string },
    ): Promise<InventoryCountItem[]>;

    updateInventoryCountItem(
        id: string,
        countedQuantity: number,
        notes?: string,
        userId?: string,
    ): Promise<InventoryCountItem>;

    getDeviationReport(
        inventoryCountId: string,
    ): Promise<InventoryCountItemWithDetails[]>;
}

export class DatabaseStorage implements IStorage {
    // User operations
    async getUser(id: string): Promise<User | undefined> {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }

    async getUserByEmail(email: string): Promise<User | undefined> {
        const normalizedEmail = email.toLowerCase();
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail));
        return user;
    }

    async getPublicUser(id: string): Promise<PublicUser | undefined> {
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                firstName: users.firstName,
                lastName: users.lastName,
                profileImageUrl: users.profileImageUrl,
                role: users.role,
                forcePasswordChange: users.forcePasswordChange,
                failedLoginAttempts: users.failedLoginAttempts,
                lockedUntil: users.lockedUntil,
                disabled: users.disabled,
                createdAt: users.createdAt,
                updatedAt: users.updatedAt,
            })
            .from(users)
            .where(eq(users.id, id));
        return user;
    }

    async createUser(userData: UpsertUser): Promise<User> {
        const [user] = await db.insert(users).values(userData).returning();
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
        return db.select().from(users).orderBy(desc(users.createdAt));
    }

    async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
        const [updated] = await db
            .update(users)
            .set({...userData, updatedAt: new Date()})
            .where(eq(users.id, id))
            .returning();
        return updated;
    }

    async deleteUser(id: string): Promise<void> {
        // Check for dependent articles (created by this user)
        const dependentArticles = await db
            .select()
            .from(articles)
            .where(eq(articles.createdBy, id));

        if (dependentArticles.length > 0) {
            throw new DependencyConflictError(
                "articles",
                dependentArticles.length,
                `Cannot delete user: ${dependentArticles.length} articles were created by this user`,
            );
        }

        // Check for dependent stock movements (performed by this user)
        const dependentMovements = await db
            .select()
            .from(stockMovements)
            .where(eq(stockMovements.userId, id));

        if (dependentMovements.length > 0) {
            throw new DependencyConflictError(
                "stock_movements",
                dependentMovements.length,
                `Cannot delete user: ${dependentMovements.length} stock movements were performed by this user`,
            );
        }

        await db.delete(users).where(eq(users.id, id));
    }

    // Category operations
    async getCategories(): Promise<Category[]> {
        return db.select().from(categories).orderBy(asc(categories.name));
    }

    async createCategory(category: InsertCategory): Promise<Category> {
        const [created] = await db.insert(categories).values(category).returning();
        return created;
    }

    async getSubCategories(categoryId?: string): Promise<SubCategory[]> {
        const query = db.select().from(subCategories);
        if (categoryId) {
            return query
                .where(eq(subCategories.categoryId, categoryId))
                .orderBy(asc(subCategories.name));
        }
        return query.orderBy(asc(subCategories.name));
    }

    async createSubCategory(
        subCategory: InsertSubCategory,
    ): Promise<SubCategory> {
        const [created] = await db
            .insert(subCategories)
            .values(subCategory)
            .returning();
        return created;
    }

    async updateCategory(
        id: string,
        category: Partial<InsertCategory>,
    ): Promise<Category> {
        const [updated] = await db
            .update(categories)
            .set({...category, updatedAt: new Date()})
            .where(eq(categories.id, id))
            .returning();
        return updated;
    }

    async deleteCategory(id: string): Promise<void> {
        // Check for dependent subcategories
        const dependentSubCategories = await db
            .select()
            .from(subCategories)
            .where(eq(subCategories.categoryId, id));

        if (dependentSubCategories.length > 0) {
            throw new DependencyConflictError(
                "subcategories",
                dependentSubCategories.length,
                `Cannot delete category: ${dependentSubCategories.length} subcategories depend on it`,
            );
        }

        // Check for dependent articles
        const dependentArticles = await db
            .select()
            .from(articles)
            .where(eq(articles.categoryId, id));

        if (dependentArticles.length > 0) {
            throw new DependencyConflictError(
                "articles",
                dependentArticles.length,
                `Cannot delete category: ${dependentArticles.length} articles depend on it`,
            );
        }

        await db.delete(categories).where(eq(categories.id, id));
    }

    async updateSubCategory(
        id: string,
        subCategory: Partial<InsertSubCategory>,
    ): Promise<SubCategory> {
        const [updated] = await db
            .update(subCategories)
            .set({...subCategory, updatedAt: new Date()})
            .where(eq(subCategories.id, id))
            .returning();
        return updated;
    }

    async deleteSubCategory(id: string): Promise<void> {
        // Check for dependent articles
        const dependentArticles = await db
            .select()
            .from(articles)
            .where(eq(articles.subCategoryId, id));

        if (dependentArticles.length > 0) {
            throw new DependencyConflictError(
                "articles",
                dependentArticles.length,
                `Cannot delete subcategory: ${dependentArticles.length} articles depend on it`,
            );
        }

        await db.delete(subCategories).where(eq(subCategories.id, id));
    }

    // Customer operations
    async getCustomers(): Promise<Customer[]> {
        return db
            .select()
            .from(customers)
            .orderBy(desc(customers.createdAt));
    }

    async getActiveCustomers(): Promise<Customer[]> {
        return db
            .select()
            .from(customers)
            .where(eq(customers.isActive, true))
            .orderBy(desc(customers.createdAt));
    }

    async createCustomer(customer: InsertCustomer): Promise<Customer> {
        const [created] = await db
            .insert(customers)
            .values(customer)
            .returning();
        return created;
    }

    async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer> {
        const [updated] = await db
            .update(customers)
            .set(customer)
            .where(eq(customers.id, id))
            .returning();
        return updated;
    }

    async deleteCustomer(id: string): Promise<void> {
        // Delete all Cost Centers associated with this customer
        await db.delete(costCenters).where(eq(costCenters.customerId, id));
        await db.delete(customers).where(eq(customers.id, id));
    }

    // Cost center operations
    async getCostCenters(): Promise<CostCenter[]> {
        return db
            .select()
            .from(costCenters)
            .orderBy(desc(costCenters.createdAt));
    }

    async getActiveCostCenters(): Promise<CostCenter[]> {
        return db
            .select()
            .from(costCenters)
            .where(eq(costCenters.isActive, true))
            .orderBy(asc(costCenters.code));
    }

    async createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter> {
        const [created] = await db
            .insert(costCenters)
            .values(costCenter)
            .returning();
        return created;
    }

    async updateCostCenter(
        id: string,
        costCenter: Partial<InsertCostCenter>,
    ): Promise<CostCenter> {
        const [updated] = await db
            .update(costCenters)
            .set({...costCenter, updatedAt: new Date()})
            .where(eq(costCenters.id, id))
            .returning();
        return updated;
    }

    async deleteCostCenter(id: string): Promise<void> {
        // Check for dependent stock movements
        const dependentMovements = await db
            .select()
            .from(stockMovements)
            .where(eq(stockMovements.costCenterId, id));

        if (dependentMovements.length > 0) {
            throw new DependencyConflictError(
                "stock_movements",
                dependentMovements.length,
                `Cannot delete cost center: ${dependentMovements.length} stock movements depend on it`,
            );
        }

        await db.delete(costCenters).where(eq(costCenters.id, id));
    }

    // Article operations
    async getArticles(): Promise<ArticleWithInventory[]> {
        return db
            .select({
                id: articles.id,
                articleNumber: articles.articleNumber,
                name: articles.name,
                description: articles.description,
                categoryId: articles.categoryId,
                subCategoryId: articles.subCategoryId,
                barcode: articles.barcode,
                qrCode: articles.qrCode,
                minimumStock: articles.minimumStock,
                location: articles.location,
                unitPrice: articles.unitPrice,
                createdBy: articles.createdBy,
                createdAt: articles.createdAt,
                updatedAt: articles.updatedAt,
                inventory: {
                    id: inventory.id,
                    articleId: inventory.articleId,
                    currentStock: inventory.currentStock,
                    reservedStock: inventory.reservedStock,
                    lastUpdated: inventory.lastUpdated,
                },
                category: {
                    id: categories.id,
                    name: categories.name,
                    code: categories.code,
                    description: categories.description,
                    createdAt: categories.createdAt,
                    updatedAt: categories.updatedAt,
                },
                subCategory: {
                    id: subCategories.id,
                    name: subCategories.name,
                    categoryId: subCategories.categoryId,
                    description: subCategories.description,
                    createdAt: subCategories.createdAt,
                    updatedAt: subCategories.updatedAt,
                },
                createdByUser: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    profileImageUrl: users.profileImageUrl,
                    role: users.role,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    forcePasswordChange: users.forcePasswordChange,
                    failedLoginAttempts: users.failedLoginAttempts,
                    lockedUntil: users.lockedUntil,
                    disabled: users.disabled,
                },
            })
            .from(articles)
            .leftJoin(inventory, eq(articles.id, inventory.articleId))
            .innerJoin(categories, eq(articles.categoryId, categories.id))
            .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id))
            .innerJoin(users, eq(articles.createdBy, users.id))
            .orderBy(desc(articles.createdAt));
    }

    async getArticleByNumber(
        articleNumber: string,
    ): Promise<ArticleWithInventory | undefined> {
        const results = await db
            .select({
                id: articles.id,
                articleNumber: articles.articleNumber,
                name: articles.name,
                description: articles.description,
                categoryId: articles.categoryId,
                subCategoryId: articles.subCategoryId,
                barcode: articles.barcode,
                qrCode: articles.qrCode,
                minimumStock: articles.minimumStock,
                location: articles.location,
                unitPrice: articles.unitPrice,
                createdBy: articles.createdBy,
                createdAt: articles.createdAt,
                updatedAt: articles.updatedAt,
                inventory: {
                    id: inventory.id,
                    articleId: inventory.articleId,
                    currentStock: inventory.currentStock,
                    reservedStock: inventory.reservedStock,
                    lastUpdated: inventory.lastUpdated,
                },
                category: {
                    id: categories.id,
                    name: categories.name,
                    code: categories.code,
                    description: categories.description,
                    createdAt: categories.createdAt,
                    updatedAt: categories.updatedAt,
                },
                subCategory: {
                    id: subCategories.id,
                    name: subCategories.name,
                    categoryId: subCategories.categoryId,
                    description: subCategories.description,
                    createdAt: subCategories.createdAt,
                    updatedAt: subCategories.updatedAt,
                },
                createdByUser: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    profileImageUrl: users.profileImageUrl,
                    role: users.role,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    forcePasswordChange: users.forcePasswordChange,
                    failedLoginAttempts: users.failedLoginAttempts,
                    lockedUntil: users.lockedUntil,
                    disabled: users.disabled,
                },
            })
            .from(articles)
            .leftJoin(inventory, eq(articles.id, inventory.articleId))
            .innerJoin(categories, eq(articles.categoryId, categories.id))
            .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id))
            .innerJoin(users, eq(articles.createdBy, users.id))
            .where(eq(articles.articleNumber, articleNumber))
            .limit(1);

        return results[0];
    }

    async getArticleByBarcode(
        barcode: string,
    ): Promise<ArticleWithInventory | undefined> {
        const results = await db
            .select({
                id: articles.id,
                articleNumber: articles.articleNumber,
                name: articles.name,
                description: articles.description,
                categoryId: articles.categoryId,
                subCategoryId: articles.subCategoryId,
                barcode: articles.barcode,
                qrCode: articles.qrCode,
                minimumStock: articles.minimumStock,
                location: articles.location,
                unitPrice: articles.unitPrice,
                createdBy: articles.createdBy,
                createdAt: articles.createdAt,
                updatedAt: articles.updatedAt,
                inventory: {
                    id: inventory.id,
                    articleId: inventory.articleId,
                    currentStock: inventory.currentStock,
                    reservedStock: inventory.reservedStock,
                    lastUpdated: inventory.lastUpdated,
                },
                category: {
                    id: categories.id,
                    name: categories.name,
                    code: categories.code,
                    description: categories.description,
                    createdAt: categories.createdAt,
                    updatedAt: categories.updatedAt,
                },
                subCategory: {
                    id: subCategories.id,
                    name: subCategories.name,
                    categoryId: subCategories.categoryId,
                    description: subCategories.description,
                    createdAt: subCategories.createdAt,
                    updatedAt: subCategories.updatedAt,
                },
                createdByUser: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    profileImageUrl: users.profileImageUrl,
                    role: users.role,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    forcePasswordChange: users.forcePasswordChange,
                    failedLoginAttempts: users.failedLoginAttempts,
                    lockedUntil: users.lockedUntil,
                    disabled: users.disabled,
                },
            })
            .from(articles)
            .leftJoin(inventory, eq(articles.id, inventory.articleId))
            .innerJoin(categories, eq(articles.categoryId, categories.id))
            .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id))
            .innerJoin(users, eq(articles.createdBy, users.id))
            .where(eq(articles.barcode, barcode))
            .limit(1);

        return results[0];
    }

    async createArticle(article: InsertArticle): Promise<Article> {
        const [created] = await db.insert(articles).values(article).returning();

        // Create an initial inventory entry
        await db.insert(inventory).values({
            articleId: created.id,
            currentStock: 0,
            reservedStock: 0,
        });

        return created;
    }

    async updateArticle(
        id: string,
        article: Partial<InsertArticle>,
    ): Promise<Article> {
        const [updated] = await db
            .update(articles)
            .set({...article, updatedAt: new Date()})
            .where(eq(articles.id, id))
            .returning();
        return updated;
    }

    async deleteArticle(id: string): Promise<void> {
        await db.delete(inventory).where(eq(inventory.articleId, id));
        await db.delete(articles).where(eq(articles.id, id));
    }

    // Inventory operations
    async getInventory(): Promise<Inventory[]> {
        return db.select().from(inventory);
    }

    async getLowStockItems(): Promise<ArticleWithInventory[]> {
        return db
            .select({
                id: articles.id,
                articleNumber: articles.articleNumber,
                name: articles.name,
                description: articles.description,
                categoryId: articles.categoryId,
                subCategoryId: articles.subCategoryId,
                barcode: articles.barcode,
                qrCode: articles.qrCode,
                minimumStock: articles.minimumStock,
                location: articles.location,
                unitPrice: articles.unitPrice,
                createdBy: articles.createdBy,
                createdAt: articles.createdAt,
                updatedAt: articles.updatedAt,
                inventory: {
                    id: inventory.id,
                    articleId: inventory.articleId,
                    currentStock: inventory.currentStock,
                    reservedStock: inventory.reservedStock,
                    lastUpdated: inventory.lastUpdated,
                },
                category: {
                    id: categories.id,
                    name: categories.name,
                    code: categories.code,
                    description: categories.description,
                    createdAt: categories.createdAt,
                    updatedAt: categories.updatedAt,
                },
                subCategory: {
                    id: subCategories.id,
                    name: subCategories.name,
                    categoryId: subCategories.categoryId,
                    description: subCategories.description,
                    createdAt: subCategories.createdAt,
                    updatedAt: subCategories.updatedAt,
                },
                createdByUser: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    profileImageUrl: users.profileImageUrl,
                    role: users.role,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    forcePasswordChange: users.forcePasswordChange,
                    failedLoginAttempts: users.failedLoginAttempts,
                    lockedUntil: users.lockedUntil,
                    disabled: users.disabled,
                },
            })
            .from(articles)
            .innerJoin(inventory, eq(articles.id, inventory.articleId))
            .innerJoin(categories, eq(articles.categoryId, categories.id))
            .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id))
            .innerJoin(users, eq(articles.createdBy, users.id))
            .where(lt(inventory.currentStock, articles.minimumStock));
    }

    async updateStock(articleId: string, newStock: number): Promise<Inventory> {
        const [updated] = await db
            .update(inventory)
            .set({
                currentStock: newStock,
                lastUpdated: new Date(),
            })
            .where(eq(inventory.articleId, articleId))
            .returning();
        return updated;
    }

    // Stock movement operations
    async createStockMovement(
        movement: InsertStockMovement,
    ): Promise<StockMovement> {
        // Validate quantity is positive
        if (movement.quantity <= 0) {
            throw new Error("Quantity must be positive");
        }

        // Get current inventory
        const [currentInventory] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.articleId, movement.articleId));

        if (!currentInventory) {
            throw new Error("Article inventory not found");
        }

        // For checkout operations, prevent stock underflow
        if (
            movement.type === "checkout" &&
            currentInventory.currentStock < movement.quantity
        ) {
            throw new Error(
                `Insufficient stock. Available: ${currentInventory.currentStock}, Requested: ${movement.quantity}`,
            );
        }

        // Create the stock movement
        const [created] = await db
            .insert(stockMovements)
            .values(movement)
            .returning();

        // Update inventory based on a movement type
        let newStock = currentInventory.currentStock;

        if (movement.type === "checkin" || movement.type === "adjustment") {
            newStock += movement.quantity;
        } else if (movement.type === "checkout") {
            newStock -= movement.quantity;
        }

        await this.updateStock(movement.articleId, newStock);

        return created;
    }

    async getStockMovements(limit = 50): Promise<StockMovementWithDetails[]> {
        return db
            .select({
                id: stockMovements.id,
                articleId: stockMovements.articleId,
                type: stockMovements.type,
                quantity: stockMovements.quantity,
                costCenterId: stockMovements.costCenterId,
                userId: stockMovements.userId,
                notes: stockMovements.notes,
                createdAt: stockMovements.createdAt,
                article: {
                    id: articles.id,
                    articleNumber: articles.articleNumber,
                    name: articles.name,
                    description: articles.description,
                    categoryId: articles.categoryId,
                    subCategoryId: articles.subCategoryId,
                    barcode: articles.barcode,
                    qrCode: articles.qrCode,
                    minimumStock: articles.minimumStock,
                    location: articles.location,
                    unitPrice: articles.unitPrice,
                    createdBy: articles.createdBy,
                    createdAt: articles.createdAt,
                    updatedAt: articles.updatedAt,
                },
                costCenter: {
                    id: costCenters.id,
                    code: costCenters.code,
                    name: costCenters.name,
                    description: costCenters.description,
                    isActive: costCenters.isActive,
                    createdAt: costCenters.createdAt,
                    updatedAt: costCenters.updatedAt,
                },
                user: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    profileImageUrl: users.profileImageUrl,
                    role: users.role,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    forcePasswordChange: users.forcePasswordChange,
                    failedLoginAttempts: users.failedLoginAttempts,
                    lockedUntil: users.lockedUntil,
                    disabled: users.disabled,
                },
            })
            .from(stockMovements)
            .innerJoin(articles, eq(stockMovements.articleId, articles.id))
            .leftJoin(costCenters, eq(stockMovements.costCenterId, costCenters.id))
            .innerJoin(users, eq(stockMovements.userId, users.id))
            .orderBy(desc(stockMovements.createdAt))
            .limit(limit);
    }

    async getStockMovementsByArticle(
        articleId: string,
    ): Promise<StockMovementWithDetails[]> {
        return db
            .select({
                id: stockMovements.id,
                articleId: stockMovements.articleId,
                type: stockMovements.type,
                quantity: stockMovements.quantity,
                costCenterId: stockMovements.costCenterId,
                userId: stockMovements.userId,
                notes: stockMovements.notes,
                createdAt: stockMovements.createdAt,
                article: {
                    id: articles.id,
                    articleNumber: articles.articleNumber,
                    name: articles.name,
                    description: articles.description,
                    categoryId: articles.categoryId,
                    subCategoryId: articles.subCategoryId,
                    barcode: articles.barcode,
                    qrCode: articles.qrCode,
                    minimumStock: articles.minimumStock,
                    location: articles.location,
                    unitPrice: articles.unitPrice,
                    createdBy: articles.createdBy,
                    createdAt: articles.createdAt,
                    updatedAt: articles.updatedAt,
                },
                costCenter: {
                    id: costCenters.id,
                    code: costCenters.code,
                    name: costCenters.name,
                    description: costCenters.description,
                    isActive: costCenters.isActive,
                    createdAt: costCenters.createdAt,
                    updatedAt: costCenters.updatedAt,
                },
                user: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    profileImageUrl: users.profileImageUrl,
                    role: users.role,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    forcePasswordChange: users.forcePasswordChange,
                    failedLoginAttempts: users.failedLoginAttempts,
                    lockedUntil: users.lockedUntil,
                    disabled: users.disabled,
                },
            })
            .from(stockMovements)
            .innerJoin(articles, eq(stockMovements.articleId, articles.id))
            .leftJoin(costCenters, eq(stockMovements.costCenterId, costCenters.id))
            .innerJoin(users, eq(stockMovements.userId, users.id))
            .where(eq(stockMovements.articleId, articleId))
            .orderBy(desc(stockMovements.createdAt));
    }

    async getDashboardStats(): Promise<{
        totalArticles: number;
        lowStockCount: number;
        todayMovements: number;
        activeCostCenters: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalArticles] = await db
            .select({
                count: sql<number>`count
                (*)`
            })
            .from(articles);

        const [lowStockCount] = await db
            .select({count: sql<number>`count(*)`})
            .from(articles)
            .innerJoin(inventory, eq(articles.id, inventory.articleId))
            .where(lt(inventory.currentStock, articles.minimumStock));

        const [todayMovements] = await db
            .select({count: sql<number>`count(*)`})
            .from(stockMovements)
            .where(gte(stockMovements.createdAt, today));

        const [activeCostCenters] = await db
            .select({count: sql<number>`count(*)`})
            .from(costCenters)
            .where(eq(costCenters.isActive, true));

        return {
            totalArticles: totalArticles.count,
            lowStockCount: lowStockCount.count,
            todayMovements: todayMovements.count,
            activeCostCenters: activeCostCenters.count,
        };
    }

    // Reporting functionality
    async getInventoryReport(
        filters: ReportFilter = {},
    ): Promise<InventoryReport[]> {
        let query = db
            .select({
                articleId: articles.id,
                articleNumber: articles.articleNumber,
                articleName: articles.name,
                categoryName: categories.name,
                subCategoryName: subCategories.name,
                currentStock: inventory.currentStock,
                minimumStock: articles.minimumStock,
                unitPrice: articles.unitPrice,
                location: articles.location,
                lastMovementDate: sql<string>`(
          SELECT MAX(created_at) 
          FROM stock_movements 
          WHERE article_id = ${articles.id}
        )`,
            })
            .from(articles)
            .innerJoin(inventory, eq(articles.id, inventory.articleId))
            .innerJoin(categories, eq(articles.categoryId, categories.id))
            .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id));

        // Apply filters
        const conditions = [];
        if (filters.categoryId) {
            conditions.push(eq(articles.categoryId, filters.categoryId));
        }
        if (filters.subCategoryId) {
            conditions.push(eq(articles.subCategoryId, filters.subCategoryId));
        }
        if (filters.articleId) {
            conditions.push(eq(articles.id, filters.articleId));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as any;
        }

        const results = await query;

        return results.map((row) => ({
            articleId: row.articleId,
            articleNumber: row.articleNumber,
            articleName: row.articleName,
            categoryName: row.categoryName,
            subCategoryName: row.subCategoryName || undefined,
            currentStock: row.currentStock,
            minimumStock: row.minimumStock,
            unitPrice: row.unitPrice || undefined,
            totalValue: row.unitPrice
                ? (parseFloat(row.unitPrice) * row.currentStock).toFixed(2)
                : undefined,
            location: row.location || undefined,
            lastMovementDate: row.lastMovementDate || undefined,
            isLowStock: row.currentStock < row.minimumStock,
        }));
    }

    async getStockMovementReport(
        filters: ReportFilter = {},
    ): Promise<StockMovementReport[]> {
        let query = db
            .select({
                id: stockMovements.id,
                articleId: stockMovements.articleId,
                type: stockMovements.type,
                quantity: stockMovements.quantity,
                costCenterId: stockMovements.costCenterId,
                userId: stockMovements.userId,
                notes: stockMovements.notes,
                createdAt: stockMovements.createdAt,
                article: {
                    id: articles.id,
                    articleNumber: articles.articleNumber,
                    name: articles.name,
                    description: articles.description,
                    categoryId: articles.categoryId,
                    subCategoryId: articles.subCategoryId,
                    barcode: articles.barcode,
                    qrCode: articles.qrCode,
                    minimumStock: articles.minimumStock,
                    location: articles.location,
                    unitPrice: articles.unitPrice,
                    createdBy: articles.createdBy,
                    createdAt: articles.createdAt,
                    updatedAt: articles.updatedAt,
                },
                costCenter: {
                    id: costCenters.id,
                    code: costCenters.code,
                    name: costCenters.name,
                    description: costCenters.description,
                    isActive: costCenters.isActive,
                    createdAt: costCenters.createdAt,
                    updatedAt: costCenters.updatedAt,
                },
                user: {
                    id: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    profileImageUrl: users.profileImageUrl,
                    role: users.role,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    forcePasswordChange: users.forcePasswordChange,
                    failedLoginAttempts: users.failedLoginAttempts,
                    lockedUntil: users.lockedUntil,
                    disabled: users.disabled,
                },
                categoryName: categories.name,
                subCategoryName: subCategories.name,
            })
            .from(stockMovements)
            .innerJoin(articles, eq(stockMovements.articleId, articles.id))
            .innerJoin(categories, eq(articles.categoryId, categories.id))
            .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id))
            .leftJoin(costCenters, eq(stockMovements.costCenterId, costCenters.id))
            .innerJoin(users, eq(stockMovements.userId, users.id));

        // Apply filters
        const conditions: any[] = [];
        if (filters.dateFrom) {
            conditions.push(
                gte(stockMovements.createdAt, new Date(filters.dateFrom)),
            );
        }
        if (filters.dateTo) {
            const endDate = new Date(filters.dateTo);
            endDate.setHours(23, 59, 59, 999);
            conditions.push(lte(stockMovements.createdAt, endDate));
        }
        if (filters.categoryId) {
            conditions.push(eq(articles.categoryId, filters.categoryId));
        }
        if (filters.subCategoryId) {
            conditions.push(eq(articles.subCategoryId, filters.subCategoryId));
        }
        if (filters.costCenterId) {
            conditions.push(eq(stockMovements.costCenterId, filters.costCenterId));
        }
        if (filters.articleId) {
            conditions.push(eq(stockMovements.articleId, filters.articleId));
        }
        if (filters.userId) {
            conditions.push(eq(stockMovements.userId, filters.userId));
        }
        if (filters.movementType) {
            conditions.push(eq(stockMovements.type, filters.movementType));
        }

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as any;
        }

        const results = await query.orderBy(desc(stockMovements.createdAt));
        return results.map((row) => ({
            ...row,
            categoryName: row.categoryName,
            subCategoryName: row.subCategoryName || undefined,
            stockAfterMovement: 0, // Will be calculated by adding running totals
        }));
    }

    async getCategoryReport(): Promise<CategoryReport[]> {
        return db
            .select({
                categoryId: categories.id,
                categoryName: categories.name,
                categoryCode: categories.code,
                totalArticles: sql<number>`count(distinct ${articles.id})`,
                totalStock: sql<number>`coalesce(sum(${inventory.currentStock}), 0)`,
                totalValue: sql<string>`coalesce(sum(${inventory.currentStock} * coalesce(${articles.unitPrice}, 0)), 0)`,
                lowStockArticles: sql<number>`count(distinct case when ${inventory.currentStock} < ${articles.minimumStock} then ${articles.id} end)`,
            })
            .from(categories)
            .leftJoin(articles, eq(categories.id, articles.categoryId))
            .leftJoin(inventory, eq(articles.id, inventory.articleId))
            .groupBy(categories.id, categories.name, categories.code)
            .orderBy(categories.name);
    }

    // Inventory counting operations
    async getInventoryCounts(): Promise<InventoryCountWithDetails[]> {
        const results = await db
            .select({
                inventoryCount: inventoryCounts,
                category: categories,
                createdByUser: users,
                approvedByUser: {
                    id: sql<string>`approved_user.id`,
                    email: sql<string>`approved_user.email`,
                    firstName: sql<string>`approved_user.first_name`,
                    lastName: sql<string>`approved_user.last_name`,
                    role: sql<string>`approved_user.role`,
                },
            })
            .from(inventoryCounts)
            .leftJoin(categories, eq(inventoryCounts.categoryId, categories.id))
            .leftJoin(users, eq(inventoryCounts.createdBy, users.id))
            .leftJoin(
                sql`users as approved_user`,
                sql`${inventoryCounts.approvedBy} = approved_user.id`,
            )
            .orderBy(desc(inventoryCounts.createdAt));

        return await Promise.all(
            results.map(async (result) => {
                const items = await this.getInventoryCountItems(
                    result.inventoryCount.id,
                );
                const totalItems = items.length;
                const completedItems = items.filter(
                    (item) => item.countedQuantity !== null,
                ).length;
                const totalDeviations = items.reduce(
                    (sum, item) => sum + Math.abs(item.deviation || 0),
                    0,
                );
                const hasDeviations = items.some((item) => (item.deviation || 0) !== 0);

                return {
                    ...result.inventoryCount,
                    category: result.category || undefined,
                    createdByUser: result.createdByUser,
                    approvedByUser: result.approvedByUser || undefined,
                    items,
                    totalItems,
                    completedItems,
                    totalDeviations,
                    hasDeviations,
                };
            }),
        );
    }

    async getInventoryCountById(
        id: string,
    ): Promise<InventoryCountWithDetails | undefined> {
        const [result] = await db
            .select({
                inventoryCount: inventoryCounts,
                category: categories,
                createdByUser: users,
                approvedByUser: {
                    id: sql<string>`approved_user.id`,
                    email: sql<string>`approved_user.email`,
                    firstName: sql<string>`approved_user.first_name`,
                    lastName: sql<string>`approved_user.last_name`,
                    role: sql<string>`approved_user.role`,
                },
            })
            .from(inventoryCounts)
            .leftJoin(categories, eq(inventoryCounts.categoryId, categories.id))
            .leftJoin(users, eq(inventoryCounts.createdBy, users.id))
            .leftJoin(
                sql`users as approved_user`,
                sql`${inventoryCounts.approvedBy} = approved_user.id`,
            )
            .where(eq(inventoryCounts.id, id));

        if (!result) return undefined;

        const items = await this.getInventoryCountItems(id);
        const totalItems = items.length;
        const completedItems = items.filter(
            (item) => item.countedQuantity !== null,
        ).length;
        const totalDeviations = items.reduce(
            (sum, item) => sum + Math.abs(item.deviation || 0),
            0,
        );
        const hasDeviations = items.some((item) => (item.deviation || 0) !== 0);

        return {
            ...result.inventoryCount,
            category: result.category || undefined,
            createdByUser: result.createdByUser,
            approvedByUser: result.approvedByUser || undefined,
            items,
            totalItems,
            completedItems,
            totalDeviations,
            hasDeviations,
        };
    }

    async createInventoryCount(
        inventoryCountData: InsertInventoryCount,
    ): Promise<InventoryCount> {
        const [created] = await db
            .insert(inventoryCounts)
            .values(inventoryCountData)
            .returning();
        return created;
    }

    async updateInventoryCountStatus(
        id: string,
        status: "open" | "in_progress" | "completed" | "approved",
        userId?: string,
    ): Promise<InventoryCount> {
        const updateData: any = {status};

        if (status === "completed") {
            updateData.completedAt = new Date();
        } else if (status === "approved" && userId) {
            updateData.approvedBy = userId;
            updateData.approvedAt = new Date();
        }

        const [updated] = await db
            .update(inventoryCounts)
            .set(updateData)
            .where(eq(inventoryCounts.id, id))
            .returning();

        return updated;
    }

    async deleteInventoryCount(id: string): Promise<void> {
        // First delete an all items
        await db
            .delete(inventoryCountItems)
            .where(eq(inventoryCountItems.inventoryCountId, id));
        // Then delete the count session
        await db.delete(inventoryCounts).where(eq(inventoryCounts.id, id));
    }

    // Inventory count items operations
    async getInventoryCountItems(
        inventoryCountId: string,
    ): Promise<InventoryCountItemWithDetails[]> {
        const results = await db
            .select({
                item: inventoryCountItems,
                article: articles,
                category: categories,
                subCategory: subCategories,
                countedByUser: {
                    id: sql<string>`counted_user.id`,
                    email: sql<string>`counted_user.email`,
                    firstName: sql<string>`counted_user.first_name`,
                    lastName: sql<string>`counted_user.last_name`,
                    role: sql<string>`counted_user.role`,
                },
            })
            .from(inventoryCountItems)
            .leftJoin(articles, eq(inventoryCountItems.articleId, articles.id))
            .leftJoin(categories, eq(articles.categoryId, categories.id))
            .leftJoin(subCategories, eq(articles.subCategoryId, subCategories.id))
            .leftJoin(
                sql`users as counted_user`,
                sql`${inventoryCountItems.countedBy} = counted_user.id`,
            )
            .where(eq(inventoryCountItems.inventoryCountId, inventoryCountId))
            .orderBy(articles.articleNumber);

        return results.map((result) => ({
            ...result.item,
            article: {
                ...result.article,
                category: result.category,
                subCategory: result.subCategory || undefined,
            },
            countedByUser: result.countedByUser || undefined,
        }));
    }

    async createInventoryCountItems(
        inventoryCountId: string,
        filters?: { categoryId?: string; locationFilter?: string },
    ): Promise<InventoryCountItem[]> {
        // First get a the articles to include in the count
        let query = db
            .select({
                article: articles,
                currentStock: inventory.currentStock,
            })
            .from(articles)
            .leftJoin(inventory, eq(articles.id, inventory.articleId));

        if (filters?.categoryId) {
            query = query.where(eq(articles.categoryId, filters.categoryId));
        }

        if (filters?.locationFilter) {
            query = query.where(
                like(articles.location, `%${filters.locationFilter}%`),
            );
        }

        const articlesToCount = await query;

        // Create count items for each article
        const countItems = articlesToCount.map((item) => ({
            inventoryCountId,
            articleId: item.article.id,
            expectedQuantity: item.currentStock || 0,
        }));

        if (countItems.length === 0) {
            return [];
        }

        return db.insert(inventoryCountItems).values(countItems).returning();
    }

    async updateInventoryCountItem(
        id: string,
        countedQuantity: number,
        notes?: string,
        userId?: string,
    ): Promise<InventoryCountItem> {
        // Get the current item to calculate deviation
        const [currentItem] = await db
            .select()
            .from(inventoryCountItems)
            .where(eq(inventoryCountItems.id, id));

        if (!currentItem) {
            throw new Error("Inventory count item not found");
        }

        const deviation = countedQuantity - currentItem.expectedQuantity;

        const [updated] = await db
            .update(inventoryCountItems)
            .set({
                countedQuantity,
                deviation,
                notes,
                countedBy: userId,
                countedAt: new Date(),
            })
            .where(eq(inventoryCountItems.id, id))
            .returning();

        return updated;
    }

    async getDeviationReport(
        inventoryCountId: string,
    ): Promise<InventoryCountItemWithDetails[]> {
        const items = await this.getInventoryCountItems(inventoryCountId);
        // Return only items with deviations
        return items.filter(
            (item) => item.deviation !== null && item.deviation !== 0,
        );
    }

    // Anti-Brute-Force operations (secure against user enumeration)
    async incrementFailedLoginAttempts(
        email: string,
    ): Promise<{ isLocked: boolean; lockUntil?: Date }> {
        const normalizedEmail = email.toLowerCase();

        // Get or create a login attempt record (works for both existing and non-existing users)
        let [attempt] = await db
            .select()
            .from(loginAttempts)
            .where(eq(loginAttempts.email, normalizedEmail));

        if (!attempt) {
            // Create a new attempt record
            [attempt] = await db
                .insert(loginAttempts)
                .values({
                    email: normalizedEmail,
                    failedAttempts: 1,
                    lastAttempt: new Date(),
                })
                .returning();

            return {isLocked: false};
        }

        const newAttempts = attempt.failedAttempts + 1;
        const lockUntil =
            newAttempts >= 5
                ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
                : null;

        await db
            .update(loginAttempts)
            .set({
                failedAttempts: newAttempts,
                lockedUntil: lockUntil,
                lastAttempt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(loginAttempts.email, normalizedEmail));

        return {
            isLocked: newAttempts >= 5,
            lockUntil: lockUntil || undefined,
        };
    }

    async disableUserAccount(email: string): Promise<void> {
        const normalizedEmail = email.toLowerCase();
        await db.update(users).set({disabled: true}).where(eq(users.email, normalizedEmail));
    }

    async isUserAccountDisabled(email: string): Promise<boolean> {
        const normalizedEmail = email.toLowerCase();
        const [result] = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail));

        return !(!result || !result.disabled);

    }

    async lockUserAccount(
        email: string,
        lockDurationMinutes: number,
    ): Promise<void> {
        const normalizedEmail = email.toLowerCase();
        const lockUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);

        // Upsert login attempt record
        await db
            .insert(loginAttempts)
            .values({
                email: normalizedEmail,
                failedAttempts: 5,
                lockedUntil: lockUntil,
                lastAttempt: new Date(),
            })
            .onConflictDoUpdate({
                target: loginAttempts.email,
                set: {
                    lockedUntil: lockUntil,
                    updatedAt: new Date(),
                },
            });
    }

    async isAccountLocked(
        email: string,
    ): Promise<{ isLocked: boolean; lockUntil?: Date }> {
        const normalizedEmail = email.toLowerCase();

        const [attempt] = await db
            .select()
            .from(loginAttempts)
            .where(eq(loginAttempts.email, normalizedEmail));

        if (!attempt || !attempt.lockedUntil) {
            return {isLocked: false};
        }

        const isLocked = attempt.lockedUntil > new Date();
        return {
            isLocked,
            lockUntil: isLocked ? attempt.lockedUntil : undefined,
        };
    }

    async resetFailedLoginAttempts(email: string): Promise<void> {
        const normalizedEmail = email.toLowerCase();

        await db
            .delete(loginAttempts)
            .where(eq(loginAttempts.email, normalizedEmail));
    }
}

export const storage = new DatabaseStorage();
