"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Commodity } from "@/lib/types";

export default function CommodityIndexPage() {
  const supabase = createClient();
  const router = useRouter();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCommodities() {
      try {
        const { data, error } = await supabase
          .from("commodities")
          .select("*, grades(count)")
          .eq("active", true)
          .order("sort_order");

        if (error) throw error;

        const mapped = (data ?? []).map((c: Commodity & { grades?: { count: number }[] }) => ({
          ...c,
          grade_count: c.grades?.[0]?.count ?? 0,
        }));
        setCommodities(mapped);
      } catch (err) {
        console.error("Failed to fetch commodities:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCommodities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#12b3c3] px-4 py-4 flex items-center justify-between">
        <span className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
          <img src="/icons/Endless Logo_Navy.png" alt="mo" className="h-6 w-auto brightness-0 invert" />
          endless metals grading
        </span>
        <Link href="/search" aria-label="Search">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#262262"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
        </Link>
      </header>

      {/* Search bar */}
      <form onSubmit={handleSearchSubmit} className="px-4 py-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search grades, products, tips..."
          className="w-full border-2 border-[#12b3c3] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#12b3c3]/40 placeholder:text-gray-400"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearchSubmit(e);
          }}
        />
      </form>

      {/* Commodity grid */}
      <main className="flex-1 px-4 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#12b3c3] border-t-transparent" />
          </div>
        ) : commodities.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">
            No commodities found.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {commodities.map((commodity) => (
              <Link
                key={commodity.id}
                href={`/${commodity.slug}`}
                className="group block border border-[#c0c8c5] rounded-lg p-4 bg-white hover:border-l-4 hover:border-l-[#12b3c3] transition-all"
              >
                <h2 className="text-[#262262] font-semibold text-sm leading-tight">
                  {commodity.name}
                </h2>
                <span className="inline-block mt-2 bg-[#12b3c3]/10 text-[#12b3c3] text-xs font-medium px-2 py-0.5 rounded-full">
                  {commodity.grade_count} grade{commodity.grade_count !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="pb-6 pt-2 text-center">
        <p className="text-[#262262] text-xs">
          endless metals — Recycling reimagined.
        </p>
      </footer>
    </div>
  );
}
