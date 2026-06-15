import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WineGlass, Stars } from "@/app/_components/icons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Viny - Vinnotater",
  description: "Hold oversikt over viner du har smakt",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="nb"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="bg-wine-gradient text-white">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <WineGlass className="w-6 h-7 text-gold-300" />
            <span className="text-lg font-bold tracking-wide">Viny</span>
            <Stars className="flex-1 h-4 text-gold-200" />
          </div>
        </header>
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="bg-wine-gradient text-white/60 text-xs py-3 text-center">
          <p>Viny &mdash; notatene dine, alltid tilgjengelig</p>
        </footer>
      </body>
    </html>
  );
}
