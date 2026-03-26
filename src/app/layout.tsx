import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import { Box } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import ThemeRegistry from "@/components/shared/ThemeRegistry";
import SessionProvider from "@/components/shared/SessionProvider";
import SnackbarProvider from "@/components/shared/SnackbarProvider";
import RealtimeProvider from "@/components/shared/RealtimeProvider";
import TutorialProvider from "@/components/shared/TutorialProvider";
import KeyboardShortcutsProvider from "@/components/shared/KeyboardShortcutsProvider";
import TutorialSpotlight from "@/components/shared/TutorialSpotlight";
import TutorialCelebration from "@/components/shared/TutorialCelebration";
import TutorialChecklist from "@/components/shared/TutorialChecklist";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { THEME_PALETTES, THEME_NAMES, THEME_STORAGE_KEY, DEFAULT_THEME } from "@/themeConfig";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"] });

export const metadata: Metadata = {
  title: "HRM",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const nonce = headerStore.get("x-nonce") ?? "";
  const locale = await getLocale();
  const messages = await getMessages();

  const foucScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var v=${JSON.stringify(Object.fromEntries(THEME_NAMES.map((name) => [name, Object.entries(THEME_PALETTES[name]).map(([k, v]) => ["--hrm-" + k, v])])))};var p=v[t]||v["${DEFAULT_THEME}"];var s=document.documentElement.style;for(var i=0;i<p.length;i++)s.setProperty(p[i][0],p[i][1])}catch(e){}})()`;

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: foucScript }} />
      </head>
      <body style={{ fontFamily: inter.style.fontFamily }}>
        <style
          nonce={nonce}
        >{`.skip-link{position:absolute;top:-40px;left:0;padding:8px 16px;z-index:1500;background:var(--hrm-green400);color:var(--hrm-slate700);font-weight:600;text-decoration:none}.skip-link:focus{top:0}`}</style>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <SessionProvider>
          <AppRouterCacheProvider options={{ nonce }}>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ThemeRegistry>
                <SnackbarProvider>
                  <RealtimeProvider>
                    <KeyboardShortcutsProvider>
                      <TutorialProvider>
                        <Box
                          component="main"
                          id="main-content"
                          sx={{
                            maxWidth: "1280px",
                            mx: "auto",
                            px: { xs: 1.5, sm: 2, md: 3 },
                            pt: 2,
                            pb: 2,
                          }}
                        >
                          {children}
                        </Box>
                        <TutorialSpotlight />
                        <TutorialCelebration />
                        <TutorialChecklist />
                      </TutorialProvider>
                    </KeyboardShortcutsProvider>
                  </RealtimeProvider>
                </SnackbarProvider>
              </ThemeRegistry>
            </NextIntlClientProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
