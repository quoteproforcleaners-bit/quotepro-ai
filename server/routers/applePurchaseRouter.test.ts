import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  query: vi.fn(), connect: vi.fn(), release: vi.fn(), decode: vi.fn(), subscriber: vi.fn(), correlate: vi.fn(),
}));
vi.mock("../db", () => ({ pool: { query: mocks.query, connect: mocks.connect } }));
vi.mock("../middleware", () => ({ authLimiter: (_r: any, _s: any, next: any) => next() }));
vi.mock("../helpers", () => ({ formatUser: (user: any) => user }));
vi.mock("../storage", () => ({
  getUserById: async (id: string) => ({ id, authProvider: "apple_purchase" }),
  getBusinessByOwner: async () => ({ onboardingComplete: true }),
}));
vi.mock("../services/applePurchaseEvidence", () => ({
  decodeAppleProof: mocks.decode, fetchPurchaseSubscriber: mocks.subscriber, correlateAppleEvidence: mocks.correlate,
}));
import router from "./applePurchaseRouter";
const handle = (path: string) => (router.stack.find((l: any) => l.route?.path === path) as any).route.stack.at(-1).handle;
function response() {
  return { code: 200, body: null as any, setHeader: vi.fn(), status(n: number) { this.code = n; return this; },
    json(data: any) { this.body = data; return this; } };
}
function request() {
  const session: any = { purchaseIdentity: "server-minted-id", regenerate: (cb: any) => cb(), save: (cb: any) => cb() };
  return { session, body: { signedTransactions: ["apple-signed-proof"], userId: "attacker-selected-id", tier: "pro" } };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.includes("SELECT DISTINCT") ? [{ user_id: "original-business-owner" }] :
      sql.includes("SELECT auth_provider") ? [{ auth_provider: "apple_purchase" }] : [],
  }));
  mocks.decode.mockResolvedValue({});
  mocks.subscriber.mockResolvedValue({});
  mocks.correlate.mockReturnValue({
    access: { tier: "starter", expiresAt: new Date(Date.now() + 60000).toISOString(), platform: "revenuecat" },
    anchors: [{ environment: "Production", originalId: "original-apple-transaction", productId: "quotepro_basic_weekly", purchasedAt: Date.now() }],
  });
});
describe("passwordless business recovery", () => {
  it("provisions a new paid owner's business without email, password or a client identity", async () => {
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes("activated_at") ? [{ activated_at: new Date(Date.now() - 60000) }] :
        sql.includes("SELECT auth_provider") ? [{ auth_provider: "apple_purchase" }] : [],
    }));
    const req = request(), res = response();
    await handle("/auth/apple-purchase")(req, res);
    expect(res.code).toBe(200);
    expect(req.session.userId).not.toBe("attacker-selected-id");
    expect(mocks.query.mock.calls.filter(([sql]) => sql.includes("INSERT INTO users"))).toHaveLength(1);
    expect(mocks.query.mock.calls.filter(([sql]) => sql.includes("INSERT INTO businesses"))).toHaveLength(1);
    expect(res.body.access.tier).toBe("starter");
  });
  it("does not silently create a blank business for an unbound historical purchaser", async () => {
    mocks.query.mockImplementation(async (sql: string) => ({
      rows: sql.includes("activated_at") ? [{ activated_at: new Date(Date.now() + 60000) }] : [],
    }));
    const req = request(), res = response();
    await handle("/auth/apple-purchase")(req, res);
    expect(res.code).toBe(403);
    expect(res.body.message).toContain("Recover your existing");
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes("INSERT INTO users"))).toBe(false);
  });
  it("restores the ledger owner, not a client-selected ID, without creating a new business", async () => {
    const req = request(), res = response();
    await handle("/auth/apple-purchase")(req, res);
    expect(res.code).toBe(200);
    expect(req.session.userId).toBe("original-business-owner");
    expect(mocks.subscriber).toHaveBeenCalledWith("server-minted-id");
    expect(mocks.query.mock.calls.some(([sql]) => sql.includes("INSERT INTO users"))).toBe(false);
  });
  it("rejects recovery without a server-issued purchase session", async () => {
    const req = request(), res = response(); delete req.session.purchaseIdentity;
    await handle("/auth/apple-purchase")(req, res);
    expect(res.code).toBe(401); expect(mocks.connect).not.toHaveBeenCalled();
  });
  it("never grants access if evidence/provider verification fails", async () => {
    mocks.correlate.mockImplementation(() => { throw new Error("invalid"); });
    const req = request(), res = response();
    await handle("/auth/apple-purchase")(req, res);
    expect(res.code).toBe(403); expect(req.session.userId).toBeUndefined();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
  it("rejects attempts to merge two businesses through a shared Apple account", async () => {
    mocks.query.mockResolvedValue({ rows: [{ user_id: "one" }, { user_id: "two" }] });
    const req = request(), res = response();
    await handle("/auth/apple-purchase")(req, res);
    expect(res.code).toBe(403); expect(mocks.query).toHaveBeenCalledWith("ROLLBACK");
    expect(req.session.userId).toBeUndefined();
  });
  it("refuses to charge when the ownership migration is absent", async () => {
    mocks.query.mockRejectedValue(new Error("missing table"));
    const req = request(), res = response();
    await handle("/auth/purchase-session")(req, res);
    expect(res.code).toBe(503); expect(mocks.subscriber).not.toHaveBeenCalled();
  });
});
