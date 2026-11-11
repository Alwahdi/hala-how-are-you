import { useEffect } from 'react';
/** Publishes the on-screen keyboard height as --kb and keeps focused dialog fields visible on phones. */
export function useMobileKeyboard() {
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const root = document.documentElement;
    const update = () => { const kb = Math.max(0, window.innerHeight - vv.height - vv.offsetTop); root.style.setProperty('--kb', `${Math.round(kb)}px`); root.style.setProperty('--vvh', `${Math.round(vv.height)}px`); };
    const onFocus = (e: FocusEvent) => { const el = e.target as HTMLElement; if (el.matches?.('input,textarea') && el.closest('[role=dialog]')) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300); };
    update(); vv.addEventListener('resize', update); vv.addEventListener('scroll', update); document.addEventListener('focusin', onFocus);
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update); document.removeEventListener('focusin', onFocus); };
  }, []);
}
