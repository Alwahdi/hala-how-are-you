export type Source = "hotspot" | "um6" | "um7";
export type Language = "ar" | "en";
export type Row = Record<string, string>;
export type Endpoint = { host: string; port: number; explicitPort: boolean };
export type Router = {
  id: string;
  name: string;
  version: string;
  endpoint: Endpoint;
  protected: boolean;
  identityVerified: boolean;
};
export type Plan = {
  routerId: string;
  source: Source;
  id: string;
  name: string;
  fingerprint: string;
  bytes: number | null;
  seconds: number | null;
  validity: string | null;
  price?: string;
  supported: boolean;
};
export type Card = {
  routerId: string;
  source: Source;
  id: string;
  name: string;
  plan: string;
  usedBytes: number | null;
  limitBytes: number | null;
  usedSeconds: number | null;
  limitSeconds: number | null;
  disabled: boolean;
  validity: "expired" | "valid" | "not-started" | "unknown";
  readAt: number;
};
export type IssueState =
  | "prepared"
  | "sent"
  | "partial"
  | "unknown"
  | "confirmed"
  | "rejected"
  | "invalidated";
export type Issue = {
  id: string;
  routerId: string;
  plan: Plan;
  name: string;
  password: string;
  bytes: number | null;
  seconds: number | null;
  state: IssueState;
  accountId?: string;
  reason?: "not-found" | "proof" | "profile" | "limits" | "association";
  createdAt: number;
  demo?: boolean;
};
export type ErrorCode =
  | "address"
  | "port"
  | "unreachable"
  | "timeout"
  | "certificate"
  | "auth"
  | "legacy-login"
  | "rejected"
  | "lost"
  | "cancelled"
  | "protocol"
  | "busy"
  | "identity"
  | "unsupported"
  | "conflict"
  | "storage"
  | "unknown";
export class PilotError extends Error {
  constructor(public readonly code: ErrorCode) {
    super(code);
    this.name = "PilotError";
  }
}
export interface Api {
  request(words: string[], signal?: AbortSignal): Promise<Row[]>;
  close(): void;
}
export interface Journal {
  routers(): Promise<Router[]>;
  saveRouter(router: Router): Promise<void>;
  list(routerId: string): Promise<Issue[]>;
  get(id: string): Promise<Issue | null>;
  insert(issue: Issue): Promise<void>;
  update(id: string, update: Partial<Issue>): Promise<void>;
}
