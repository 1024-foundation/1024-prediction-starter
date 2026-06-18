/**
 * Top nav. Server Component so it can read whether trading credentials are
 * configured (and which environment we're pointed at) without shipping secrets.
 */
import Link from "next/link";
import { API_BASE, hasCredentials } from "@/lib/api/server";
import { Badge } from "./ui";

export function SiteHeader() {
  const env = API_BASE.includes("testnet") ? "testnet-stable" : API_BASE.includes("mainnet") ? "mainnet" : "custom";
  const trading = hasCredentials();
  return (
    <header className="flex items-center justify-between gap-4 border-b border-ink-line py-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-base font-bold text-white">
          10<span className="text-brand">24</span> Predict
        </span>
        <span className="text-[10px] uppercase tracking-widest text-white/30">starter</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="text-white/70 transition hover:text-white">
          Markets
        </Link>
        <Link href="/portfolio" className="text-white/70 transition hover:text-white">
          Portfolio
        </Link>
        <Badge tone={env === "mainnet" ? "amber" : "brand"}>{env}</Badge>
        <Badge tone={trading ? "green" : "neutral"}>{trading ? "trading on" : "read-only"}</Badge>
      </nav>
    </header>
  );
}
