"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Commodity, Grade } from "@/lib/types";

export default function GradeListPage() {
  const supabase = createClient();
  const params = useParams<{ commodity: string }>();
  const commoditySlug = params.commodity;

  const [commodity, setCommodity] = useState<Commodity | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: comData, error: comError } = await supabase
          .from("commodities")
          .select("*")
          .eq("slug", commoditySlug)
          .single();

        if (comError) throw comError;
        setCommodity(comData);

        const { data: gradeData, error: gradeError } = await supabase
          .from("grades")
          .select("*")
          .eq("commodity_id", comData.id)
          .eq("active", true)
          .order("sort_order");

        if (gradeError) throw gradeError;
        setGrades(gradeData ?? []);
      } catch (err) {
        console.error("Failed to fetch grades:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commoditySlug]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#12b3c3] px-4 py-4 flex items-center gap-3">
        <Link href="/" aria-label="Back to commodities">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="white"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-white font-bold text-lg truncate">
          {commodity?.name ?? "Loading..."}
        </h1>
      </header>

      {/* Grade list */}
      <main className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#12b3c3] border-t-transparent" />
          </div>
        ) : grades.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">
            No grades found for this commodity.
          </p>
        ) : (
          <ul>
            {grades.map((grade) => (
              <li key={grade.id}>
                <Link
                  href={`/${commoditySlug}/${grade.slug}`}
                  className="block px-4 py-3.5 border-b border-[#c0c8c5] bg-white hover:border-l-4 hover:border-l-[#12b3c3] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[#262262] font-semibold text-sm">
                        {grade.name}
                      </h2>
                      {grade.spec_json?.description && (
                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">
                          {grade.spec_json.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {grade.isri_code && (
                        <span className="bg-[#12b3c3]/10 text-[#12b3c3] text-xs font-mono px-2 py-0.5 rounded">
                          {grade.isri_code}
                        </span>
                      )}
                      {grade.dispute_flag && (
                        <span className="bg-[#f04e23] text-white text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap">
                          High dispute rate
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
