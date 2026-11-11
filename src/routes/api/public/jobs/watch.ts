import { createFileRoute } from '@tanstack/react-router';
import { authenticateCronRequest } from '@/integrations/supabase/cron-auth';
import { evaluateRouter, cardsToClean, localClock, lowPackages, type WatchState } from '@/lib/watch-rules';
import { checkHealth, healthScore } from '@/lib/router-health';
import { cardState, type CardRow } from '@/lib/card-status';

// Runs every minute from the scheduler: router down/up, strain, restarts, low cards, daily report, nightly cleanup, health.
export const Route = createFileRoute('/api/public/jobs/watch')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { supabaseAdmin: sb } = await import('@/integrations/supabase/client.server');
        const { notify } = await import('@/lib/notify.server');
        const now = Date.now();
        await sb.rpc('mark_finished_cards');
        // Tasks the router never picked up (offline) expire after 15 minutes.
        await sb.from('router_jobs').update({ status: 'expired' }).in('status', ['pending', 'sent']).lt('requested_at', new Date(now - 15 * 60_000).toISOString()).eq('kind', 'remove_cards');
        await sb.from('router_jobs').update({ status: 'done', done_at: new Date(now).toISOString() }).eq('kind', 'reboot').eq('status', 'sent').lt('sent_at', new Date(now - 15 * 60_000).toISOString());
        await sb.from('router_jobs').update({ status: 'expired' }).eq('kind', 'reboot').eq('status', 'pending').lt('requested_at', new Date(now - 15 * 60_000).toISOString());

        const { data: routers } = await sb.from('routers').select('id, owner_id, name, last_seen_at, last_status, watch_state, health, health_checked_at');
        const owners = new Set<string>();
        for (const r of routers ?? []) {
          owners.add(r.owner_id);
          const st = (r.last_status ?? {}) as Record<string, never>;
          const { alerts, state } = evaluateRouter(r.name, r.last_seen_at, st, (r.watch_state ?? {}) as WatchState, now);
          const patch: Record<string, unknown> = { watch_state: state };
          for (const a of alerts) {
            await notify(sb, { owner: r.owner_id, router: r.id, kind: a.kind, key: `${r.id}:${a.key}`, title: a.ar[0], body: a.ar[1], path: '/dashboard?tab=more', severity: a.severity, dedupHours: 24 });
            await sb.from('router_events').insert({ router_id: r.id, owner_id: r.owner_id, kind: a.kind, detail: { en: a.en[0] } });
            if (a.kind === 'router_restart' && a.severity === 'ok') await sb.from('router_jobs').update({ status: 'done', done_at: new Date(now).toISOString(), result: 'restarted' }).eq('router_id', r.id).eq('kind', 'reboot').eq('status', 'sent');
          }
          // Health: re-check every 6 hours from the latest report; alert only new critical problems (once a week each).
          if (r.last_seen_at && (!r.health_checked_at || now - new Date(r.health_checked_at).getTime() > 6 * 3600_000)) {
            const issues = checkHealth(st as never, now);
            patch['health'] = { score: healthScore(issues), issues: issues.map((i) => i.id) };
            patch['health_checked_at'] = new Date(now).toISOString();
            for (const i of issues.filter((x) => x.severity === 'critical')) await notify(sb, { owner: r.owner_id, router: r.id, kind: 'health', key: `${r.id}:health:${i.id}`, title: `${r.name}: ${i.ar[0]}`, body: i.ar[1], path: '/health', severity: 'critical', dedupHours: 24 * 7 });
          }
          await sb.from('routers').update(patch as never).eq('id', r.id);
        }

        for (const owner of owners) {
          const { data: prefs } = await sb.from('alert_prefs').select('*').eq('owner_id', owner).maybeSingle();
          const p = prefs ?? { report_hour: 21, utc_offset_min: 180, auto_cleanup: true, cleanup_after_days: 3, last_report_on: null, last_cleanup_on: null };
          const { date, hour } = localClock(p.utc_offset_min, now);
          const mine = (routers ?? []).filter((r) => r.owner_id === owner);
          const ids = mine.map((r) => r.id);
          const needCards = hour === p.report_hour || hour === 3 || new Date(now).getUTCMinutes() % 30 === 0;
          if (!needCards || !ids.length) continue;
          const { data: cards } = await sb.from('router_cards').select('router_id, name, source, profile, uptime_s, bytes, limit_uptime_s, limit_bytes, disabled, finished_at, first_seen_at').in('router_id', ids).limit(20000);
          const list = (cards ?? []) as (CardRow & { finished_at: string | null })[];
          for (const pk of lowPackages(list.map((c) => ({ profile: c.profile, state: cardState(c) })))) {
            await notify(sb, { owner, kind: 'cards_low', key: `cards_low:${pk.name}:${date}`, title: `باقي ${pk.ready} كرت جاهز في «${pk.name}»`, body: 'جهّز دفعة جديدة قبل ما تخلص الكروت عند الموزعين.', path: '/dashboard?tab=cards&filter=unused', severity: 'warn', dedupHours: 20 });
          }
          if (hour === p.report_hour && p.last_report_on !== date) {
            const { data: log } = await sb.from('router_status_log').select('status').in('router_id', ids).gte('created_at', new Date(now - 86400_000).toISOString()).limit(2000);
            const peak = Math.max(0, ...(log ?? []).map((l) => { const s = l.status as { hotspotActive?: number; umActive?: number }; return (s.hotspotActive ?? 0) + (s.umActive ?? 0); }));
            const { count: downs } = await sb.from('router_events').select('id', { count: 'exact', head: true }).eq('owner_id', owner).eq('kind', 'router_down').gte('created_at', new Date(now - 86400_000).toISOString());
            const fresh = list.filter((c) => now - new Date(c.first_seen_at).getTime() < 86400_000).length;
            const ready = list.filter((c) => cardState(c) === 'unused').length;
            await notify(sb, { owner, kind: 'daily_report', key: `report:${date}`, title: 'تقرير شبكتك اليوم', body: `أعلى عدد متصلين: ${peak} · كروت جديدة: ${fresh} · جاهزة للبيع: ${ready} · انقطاعات: ${downs ?? 0}`, path: '/dashboard', severity: 'info', dedupHours: 20 });
            await sb.from('alert_prefs').upsert({ owner_id: owner, last_report_on: date }, { onConflict: 'owner_id' });
          }
          if (hour === 3 && p.auto_cleanup && p.last_cleanup_on !== date) {
            let total = 0;
            for (const id of ids) {
              const names = cardsToClean(list.filter((c) => c.router_id === id), p.cleanup_after_days, now);
              const rows = Array.from({ length: Math.ceil(names.length / 40) }, (_, i) => ({ router_id: id, owner_id: owner, kind: 'remove_cards', auto: true, payload: { names: names.slice(i * 40, i * 40 + 40) } }));
              if (rows.length) await sb.from('router_jobs').insert(rows);
              total += names.length;
            }
            await sb.from('alert_prefs').upsert({ owner_id: owner, last_cleanup_on: date }, { onConflict: 'owner_id' });
            if (total) await notify(sb, { owner, kind: 'cleanup', key: `cleanup:${date}`, title: `صيانة الليل: إزالة ${total} كرت منتهي`, body: `كروت Hotspot منتهية منذ ${p.cleanup_after_days} أيام أو أكثر. الراوتر يتأكد من كل كرت قبل حذفه.`, path: '/alerts', severity: 'info', dedupHours: 20 });
          }
        }
        return Response.json({ ok: true, routers: routers?.length ?? 0 });
      },
    },
  },
});
