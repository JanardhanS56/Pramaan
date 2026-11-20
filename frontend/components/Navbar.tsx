"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  Scale,
  FileText,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/registry", label: "Registry", icon: Layers },
    { href: "/actuals", label: "Actuals & Ledger", icon: Scale },
    { href: "/audit", label: "Audit Trail", icon: FileText },
  ];

  return (
    <aside className="w-full md:w-60 md:min-w-[240px] md:fixed md:inset-y-0 md:left-0 bg-[#1F4E35] text-white flex flex-col justify-between z-40 md:border-r border-[#163A27] select-none sticky top-0 md:top-0">
      {/* Top Branding Section */}
      <div>
        <div className="px-4 py-3.5 md:px-5 md:py-6 border-b border-[#163A27] flex items-center justify-between md:block">
          <div>
            <div className="flex items-baseline space-x-2">
              <Link
                href="/"
                className="text-lg md:text-xl font-bold tracking-tight text-white hover:text-[#EAF2ED] transition-colors"
              >
                Setu
              </Link>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#EAF2ED]/80 bg-[#163A27] px-1.5 py-0.5 rounded border border-[#163A27]">
                Pramaan v1.0
              </span>
            </div>
            <p className="text-[11px] text-[#EAF2ED]/70 mt-0.5 md:mt-1 font-medium">
              Commitment Confidence Engine
            </p>
          </div>
          <div className="md:hidden text-right">
            <span className="text-[10px] font-mono text-[#EAF2ED]/80 bg-[#163A27] px-2 py-0.5 rounded border border-[#163A27]">
              Sahyadri FPO
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-2 md:p-3 flex md:flex-col overflow-x-auto gap-1 border-b md:border-b-0 border-[#163A27]">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3 py-1.5 md:py-2 rounded text-xs whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-[#EAF2ED]/40 ${
                  isActive
                    ? "bg-[#EAF2ED] text-[#1F4E35] font-semibold"
                    : "text-white/90 hover:bg-[#163A27] hover:text-white font-medium"
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? "text-[#1F4E35]" : "text-white/80"
                  }`}
                />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Anchored Bottom Workspace Anchor (Desktop) */}
      <div className="hidden md:block p-4 border-t border-[#163A27] bg-[#163A27]/50">
        <div className="text-xs font-semibold text-white tracking-tight">
          Sahyadri FPO
        </div>
        <div className="text-[11px] text-[#EAF2ED]/70">Nashik, Maharashtra</div>
        <div className="mt-2.5 pt-2 border-t border-[#163A27] flex items-center space-x-1.5 text-[10px] text-[#EAF2ED]/80 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EAF2ED] inline-block" />
          <span>Evaluation: 2024-RB</span>
        </div>
      </div>
    </aside>
  );
}

export const Sidebar = Navbar;
