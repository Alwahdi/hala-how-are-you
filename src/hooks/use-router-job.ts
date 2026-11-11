import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RouterJob = { status: 'pending' | 'sent' | 'done' | 'failed' | 'expired' | string; result: string | null; requested_at: string; sent_at: string | null };
export const jobOver = (j: RouterJob | null | undefined) => !!j && (j.status === 'done' || j.status === 'failed' || j.status === 'expired');

/** Follows one queued router task every 3 seconds until the router answers (or the task expires). */
export function useRouterJob(id: string | null | undefined, onOver?: (j: RouterJob) => void) {
  return useQuery({
    queryKey: ['router-job', id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from('router_jobs').select('status, result, requested_at, sent_at').eq('id', id!).maybeSingle();
      const j = data as RouterJob | null;
      if (j && jobOver(j)) onOver?.(j);
      return j;
    },
    refetchInterval: (q) => (jobOver(q.state.data as RouterJob | null | undefined) ? false : 3000),
  });
}

/** Where a task stands, in plain words. */
export function jobPhase(j: RouterJob | null | undefined, ar: boolean): { tone: 'wait' | 'ok' | 'bad'; text: string } {
  const t = (a: string, b: string) => (ar ? a : b);
  if (!j || j.status === 'pending') return { tone: 'wait', text: t('ننتظر الراوتر يستلم (عادة أقل من 30 ثانية)...', 'Waiting for the router (usually under 30 seconds)...') };
  if (j.status === 'sent') return Date.now() - Date.parse(j.sent_at ?? j.requested_at) > 90_000
    ? { tone: 'bad', text: t('أرسلنا الأمر والراوتر ما رد. تأكد بعد دقيقة.', 'Sent, but the router did not reply. Check again in a minute.') }
    : { tone: 'wait', text: t('الراوتر ينفذ...', 'The router is on it...') };
  if (j.status === 'expired') return { tone: 'bad', text: t('الراوتر ما استلم خلال 5 دقائق، فألغيناه.', "The router didn't pick it up within 5 minutes, so we cancelled it.") };
  if (j.status === 'failed') {
    const r = (j.result ?? '').split(':')[0];
    if (r === 'missing') return { tone: 'bad', text: t('ما لقيناه على الراوتر.', 'Not found on the router.') };
    if (r === 'exists') return { tone: 'bad', text: t('فيه واحد بنفس الاسم على الراوتر.', 'Something with that name already exists on the router.') };
    return { tone: 'bad', text: t('الراوتر رفض الأمر.', 'The router refused it.') };
  }
  return { tone: 'ok', text: t('تم على الراوتر.', 'Done on the router.') };
}
