import { AlertTriangle, Ban, CircleDashed, Wifi } from 'lucide-react';
import type { CardState } from '@/lib/specimen-data';

export const stateLabel = (s: CardState, ar: boolean) => ({ unused: ar ? 'لم يُستخدم بعد' : 'Not used yet', inUse: ar ? 'قيد الاستخدام' : 'In use', almostFinished: ar ? 'قارب على الانتهاء' : 'Almost finished', disabled: ar ? 'معطّل' : 'Disabled' })[s];
export const StateIcon = ({ state, size = 14 }: { state: CardState; size?: number }) => state === 'disabled' ? <Ban size={size} aria-hidden="true"/> : state === 'almostFinished' ? <AlertTriangle size={size} aria-hidden="true"/> : state === 'inUse' ? <Wifi size={size} aria-hidden="true"/> : <CircleDashed size={size} aria-hidden="true"/>;
export function CardStateChip({ state, ar }: { state: CardState; ar: boolean }) {
  return <span className={`status-chip status-chip--${state}`}><StateIcon state={state}/>{stateLabel(state, ar)}</span>;
}
export function UsageBar({ ratio, state, label }: { ratio: number; state: CardState; label: string }) {
  const pct = Math.max(0, Math.min(100, ratio * 100));
  return <div className={`usage-bar usage-bar--${state}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}><span style={{ inlineSize: pct > 0 ? `max(${pct}%, 12px)` : "0%" }}/></div>;
}
