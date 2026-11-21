import { Issue, Journal, PilotError, Router } from "./types";
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export class MemoryJournal implements Journal {
  private accounts = new Map<string, Router>();
  private issues = new Map<string, Issue>();
  async routers() {
    return [...this.accounts.values()].map(copy);
  }
  async saveRouter(router: Router) {
    this.accounts.set(router.id, copy(router));
  }
  async list(routerId: string) {
    return [...this.issues.values()]
      .filter((i) => i.routerId === routerId)
      .map(copy)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  async get(id: string) {
    return this.issues.has(id) ? copy(this.issues.get(id)!) : null;
  }
  async insert(issue: Issue) {
    if (
      this.issues.has(issue.id) ||
      [...this.issues.values()].some(
        (i) =>
          i.routerId === issue.routerId &&
          !["confirmed", "rejected", "invalidated"].includes(i.state),
      )
    )
      throw new PilotError("busy");
    this.issues.set(issue.id, copy(issue));
  }
  async update(id: string, value: Partial<Issue>) {
    const current = this.issues.get(id);
    if (!current) throw new PilotError("storage");
    this.issues.set(id, copy({ ...current, ...value, id: current.id, routerId: current.routerId }));
  }
}
