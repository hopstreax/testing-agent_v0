"use client";

import React from "react";
import { Search, ChevronDown, Calendar, RotateCcw } from "lucide-react";

export type StatusFilter = "ALL" | "PASSED" | "FAILED" | "RUNNING" | "ERROR";
export type DateFilter = "ALL" | "24H" | "7D" | "30D";

interface RunsToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (date: DateFilter) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function RunsToolbar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateFilter,
  onDateFilterChange,
  onRefresh,
  isLoading,
}: RunsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1b2026] bg-[#0d1013] p-2.5 shadow-xs">
      {/* Search Input */}
      <div className="relative flex flex-1 items-center min-w-[260px] max-w-md">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter runs by objective, target URL, commit hash..."
          className="h-8 w-full rounded-md border border-[#22272b] bg-[#121518] pl-8 pr-3 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-colors"
        />
      </div>

      {/* Filter Selects Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            className="h-8 appearance-none rounded-md border border-[#22272b] bg-[#121518] pl-3 pr-7 font-mono text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] focus:border-emerald-500/60 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="ALL">STATUS: ALL</option>
            <option value="PASSED">STATUS: PASSED</option>
            <option value="FAILED">STATUS: FAILED</option>
            <option value="RUNNING">STATUS: RUNNING</option>
            <option value="ERROR">STATUS: ERROR</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-zinc-500" />
        </div>

        {/* Environment Filter (Presentational: RunSummary has no env field) */}
        <div className="relative hidden sm:block">
          <select
            disabled
            title="Environment tagging is configured per test workspace"
            className="h-8 appearance-none rounded-md border border-[#22272b] bg-[#121518] pl-3 pr-7 font-mono text-xs font-medium text-zinc-400 opacity-80 cursor-default"
          >
            <option>ENV: ALL</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-zinc-600" />
        </div>

        {/* Branch Filter (Presentational: RunSummary has no branch field) */}
        <div className="relative hidden md:block">
          <select
            disabled
            title="Git branch context is synchronized via GitHub/Git provider"
            className="h-8 appearance-none rounded-md border border-[#22272b] bg-[#121518] pl-3 pr-7 font-mono text-xs font-medium text-zinc-400 opacity-80 cursor-default"
          >
            <option>Branch: main</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-zinc-600" />
        </div>

        {/* Date Filter */}
        <div className="relative">
          <select
            value={dateFilter}
            onChange={(e) => onDateFilterChange(e.target.value as DateFilter)}
            className="h-8 appearance-none rounded-md border border-[#22272b] bg-[#121518] pl-8 pr-7 font-mono text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] focus:border-emerald-500/60 focus:outline-none transition-colors cursor-pointer"
          >
            <option value="7D">PAST 7 DAYS</option>
            <option value="24H">PAST 24 HOURS</option>
            <option value="30D">PAST 30 DAYS</option>
            <option value="ALL">ALL TIME</option>
          </select>
          <Calendar className="pointer-events-none absolute left-2.5 top-2.5 h-3 w-3 text-zinc-500" />
          <ChevronDown className="pointer-events-none absolute right-2 top-2.5 h-3 w-3 text-zinc-500" />
        </div>

        {/* Refresh Trigger */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#22272b] bg-[#121518] text-zinc-400 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
          title="Refresh run history"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
        </button>
      </div>
    </div>
  );
}
