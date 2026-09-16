"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { TopBar } from "@/components/shell/top-bar";
import { WorkspaceFooter } from "@/components/shell/workspace-footer";
import {
  BookOpen,
  Compass,
  Cpu,
  MousePointer,
  Crosshair,
  ShieldCheck,
  Bot,
  KeyRound,
  AlertTriangle,
  FileText,
  Workflow,
} from "lucide-react";

const DOC_SECTIONS = [
  { id: "overview", title: "1. Overview", icon: Compass },
  { id: "how-it-works", title: "2. How TraceKit Works", icon: Cpu },
  { id: "actions", title: "3. Agent Actions", icon: MousePointer },
  { id: "locators", title: "4. Locator Priority Ladder", icon: Crosshair },
  { id: "assertions", title: "5. Deterministic Assertions", icon: ShieldCheck },
  { id: "llm-providers", title: "6. LLM Reasoning Providers", icon: Bot },
  { id: "authentication", title: "7. Session & Storage State", icon: KeyRound },
  { id: "diagnosis", title: "8. Failure Diagnosis Engine", icon: AlertTriangle },
  { id: "reports", title: "9. Reports & Artifacts", icon: FileText },
  { id: "example-workflow", title: "10. Example Workflow", icon: Workflow },
];

export default function DocumentationPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#090a0c] text-[#f4f4f6]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl">
            {/* Header Metadata Pill */}
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded bg-emerald-950/70 border border-emerald-800/50 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">
                <BookOpen className="h-3 w-3" />
                Developer Reference
              </span>
              <span className="font-mono text-xs text-zinc-500">
                • TraceKit Engine v0.1
              </span>
            </div>

            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                Technical Documentation
              </h1>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-zinc-400 max-w-2xl">
                Comprehensive architecture and capability guide for TraceKit&apos;s autonomous testing engine, locator resolution hierarchy, deterministic assertion protocols, and failure diagnosis rules.
              </p>
            </div>

            {/* Sticky/Fast Table of Contents Navigator */}
            <nav
              aria-label="Documentation sections"
              className="mb-10 rounded-xl border border-[#1f2428] bg-[#0d1013] p-4 sm:p-5"
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500 block mb-3">
                Contents
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {DOC_SECTIONS.map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <a
                      key={sec.id}
                      href={`#${sec.id}`}
                      className="flex items-center gap-2 text-zinc-300 hover:text-emerald-400 transition-colors p-1.5 rounded hover:bg-[#161a1e]"
                    >
                      <Icon className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{sec.title}</span>
                    </a>
                  );
                })}
              </div>
            </nav>

            {/* Documentation Content Articles */}
            <div className="flex flex-col gap-10">
              {/* ------------------------------------------------------------- */}
              {/* 1. OVERVIEW                                                   */}
              {/* ------------------------------------------------------------- */}
              <article id="overview" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Compass className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Architecture</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  1. Overview
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  TraceKit is an autonomous browser testing agent designed to eliminate selector maintenance and fragile test scripts. Rather than relying on rigid XPath or CSS selector paths that break on DOM updates, TraceKit translates high-level natural language test goals into resilient, multi-step browser actions powered by multimodal LLM reasoning and verified by deterministic Chromium assertions.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-semibold text-white block mb-1">Acts</span>
                    <p className="text-zinc-400 text-[11px]">Inspects accessibility trees, clicks, types, selects, scrolls, and navigates.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-semibold text-white block mb-1">Verifies</span>
                    <p className="text-zinc-400 text-[11px]">Validates page state via 11 deterministic browser assertions directly against Chromium.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-semibold text-white block mb-1">Explains</span>
                    <p className="text-zinc-400 text-[11px]">Automated failure diagnosis categorizes root causes into application crashes vs automation failures.</p>
                  </div>
                </div>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 2. HOW TRACEKIT WORKS                                         */}
              {/* ------------------------------------------------------------- */}
              <article id="how-it-works" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Cpu className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Execution Loop</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  2. How TraceKit Works
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  Each test run executes inside an isolated Patchright/Chromium browser context using a 5-stage continuous execution cycle:
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518] flex items-start gap-3">
                    <span className="font-mono font-bold text-emerald-400 shrink-0">1. OBSERVE</span>
                    <p className="text-zinc-400">Captures clean DOM accessibility snapshots, visible element labels, interactive controls, current URL, and viewport screenshot.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518] flex items-start gap-3">
                    <span className="font-mono font-bold text-emerald-400 shrink-0">2. REASON</span>
                    <p className="text-zinc-400">The LLM reasoning engine assesses current page state against the test goal and previous actions, deciding the next single discrete action.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518] flex items-start gap-3">
                    <span className="font-mono font-bold text-emerald-400 shrink-0">3. ACT</span>
                    <p className="text-zinc-400">ActionDispatcher resolves target elements through the 6-tier locator ladder and performs the physical browser action.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518] flex items-start gap-3">
                    <span className="font-mono font-bold text-emerald-400 shrink-0">4. VERIFY</span>
                    <p className="text-zinc-400">Deterministic assertions evaluate element visibility, values, text, or counts directly via Playwright assertions before proceeding.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518] flex items-start gap-3">
                    <span className="font-mono font-bold text-emerald-400 shrink-0">5. REPORT</span>
                    <p className="text-zinc-400">Compiles chronological step traces, full-resolution screenshot galleries, execution timings, and deterministic diagnosis reports.</p>
                  </div>
                </div>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 3. AGENT ACTIONS                                              */}
              {/* ------------------------------------------------------------- */}
              <article id="actions" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <MousePointer className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Action Protocol</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  3. Agent Actions
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  The agent communicates decisions via a strict discriminated Pydantic action schema supported by the backend:
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-[#1f2428]">
                    <thead className="bg-[#121518] text-zinc-300 font-mono text-[11px] border-b border-[#1f2428]">
                      <tr>
                        <th className="p-2.5">Action Type</th>
                        <th className="p-2.5">Key Parameters</th>
                        <th className="p-2.5">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1b1f23] text-zinc-400">
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">click</td>
                        <td className="p-2.5 font-mono text-[11px]">role, name, text, index, button, click_count</td>
                        <td className="p-2.5">Clicks on a target element with single or multi-click support.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">fill</td>
                        <td className="p-2.5 font-mono text-[11px]">value, role, name, placeholder, label, selector</td>
                        <td className="p-2.5">Focuses and types text into input fields or textareas.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">navigate</td>
                        <td className="p-2.5 font-mono text-[11px]">url (http/https)</td>
                        <td className="p-2.5">Navigates the browser page to a new web location.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">assert</td>
                        <td className="p-2.5 font-mono text-[11px]">assertion_type, expected_value, locator criteria</td>
                        <td className="p-2.5">Executes a deterministic Playwright assertion.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">press_key</td>
                        <td className="p-2.5 font-mono text-[11px]">key (Enter, Escape, Tab, ArrowDown, ArrowUp, Backspace)</td>
                        <td className="p-2.5">Sends a keyboard keypress event to the page or active element.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">select</td>
                        <td className="p-2.5 font-mono text-[11px]">value or label, locator criteria</td>
                        <td className="p-2.5">Selects an option inside a native HTML &lt;select&gt; dropdown.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">scroll</td>
                        <td className="p-2.5 font-mono text-[11px]">direction (&apos;down&apos; | &apos;up&apos;), amount (px)</td>
                        <td className="p-2.5">Scrolls the viewport up or down by a specified pixel distance.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">hover</td>
                        <td className="p-2.5 font-mono text-[11px]">locator criteria</td>
                        <td className="p-2.5">Hovers over an element to trigger dropdowns or tooltip states.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-mono text-emerald-400">finish</td>
                        <td className="p-2.5 font-mono text-[11px]">success (boolean), message (string)</td>
                        <td className="p-2.5">Terminates the test run signaling goal fulfillment or blocker.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 4. LOCATORS                                                   */}
              {/* ------------------------------------------------------------- */}
              <article id="locators" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Crosshair className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Resolution Ladder</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  4. Locator Priority Ladder
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  TraceKit generally prefers accessible locators (such as role/name, text, placeholder, and label) to avoid brittle test scripts. However, when an explicit selector is provided, selector resolution takes precedence in execution:
                </p>

                <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 bg-[#121518] p-4 rounded-lg border border-[#1f2428]">
                  <li>
                    <strong className="text-white">CSS Selector / data-testid</strong>: (e.g. <code className="text-emerald-400 font-mono">selector=&quot;[data-test=&apos;login-button&apos;]&quot;</code>) — takes precedence whenever explicitly provided.
                  </li>
                  <li>
                    <strong className="text-white">Role + Accessible Name</strong>: (e.g. <code className="text-emerald-400 font-mono">role=&quot;button&quot;, name=&quot;Add to cart&quot;</code>) — preferred accessibility locator.
                  </li>
                  <li>
                    <strong className="text-white">Exact or Partial Text</strong>: (e.g. <code className="text-emerald-400 font-mono">text=&quot;Checkout&quot;</code>) — matches visible rendered strings.
                  </li>
                  <li>
                    <strong className="text-white">Placeholder Attribute</strong>: (e.g. <code className="text-emerald-400 font-mono">placeholder=&quot;Enter your email&quot;</code>) — ideal for search and text inputs.
                  </li>
                  <li>
                    <strong className="text-white">Associated Label</strong>: (e.g. <code className="text-emerald-400 font-mono">label=&quot;Password&quot;</code>) — resolves inputs via associated form &lt;label&gt; tags.
                  </li>
                  <li>
                    <strong className="text-white">Disambiguation Index</strong>: (e.g. <code className="text-emerald-400 font-mono">index=0</code>) — 0-based integer to disambiguate and select an exact element when multiple matching elements are found.
                  </li>
                </ol>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 5. ASSERTIONS                                                 */}
              {/* ------------------------------------------------------------- */}
              <article id="assertions" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Verification Protocol</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  5. Deterministic Assertions
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  Unlike subjective LLM judgments, TraceKit verifies test conditions directly against Chromium DOM APIs using Playwright&apos;s expect assertion library:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-emerald-400 block mb-1">visible / hidden</span>
                    <p className="text-zinc-400 text-[11px]">Verifies whether an element is present and visible in the viewport, or completely detached/hidden.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-emerald-400 block mb-1">has_text / has_value</span>
                    <p className="text-zinc-400 text-[11px]">Verifies that an element contains expected text or that a form input holds an expected value.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-emerald-400 block mb-1">has_url / has_title</span>
                    <p className="text-zinc-400 text-[11px]">Page-level assertions verifying that the browser URL or document title matches the expected string.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-emerald-400 block mb-1">enabled / disabled</span>
                    <p className="text-zinc-400 text-[11px]">Checks interactive states for submit buttons, links, and form controls.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-emerald-400 block mb-1">checked / unchecked</span>
                    <p className="text-zinc-400 text-[11px]">Verifies the checked state of HTML checkboxes and radio button toggles.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-emerald-400 block mb-1">has_count</span>
                    <p className="text-zinc-400 text-[11px]">Verifies that a locator matches an exact non-negative integer count of elements (e.g. cart badge count or list item quantity).</p>
                  </div>
                </div>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 6. LLM REASONING PROVIDERS                                    */}
              {/* ------------------------------------------------------------- */}
              <article id="llm-providers" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Bot className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Inference Layer</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  6. LLM Reasoning Providers
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  TraceKit supports multiple reasoning providers configured through environment variables or Test Studio advanced options:
                </p>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">Google Gemini (Default)</span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">gemini-3.6-flash</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">Primary reasoning provider. Also supports curated models: <code className="text-zinc-300 font-mono">gemini-2.5-flash</code>, <code className="text-zinc-300 font-mono">gemini-2.5-pro</code>.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">Groq</span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">openai/gpt-oss-120b</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">Ultra-low latency LPU inference. Also supports curated models: <code className="text-zinc-300 font-mono">openai/gpt-oss-20b</code>, <code className="text-zinc-300 font-mono">qwen/qwen3.6-27b</code>.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">Ollama</span>
                      <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.5 rounded">qwen2.5-coder:3b</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">Self-hosted, air-gapped local model execution. Also supports curated model: <code className="text-zinc-300 font-mono">llama3.2:3b</code>.</p>
                  </div>

                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">Auto Fallback Orchestrator</span>
                      <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded">Priority Cascade</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">Attempts primary configured provider and gracefully cascades to alternate available backends upon rate limits (HTTP 429) or transient network timeouts.</p>
                  </div>
                </div>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 7. AUTHENTICATION & STORAGE STATE                             */}
              {/* ------------------------------------------------------------- */}
              <article id="authentication" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <KeyRound className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Session Injection</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  7. Session &amp; Storage State
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  TraceKit supports testing post-login flows without repeating the login sequence on every test execution. Users can supply Playwright-compatible <code className="text-emerald-400 font-mono">storage_state</code> JSON in the Advanced Settings drawer:
                </p>

                <div className="bg-[#121518] p-4 rounded-lg border border-[#1f2428] text-xs font-mono text-zinc-300 overflow-x-auto">
                  <pre>{`{
  "cookies": [
    {
      "name": "session_token",
      "value": "xyz...",
      "domain": ".example.com",
      "path": "/",
      "httpOnly": true,
      "secure": true
    }
  ],
  "origins": [
    {
      "origin": "https://example.com",
      "localStorage": [{ "name": "user_id", "value": "1001" }]
    }
  ]
}`}</pre>
                </div>
                <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
                  When provided, the browser context initializes with these injected cookies and local storage tokens, immediately loading authenticated dashboards or checkout flows.
                </p>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 8. FAILURE DIAGNOSIS ENGINE                                   */}
              {/* ------------------------------------------------------------- */}
              <article id="diagnosis" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Root Cause Analysis</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  8. Failure Diagnosis Engine
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  When a test run finishes with failure, the backend diagnosis engine (<code className="text-emerald-400 font-mono">diagnosis.py</code>) categorizes the failure into two major classes and pinpoint causes:
                </p>

                <div className="space-y-4 text-xs">
                  <div className="border border-red-900/40 bg-red-950/10 p-4 rounded-lg">
                    <span className="font-mono font-bold text-red-400 block mb-1">
                      APPLICATION_BEHAVIOR_MISMATCH
                    </span>
                    <p className="text-zinc-300 text-xs mb-2">
                      The application under test failed or behaved unexpectedly.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                      <li><strong className="text-zinc-300">APPLICATION_CRASH</strong>: Target website threw uncaught JavaScript exceptions or returned HTTP 5xx server errors.</li>
                      <li><strong className="text-zinc-300">ASSERTION_FAILED</strong>: A deterministic assertion failed (e.g. checkout button was disabled, item count mismatched).</li>
                      <li><strong className="text-zinc-300">EXPECTED_STATE_NOT_REACHED</strong>: Target condition could not be fulfilled within the step budget.</li>
                    </ul>
                  </div>

                  <div className="border border-amber-900/40 bg-amber-950/10 p-4 rounded-lg">
                    <span className="font-mono font-bold text-amber-400 block mb-1">
                      AUTOMATION_FAILURE
                    </span>
                    <p className="text-zinc-300 text-xs mb-2">
                      An environmental, provider, or locator issue halted test automation.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-zinc-400 text-[11px]">
                      <li><strong className="text-zinc-300">NAVIGATION_ERROR</strong>: Target URL failed DNS resolution, connection refused, or timed out.</li>
                      <li><strong className="text-zinc-300">PROVIDER_ERROR</strong>: LLM reasoning provider threw an unrecoverable exception or rate limit.</li>
                      <li><strong className="text-zinc-300">SESSION_ERROR</strong>: Browser session launch failure or headless crash.</li>
                      <li><strong className="text-zinc-300">LOCATOR_NOT_FOUND</strong>: Target locator criteria could not match any DOM element.</li>
                      <li><strong className="text-zinc-300">BUDGET_EXCEEDED</strong>: Max step count exhausted before reaching test conclusion.</li>
                    </ul>
                  </div>
                </div>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 9. REPORTS & ARTIFACTS                                        */}
              {/* ------------------------------------------------------------- */}
              <article id="reports" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <FileText className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Inspectable Evidence</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  9. Reports &amp; Artifacts
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  Every test run produces complete, inspectable evidence packages persisted to the backend artifacts directory:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-white block mb-1">report.json</span>
                    <p className="text-zinc-400 text-[11px]">Machine-readable JSON containing full step timestamps, actions, locator strategies, and raw LLM reasoning outputs.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-white block mb-1">report.md</span>
                    <p className="text-zinc-400 text-[11px]">Human-readable GitHub-flavored Markdown report detailing objectives, step logs, assertions, and final verdict.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-white block mb-1">trace.zip</span>
                    <p className="text-zinc-400 text-[11px]">Standard Playwright execution trace file viewable in <code className="text-emerald-400">trace.playwright.dev</code> with full DOM snapshots and timeline scrubbers.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-[#1f2428] bg-[#121518]">
                    <span className="font-mono font-semibold text-white block mb-1">screenshots/</span>
                    <p className="text-zinc-400 text-[11px]">Timestamped full-resolution PNG visual evidence captures recorded before and after each browser interaction.</p>
                  </div>
                </div>
              </article>

              {/* ------------------------------------------------------------- */}
              {/* 10. EXAMPLE WORKFLOW                                          */}
              {/* ------------------------------------------------------------- */}
              <article id="example-workflow" className="scroll-mt-20 rounded-xl border border-[#1f2428] bg-[#0d1013] p-5 sm:p-7">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Workflow className="h-4 w-4" />
                  <span className="font-mono text-xs uppercase font-semibold tracking-wider">Walkthrough</span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mb-3">
                  10. Example Workflow
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
                  Here is a realistic end-to-end execution trace demonstrating autonomous e-commerce checkout verification on Saucedemo:
                </p>

                <div className="space-y-2 text-xs font-mono bg-[#121518] p-4 rounded-lg border border-[#1f2428] text-zinc-300 overflow-x-auto">
                  <div className="text-emerald-400 font-semibold mb-2">
                    # Test Objective: &quot;Log in with standard_user, add the backpack to the cart, and verify the checkout button is enabled.&quot;
                  </div>
                  <div className="text-zinc-400">Step 1: navigate(url=&quot;https://www.saucedemo.com&quot;) → 200 OK (312ms)</div>
                  <div className="text-zinc-400">Step 2: fill(placeholder=&quot;Username&quot;, value=&quot;standard_user&quot;) → resolved via placeholder (48ms)</div>
                  <div className="text-zinc-400">Step 3: fill(placeholder=&quot;Password&quot;, value=&quot;secret_sauce&quot;) → resolved via placeholder (44ms)</div>
                  <div className="text-zinc-400">Step 4: click(role=&quot;button&quot;, name=&quot;Login&quot;) → resolved via role+name (185ms)</div>
                  <div className="text-zinc-400">Step 5: click(selector=&quot;[data-test=&apos;add-to-cart-sauce-labs-backpack&apos;]&quot;) → resolved (76ms)</div>
                  <div className="text-zinc-400">Step 6: click(role=&quot;link&quot;, name=&quot;Shopping Cart&quot;) → resolved via role+name (120ms)</div>
                  <div className="text-emerald-400 font-semibold">Step 7: assert(assertion_type=&quot;enabled&quot;, role=&quot;button&quot;, name=&quot;Checkout&quot;) → PASSED (32ms)</div>
                  <div className="text-emerald-400 font-semibold">Step 8: finish(success=true, message=&quot;Checkout button is verified enabled after adding backpack.&quot;)</div>
                </div>
              </article>
            </div>
          </div>
        </main>

        {/* Compact Workspace Footer */}
        <WorkspaceFooter />
      </div>
    </div>
  );
}
