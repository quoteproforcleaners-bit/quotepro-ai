import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import {
  getUserById,
  getUserByEmail,
  getUserByProviderId,
  createUser,
  getBusinessByOwner,
  createBusiness,
  updateBusiness,
  getPricingByBusiness,
  upsertPricingSettings,
} from "./storage";

declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

function setupSession(app: Express) {
  const PgStore = connectPg(session);

  app.use(
    session({
      store: new PgStore({
        pool: pool as any,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "quotepro-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    })
  );
}

function requireAuth(req: Request, res: Response, next: Function) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupSession(app);

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await createUser({
        email,
        name: name || null,
        passwordHash,
        authProvider: "email",
      });

      const business = await createBusiness(user.id);

      req.session.userId = user.id;

      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        business: formatBusiness(business),
        needsOnboarding: !business.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const business = await getBusinessByOwner(user.id);

      req.session.userId = user.id;

      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/apple", async (req: Request, res: Response) => {
    try {
      const { identityToken, user: appleUser, fullName, email: appleEmail } = req.body;

      if (!identityToken) {
        return res.status(400).json({ message: "Identity token is required" });
      }

      const parts = identityToken.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ message: "Invalid token format" });
      }

      let payload: any;
      try {
        payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf8")
        );
      } catch {
        return res.status(400).json({ message: "Invalid token" });
      }

      const email = payload.email || appleEmail;
      const providerId = payload.sub || appleUser;

      if (!email || !providerId) {
        return res.status(400).json({ message: "Could not extract user info from token" });
      }

      let user = await getUserByProviderId("apple", providerId);

      if (!user) {
        user = await getUserByEmail(email);
        if (user) {
          return res.status(409).json({
            message: "An account with this email already exists. Please sign in with your email and password.",
          });
        }

        const name =
          fullName?.givenName && fullName?.familyName
            ? `${fullName.givenName} ${fullName.familyName}`
            : undefined;

        user = await createUser({
          email,
          name,
          authProvider: "apple",
          providerId,
        });

        const business = await createBusiness(user.id);
        req.session.userId = user.id;

        return res.json({
          user: { id: user.id, email: user.email, name: user.name },
          business: formatBusiness(business),
          needsOnboarding: true,
        });
      }

      const business = await getBusinessByOwner(user.id);
      req.session.userId = user.id;

      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Apple auth error:", error);
      return res.status(500).json({ message: "Apple sign-in failed" });
    }
  });

  app.post("/api/auth/google", async (req: Request, res: Response) => {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ message: "ID token is required" });
      }

      const parts = idToken.split(".");
      if (parts.length !== 3) {
        return res.status(400).json({ message: "Invalid token format" });
      }

      let payload: any;
      try {
        payload = JSON.parse(
          Buffer.from(parts[1], "base64").toString("utf8")
        );
      } catch {
        return res.status(400).json({ message: "Invalid token" });
      }

      const email = payload.email;
      const providerId = payload.sub;
      const name = payload.name;

      if (!email || !providerId) {
        return res.status(400).json({ message: "Could not extract user info from token" });
      }

      let user = await getUserByProviderId("google", providerId);

      if (!user) {
        user = await getUserByEmail(email);
        if (user) {
          return res.status(409).json({
            message: "An account with this email already exists. Please sign in with your original method.",
          });
        }

        user = await createUser({
          email,
          name,
          authProvider: "google",
          providerId,
        });

        const business = await createBusiness(user.id);
        req.session.userId = user.id;

        return res.json({
          user: { id: user.id, email: user.email, name: user.name },
          business: formatBusiness(business),
          needsOnboarding: true,
        });
      }

      const business = await getBusinessByOwner(user.id);
      req.session.userId = user.id;

      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Google auth error:", error);
      return res.status(500).json({ message: "Google sign-in failed" });
    }
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const user = await getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      const business = await getBusinessByOwner(user.id);

      return res.json({
        user: { id: user.id, email: user.email, name: user.name },
        business: business ? formatBusiness(business) : null,
        needsOnboarding: !business?.onboardingComplete,
      });
    } catch (error: any) {
      console.error("Auth check error:", error);
      return res.status(500).json({ message: "Auth check failed" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "Logged out" });
    });
  });

  app.get("/api/business", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      return res.json(formatBusiness(business));
    } catch (error: any) {
      console.error("Get business error:", error);
      return res.status(500).json({ message: "Failed to get business" });
    }
  });

  app.put("/api/business", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const updated = await updateBusiness(business.id, req.body);
      return res.json(formatBusiness(updated));
    } catch (error: any) {
      console.error("Update business error:", error);
      return res.status(500).json({ message: "Failed to update business" });
    }
  });

  app.get("/api/pricing", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const pricing = await getPricingByBusiness(business.id);
      return res.json(pricing?.settings || null);
    } catch (error: any) {
      console.error("Get pricing error:", error);
      return res.status(500).json({ message: "Failed to get pricing" });
    }
  });

  app.put("/api/pricing", requireAuth, async (req: Request, res: Response) => {
    try {
      const business = await getBusinessByOwner(req.session.userId!);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }

      const row = await upsertPricingSettings(business.id, req.body);
      return res.json(row.settings);
    } catch (error: any) {
      console.error("Update pricing error:", error);
      return res.status(500).json({ message: "Failed to update pricing" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function formatBusiness(b: any) {
  return {
    id: b.id,
    companyName: b.companyName,
    email: b.email,
    phone: b.phone,
    address: b.address,
    logoUri: b.logoUri,
    primaryColor: b.primaryColor,
    senderName: b.senderName,
    senderTitle: b.senderTitle,
    bookingLink: b.bookingLink,
    onboardingComplete: b.onboardingComplete,
  };
}
