import { eq } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  businesses,
  pricingSettings,
  type User,
  type InsertUser,
  type Business,
  type PricingSettingsRow,
} from "@shared/schema";

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  return user;
}

export async function getUserByProviderId(
  provider: string,
  providerId: string
): Promise<User | undefined> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.providerId, providerId));
  return results.find((u) => u.authProvider === provider);
}

export async function createUser(data: {
  email: string;
  name?: string;
  passwordHash?: string;
  authProvider: string;
  providerId?: string;
}): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase(),
      name: data.name || null,
      passwordHash: data.passwordHash || null,
      authProvider: data.authProvider,
      providerId: data.providerId || null,
    })
    .returning();
  return user;
}

export async function getBusinessByOwner(
  userId: string
): Promise<Business | undefined> {
  const [business] = await db
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId));
  return business;
}

export async function createBusiness(
  userId: string
): Promise<Business> {
  const [business] = await db
    .insert(businesses)
    .values({ ownerUserId: userId })
    .returning();
  return business;
}

export async function updateBusiness(
  businessId: string,
  data: Partial<{
    companyName: string;
    email: string;
    phone: string;
    address: string;
    logoUri: string | null;
    primaryColor: string;
    senderName: string;
    senderTitle: string;
    bookingLink: string;
    onboardingComplete: boolean;
  }>
): Promise<Business> {
  const [business] = await db
    .update(businesses)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(businesses.id, businessId))
    .returning();
  return business;
}

export async function getPricingByBusiness(
  businessId: string
): Promise<PricingSettingsRow | undefined> {
  const [row] = await db
    .select()
    .from(pricingSettings)
    .where(eq(pricingSettings.businessId, businessId));
  return row;
}

export async function upsertPricingSettings(
  businessId: string,
  settings: unknown
): Promise<PricingSettingsRow> {
  const existing = await getPricingByBusiness(businessId);
  if (existing) {
    const [row] = await db
      .update(pricingSettings)
      .set({ settings, updatedAt: new Date() })
      .where(eq(pricingSettings.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(pricingSettings)
    .values({ businessId, settings })
    .returning();
  return row;
}
