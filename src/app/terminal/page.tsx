import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Argus Live Monitor Terminal | Ethereum RPC Integrity Leaderboard",
  description: "Track Ethereum RPC performance, consensus accuracy, uptime, and latency in real time. Access our public failover RPC endpoint, rotated deterministically every 5 minutes.",
};

export default function TerminalPage() {
  return (
    <>
      <Navbar />
      <main className="blueprint-grid min-h-[100dvh] pt-24 pb-12" id="terminal-main" role="main">
        <div className="container-page py-4">
          <DashboardContainer />
        </div>
      </main>
      <Footer />
    </>
  );
}
