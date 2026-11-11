export type RouterRow = { id: string; name: string; last_seen_at: string | null; last_status: unknown; cloud_host: string | null; last_check_error: string | null; direct_port: number | null; role: string; ros_version: string; connection_method: string; direct_tls: boolean | null; cards_synced_at: string | null };
export type Session = { router_id: string; source: string; username: string; address: string | null; mac: string | null; uptime_s: number; bytes: number };
export type ProfileRow = { router_id: string; source: string; name: string; rate_limit: string | null; shared_users: string | null; validity: string | null; price: string | null };
export type Source = 'hotspot' | 'usermanager';
