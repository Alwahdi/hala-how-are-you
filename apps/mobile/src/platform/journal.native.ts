import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import { Buffer } from "buffer";
import { Issue, Journal, PilotError, Router } from "../core/types";
export async function openJournal(): Promise<Journal> {
  let key = await SecureStore.getItemAsync("mikro-pilot-database-key");
  if (!key) {
    key = Buffer.from(await Crypto.getRandomBytesAsync(32)).toString("hex");
    await SecureStore.setItemAsync("mikro-pilot-database-key", key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  if (!/^[a-f0-9]{64}$/.test(key)) throw new PilotError("storage");
  const db = await SQLite.openDatabaseAsync("mikro-pilot.db");
  try {
    await db.execAsync(`PRAGMA key = "x'${key}'";`);
    const cipher = await db.getFirstAsync<Record<string, string>>("PRAGMA cipher_version");
    if (!cipher || !Object.values(cipher).some((v) => typeof v === "string" && v.length > 0))
      throw new PilotError("storage");
    await db.execAsync(
      `PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS routers(id TEXT PRIMARY KEY, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS issues(id TEXT PRIMARY KEY, router_id TEXT NOT NULL, state TEXT NOT NULL, payload TEXT NOT NULL); CREATE UNIQUE INDEX IF NOT EXISTS one_pending_per_router ON issues(router_id) WHERE state IN ('prepared','sent','partial','unknown');`,
    );
    return new DeviceJournal(db);
  } catch {
    await db.closeAsync();
    throw new PilotError("storage");
  }
}
class DeviceJournal implements Journal {
  constructor(private db: SQLite.SQLiteDatabase) {}
  async routers() {
    return (await this.db.getAllAsync<{ payload: string }>("SELECT payload FROM routers")).map(
      (r) => JSON.parse(r.payload) as Router,
    );
  }
  async saveRouter(router: Router) {
    await this.db.runAsync(
      "INSERT INTO routers(id,payload) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload",
      router.id,
      JSON.stringify(router),
    );
  }
  async list(routerId: string) {
    return (
      await this.db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM issues WHERE router_id=? ORDER BY rowid DESC",
        routerId,
      )
    ).map((r) => JSON.parse(r.payload) as Issue);
  }
  async get(id: string) {
    const row = await this.db.getFirstAsync<{ payload: string }>(
      "SELECT payload FROM issues WHERE id=?",
      id,
    );
    return row ? (JSON.parse(row.payload) as Issue) : null;
  }
  async insert(issue: Issue) {
    try {
      await this.db.runAsync(
        "INSERT INTO issues(id,router_id,state,payload) VALUES(?,?,?,?)",
        issue.id,
        issue.routerId,
        issue.state,
        JSON.stringify(issue),
      );
    } catch {
      throw new PilotError("busy");
    }
  }
  async update(id: string, update: Partial<Issue>) {
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      const row = await tx.getFirstAsync<{ payload: string }>(
        "SELECT payload FROM issues WHERE id=?",
        id,
      );
      if (!row) throw new PilotError("storage");
      const current = JSON.parse(row.payload) as Issue;
      const next = {
        ...current,
        state: update.state ?? current.state,
        accountId: update.accountId ?? current.accountId,
        reason: update.state === "confirmed" ? undefined : (update.reason ?? current.reason),
      };
      await tx.runAsync(
        "UPDATE issues SET state=?,payload=? WHERE id=?",
        next.state,
        JSON.stringify(next),
        id,
      );
    });
  }
}
