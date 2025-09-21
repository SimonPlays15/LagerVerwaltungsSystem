import bcrypt from 'bcrypt';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';
import { registerUserSchema, loginUserSchema, type RegisterUser, type LoginUser } from '../shared/schema';

const SALT_ROUNDS = 12;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function registerUser(userData: RegisterUser) {
  const { password, ...userInfo } = userData;
  const passwordHash = await hashPassword(password);
  
  const user = await storage.createUser({
    ...userInfo,
    passwordHash,
  });
  
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    forcePasswordChange: user.forcePasswordChange,
  };
}

// Valid dummy hash for timing-attack prevention (bcrypt hash of 'invalid' with cost 12)
const DUMMY_HASH = '$2b$12$Ln/qtmdkAi.5sSndPlhEhOxDcoRlwbsCAE2yLa7SYu1VunI3Vdqnq';

export async function loginUser(credentials: LoginUser) {
  const { email, password } = credentials;
  
  try {
      // Check if account is disabled
      const isDisabled = await storage.isUserAccountDisabled(email);
      if (isDisabled) {
          throw new Error('Account is disabled. Please contact support.');
      }

    // Check if account is locked (works for both existing and non-existing users)
    const lockStatus = await storage.isAccountLocked(email);
    if (lockStatus.isLocked) {
      // Perform dummy bcrypt to maintain timing consistency even for locked accounts
      await verifyPassword(password, DUMMY_HASH).catch(() => false);
      
      const waitTime = lockStatus.lockUntil 
        ? Math.ceil((lockStatus.lockUntil.getTime() - Date.now()) / 1000 / 60) // minutes
        : 30;
      throw new Error(`Account is temporarily locked due to too many failed login attempts. Please try again in ${waitTime} minutes.`);
    }

    const user = await storage.getUserByEmail(email);
    let isPasswordValid = false;
    
    if (user) {
      // Real user: verify actual password
      try {
        isPasswordValid = await verifyPassword(password, user.passwordHash);
      } catch (error) {
        console.error("Password verification error:", error);
        isPasswordValid = false;
      }
    } else {
      // Non-existent user: perform dummy bcrypt to maintain constant timing
      try {
        await verifyPassword(password, DUMMY_HASH);
      } catch (error) {
        // Ignore errors in dummy verification
      }
      isPasswordValid = false; // Always false for non-existent users
    }
    
    if (!isPasswordValid) {
      // Increment failed attempts (works for both existing and non-existing users)
      try {
        const attemptResult = await storage.incrementFailedLoginAttempts(email);
        
        if (attemptResult.isLocked) {
          // Account just got locked on this attempt - provide immediate feedback
          const waitTime = attemptResult.lockUntil 
            ? Math.ceil((attemptResult.lockUntil.getTime() - Date.now()) / 1000 / 60)
            : 30;
          throw new Error(`Account locked after too many failed attempts. Please try again in ${waitTime} minutes.`);
        }
      } catch (error) {
        console.error("Error tracking login attempts:", error);
        // Continue with login failure even if tracking failed
      }
      
      throw new Error('Invalid credentials');
    }
    
    // Reset failed login attempts on successful login
    try {
      await storage.resetFailedLoginAttempts(email);
    } catch (error) {
      console.error("Failed to reset login attempts:", error);
      // Continue with successful login even if reset failed
    }
    
    return {
      id: user!.id, // user is guaranteed to exist at this point
      email: user!.email,
      firstName: user!.firstName,
      lastName: user!.lastName,
      role: user!.role,
      forcePasswordChange: user!.forcePasswordChange,
    };
  } catch (error) {
    // Zentralisierte Fehlerbehandlung
    console.error("Login process error:", error);
    
    if (error instanceof Error) {
      throw error; // Originalen Fehler weitergeben
    } else {
      throw new Error('Ein unbekannter Fehler ist aufgetreten');
    }
  }
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error('User not found');
  }
  
  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new Error('Current password is incorrect');
  }
  
  const newPasswordHash = await hashPassword(newPassword);
  await storage.updateUser(userId, {
    passwordHash: newPasswordHash,
    forcePasswordChange: false, // Reset force flag after password change
  });
  
  return true;
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
}

// Session interface extension for TypeScript
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Updated authentication middleware
export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  try {
    const user = await storage.getPublicUser(req.session.userId);
    if (!user) {
      req.session.destroy((err: any) => {});
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};