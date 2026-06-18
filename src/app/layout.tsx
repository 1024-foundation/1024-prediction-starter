import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { TradeModalProvider } from "@/components/TradeModalProvider";
import { hasCredentials } from "@/lib/api/server";

// The 1024 frontend's body font.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-hanken",
  display: "swap",
});

export const metadata: Metadata = {
  title: "1024 Prediction Starter",
  description:
    "A minimal open-source prediction market built on the 1024 Public API.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={hanken.variable}>
      <body className="min-h-screen bg-surface-bg font-sans antialiased">
        <TradeModalProvider tradingEnabled={hasCredentials()}>
          <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
            <SiteHeader />
            <div className="flex-1 py-6">{children}</div>
            <footer className="border-t border-surface-border py-6 text-center text-xs text-white/30">
              Open-source teaching demo on the{" "}
              <a href="https://api-mainnet.1024ex.com" className="text-white/50 hover:text-white">
                1024 Public API
              </a>
              . Not affiliated investment advice.
            </footer>
          </div>
        </TradeModalProvider>
      </body>
    </html>
  );
}
