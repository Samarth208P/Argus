import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/marketing/HeroSection";
import { TrustBar } from "@/components/marketing/TrustBar";
import { FeatureStory } from "@/components/marketing/FeatureStory";
import { MetricsSection } from "@/components/marketing/MetricsSection";
import { EvidenceSection } from "@/components/marketing/EvidenceSection";
import { IntegrationsSection } from "@/components/marketing/IntegrationsSection";
import { SecuritySection } from "@/components/marketing/SecuritySection";
import { UseCasesSection } from "@/components/marketing/UseCasesSection";
import { FinalCTA } from "@/components/marketing/FinalCTA";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main role="main">
        {/* ── Marketing narrative ─────────────────────────── */}
        <HeroSection />
        <TrustBar />
        <FeatureStory />
        <MetricsSection />
        <EvidenceSection />

        {/* ── Closing narrative ───────────────────────────── */}
        <UseCasesSection />
        <IntegrationsSection />
        <SecuritySection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
