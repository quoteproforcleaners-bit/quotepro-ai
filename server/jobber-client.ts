import { pool } from "./db";
import { encryptToken, decryptToken } from "./qbo-client";

function parseAddressString(addr: string): { street?: string; city?: string; province?: string; postalCode?: string; country?: string } {
  if (!addr || !addr.trim()) return {};
  // Try "123 Main St, Springfield, IL 62701" or "123 Main St, Springfield, IL 62701, US"
  const parts = addr.split(",").map((s) => s.trim());
  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZip = parts[2].trim().split(/\s+/);
    const province = stateZip[0] || "";
    const postalCode = stateZip[1] || "";
    const country = parts[3] || "US";
    return { street, city, province, postalCode, country };
  }
  if (parts.length === 2) {
    return { street: parts[0], city: parts[1], country: "US" };
  }
  return { street: addr, country: "US" };
}

const JOBBER_AUTH_URL = "https://api.getjobber.com/api/oauth/authorize";
const JOBBER_TOKEN_URL = "https://api.getjobber.com/api/oauth/token";
const JOBBER_GRAPHQL_URL = "https://api.getjobber.com/api/graphql";
const JOBBER_GRAPHQL_VERSION = "2023-11-15";

export async function logJobberSync(
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
      `INSERT INTO jobber_sync_log (id, user_id, quote_id, action, request_summary, response_summary, status, error_message, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())`,
      [userId, quoteId, action, requestSummary || null, responseSummary || null, status, errorMessage || null]
    );
  } catch (e) {
    console.error("Failed to log Jobber sync:", e);
  }
}

const JOBBER_SCOPES = [
  "read_clients",
  "write_clients",
  "read_jobs",
  "write_jobs",
  "read_invoices",
  "write_invoices",
  "read_quotes",
  "write_quotes",
].join(" ");

export function buildJobberAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.JOBBER_CLIENT_ID;
  if (!clientId) throw new Error("JOBBER_CLIENT_ID is not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: JOBBER_SCOPES,
    state,
  });

  return `${JOBBER_AUTH_URL}?${params.toString()}`;
}

