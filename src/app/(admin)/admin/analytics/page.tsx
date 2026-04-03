"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

interface ViewAggregate {
  grade_id: string;
  grade_name: string;
  count: number;
}

interface SearchAggregate {
  query: string;
  count: number;
}

export default function AnalyticsPage() {
  const [topViewed, setTopViewed] = useState<ViewAggregate[]>([]);
  const [topSearches, setTopSearches] = useState<SearchAggregate[]>([]);
  const [zeroResults, setZeroResults] = useState<SearchAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const supabase = createClient();

        // Fetch grade views
        const { data: views } = await supabase
          .from("grade_views")
          .select("grade_id");

        // Fetch grades for name mapping
        const { data: grades } = await supabase
          .from("grades")
          .select("id, name");

        const gradeMap: Record<string, string> = {};
        if (grades) {
          for (const g of grades) {
            gradeMap[g.id] = g.name;
          }
        }

        if (views) {
          const viewCounts: Record<string, number> = {};
          for (const v of views) {
            viewCounts[v.grade_id] = (viewCounts[v.grade_id] || 0) + 1;
          }
          setTopViewed(
            Object.entries(viewCounts)
              .map(([grade_id, count]) => ({
                grade_id,
                grade_name: gradeMap[grade_id] ?? "Unknown",
                count,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
          );
        }

        // Fetch search logs
        const { data: searchLogs } = await supabase
          .from("search_logs")
          .select("query, results_count");

        if (searchLogs) {
          const queryCounts: Record<string, number> = {};
          const zeroCounts: Record<string, number> = {};

          for (const log of searchLogs) {
            const q = log.query.toLowerCase().trim();
            queryCounts[q] = (queryCounts[q] || 0) + 1;
            if (log.results_count === 0) {
              zeroCounts[q] = (zeroCounts[q] || 0) + 1;
            }
          }

          setTopSearches(
            Object.entries(queryCounts)
              .map(([query, count]) => ({ query, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 20)
          );

          setZeroResults(
            Object.entries(zeroCounts)
              .map(([query, count]) => ({ query, count }))
              .sort((a, b) => b.count - a.count)
          );
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load analytics"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
        Analytics
      </h1>

      {error && (
        <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-3 text-[#f04e23] text-sm">
          {error}
        </div>
      )}

      {/* Top 10 Most Viewed Grades */}
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: "#c0c8c5" }}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "#262262" }}
        >
          Top 10 Most Viewed Grades
        </h2>
        {topViewed.length === 0 ? (
          <p className="text-sm" style={{ color: "#c0c8c5" }}>
            No view data yet
          </p>
        ) : (
          <div className="space-y-2">
            {topViewed.map((item, i) => (
              <div
                key={item.grade_id}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "#c0c8c5" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-medium w-6 text-right"
                    style={{ color: "#c0c8c5" }}
                  >
                    {i + 1}.
                  </span>
                  <Link
                    href={`/admin/grades/${item.grade_id}`}
                    className="text-sm font-medium hover:underline"
                    style={{ color: "#262262" }}
                  >
                    {item.grade_name}
                  </Link>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#12b3c3", color: "#ffffff" }}
                >
                  {item.count} views
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 20 Search Terms */}
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: "#c0c8c5" }}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "#262262" }}
        >
          Top 20 Search Terms
        </h2>
        {topSearches.length === 0 ? (
          <p className="text-sm" style={{ color: "#c0c8c5" }}>
            No search data yet
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            {topSearches.map((item, i) => (
              <div
                key={item.query}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "#c0c8c5" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-medium w-6 text-right"
                    style={{ color: "#c0c8c5" }}
                  >
                    {i + 1}.
                  </span>
                  <span className="text-sm">{item.query}</span>
                </div>
                <span
                  className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: "#12b3c3", color: "#ffffff" }}
                >
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zero Result Queries */}
      <div
        className="rounded-lg border p-5"
        style={{ borderColor: "#c0c8c5" }}
      >
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: "#262262" }}
        >
          Zero Result Queries
        </h2>
        {zeroResults.length === 0 ? (
          <p className="text-sm" style={{ color: "#c0c8c5" }}>
            No zero-result queries
          </p>
        ) : (
          <div className="space-y-2">
            {zeroResults.map((item, i) => (
              <div
                key={item.query}
                className="flex items-center justify-between py-2 border-b last:border-0"
                style={{ borderColor: "#c0c8c5" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-sm font-medium w-6 text-right"
                    style={{ color: "#c0c8c5" }}
                  >
                    {i + 1}.
                  </span>
                  <span className="text-sm">{item.query}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#f04e23", color: "#ffffff" }}
                  >
                    {item.count}
                  </span>
                  <button
                    className="text-xs px-2 py-1 rounded border"
                    style={{ borderColor: "#12b3c3", color: "#12b3c3" }}
                    title="Add alias for this search term in a grade"
                  >
                    Add alias
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
