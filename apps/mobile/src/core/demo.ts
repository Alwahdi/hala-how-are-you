import { Gateway } from "./gateway";
import { Card, Issue, Journal, PilotError, Plan, Router } from "./types";
export const demoRouter: Router = {
  id: "demonstration-router",
  name: "شبكة توضيحية / Sample network",
  version: "7.demo",
  endpoint: { host: "example.invalid", port: 8729, explicitPort: false },
  protected: true,
  identityVerified: false,
};
const plan: Plan = {
  routerId: demoRouter.id,
  source: "hotspot",
  id: "demo-plan",
  name: "باقة توضيحية / Sample plan",
  fingerprint: "demonstration-only",
  bytes: 600000000,
  seconds: 18000,
  validity: "2d",
  supported: true,
  price: "100",
};
export class DemoGateway implements Gateway {
  router = demoRouter;
  outcome: "confirmed" | "rejected" | "unknown" = "confirmed";
  private cards: Card[] = [
    {
      routerId: demoRouter.id,
      source: "hotspot",
      id: "demo-card",
      name: "00123874",
      plan: plan.name,
      usedBytes: 600000000,
      limitBytes: 600000000,
      usedSeconds: 1200,
      limitSeconds: 18000,
      disabled: false,
      validity: "valid",
      readAt: Date.now(),
    },
  ];
  async plans() {
    return { plans: [{ ...plan }], unavailable: [] };
  }
  async inspect(name: string) {
    return {
      cards: this.cards.filter((c) => c.name === name).map((c) => ({ ...c, readAt: Date.now() })),
      unavailable: [],
    };
  }
  async issue(issue: Issue, journal: Journal) {
    if (issue.routerId !== this.router.id || issue.plan.routerId !== this.router.id)
      throw new PilotError("identity");
    if (this.cards.some((c) => c.name === issue.name)) throw new PilotError("conflict");
    await journal.insert(issue);
    if (this.outcome === "rejected") {
      await journal.update(issue.id, { state: "rejected" });
      return (await journal.get(issue.id))!;
    }
    this.cards.push({
      routerId: this.router.id,
      source: issue.plan.source,
      id: issue.id,
      name: issue.name,
      plan: issue.plan.name,
      usedBytes: 0,
      limitBytes: issue.bytes,
      usedSeconds: 0,
      limitSeconds: issue.seconds,
      disabled: false,
      validity: "not-started",
      readAt: Date.now(),
    });
    await journal.update(issue.id, { state: this.outcome === "unknown" ? "unknown" : "confirmed" });
    return (await journal.get(issue.id))!;
  }
  async verify(issue: Issue, journal: Journal) {
    if (this.outcome !== "unknown") await journal.update(issue.id, { state: "confirmed" });
    return (await journal.get(issue.id))!;
  }
}