export async function exchangeJobberCode(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const clientId = process.env.JOBBER_CLIENT_ID;
  const clientSecret = process.env.JOBBER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Jobber token exchange: missing credentials", { hasClientId: !!clientId, hasClientSecret: !!clientSecret });
    throw new Error(`Jobber credentials not configured (id: ${!!clientId}, secret: ${!!clientSecret})`);
  }

  const response = await fetch(JOBBER_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Jobber token exchange failed (${response.status}): ${errBody}`);
  }

  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in || 3600,
  };
}

interface JobberConnection {
  id: string;
  userId: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string;
  accessTokenExpiresAt: Date;
  status: string;
  autoCreateJobOnQuoteAccept: boolean;
}

export class JobberClient {
  private userId: string;
  private connection: JobberConnection | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  async loadConnection(): Promise<JobberConnection | null> {
    const result = await pool.query(
      `SELECT id, user_id as "userId",
              access_token_encrypted as "accessTokenEncrypted",
              refresh_token_encrypted as "refreshTokenEncrypted",
              access_token_expires_at as "accessTokenExpiresAt",
              status,
              auto_create_job_on_quote_accept as "autoCreateJobOnQuoteAccept"
       FROM jobber_connections WHERE user_id = $1 AND status != 'disconnected'`,
      [this.userId]
    );
    this.connection = result.rows[0] || null;
    return this.connection;
  }

  getConnection() {
    return this.connection;
  }

  async ensureValidToken(): Promise<string> {
    if (!this.connection) throw new Error("No Jobber connection loaded");

    const now = new Date();
    const expiresAt = new Date(this.connection.accessTokenExpiresAt);
    const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinFromNow) {
      return decryptToken(this.connection.accessTokenEncrypted);
    }

    const clientId = process.env.JOBBER_CLIENT_ID;
    const clientSecret = process.env.JOBBER_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("JOBBER_CLIENT_ID and JOBBER_CLIENT_SECRET must be set");
    }

    const refreshToken = decryptToken(this.connection.refreshTokenEncrypted);

    const response = await fetch(JOBBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Jobber token refresh failed:", response.status, errorBody);
      await pool.query(
        `UPDATE jobber_connections SET status = 'needs_reauth', last_error = $1 WHERE user_id = $2`,
        [`Token refresh failed: ${response.status}`, this.userId]
      );
      await logJobberSync(this.userId, null, "refresh", {}, { status: response.status }, "failed", "Token refresh failed");
      throw new Error("Jobber token refresh failed - user needs to reconnect");
    }

    const tokens = await response.json();
    const newAccessToken = tokens.access_token;
    const newRefreshToken = tokens.refresh_token || refreshToken;
    const expiresIn = tokens.expires_in || 3600;
    const newExpiresAt = new Date(now.getTime() + expiresIn * 1000);

    await pool.query(
      `UPDATE jobber_connections
       SET access_token_encrypted = $1,
           refresh_token_encrypted = $2,
           access_token_expires_at = $3,
           status = 'connected',
           last_error = NULL
       WHERE user_id = $4`,
      [encryptToken(newAccessToken), encryptToken(newRefreshToken), newExpiresAt, this.userId]
    );

    this.connection.accessTokenEncrypted = encryptToken(newAccessToken);
    this.connection.refreshTokenEncrypted = encryptToken(newRefreshToken);
    this.connection.accessTokenExpiresAt = newExpiresAt;
    this.connection.status = "connected";

    await logJobberSync(this.userId, null, "refresh", {}, { success: true }, "ok");
    return newAccessToken;
  }

  async graphql(query: string, variables?: Record<string, any>, retryCount = 0): Promise<any> {
    const maxRetries = 2;
    const accessToken = await this.ensureValidToken();

    const response = await fetch(JOBBER_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-JOBBER-GRAPHQL-VERSION": JOBBER_GRAPHQL_VERSION,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401 && retryCount === 0) {
      this.connection!.accessTokenExpiresAt = new Date(0);
      return this.graphql(query, variables, retryCount + 1);
    }

    if ((response.status === 429 || response.status >= 500) && retryCount < maxRetries) {
      const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.graphql(query, variables, retryCount + 1);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Jobber GraphQL error ${response.status}: ${errText}`);
    }

    const data = await response.json();

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Jobber GraphQL errors: ${data.errors.map((e: any) => e.message).join(", ")}`);
    }

    return data.data;
  }

  async createClient(input: {
    firstName: string;
    lastName: string;
    companyName?: string;
    email?: string;
    phone?: string;
    address?: { street1?: string; street2?: string; city?: string; province?: string; postalCode?: string; country?: string };
  }): Promise<{ id: string; firstName: string; lastName: string }> {
    const mutation = `
      mutation CreateClient($input: ClientCreateInput!) {
        clientCreate(input: $input) {
          client {
            id
            firstName
            lastName
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    const clientInput: any = {
      firstName: input.firstName,
      lastName: input.lastName,
    };

    if (input.companyName) clientInput.companyName = input.companyName;

    if (input.email) {
      clientInput.emails = [{
        description: "MAIN",
        primary: true,
        address: input.email,
      }];
    }

    if (input.phone) {
      clientInput.phones = [{
        description: "MAIN",
        primary: true,
        number: input.phone,
      }];
    }

    if (input.address) {
      clientInput.billingAddress = {
        street1: input.address.street1 || "",
        city: input.address.city || "",
        province: input.address.province || "",
        postalCode: input.address.postalCode || "",
        country: input.address.country || "US",
      };
      if (input.address.street2) {
        clientInput.billingAddress.street2 = input.address.street2;
      }
    }

    const data = await this.graphql(mutation, { input: clientInput });
    const result = data.clientCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(`Jobber client creation failed: ${result.userErrors.map((e: any) => e.message).join(", ")}`);
    }

    return result.client;
  }

  async getClientPropertyId(clientId: string): Promise<string | null> {
    const query = `
      query GetClientProperties($clientId: ID!) {
        client(id: $clientId) {
          properties {
            nodes { id }
          }
        }
      }
    `;
    try {
      const data = await this.graphql(query, { clientId });
      const nodes = data?.client?.properties?.nodes || [];
      return nodes.length > 0 ? nodes[0].id : null;
    } catch {
      return null;
    }
  }

  async createProperty(clientId: string, address: {
    street?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
  }): Promise<string | null> {
    const esc = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const street = esc(address.street || "N/A");
    const city = esc(address.city || "");
    const province = esc(address.province || "");
    const postalCode = esc(address.postalCode || "");
    const country = esc(address.country || "US");

    // Confirmed from production logs:
    //   propertyCreate REQUIRES arg named "input" (PropertyCreateInput type)
    //   PropertyAttributes has: address: AddressAttributes, contacts: [ContactCreateAttributes]
    //   AddressAttributes likely uses street1 (matches Jobber's billingAddress convention)
    //   PropertyCreateInput contains a field of type PropertyAttributes (exact field name unknown)
    const addrBlock = `address: { street1: "${street}", city: "${city}", province: "${province}", postalCode: "${postalCode}", country: "${country}" }`;
    const attempts: Array<[string, string]> = [
      // 1. input.properties = list of PropertyAttributes (most likely based on naming)
      [`mutation { propertyCreate(clientId: "${clientId}", input: { properties: [{ ${addrBlock} }] }) { properties { id } userErrors { message path } } }`, "input.properties[{address}]"],
      // 2. input directly is list of PropertyAttributes
      [`mutation { propertyCreate(clientId: "${clientId}", input: [{ ${addrBlock} }]) { properties { id } userErrors { message path } } }`, "input=[{address}]"],
      // 3. input.property = single PropertyAttributes (singular field name)
      [`mutation { propertyCreate(clientId: "${clientId}", input: { property: { ${addrBlock} } }) { properties { id } userErrors { message path } } }`, "input.property{address}"],
      // 4. input.serviceAddress = AddressAttributes directly (alternate field name)
      [`mutation { propertyCreate(clientId: "${clientId}", input: { serviceAddress: { street1: "${street}", city: "${city}", province: "${province}", postalCode: "${postalCode}", country: "${country}" } }) { properties { id } userErrors { message path } } }`, "input.serviceAddress"],
      // 5. Empty input — Jobber may create property from client billing address
      [`mutation { propertyCreate(clientId: "${clientId}", input: {}) { properties { id } userErrors { message path } } }`, "input={}"],
    ];

    for (let i = 0; i < attempts.length; i++) {
      const [mutation, label] = attempts[i];
      try {
        const data = await this.graphql(mutation);
        const result = data?.propertyCreate;
        if (result?.userErrors?.length > 0) {
          console.warn(`[Jobber propertyCreate] attempt "${label}" userErrors:`, JSON.stringify(result.userErrors));
          continue;
        }
        const id = result?.properties?.[0]?.id || null;
        if (id) {
          console.log(`[Jobber propertyCreate] attempt "${label}" succeeded, propertyId=${id}`);
          return id;
        }
        console.warn(`[Jobber propertyCreate] attempt "${label}" returned no property id`);
      } catch (e: any) {
        console.warn(`[Jobber propertyCreate] attempt "${label}" threw: ${e.message}`);
      }
    }
    console.error("[Jobber propertyCreate] all attempts exhausted — property could not be created");
    return null;
  }

  async introspectPropertyCreateInput(): Promise<void> {
    try {
      const data = await this.graphql(`
        {
          pci: __type(name: "PropertyCreateInput") {
            name
            inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
          }
          pa: __type(name: "PropertyAttributes") {
            name
            inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
          }
          aa: __type(name: "AddressAttributes") {
            name
            inputFields { name type { name kind ofType { name kind ofType { name kind } } } }
          }
          m: __schema {
            mutationType {
              fields(includeDeprecated: true) {
                name
                args { name type { name kind ofType { name kind ofType { name kind } } } }
              }
            }
          }
        }
      `);
      const propCreate = data?.m?.mutationType?.fields?.find((f: any) => f.name === "propertyCreate");
      console.log("[Jobber schema] PropertyCreateInput fields:", JSON.stringify(data?.pci?.inputFields?.map((f: any) => f.name)));
      console.log("[Jobber schema] PropertyAttributes fields:", JSON.stringify(data?.pa?.inputFields?.map((f: any) => f.name)));
      console.log("[Jobber schema] AddressAttributes fields:", JSON.stringify(data?.aa?.inputFields?.map((f: any) => f.name)));
      console.log("[Jobber schema] propertyCreate args:", JSON.stringify(propCreate?.args?.map((a: any) => ({ name: a.name, type: a.type?.name || a.type?.ofType?.name || a.type?.ofType?.ofType?.name }))));
    } catch (e: any) {
      console.log("[Jobber schema] introspection failed:", e.message);
    }
  }

  async getOrCreatePropertyId(clientId: string, addressStr?: string | null): Promise<string> {
    // 1. Try to get existing property
    const existing = await this.getClientPropertyId(clientId);
    if (existing) return existing;

    // 2. Log schema to diagnose correct input structure
    await this.introspectPropertyCreateInput();

    // 3. Parse the address string (e.g. "123 Main St, Springfield, IL 62701")
    const address = parseAddressString(addressStr || "");
    console.log(`[Jobber getOrCreateProperty] clientId=${clientId} rawAddress="${addressStr}" parsed=${JSON.stringify(address)}`);

    // 4. Try to create a property
    const created = await this.createProperty(clientId, address);
    if (created) return created;

    console.error(`[Jobber getOrCreateProperty] FAILED clientId=${clientId} address="${addressStr}"`);
    throw new Error(
      "Could not find or create a service property for this Jobber client. " +
      "Please add a service address to the client in Jobber and try again."
    );
  }

  async createJob(input: {
    clientId: string;
    title: string;
    instructions?: string;
    total?: number;
    addressStr?: string | null;
    lineItems?: Array<{ name: string; description?: string; unitPrice: string; quantity: number }>;
  }): Promise<{ id: string; jobNumber: number | null; title: string }> {
    // Step 1: Get or create the property ID (required by Jobber API)
    const propertyId = await this.getOrCreatePropertyId(input.clientId, input.addressStr);

    // Step 2: Create the job using the exact fields Jobber's API expects
    const mutation = `
      mutation CreateJob($propertyId: ID!, $title: String!, $instructions: String) {
        jobCreate(input: {
          propertyId: $propertyId,
          title: $title,
          instructions: $instructions,
          invoicing: {
            billingType: FLAT_RATE
          }
        }) {
          job {
            id
            jobNumber
            title
          }
          userErrors {
            message
            path
          }
        }
      }
    `;

    const data = await this.graphql(mutation, {
      propertyId,
      title: input.title,
      instructions: input.instructions || null,
    });
    const result = data.jobCreate;

    if (!result) {
      throw new Error("jobCreate returned no data");
    }
    if (result.userErrors && result.userErrors.length > 0) {
      throw new Error(`Jobber job creation failed: ${result.userErrors.map((e: any) => e.message).join(", ")}`);
    }

    // Step 3: Attach line items as a job note (most compatible approach)
    if (result.job?.id && input.lineItems && input.lineItems.length > 0) {
      const lineItemText = input.lineItems
        .map((li) => `• ${li.name}${li.description ? ` (${li.description})` : ""}: $${li.unitPrice}`)
        .join("\n");
      const total = input.total ? `\nTotal: $${input.total.toFixed(2)}` : "";
      await this.addJobNote(result.job.id, `Services:\n${lineItemText}${total}`).catch(() => {});
    }

    return result.job;
  }

  async addJobNote(jobId: string, note: string): Promise<void> {
    const mutation = `
      mutation AddJobNote($jobId: ID!, $note: String!) {
        jobCreateNote(input: {
          jobId: $jobId,
          note: $note
        }) {
          note { id }
          userErrors { message }
        }
      }
    `;
    await this.graphql(mutation, { jobId, note });
  }

  async disconnectApp(): Promise<void> {
    const mutation = `
      mutation AppDisconnect {
        appDisconnect {
          success
        }
      }
    `;
    try {
      await this.graphql(mutation);
    } catch (e: any) {
      console.warn("appDisconnect mutation failed (token may already be invalid):", e.message);
    }
  }
}

