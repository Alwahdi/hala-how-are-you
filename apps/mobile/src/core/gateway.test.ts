import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LiveGateway } from "./gateway";
import { MemoryJournal } from "./memory";
import { Api, Issue, PilotError, Router, Row, Source } from "./types";
class FixtureRouter implements Api {
  router: Router = {
    id: "TEST-HARDWARE",
    name: "Test router",
    version: "7.20",
    endpoint: { host: "127.0.0.1", port: 8728, explicitPort: true },
    protected: false,
    identityVerified: true,
  };
  accounts: Row[] = [];
  links: Row[] = [];
  adds = 0;
  closed = false;
  loss: "none" | "after-add" | "reject-add" | "link" = "none";
  serial = "TEST-HARDWARE";
  missingProof = false;
  profileChanged = false;
  async request(words: string[]) {
    const cmd = words[0]!;
    const arg = (name: string) =>
      words.find((w) => w.startsWith("=" + name + "="))?.slice(name.length + 2);
    const source: Source = cmd.includes("/tool/user-manager/")
      ? "um6"
      : cmd.includes("/user-manager/")
        ? "um7"
        : "hotspot";
    if (cmd === "/system/resource/print") return [{ version: this.router.version }];
    if (cmd === "/system/identity/print") return [{ name: this.router.name }];
    if (cmd === "/system/routerboard/print") return [{ "serial-number": this.serial }];
    if (cmd.includes("profile-limitation/print")) return [{ profile: "day", limitation: "limit" }];
    if (cmd.endsWith("/limitation/print"))
      return [{ ".id": "*L1", name: "limit", "transfer-limit": "600000000", "uptime-limit": "5h" }];
    if (cmd.endsWith("/profile/print"))
      return [
        { ".id": "*P1", name: "day", validity: this.profileChanged ? "3d" : "2d", price: "100" },
      ];
    if (cmd.endsWith("/customer/print")) return [{ login: "fixture-customer" }];
    if (cmd === "/user-manager/user-profile/print") return this.links;
    if (cmd === "/user-manager/user-profile/add") {
      if (this.loss === "link") throw new PilotError("lost");
      this.links.push({ profile: arg("profile")!, user: arg("user")! });
      return [];
    }
    if (cmd.endsWith("/user/print")) {
      const query = words.find((w) => w.startsWith("?"));
      const name = query?.slice(query.indexOf("=") + 1);
      return this.accounts
        .filter((a) => (!name || (a.name || a.username) === name) && a.source === source)
        .map((a) => {
          const row = { ...a };
          if (this.missingProof) delete row.password;
          return row;
        });
    }
    if (cmd.endsWith("/user/add")) {
      if (this.loss === "reject-add") throw new PilotError("rejected");
      this.adds++;
      this.accounts.push({
        ".id": "*U" + this.adds,
        source,
        name: arg("name") || "",
        username: arg("username") || "",
        password: arg("password")!,
        profile: arg("profile") || "",
        customer: arg("customer") || "",
        disabled: arg("disabled") === "yes" ? "true" : "false",
        "limit-bytes-total": arg("limit-bytes-total") || "",
        "limit-uptime": arg("limit-uptime") || "",
      });
      if (this.loss === "after-add") throw new PilotError("lost");
      return [];
    }
    if (cmd.endsWith("/create-and-activate-profile")) {
      const account = this.accounts.find((a) => a[".id"] === arg("numbers"))!;
      account["actual-profile"] = arg("profile")!;
      return [];
    }
    if (cmd.endsWith("/user/set")) {
      this.accounts.find((a) => a[".id"] === arg(".id"))!.disabled = "false";
      return [];
    }
    throw new PilotError("rejected");
  }
  close() {
    this.closed = true;
  }
}
async function setup(source: Source = "hotspot") {
  const fixture = new FixtureRouter();
  if (source === "um6") fixture.router.version = "6.49";
  const service = new LiveGateway(fixture.router, async () => fixture),
    store = new MemoryJournal(),
    plan = (await service.plans()).plans.find((p) => p.source === source)!;
  const issue: Issue = {
    id: randomBytes(12).toString("hex"),
    routerId: fixture.router.id,
    plan,
    name: "M" + randomBytes(6).toString("hex"),
    password: randomBytes(18).toString("hex"),
    bytes: 600000000,
    seconds: 18000,
    state: "prepared",
    createdAt: Date.now(),
  };
  return { fixture, service, store, issue };
}
describe("verified local issuance", () => {
  it.each(["hotspot", "um6", "um7"] as Source[])(
    "creates and verifies %s without assuming assignment",
    async (source) => {
      const { fixture, service, store, issue } = await setup(source);
      expect((await service.issue(issue, store)).state).toBe("confirmed");
      expect(fixture.adds).toBe(1);
      expect(fixture.accounts[0]?.disabled).toBe("false");
    },
  );
  it("lost add reply is recovered by reading, never by sending another add", async () => {
    const { fixture, service, store, issue } = await setup();
    fixture.loss = "after-add";
    expect((await service.issue(issue, store)).state).toBe("unknown");
    fixture.loss = "none";
    expect((await service.verify((await store.get(issue.id))!, store)).state).toBe("confirmed");
    expect(fixture.adds).toBe(1);
    await expect(service.issue(issue, store)).rejects.toMatchObject({ code: "conflict" });
    expect(fixture.adds).toBe(1);
  });
  it("explicit rejection is not advertised as issuance", async () => {
    const { fixture, service, store, issue } = await setup();
    fixture.loss = "reject-add";
    expect((await service.issue(issue, store)).state).toBe("rejected");
    expect(fixture.adds).toBe(0);
  });
  it("a partial User Manager account stays disabled until explicit completion", async () => {
    const { fixture, service, store, issue } = await setup("um7");
    fixture.loss = "link";
    expect((await service.issue(issue, store)).state).toBe("unknown");
    expect(fixture.accounts[0]?.disabled).toBe("true");
    fixture.loss = "none";
    const partial = await service.verify((await store.get(issue.id))!, store);
    expect(partial.state).toBe("partial");
    expect(fixture.links).toHaveLength(0);
    expect((await service.verify(partial, store, true)).state).toBe("confirmed");
    expect(fixture.links).toHaveLength(1);
    expect(fixture.adds).toBe(1);
  });
  it("never confirms when ownership proof is missing or mismatched", async () => {
    const { fixture, service, store, issue } = await setup();
    await service.issue(issue, store);
    fixture.missingProof = true;
    expect((await service.verify(issue, store)).state).toBe("unknown");
    fixture.missingProof = false;
    fixture.accounts[0]!.password = randomBytes(18).toString("hex");
    expect((await service.verify(issue, store)).state).toBe("invalidated");
  });
  it("checks router identity and profile version before any new write", async () => {
    const { fixture, service, store, issue } = await setup();
    fixture.serial = "OTHER-TEST-HARDWARE";
    await expect(service.issue(issue, store)).rejects.toMatchObject({ code: "identity" });
    expect(fixture.adds).toBe(0);
    fixture.serial = fixture.router.id;
    fixture.profileChanged = true;
    await expect(service.issue(issue, store)).rejects.toMatchObject({ code: "conflict" });
    expect(await store.list(fixture.router.id)).toEqual([]);
  });
  it("does not silently correct tampered account limits", async () => {
    const { fixture, service, store, issue } = await setup();
    await service.issue(issue, store);
    fixture.accounts[0]!["limit-bytes-total"] = "100";
    expect((await service.verify(issue, store, true)).state).toBe("partial");
    expect(fixture.accounts[0]!["limit-bytes-total"]).toBe("100");
  });
  it("blocks cross-router values before transport or journal writes", async () => {
    const { fixture, service, store, issue } = await setup();
    issue.plan.routerId = "OTHER";
    await expect(service.issue(issue, store)).rejects.toMatchObject({ code: "identity" });
    expect(fixture.adds).toBe(0);
  });
  it("keeps one unresolved request per router and returns copies", async () => {
    const { store, issue } = await setup();
    await store.insert(issue);
    await expect(
      store.insert({ ...issue, id: randomBytes(12).toString("hex") }),
    ).rejects.toMatchObject({ code: "busy" });
    const value = await store.get(issue.id);
    value!.state = "confirmed";
    expect((await store.get(issue.id))!.state).toBe("prepared");
    await store.update(issue.id, { state: "confirmed" });
    await store.insert({ ...issue, id: randomBytes(12).toString("hex") });
  });
});
