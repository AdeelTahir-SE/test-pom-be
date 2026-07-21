import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import Script from "next/script";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pomocnik.net | Teren in pisarna. Kot ena ekipa.",
  description: "Povežite terenske delavce in pisarniško vodstvo z pomocnik.net. Enostavno sledenje opravilom, pretvarjanje glasovnih posnetkov v besedilo in pregled v živo brez odvečnih klicev.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* TEMPORARY: dev-only language toggle for review, remove before ship. */}
        <LanguageSwitcher />
        {children}
        <Script 
          src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" 
          strategy="afterInteractive" 
        />
      </body>
    </html>
  );
}