export async function syncQuoteToJobber(
  userId: string,
  quoteId: string,
  trigger: "manual" | "automatic" = "manual",
  force = false
): Promise<{ success: boolean; jobberClientId?: string; jobberJobId?: string; jobberJobNumber?: string; error?: string }> {
  const existingLink = await pool.query(
    `SELECT id, jobber_client_id as "jobberClientId", jobber_job_id as "jobberJobId",
            jobber_job_number as "jobberJobNumber", sync_status as "syncStatus"
     FROM jobber_job_links WHERE user_id = $1 AND quote_id = $2`,
    [userId, quoteId]
  );

  if (existingLink.rows.length > 0 && existingLink.rows[0].syncStatus === "success" && !force) {
    return {
      success: true,
      jobberClientId: existingLink.rows[0].jobberClientId,
      jobberJobId: existingLink.rows[0].jobberJobId,
      jobberJobNumber: existingLink.rows[0].jobberJobNumber,
    };
  }

  const client = new JobberClient(userId);
  const conn = await client.loadConnection();
  if (!conn) {
    return { success: false, error: "Jobber is not connected" };
  }

  const quoteResult = await pool.query(
    `SELECT q.id, q.customer_id as "customerId", q.total, q.status,
            q.frequency_selected as "frequency",
            q.property_beds as "beds", q.property_baths as "baths", q.property_sqft as "sqft",
            q.selected_option as "selectedOption", q.options,
            q.add_ons as "addOns", q.property_details as "propertyDetails",
            c.first_name as "firstName", c.last_name as "lastName",
            c.email, c.phone, c.address
     FROM quotes q
     LEFT JOIN customers c ON q.customer_id = c.id
     WHERE q.id = $1`,
    [quoteId]
  );

  if (quoteResult.rows.length === 0) {
    return { success: false, error: "Quote not found" };
  }

  const quote = quoteResult.rows[0];
  const firstName = quote.firstName || "Unknown";
  const lastName = quote.lastName || "Customer";
  const total = quote.total ? Number(quote.total).toFixed(2) : "0.00";

  try {
    let jobberClientId: string;

    const existingMapping = await pool.query(
      `SELECT jobber_client_id as "jobberClientId" FROM jobber_client_mappings
       WHERE user_id = $1 AND qp_customer_id = $2`,
      [userId, quote.customerId]
    );

    if (existingMapping.rows.length > 0) {
      jobberClientId = existingMapping.rows[0].jobberClientId;
    } else {
      const addressParts: any = {};
      if (quote.address) addressParts.street1 = quote.address;

      const jobberClient = await client.createClient({
        firstName,
        lastName,
        email: quote.email || undefined,
        phone: quote.phone || undefined,
        address: Object.keys(addressParts).length > 0 ? addressParts : undefined,
      });

      jobberClientId = jobberClient.id;

      if (quote.customerId) {
        await pool.query(
          `INSERT INTO jobber_client_mappings (id, user_id, qp_customer_id, jobber_client_id, created_at)
           VALUES (gen_random_uuid(), $1, $2, $3, NOW())
           ON CONFLICT (user_id, qp_customer_id) DO UPDATE SET jobber_client_id = $3`,
          [userId, quote.customerId, jobberClientId]
        );
      }

      await logJobberSync(userId, quoteId, "create_client", { firstName, lastName }, { jobberClientId }, "ok");
    }

    const frequency = quote.frequency || "one-time";

    // --- Smart title ---
    const SERVICE_NAMES: Record<string, string> = {
      good: "Standard Clean",
      better: "Deep Clean",
      best: "Premium Clean",
    };
    const FREQUENCY_LABELS: Record<string, string> = {
      weekly: "Weekly",
      "bi-weekly": "Bi-Weekly",
      biweekly: "Bi-Weekly",
      monthly: "Monthly",
      "every-4-weeks": "Every 4 Weeks",
      "one-time": "",
      onetime: "",
    };

    const serviceName = SERVICE_NAMES[quote.selectedOption] || "Cleaning";
    const frequencyTag = FREQUENCY_LABELS[frequency] ?? "";
    const propertySummary = [
      quote.beds ? `${quote.beds}bd` : null,
      quote.baths ? `${quote.baths}ba` : null,
      quote.sqft ? `${quote.sqft}sqft` : null,
    ]
      .filter(Boolean)
      .join("/");

    const titleParts = [
      serviceName,
      propertySummary || null,
      frequencyTag || null,
      `${firstName} ${lastName}`,
    ].filter(Boolean);
    const title = titleParts.join(" — ");

    // --- Line items ---
    const lineItems: Array<{ name: string; description?: string; unitPrice: string; quantity: number }> = [];

    const options = quote.options as any;
    const selectedTierData = options && quote.selectedOption ? options[quote.selectedOption] : null;
    const tierPrice = selectedTierData
      ? Number(selectedTierData.price ?? selectedTierData.subtotal ?? selectedTierData.total ?? quote.total)
      : Number(quote.total);

    const propertyDesc = [
      propertySummary,
      frequencyTag ? `${frequencyTag} service` : "One-time service",
    ]
      .filter(Boolean)
      .join(" · ");

    lineItems.push({
      name: serviceName,
      description: propertyDesc || undefined,
      unitPrice: tierPrice.toFixed(2),
      quantity: 1,
    });

    // Add-ons as individual line items
    const addOns = quote.addOns as any;
    const ADD_ON_PRICES: Record<string, number> = {
      inside_oven: 35,
      inside_fridge: 25,
      interior_windows: 40,
      laundry: 30,
      dishes: 20,
      baseboards: 20,
      blinds: 25,
      wall_spots: 15,
      garage: 45,
      patio: 35,
      carpet_vacuum: 15,
    };

    if (addOns && typeof addOns === "object") {
      for (const [key, val] of Object.entries(addOns)) {
        if (val === true) {
          const label = key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          const addOnPrice = ADD_ON_PRICES[key] ?? 0;
          lineItems.push({
            name: label,
            unitPrice: addOnPrice.toFixed(2),
            quantity: 1,
          });
        }
      }
    }

    // --- Instructions block ---
    const noteLines: string[] = [
      `Synced from QuotePro`,
      `Quote Total: $${total}`,
      frequencyTag ? `Frequency: ${frequencyTag}` : "Service: One-time",
    ];
    if (quote.beds) noteLines.push(`Bedrooms: ${quote.beds}`);
    if (quote.baths) noteLines.push(`Bathrooms: ${quote.baths}`);
    if (quote.sqft) noteLines.push(`Sq Ft: ${quote.sqft}`);
    if (quote.address) noteLines.push(`Address: ${quote.address}`);

    const jobberJob = await client.createJob({
      clientId: jobberClientId,
      title,
      instructions: noteLines.join("\n"),
      total: Number(total),
      addressStr: quote.address as string | null,
      lineItems,
    });

    if (existingLink.rows.length > 0) {
      await pool.query(
        `UPDATE jobber_job_links SET jobber_client_id = $1, jobber_job_id = $2, jobber_job_number = $3,
                sync_status = 'success', sync_trigger = $4, error_message = NULL, created_at = NOW()
         WHERE id = $5`,
        [jobberClientId, jobberJob.id, jobberJob.jobNumber?.toString() || null, trigger, existingLink.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO jobber_job_links (id, user_id, quote_id, jobber_client_id, jobber_job_id, jobber_job_number, sync_status, sync_trigger, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'success', $6, NOW())`,
        [userId, quoteId, jobberClientId, jobberJob.id, jobberJob.jobNumber?.toString() || null, trigger]
      );
    }

    await logJobberSync(userId, quoteId, "sync_quote", { trigger, quoteId }, {
      jobberClientId,
      jobberJobId: jobberJob.id,
      jobberJobNumber: jobberJob.jobNumber,
    }, "ok");

    return {
      success: true,
      jobberClientId,
      jobberJobId: jobberJob.id,
      jobberJobNumber: jobberJob.jobNumber?.toString() || undefined,
    };
  } catch (error: any) {
    console.error("Jobber sync failed:", error.message);

    if (existingLink.rows.length > 0) {
      await pool.query(
        `UPDATE jobber_job_links SET sync_status = 'failed', error_message = $1 WHERE id = $2`,
        [error.message, existingLink.rows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO jobber_job_links (id, user_id, quote_id, jobber_client_id, jobber_job_id, jobber_job_number, sync_status, sync_trigger, error_message, created_at)
         VALUES (gen_random_uuid(), $1, $2, '', '', NULL, 'failed', $3, $4, NOW())`,
        [userId, quoteId, trigger, error.message]
      );
    }

    await logJobberSync(userId, quoteId, "sync_quote", { trigger, quoteId }, { error: error.message }, "failed", error.message);

    return { success: false, error: error.message };
  }
}
