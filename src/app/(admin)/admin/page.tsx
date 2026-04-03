"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { EdgeCase } from "@/lib/types";

interface DashboardCounts {
  totalGrades: number;
  pendingApprovals: number;
  totalProducts: number;
  totalPhotos: number;
}

interface SearchAggregate {
  query: string;
  count: number;
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts>({
    totalGrades: 0,
    pendingApprovals: 0,
    totalProducts: 0,
    totalPhotos: 0,
  });
  const [recentEdgeCases, setRecentEdgeCases] = useState<
    (EdgeCase & { grades?: { name: string } })[]
  >([]);
  const [topSearches, setTopSearches] = useState<SearchAggregate[]>([]);
  const [zeroResults, setZeroResults] = useState<SearchAggregate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const supabase = createClient();

        const [gradesRes, approvalsRes, productsRes, photosRes] =
          await Promise.all([
            supabase
              .from("grades")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("edge_cases")
              .select("id", { count: "exact", head: true })
              .eq("approved", false),
            supabase
              .from("products")
              .select("id", { count: "exact", head: true }),
            supabase
              .from("grade_photos")
              .select("id", { count: "exact", head: true }),
          ]);

        setCounts({
          totalGrades: gradesRes.count ?? 0,
          pendingApprovals: approvalsRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
          totalPhotos: photosRes.count ?? 0,
        });

        // Recent edge cases
        const { data: edgeCases } = await supabase
          .from("edge_cases")
          .select("*, grades(name)")
          .order("submitted_at", { ascending: false })
          .limit(10);
        setRecentEdgeCases(edgeCases ?? []);

        // Search logs for aggregation
        const { data: searchLogs } = await supabase
          .from("search_logs")
          .select("query, results_count");

        if (searchLogs) {
          // Top searched
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
              .slice(0, 10)
          );

          setZeroResults(
            Object.entries(zeroCounts)
              .map(([query, count]) => ({ query, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10)
          );
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-4 text-[#f04e23] text-sm">
        {error}
      </div>
    );
  }

  const cards = [
    { label: "Total Grades", value: counts.totalGrades },
    { label: "Pending Approvals", value: counts.pendingApprovals },
    { label: "Total Products", value: counts.totalProducts },
    { label: "Total Photos", value: counts.totalPhotos },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
        Dashboard
      </h1>

      {/* Count cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border p-5"
            style={{ borderColor: "#c0c8c5" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-3xl font-bold"
                  style={{ color: "#262262" }}
                >
                  {card.value}
                </p>
                <p className="text-sm mt-1" style={{ color: "#c0c8c5" }}>
                  {card.label}
                </p>
              </div>
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: "#12b3c3", opacity: 0.15 }}
              >
                <div
                  className="h-5 w-5 rounded-full"
                  style={{ backgroundColor: "#12b3c3" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      <div>
        <h2
          className="text-lg font-semibold mb-3"
          style={{ color: "#262262" }}
        >
          Recent Edge Case Submissions
        </h2>
        <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#c0c8c5" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "#262262" }}>
                <th className="px-4 py-2.5 text-left text-white font-medium">
                  Date
                </th>
                <th className="px-4 py-2.5 text-left text-white font-medium">
                  Grade
                </th>
                <th className="px-4 py-2.5 text-left text-white font-medium">
                  Yard
                </th>
                <th className="px-4 py-2.5 text-left text-white font-medium">
                  Scenario
                </th>
                <th className="px-4 py-2.5 text-left text-white font-medium">
                  Outcome
                </th>
              </tr>
            </thead>
            <tbody>
              {recentEdgeCases.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-center"
                    style={{ color: "#c0c8c5" }}
                  >
                    No recent submissions
                  </td>
                </tr>
              ) : (
                recentEdgeCases.map((ec, i) => (
                  <tr
                    key={ec.id}
                    className={i % 2 === 0 ? "bg-white" : ""}
                    style={i % 2 !== 0 ? { backgroundColor: "#c0c8c5", opacity: 0.15 } : undefined}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {new Date(ec.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      {(ec as EdgeCase & { grades?: { name?: string } }).grades?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">{ec.yard ?? "—"}</td>
                    <td className="px-4 py-2.5 max-w-xs truncate">
                      {ec.scenario}
                    </td>
                    <td className="px-4 py-2.5">{ec.outcome ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top searched */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-lg border p-5"
          style={{ borderColor: "#c0c8c5" }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: "#262262" }}
          >
            Top 10 Searched Terms
          </h2>
          {topSearches.length === 0 ? (
            <p className="text-sm" style={{ color: "#c0c8c5" }}>
              No search data yet
            </p>
          ) : (
            <ul className="space-y-2">
              {topSearches.map((s, i) => (
                <li
                  key={s.query}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span
                      className="font-medium mr-2"
                      style={{ color: "#c0c8c5" }}
                    >
                      {i + 1}.
                    </span>
                    {s.query}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "#12b3c3",
                      color: "#ffffff",
                    }}
                  >
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Zero result searches */}
        <div
          className="rounded-lg border p-5"
          style={{ borderColor: "#c0c8c5" }}
        >
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: "#262262" }}
          >
            Zero Result Searches
          </h2>
          {zeroResults.length === 0 ? (
            <p className="text-sm" style={{ color: "#c0c8c5" }}>
              No zero-result queries
            </p>
          ) : (
            <ul className="space-y-2">
              {zeroResults.map((s, i) => (
                <li
                  key={s.query}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    <span
                      className="font-medium mr-2"
                      style={{ color: "#c0c8c5" }}
                    >
                      {i + 1}.
                    </span>
                    {s.query}
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "#f04e23",
                      color: "#ffffff",
                    }}
                  >
                    {s.count}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
