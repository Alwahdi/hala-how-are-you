import { Api, Card, Issue, Journal, PilotError, Plan, Router, Row, Source } from "./types";
import { duration, knownLimit, numberOrNull } from "./records";
export const paths: Record<Source, { user: string; profile: string; field: string }> = {
  hotspot: { user: "/ip/hotspot/user", profile: "/ip/hotspot/user/profile", field: "name" },
  um6: {
    user: "/tool/user-manager/user",
    profile: "/tool/user-manager/profile",
    field: "username",
  },
  um7: { user: "/user-manager/user", profile: "/user-manager/profile", field: "name" },
};
const stable = (value: Row) =>
  JSON.stringify(
    Object.keys(value)
      .sort()
      .map((k) => [k, value[k]]),
  );
const addKnown = (a: number | null, b: number | null) =>
  a === null || b === null || !Number.isSafeInteger(a + b) ? null : a + b;
export async function routerIdentity(
  api: Api,
): Promise<Pick<Router, "id" | "name" | "version" | "identityVerified">> {
  const resource = (await api.request(["/system/resource/print", "=.proplist=version"]))[0];
  const identity = (await api.request(["/system/identity/print", "=.proplist=name"]))[0];
  if (!resource?.version || !/^[67]\./.test(resource.version)) throw new PilotError("unsupported");
  let hardware = "";
  try {
    hardware =
      (await api.request(["/system/routerboard/print", "=.proplist=serial-number"]))[0]?.[
        "serial-number"
      ] || "";
  } catch (e) {
    if (!(e instanceof PilotError) || e.code !== "rejected") throw e;
  }
  if (!hardware) {
    try {
      hardware =
        "license:" +
        ((await api.request(["/system/license/print", "=.proplist=system-id"]))[0]?.["system-id"] ||
          "");
    } catch (e) {
      if (!(e instanceof PilotError) || e.code !== "rejected") throw e;
    }
  }
  if (!hardware || hardware === "license:") throw new PilotError("identity");
  return {
    id: hardware,
    name: identity?.name || "MikroTik",
    version: resource.version,
    identityVerified: true,
  };
}
async function profileRows(api: Api, router: Router, source: Source): Promise<Plan[]> {
  const p = paths[source];
  const rows = await api.request([
    p.profile + "/print",
    "=.proplist=.id,name,validity,price,starts-at,starts-when,rate-limit,on-login,shared-users",
  ]);
  let links: Row[] = [],
    limits: Row[] = [];
  if (source !== "hotspot") {
    const base = source === "um6" ? "/tool/user-manager/profile" : "/user-manager";
    links = await api.request([base + "/profile-limitation/print"]);
    limits = await api.request([base + "/limitation/print"]);
  }
  return rows
    .filter((row) => row.name && row[".id"])
    .map((row) => {
      const matched = links.filter(
        (link) => link.profile === row.name || link.profile === row[".id"],
      );
      const limit =
        matched.length === 1
          ? limits.find(
              (l) => l.name === matched[0]!.limitation || l[".id"] === matched[0]!.limitation,
            )
          : undefined;
      const known = source === "hotspot" || (matched.length === 1 && !!limit);
      return {
        routerId: router.id,
        source,
        id: row[".id"]!,
        name: row.name!,
        fingerprint: stable(row) + stable(matched[0] || {}) + stable(limit || {}),
        bytes: source === "hotspot" ? null : knownLimit(numberOrNull(limit?.["transfer-limit"])),
        seconds: source === "hotspot" ? null : knownLimit(duration(limit?.["uptime-limit"])),
        validity: row.validity || null,
        price: row.price,
        supported: known,
      };
    });
}
export interface Gateway {
  router: Router;
  plans(): Promise<{ plans: Plan[]; unavailable: Source[] }>;
  inspect(name: string): Promise<{ cards: Card[]; unavailable: Source[] }>;
  issue(issue: Issue, journal: Journal): Promise<Issue>;
  verify(issue: Issue, journal: Journal, complete?: boolean): Promise<Issue>;
}
export class LiveGateway implements Gateway {
  constructor(
    public router: Router,
    private open: () => Promise<Api>,
  ) {}
  private async session<T>(fn: (api: Api) => Promise<T>): Promise<T> {
    const api = await this.open();
    try {
      const who = await routerIdentity(api);
      if (who.id !== this.router.id) throw new PilotError("identity");
      return await fn(api);
    } finally {
      api.close();
    }
  }
  async plans() {
    return this.session(async (api) => {
      const out: Plan[] = [],
        unavailable: Source[] = [];
      for (const source of [
        "hotspot",
        this.router.version.startsWith("6.") ? "um6" : "um7",
      ] as Source[]) {
        try {
          out.push(...(await profileRows(api, this.router, source)));
        } catch (e) {
          if (!(e instanceof PilotError) || e.code !== "rejected") throw e;
          unavailable.push(source);
        }
      }
      return { plans: out, unavailable };
    });
  }
  async inspect(name: string) {
    if (!/^[A-Za-z0-9_.@-]{1,64}$/.test(name)) throw new PilotError("address");
    return this.session(async (api) => {
      const cards: Card[] = [],
        unavailable: Source[] = [];
      for (const source of [
        "hotspot",
        this.router.version.startsWith("6.") ? "um6" : "um7",
      ] as Source[]) {
        const p = paths[source];
        let rows: Row[];
        try {
          rows = await api.request([
            p.user + "/print",
            "=.proplist=.id," +
              p.field +
              ",profile,actual-profile,bytes-in,bytes-out,download-used,upload-used,uptime,uptime-used,limit-bytes-total,limit-uptime,disabled",
            "?" + p.field + "=" + name,
          ]);
        } catch (e) {
          if (e instanceof PilotError && e.code === "rejected") {
            unavailable.push(source);
            continue;
          }
          throw e;
        }
        for (const row of rows) {
          const down = numberOrNull(row[source === "hotspot" ? "bytes-out" : "download-used"]),
            up = numberOrNull(row[source === "hotspot" ? "bytes-in" : "upload-used"]);
          let validity: Card["validity"] = "unknown",
            plan = row.profile || row["actual-profile"] || "—";
          if (source === "um7") {
            const links = await api.request([
              "/user-manager/user-profile/print",
              "=.proplist=user,profile,state,end-time",
              "?user=" + name,
            ]);
            if (links.length === 1) {
              plan = links[0]!.profile || plan;
              validity =
                links[0]!.state === "used" || links[0]!.state === "expired"
                  ? "expired"
                  : links[0]!.state === "running"
                    ? "valid"
                    : links[0]!.state === "waiting"
                      ? "not-started"
                      : "unknown";
            }
          }
          cards.push({
            routerId: this.router.id,
            source,
            id: row[".id"]!,
            name: row[p.field]!,
            plan,
            usedBytes: addKnown(down, up),
            limitBytes: knownLimit(numberOrNull(row["limit-bytes-total"])),
            usedSeconds: duration(row[source === "hotspot" ? "uptime" : "uptime-used"]),
            limitSeconds: knownLimit(duration(row["limit-uptime"])),
            disabled: row.disabled === "true" || row.disabled === "yes",
            validity,
            readAt: Date.now(),
          });
        }
      }
      return { cards, unavailable };
    });
  }
  async issue(issue: Issue, journal: Journal) {
    validateIssue(issue, this.router);
    return this.session(async (api) => {
      const plans = await profileRows(api, this.router, issue.plan.source),
        current = plans.find((p) => p.id === issue.plan.id && p.name === issue.plan.name);
      if (!current?.supported || current.fingerprint !== issue.plan.fingerprint)
        throw new PilotError("conflict");
      const p = paths[issue.plan.source];
      const existing = await api.request([
        p.user + "/print",
        "=.proplist=.id",
        "?" + p.field + "=" + issue.name,
      ]);
      if (existing.length) throw new PilotError("conflict");
      let customer: string | undefined;
      if (issue.plan.source === "um6") {
        const customers = await api.request([
          "/tool/user-manager/customer/print",
          "=.proplist=login",
        ]);
        if (customers.length !== 1 || !customers[0]?.login) throw new PilotError("unsupported");
        customer = customers[0].login;
      }
      await journal.insert(issue);
      await journal.update(issue.id, { state: "sent" });
      try {
        await api.request([
          p.user + "/add",
          "=" + p.field + "=" + issue.name,
          "=password=" + issue.password,
          ...(customer ? ["=customer=" + customer] : []),
          ...(issue.plan.source === "hotspot"
            ? [
                "=profile=" + issue.plan.name,
                "=limit-bytes-total=" + issue.bytes,
                "=limit-uptime=" + issue.seconds + "s",
              ]
            : ["=disabled=yes"]),
        ]);
      } catch (e) {
        await journal.update(issue.id, {
          state: e instanceof PilotError && e.code === "rejected" ? "rejected" : "unknown",
        });
        return (await journal.get(issue.id))!;
      }
      return this.verifyWithApi(api, issue, journal, true);
    });
  }
  async verify(issue: Issue, journal: Journal, complete = false) {
    validateIssue(issue, this.router);
    const stored = await journal.get(issue.id);
    if (!stored || stored.routerId !== this.router.id) throw new PilotError("identity");
    return this.session((api) =>
      this.verifyWithApi(
        api,
        stored,
        journal,
        complete && !["confirmed", "invalidated", "rejected"].includes(stored.state),
      ),
    );
  }
  private async verifyWithApi(
    api: Api,
    issue: Issue,
    journal: Journal,
    complete: boolean,
  ): Promise<Issue> {
    const p = paths[issue.plan.source];
    try {
      const plan = (await profileRows(api, this.router, issue.plan.source)).find(
        (p) => p.id === issue.plan.id && p.name === issue.plan.name,
      );
      if (!plan || plan.fingerprint !== issue.plan.fingerprint) {
        await journal.update(issue.id, { state: "partial", reason: "profile" });
        return (await journal.get(issue.id))!;
      }
      const rows = await api.request([
        p.user + "/print",
        "=.proplist=.id," +
          p.field +
          ",password,profile,actual-profile,customer,disabled,limit-bytes-total,limit-uptime",
        "?" + p.field + "=" + issue.name,
      ]);
      if (rows.length !== 1) {
        await journal.update(issue.id, { state: "unknown", reason: "not-found" });
        return (await journal.get(issue.id))!;
      }
      let row = rows[0]!;
      if (row.password === undefined) {
        await journal.update(issue.id, { state: "unknown", reason: "proof" });
        return (await journal.get(issue.id))!;
      }
      if (row.password !== issue.password) {
        await journal.update(issue.id, { state: "invalidated" });
        return (await journal.get(issue.id))!;
      }
      await journal.update(issue.id, { accountId: row[".id"] });
      if (issue.plan.source === "hotspot") {
        const matched =
          row.profile === issue.plan.name &&
          numberOrNull(row["limit-bytes-total"]) === issue.bytes &&
          duration(row["limit-uptime"]) === issue.seconds &&
          ["false", "no"].includes(row.disabled || "");
        await journal.update(issue.id, {
          state: matched ? "confirmed" : "partial",
          reason: matched ? undefined : "limits",
        });
        return (await journal.get(issue.id))!;
      }
      const linked = async () =>
        issue.plan.source === "um6"
          ? row["actual-profile"] === issue.plan.name
          : (
              await api.request([
                "/user-manager/user-profile/print",
                "=.proplist=.id,profile,user",
                "?user=" + issue.name,
              ])
            ).some((link) => link.profile === issue.plan.name || link.profile === issue.plan.id);
      if (!(await linked())) {
        await journal.update(issue.id, { state: "partial", reason: "association" });
        if (!complete) return (await journal.get(issue.id))!;
        if (issue.plan.source === "um6") {
          if (!row.customer) throw new PilotError("unsupported");
          await api.request([
            p.user + "/create-and-activate-profile",
            "=numbers=" + row[".id"],
            "=customer=" + row.customer,
            "=profile=" + issue.plan.name,
          ]);
          row = (
            await api.request([
              p.user + "/print",
              "=.proplist=.id,actual-profile,password,disabled",
              "?" + p.field + "=" + issue.name,
            ])
          )[0]!;
        } else
          await api.request([
            "/user-manager/user-profile/add",
            "=user=" + issue.name,
            "=profile=" + issue.plan.name,
          ]);
        if (!(await linked())) return (await journal.get(issue.id))!;
      }
      if (row.disabled === "true" || row.disabled === "yes") {
        await journal.update(issue.id, { state: "partial" });
        if (!complete) return (await journal.get(issue.id))!;
        await api.request([p.user + "/set", "=.id=" + row[".id"], "=disabled=no"]);
      }
      const final = (
        await api.request([
          p.user + "/print",
          "=.proplist=.id,password,disabled,actual-profile",
          "?" + p.field + "=" + issue.name,
        ])
      )[0];
      if (final) row = final;
      await journal.update(issue.id, {
        state:
          final?.password === issue.password &&
          ["false", "no"].includes(final.disabled || "") &&
          (await linked())
            ? "confirmed"
            : "partial",
      });
    } catch {
      await journal.update(issue.id, { state: "unknown" });
    }
    return (await journal.get(issue.id))!;
  }
}
export function validateIssue(issue: Issue, router: Router) {
  if (issue.routerId !== router.id || issue.plan.routerId !== router.id || !issue.plan.supported)
    throw new PilotError("identity");
  if (
    (issue.plan.source === "um6" && !router.version.startsWith("6.")) ||
    (issue.plan.source === "um7" && !router.version.startsWith("7."))
  )
    throw new PilotError("unsupported");
  if (!/^[A-Za-z0-9_.@-]{4,32}$/.test(issue.name) || !/^[A-Za-z0-9_-]{12,64}$/.test(issue.password))
    throw new PilotError("address");
  if (
    issue.plan.source === "hotspot" &&
    ![issue.bytes, issue.seconds].every((n) => n !== null && Number.isSafeInteger(n) && n! > 0)
  )
    throw new PilotError("unsupported");
}
