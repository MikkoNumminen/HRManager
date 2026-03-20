import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Box } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import ThemeRegistry from "@/components/ThemeRegistry";
import SessionProvider from "@/components/SessionProvider";
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
                <Box sx={{ maxWidth: "1280px", mx: "auto", pl: 2, pt: 2, pb: 2, pr: 18 }}>
                  {children}
                </Box>
              </ThemeRegistry>
            </NextIntlClientProvider>
          </AppRouterCacheProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
