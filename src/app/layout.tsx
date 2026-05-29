import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entering Our Universe",
  description: "A cinematic private memory universe built from love, stars, music, and small remembered moments."
};

export const viewport: Viewport = {
  themeColor: "#05020b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

import { Emilys_Candy } from "next/font/google";

const emilysCandy = Emilys_Candy({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-emilys-candy",
});

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={emilysCandy.variable} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
