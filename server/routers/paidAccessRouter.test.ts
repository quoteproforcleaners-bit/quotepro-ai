import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../services/paidAccess", () => ({ verifyPaidAccess: vi.fn() }));
import { verifyPaidAccess } from "../services/paidAccess";
import router, { requirePaidAccess } from "./paidAccessRouter";
const verify = vi.mocked(verifyPaidAccess);
function response() {
  const res: any = { locals: {}, status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  res.status.mockReturnValue(res); res.json.mockReturnValue(res);
  return res;
}
beforeEach(() => vi.resetAllMocks());
describe("server subscription enforcement", () => {
  it("rejects unsigned requests without provider calls", async () => {
    const res = response(), next = vi.fn();
    await requirePaidAccess()({ session: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401); expect(verify).not.toHaveBeenCalled(); expect(next).not.toHaveBeenCalled();
  });
  it.each(["free", "starter", "growth", "pro"] as const)("enforces manual and AI access for %s", async tier => {
    verify.mockResolvedValue({ tier, expiresAt: null, platform: null });
    for (const ai of [false, true]) {
      const res = response(), next = vi.fn();
      await requirePaidAccess(ai)({ session: { userId: "authenticated-owner" }, body: { tier: "pro" } } as any, res, next);
      const allowed = tier !== "free" && (!ai || tier !== "starter");
      expect(next.mock.calls.length).toBe(allowed ? 1 : 0);
      if (!allowed) expect(res.status).toHaveBeenCalledWith(403);
    }
  });
  it("fails closed on provider outage", async () => {
    verify.mockRejectedValue(new Error("provider unavailable"));
    const res = response(), next = vi.fn();
    await requirePaidAccess()({ session: { userId: "owner" } } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(503); expect(next).not.toHaveBeenCalled();
  });
  it("sync ignores a forged provider identity or tier", async () => {
    verify.mockResolvedValue({ tier: "free", expiresAt: null, platform: null });
    const layer = router.stack.find((layer: any) => layer.route?.path === "/subscription/sync") as any;
    const res = response();
    await layer.route.stack[0].handle({ session: { userId: "owner" }, body: { appUserId: "someone-else", tier: "pro" } }, res);
    expect(verify).toHaveBeenCalledWith("owner");
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ tier: "free", isOnTrial: false }));
  });
});
