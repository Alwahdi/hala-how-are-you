export function actionHistoryLabel(kind: string, payload: Record<string, unknown> | null, ar: boolean, auto = false): string {
  const t=(a:string,b:string)=>ar?a:b;
  const actions: Record<string,[string,string]>={on:['تشغيل كرت','Enable card'],off:['إيقاف كرت','Disable card'],del:['حذف كرت','Remove card'],renew:['تجديد كرت','Renew card'],kick:['فصل جلسة','Disconnect session'],rename:['تغيير رقم كرت','Rename card'],comment:['تعديل ملاحظة','Edit note'],add:['إضافة باقة','Add package'],edit:['تعديل باقة','Edit package']};
  if(kind==='reboot') return t('إعادة تشغيل الراوتر','Router restart');
  if(kind==='remove_cards') return t('إزالة كروت خلص رصيدها','Remove used-up cards')+(auto?t(' · صيانة تلقائية',' · Automatic maintenance'):'');
  const action=typeof payload?.action==='string'?payload.action:'';
  if(kind==='card_action') return actions[action]?t(...actions[action]):t('إجراء على كرت','Card action');
  if(kind==='card_bulk') return t('إجراء جماعي على الكروت','Bulk card action')+(actions[action]?` · ${t(...actions[action])}`:'');
  if(kind==='package') return action==='del'?t('حذف باقة','Remove package'):actions[action]?t(...actions[action]):t('إجراء على باقة','Package action');
  return t('إجراء على الراوتر','Router action');
}