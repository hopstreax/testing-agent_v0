import React from "react";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { HeroSection } from "@/components/landing/hero-section";
import { CapabilityStrip } from "@/components/landing/capability-strip";
import { ExecutionLoop } from "@/components/landing/execution-loop";
import { WorkflowSection } from "@/components/landing/workflow-section";
import { ComparisonSection } from "@/components/landing/comparison-section";
import { FailureExplanation } from "@/components/landing/failure-explanation";
import { EvidenceWorkspace } from "@/components/landing/evidence-workspace";
import { FinalCTA } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function LandingPage(props: {
  searchParams: Promise<{ clone?: string }>;
}) {
  const searchParams = await props.searchParams;
  if (searchParams?.clone) {
    redirect(`/test?clone=${encodeURIComponent(searchParams.clone)}`);
  }

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f4f4f6] flex flex-col font-sans selection:bg-[#00e599]/30 selection:text-white overflow-x-hidden">
      <LandingNav />
      <main className="flex-1 flex flex-col">
        {/* 1. Hero: Autonomous DevTools Console (Phase 2 Anchor) */}
        <HeroSection />

        {/* 2. Capability Pipeline: Observe -> Act -> Verify -> Explain */}
        <CapabilityStrip />

        {/* 3. The Signature Execution Loop: AI Agent -> Browser -> Deterministic Verification */}
        <ExecutionLoop />

        {/* 4. Interactive Execution Timeline: Watching one test run unfold */}
        <WorkflowSection />

        {/* 5. Two Testing Loops: Traditional brittle loop vs TraceKit autonomous loop */}
        <ComparisonSection />

        {/* 6. Deterministic Failure Diagnosis: Explaining root cause, not just red X */}
        <FailureExplanation />

        {/* 7. Developer Investigation Workspace: StepsTrace, AssertionsTable, VisualEvidence */}
        <EvidenceWorkspace />

        {/* 8. Restrained Large Typography Conclusion & CTA */}
        <FinalCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
