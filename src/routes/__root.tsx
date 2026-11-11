import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { getInitialLanguage } from '@/lib/locale.functions';
import { LanguageContext } from '@/components/language-provider';
import { useLanguage } from '@/components/language-provider';
import { useMobileKeyboard } from '@/hooks/use-mobile-keyboard';
import { EarlyAccessProvider } from '@/components/early-access-context';
import { Button } from '@/components/ui/button';
import type { Language } from '@/lib/locale';

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  const { ar } = useLanguage();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{ar ? 'الصفحة غير موجودة' : 'Page not found'}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? 'الرابط غير صحيح أو الصفحة انتقلت. تقدر ترجع إلى Mikro.' : 'This page may have moved or the link is incorrect. You can return to Mikro.'}
        </p>
        <div className="mt-6">
          <Button asChild><Link to="/">{ar ? 'العودة إلى Mikro' : 'Back to Mikro'}</Link></Button>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  const { ar } = useLanguage();
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {ar ? 'ما قدرنا نفتح الصفحة' : "This page didn't load"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ar ? 'حصل خطأ عندنا. جرّب مرة ثانية أو ارجع إلى Mikro.' : 'Something went wrong on our end. Try again or return to Mikro.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {ar ? 'جرّب مرة ثانية' : 'Try again'}
          </Button>
          <Button asChild variant="outline"><Link to="/">{ar ? 'العودة إلى Mikro' : 'Back to Mikro'}</Link></Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // Language is decided once on the server; a re-run (HMR, retry) during a network blip keeps the current page language instead of blanking the app.
  loader: async () => {
    try {
      return await getInitialLanguage();
    } catch {
      if (typeof document !== 'undefined') return document.documentElement.lang === 'en' ? 'en' : 'ar';
      throw new Error('language unavailable');
    }
  },
  staleTime: Infinity,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mikro by Alwahdi" },
      { name: "description", content: "Mikro network operations by Alwahdi" },
      { name: "author", content: "Alwahdi" },
      { property: "og:title", content: "Mikro by Alwahdi" },
      { property: "og:description", content: "Mikro network operations by Alwahdi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0b1210" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Mikro" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const initialLanguage = Route.useLoaderData();
  const [language, updateLanguage] = useState<Language>(initialLanguage ?? 'ar');
  useMobileKeyboard();
  const setLanguage = (value: Language) => {
    document.cookie = `mikro-language=${value}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`;
    updateLanguage(value);
  };
  return (
    <html lang={language} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <head>
        <HeadContent />
      </head>
      <body>
        <LanguageContext.Provider value={{ language, setLanguage }}><EarlyAccessProvider>{children}</EarlyAccessProvider></LanguageContext.Provider>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
