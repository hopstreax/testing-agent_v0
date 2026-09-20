"use client";

import React from "react";
import { Download, ChevronLeft, ChevronRight } from "lucide-react";
import { RunSummary } from "@/lib/api";

interface RunsPaginationProps {
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  filteredRuns: RunSummary[];
}

export function RunsPagination({
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  filteredRuns,
}: RunsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array (compact)
  const getPageNumbers = () => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    if (filteredRuns.length === 0) return;

    const headers = [
      "Run ID",
      "Status",
      "Target URL",
      "Goal",
      "Created At",
      "Duration (s)",
      "Success",
    ];

    const escapeCsv = (str: string) => {
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredRuns.map((r) => [
      escapeCsv(r.run_id),
      escapeCsv(r.status),
      escapeCsv(r.url),
      escapeCsv(r.goal),
      escapeCsv(r.created_at || ""),
      r.duration_ms ? (r.duration_ms / 1000).toFixed(1) : "",
      r.success === null ? "" : String(r.success),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `tracekit-runs-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1 text-xs select-none">
      {/* Left: Range Info & Export CSV */}
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-zinc-400">
          Showing <span className="text-zinc-200">{startItem}–{endItem}</span> of{" "}
          <span className="text-zinc-200">{totalItems}</span> runs
        </span>

        {totalItems > 0 && (
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#22272b] bg-[#121518] px-2.5 py-1 font-mono text-[11px] font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
            title="Download active runs as CSV"
          >
            <Download className="h-3 w-3 text-emerald-400" />
            <span>EXPORT CSV</span>
          </button>
        )}
      </div>

      {/* Right: Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 font-mono text-xs">
          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-0.5 rounded border border-[#22272b] bg-[#121518] px-2 py-1 text-zinc-400 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <ChevronLeft className="h-3 w-3" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Numbered Buttons */}
          {getPageNumbers().map((page) => {
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`flex h-7 w-7 items-center justify-center rounded border text-xs font-bold transition-colors cursor-pointer ${
                  isActive
                    ? "border-emerald-400 bg-emerald-400 text-zinc-950"
                    : "border-[#22272b] bg-[#121518] text-zinc-300 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white"
                }`}
              >
                {page}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-0.5 rounded border border-[#22272b] bg-[#121518] px-2 py-1 text-zinc-400 hover:border-zinc-700 hover:bg-[#161a1e] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
