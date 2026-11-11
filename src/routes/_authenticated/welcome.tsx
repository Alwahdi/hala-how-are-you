import { createFileRoute, redirect } from '@tanstack/react-router';

// Account details are now the first steps of onboarding.
export const Route = createFileRoute('/_authenticated/welcome')({
  beforeLoad: () => { throw redirect({ to: '/onboarding', replace: true }); },
});
