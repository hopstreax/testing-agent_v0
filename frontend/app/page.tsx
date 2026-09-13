import React from "react";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { CapabilityStrip } from "@/components/landing/capability-strip";
import { WorkflowSection } from "@/components/landing/workflow-section";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { FinalCTA } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";
import { Reveal } from "@/components/landing/reveal";

export default async function LandingPage(props: {
  searchParams: Promise<{ clone?: string }>;
}) {
  const searchParams = await props.searchParams;
  if (searchParams?.clone) {
    redirect(`/test?clone=${encodeURIComponent(searchParams.clone)}`);
  }

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f4f4f6] flex flex-col font-sans selection:bg-[#00e599]/30 selection:text-white">
      <LandingNav />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <CapabilityStrip />

        {/* Middle Section: Workflow & Comparison */}
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-start">
              <div className="lg:col-span-7">
                <Reveal delayMs={50}>
                  <WorkflowSection />
                </Reveal>
              </div>
              <div className="lg:col-span-5">
                <Reveal delayMs={150}>
                  <ComparisonSection />
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
