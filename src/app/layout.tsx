import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Box } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import ThemeRegistry from "@/components/ThemeRegistry";
import SessionProvider from "@/components/SessionProvider";
import SnackbarProvider from "@/components/SnackbarProvider";
import TutorialProvider from "@/components/TutorialProvider";
import TutorialSpotlight from "@/components/TutorialSpotlight";
import TutorialCelebration from "@/components/TutorialCelebration";
import TutorialChecklist from "@/components/TutorialChecklist";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { THEME_PALETTES, THEME_NAMES, THEME_STORAGE_KEY, DEFAULT_THEME } from "@/themeConfig";

const inter = Inter({ subsets: ["latin", "latin-ext", "cyrillic", "greek", "vietnamese"] });

export const metadata: Metadata = {
  title: "HRM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  const foucScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var v=${JSON.stringify(Object.fromEntries(THEME_NAMES.map((name) => [name, Object.entries(THEME_PALETTES[name]).map(([k, v]) => ["--hrm-" + k, v])])))};var p=v[t]||v["${DEFAULT_THEME}"];var s=document.documentElement.style;for(var i=0;i<p.length;i++)s.setProperty(p[i][0],p[i][1])}catch(e){}})()`;

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: foucScript }} />
      </head>
      <body style={{ fontFamily: inter.style.fontFamily }}>
        <Box
          component="a"
          href="#main-content"
          sx={{
            position: "absolute",
            top: -40,
            left: 0,
            px: 2,
            py: 1,
            zIndex: 1500,
            backgroundColor: "var(--hrm-green400)",
            color: "var(--hrm-slate700)",
            fontWeight: 600,
            textDecoration: "none",
            "&:focus": { top: 0 },
          }}
        >
          Skip to main content
        </Box>
        <SessionProvider>
          <AppRouterCacheProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ThemeRegistry>
                <SnackbarProvider>
                  <TutorialProvider>
                    <Box
                      component="main"
                      id="main-content"
                      sx={{
                        maxWidth: "1280px",
                        mx: "auto",
                        px: { xs: 1, sm: 2, md: 3 },
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
                </SnackbarProvider>
              </ThemeRegistry>
            </NextIntlClientProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
