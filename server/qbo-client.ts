import crypto from "node:crypto";
import { pool } from "./db";

const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QBO_SANDBOX_URL = "https://sandbox-quickbooks.api.intuit.com";
const QBO_PRODUCTION_URL = "https://quickbooks.api.intuit.com";

function getEncryptionKey(): Buffer {
  const key = process.env.QBO_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("QBO_ENCRYPTION_KEY must be set (32+ hex chars)");
  }
  return Buffer.from(key.slice(0, 32), "utf8");
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", crypto.createHash("sha256").update(key).digest(), iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");
  return iv.toString("hex") + ":" + tag + ":" + encrypted;
}

export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv("aes-256-gcm", crypto.createHash("sha256").update(key).digest(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export async function logSync(
  userId: string,
  quoteId: string | null,
  action: string,
  requestSummary: any,
  responseSummary: any,
  status: "ok" | "failed",
  errorMessage?: string
) {
  try {
    await pool.query(
      `INSERT INTO qbo_sync_log (id, user_id, quote_id, action, request_summary, response_summary, status, error_message, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, quoteId, action, JSON.stringify(requestSummary), JSON.stringify(responseSummary), status, errorMessage || null]
    );
  } catch (e) {
    console.error("Failed to log QBO sync:", e);
  }
}

interface QBOConnection {
  id: string;
  userId: string;
  realmId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiresAt: Date;
  environment: string;
  status: string;
  companyName: string | null;
  autoCreateInvoice: boolean;
}

export class QBOClient {
  private userId: string;
  private connection: QBOConnection | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  async loadConnection(): Promise<QBOConnection | null> {
    const result = await pool.query(
      `SELECT id, user_id as "userId", realm_id as "realmId",
              access_token_encrypted as "accessTokenEncrypted",
              refresh_token_encrypted as "refreshTokenEncrypted",
              access_token_expires_at as "accessTokenExpiresAt",
              environment, status, company_name as "companyName",
              auto_create_invoice as "autoCreateInvoice"
       FROM qbo_connections WHERE user_id = $1 AND status != 'disconnected'`,
      [this.userId]
    );
    this.connection = result.rows[0] || null;
    return this.connection;
  }

  getConnection() {
    return this.connection;
  }

  private getBaseUrl(): string {
    if (!this.connection) throw new Error("No QBO connection loaded");
    return this.connection.environment === "sandbox" ? QBO_SANDBOX_URL : QBO_PRODUCTION_URL;
  }

  async ensureValidToken(): Promise<string> {
    if (!this.connection) throw new Error("No QBO connection loaded");

    const now = new Date();
    const expiresAt = new Date(this.connection.accessTokenExpiresAt);
    const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinFromNow) {
      return decryptToken(this.connection.accessTokenEncrypted);
    }

    const clientId = process.env.INTUIT_CLIENT_ID;
    const clientSecret = process.env.INTUIT_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET must be set");
    }

    const refreshToken = decryptToken(this.connection.refreshTokenEncrypted);
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(INTUIT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${basicAuth}`,
        "Accept": "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("QBO token refresh failed:", response.status, errorBody);
      await pool.query(
        `UPDATE qbo_connections SET status = 'needs_reauth', last_error = $1 WHERE user_id = $2`,
        [`Token refresh failed: ${response.status}`, this.userId]
      );
      await logSync(this.userId, null, "refresh", {}, { status: response.status }, "failed", "Token refresh failed - reconnection required");
      throw new Error("QBO token refresh failed - user needs to reconnect");
    }

    const tokens = await response.json();
    const newAccessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token || refreshToken;
    const expiresIn = tokens.expires_in || 3600;
    const newExpiresAt = new Date(now.getTime() + expiresIn * 1000);

    await pool.query(
      `UPDATE qbo_connections
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           access_token_expires_at = $3,
           refresh_token_last_rotated_at = NOW(),
           status = 'connected',
           last_error = NULL
       WHERE user_id = $4`,
      [encryptToken(newAccessToken), encryptToken(newRefreshToken), newExpiresAt, this.userId]
    );

    this.connection.accessTokenEncrypted = encryptToken(newAccessToken);
    this.connection.refreshTokenEncrypted = encryptToken(newRefreshToken);
    this.connection.accessTokenExpiresAt = newExpiresAt;
    this.connection.status = "connected";

    await logSync(this.userId, null, "refresh", {}, { success: true }, "ok");
    return newAccessToken;
  }

  async request(method: string, path: string, body?: any, retryCount = 0): Promise<any> {
    const maxRetries = 3;
    const accessToken = await this.ensureValidToken();
    const url = `${this.getBaseUrl()}/v3/company/${this.connection!.realmId}${path}`;

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${accessToken}`,
      "Accept": "application/json",
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && retryCount === 0) {
      this.connection!.accessTokenExpiresAt = new Date(0);
      return this.request(method, path, body, retryCount + 1);
    }

    if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.request(method, path, body, retryCount + 1);
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.Fault?.Error?.[0]?.Detail || data?.Fault?.Error?.[0]?.Message || JSON.stringify(data);
      throw new Error(`QBO API error ${response.status}: ${errorMsg}`);
    }

    return data;
  }

  async queryCustomer(email?: string, displayName?: string): Promise<any | null> {
    let query = "select * from Customer where ";
    const conditions: string[] = [];
    if (email) conditions.push(`PrimaryEmailAddr = '${email.replace(/'/g, "\\'")}'`);
    if (displayName) conditions.push(`DisplayName = '${displayName.replace(/'/g, "\\'")}'`);
    if (conditions.length === 0) return null;
    query += conditions.join(" OR ");
    query += " MAXRESULTS 1";

    const data = await this.request("GET", `/query?query=${encodeURIComponent(query)}`);
    const customers = data?.QueryResponse?.Customer;
    return customers && customers.length > 0 ? customers[0] : null;
  }

  async createCustomer(displayName: string, email?: string, phone?: string, address?: string): Promise<any> {
    const customerData: any = { DisplayName: displayName };
    if (email) customerData.PrimaryEmailAddr = { Address: email };
    if (phone) customerData.PrimaryPhone = { FreeFormNumber: phone };
    if (address) {
      customerData.BillAddr = { Line1: address };
    }
    const data = await this.request("POST", "/customer", customerData);
    return data.Customer;
  }

  async createInvoice(
    customerRefId: string,
    lines: Array<{ description: string; amount: number; itemName?: string }>,
    privateNote?: string,
    txnDate?: string
  ): Promise<any> {
    const invoiceLines = lines.map((line, idx) => ({
      DetailType: "SalesItemLineDetail",
      Amount: line.amount,
      Description: line.description,
      SalesItemLineDetail: {
        UnitPrice: line.amount,
        Qty: 1,
      },
      LineNum: idx + 1,
    }));

    const invoiceData: any = {
      CustomerRef: { value: customerRefId },
      Line: invoiceLines,
    };

    if (privateNote) invoiceData.PrivateNote = privateNote;
    if (txnDate) invoiceData.TxnDate = txnDate;

    const data = await this.request("POST", "/invoice", invoiceData);
    return data.Invoice;
  }

  async getCompanyInfo(): Promise<any> {
    if (!this.connection) throw new Error("No QBO connection loaded");
    const data = await this.request("GET", `/companyinfo/${this.connection.realmId}`);
    return data.CompanyInfo;
  }
}
