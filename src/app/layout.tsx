import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Box } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import ThemeRegistry from "@/components/ThemeRegistry";
import SessionProvider from "@/components/SessionProvider";
import TutorialProvider from "@/components/TutorialProvider";
import TutorialSpotlight from "@/components/TutorialSpotlight";
import TutorialCelebration from "@/components/TutorialCelebration";
import TutorialChecklist from "@/components/TutorialChecklist";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

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

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body style={{ fontFamily: inter.style.fontFamily }}>
        <SessionProvider>
          <AppRouterCacheProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              <ThemeRegistry>
                <TutorialProvider>
                  <Box
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
              </ThemeRegistry>
            </NextIntlClientProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
