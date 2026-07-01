import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "./header";
import { BottomNav } from "@/app/_components/bottom-nav";
import { Sidebar } from "@/app/_components/sidebar";

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

export const viewport = {
  width: "device-width" as const,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover" as const,
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
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        {/* Set html[data-sidebar-hidden] before first paint on /login|/register
            so the desktop main padding (added by globals.css) is skipped on
            those routes during SSR — no blank 256px strip beside the form. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(location.pathname==='/login'||location.pathname==='/register'){document.documentElement.dataset.sidebarHidden='true'}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-cream-50">
        <Providers>
          <Sidebar />
          <Header />
          {/* lg:pl-[var(--sidebar-width)] is the source of truth for the
              sidebar offset on desktop. globals.css additionally gates this
              to 0 on /login|/register via html[data-sidebar-hidden] (and
              sets padding-bottom:0 on those routes as well).
              transition-[padding-left] (not transition-[padding]) so only
              padding-left animates as the sidebar collapses/expands.
              pb-20 stays for mobile (BottomNav clearance); lg:pb-6 is
              not needed — both CSS branches override it at lg+. */}
          <main className="flex-1 flex flex-col pb-20 lg:pl-[var(--sidebar-width,256px)] transition-[padding-left] duration-300 ease-in-out">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
