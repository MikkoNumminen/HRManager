import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Box } from "@mui/material";
import ThemeRegistry from "@/components/ThemeRegistry";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: inter.style.fontFamily }}>
        <ThemeRegistry>
          <Box sx={{ maxWidth: "1280px", mx: "auto", p: 2 }}>
            {children}
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
