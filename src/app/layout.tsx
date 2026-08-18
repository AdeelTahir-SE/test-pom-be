import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers/QueryProvider";
import Script from "next/script";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
// ! We are not migrating to cache components yet, so we are opting out of the new behavior for now. This is a temporary measure until we can fully adopt the new caching behavior in our application.
// export const instant = false;

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pomocnik.net | Teren in pisarna. Kot ena ekipa.",
  description: "Povežite terenske delavce in pisarniško vodstvo z pomocnik.net. Enostavno sledenje opravilom, pretvarjanje glasovnih posnetkov v besedilo in pregled v živo brez odvečnih klicev.",
  manifest: "/manifest.json",
  icons: {
    icon: "/pomocnik-logo.png",
    apple: "/icon-192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pomocnik",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="sl"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          {children}
        </QueryProvider>
        <Script
          src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
