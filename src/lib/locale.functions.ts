import { createServerFn } from '@tanstack/react-start';
import { resolveLanguage } from './locale';

export const getInitialLanguage = createServerFn({ method: 'GET' }).handler(async () => {
  const { getCookie, getRequestHeader, setResponseHeader } = await import('@tanstack/react-start/server');
  setResponseHeader('Cache-Control', 'private, no-store');
  setResponseHeader('Vary', 'Cookie, Accept-Language');
  return resolveLanguage(getCookie('mikro-language'), getRequestHeader('accept-language'));
});