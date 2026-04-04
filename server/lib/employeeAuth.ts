import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const SECRET = process.env.EMPLOYEE_JWT_SECRET || "employee-dev-secret-change-me";
const EXPIRY_SECONDS = 8 * 60 * 60; // 8 hours

export interface EmployeeTokenPayload {
  employeeId: string;
  businessId: string;
  name: string;
  role: "employee";
  iat: number;
  exp: number;
}

function b64url(str: string): string {
  return Buffer.from(str).toString("base64url");
}

export function signEmployeeToken(payload: Omit<EmployeeTokenPayload, "iat" | "exp">): string {
  const now = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + EXPIRY_SECONDS };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(full));
  const sig = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyEmployeeToken(token: string): EmployeeTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [header, body, sig] = parts;
  const expected = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  if (expected !== sig) throw new Error("Invalid signature");
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as EmployeeTokenPayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  if (payload.role !== "employee") throw new Error("Wrong role");
  return payload;
}

export function employeeAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ message: "Employee authentication required" });
    return;
  }
  try {
    const payload = verifyEmployeeToken(auth.slice(7));
    (req as any).employee = payload;
    next();
  } catch (err: any) {
    res.status(401).json({ message: err.message || "Invalid or expired token" });
  }
}
