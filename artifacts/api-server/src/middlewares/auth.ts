import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthPayload {
  userId: number;
  username: string;
  role: "admin" | "staff" | "driver";
  name: string;
}

export interface UserPermissions {
  canViewProfit: boolean;
  canDeleteData: boolean;
  canEditStock: boolean;
  canAccessReports: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      userPermissions?: UserPermissions;
    }
  }
}

const JWT_SECRET = process.env.SESSION_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET ?? "dev-only-secret-change-me";

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, EFFECTIVE_JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ message: "پێویستت بە چوونەژوورەوەیە" });
    return;
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, EFFECTIVE_JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "نیشانەی چوونەژوورەوە هەڵەیە یان کاتی بڕی" });
  }
}

export function requireDriver(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "driver") {
      res.status(403).json({ message: "تەنها شۆفێر دەتوانێت ئەم کارە بکات" });
      return;
    }
    next();
  });
}
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ message: "تەنها بەڕێوەبەران دەتوانن ئەم کارە بکەن" });
      return;
    }
    next();
  });
}

export async function loadPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) { next(); return; }

  if (req.user.role === "admin") {
    req.userPermissions = {
      canViewProfit: true,
      canDeleteData: true,
      canEditStock: true,
      canAccessReports: true,
    };
    next();
    return;
  }

  if (req.user.role === "driver") {
    req.userPermissions = {
      canViewProfit: false,
      canDeleteData: false,
      canEditStock: false,
      canAccessReports: false,
    };
    next();
    return;
  }

  try {
    const [user] = await db
      .select({
        canViewProfit: usersTable.canViewProfit,
        canDeleteData: usersTable.canDeleteData,
        canEditStock: usersTable.canEditStock,
        canAccessReports: usersTable.canAccessReports,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.user.userId));

    if (!user) { res.status(401).json({ message: "بەکارهێنەر نەدۆزرایەوە" }); return; }
    req.userPermissions = user;
    next();
  } catch (err) {
    next(err);
  }
}
