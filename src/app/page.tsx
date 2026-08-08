import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DashboardContainer } from "@/components/dashboard/DashboardContainer";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main role="main" className="blueprint-grid min-h-[100dvh] pt-24 pb-12">
        <DashboardContainer />
      </main>
      <Footer />
    </>
  );
}
