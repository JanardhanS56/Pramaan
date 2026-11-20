"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard" },
    { href: "/registry", label: "Registry" },
    { href: "/actuals", label: "Actuals & Ledger" },
    { href: "/audit", label: "Audit Trail" },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 p-2 rounded-lg text-white font-bold flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <Link href="/" className="font-bold text-lg tracking-tight hover:text-emerald-400 transition-colors">
              Setu <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">v1.0 Pramaan</span>
            </Link>
            <p className="text-xs text-slate-400">Commitment Confidence Engine</p>
          </div>
        </div>

        <nav className="flex space-x-1 sm:space-x-4">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-800 text-emerald-400 border border-slate-700"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
