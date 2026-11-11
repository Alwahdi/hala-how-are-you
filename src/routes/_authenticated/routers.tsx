import { createFileRoute, redirect } from '@tanstack/react-router';

// Old address: router management now lives in the dashboard's Network tab.
export const Route = createFileRoute('/_authenticated/routers')({
  beforeLoad: () => { throw redirect({ to: '/dashboard', search: { tab: 'network' }, replace: true }); },
});
