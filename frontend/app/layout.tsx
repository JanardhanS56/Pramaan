import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Setu — Commitment Confidence Engine",
  description: "Empirically validated commitment confidence for Farmer Producer Organizations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F9FAF8] text-[#1C201E] min-h-screen flex flex-col md:flex-row font-sans antialiased">
        <Navbar />
        <div className="flex-1 md:pl-60 flex flex-col min-h-screen bg-[#F9FAF8]">
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8">
            {children}
          </main>
          <footer className="border-t border-[#DCE1DD] bg-white py-4 text-center text-xs text-[#5A635E]">
            Setu v1.0 &quot;Pramaan&quot; · Backtest-Gated Conformal Quantiles · Sahyadri FPO
          </footer>
        </div>
      </body>
    </html>
  );
}
