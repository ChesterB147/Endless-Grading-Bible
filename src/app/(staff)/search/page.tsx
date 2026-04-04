"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Grade, Product, FieldTip } from "@/lib/types";

interface GradeResult {
  grade: Grade;
  commoditySlug: string;
  commodityName: string;
}

interface ProductResult {
  product: Product;
  gradeName: string;
  gradeSlug: string;
  commoditySlug: string;
  commodityName: string;
}

interface TipResult {
  tip: FieldTip;
  gradeName: string;
  gradeSlug: string;
  commoditySlug: string;
  commodityName: string;
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "#12b3c3" }} />}>
      <SearchPage />
    </Suspense>
  );
}

function SearchPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [gradeResults, setGradeResults] = useState<GradeResult[]>([]);
  const [productResults, setProductResults] = useState<ProductResult[]>([]);
  const [tipResults, setTipResults] = useState<TipResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      if (!q) {
        setGradeResults([]);
        setProductResults([]);
        setTipResults([]);
        setSearched(false);
        return;
      }

      setSearching(true);
      setSearched(true);

      try {
        const pattern = `%${q}%`;

        // Search grades
        const { data: grades } = await supabase
          .from("grades")
          .select("*, commodities(name, slug)")
          .eq("active", true)
          .or(`name.ilike.${pattern}`)
          .limit(20);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gradeHits: GradeResult[] = (grades ?? []).map((g: any) => ({
          grade: g,
          commoditySlug: g.commodities?.slug ?? "",
          commodityName: g.commodities?.name ?? "",
        }));

        // Search products
        const { data: products } = await supabase
          .from("products")
          .select("*, grades(name, slug, commodities(name, slug))")
          .or(`name.ilike.${pattern},search_terms.cs.{${q}}`)
          .limit(20);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const productHits: ProductResult[] = (products ?? []).map((p: any) => ({
          product: p,
          gradeName: p.grades?.name ?? "",
          gradeSlug: p.grades?.slug ?? "",
          commoditySlug: p.grades?.commodities?.slug ?? "",
          commodityName: p.grades?.commodities?.name ?? "",
        }));

        // Search field tips
        const { data: tips } = await supabase
          .from("field_tips")
          .select("*, grades(name, slug, commodities(name, slug))")
          .ilike("title", pattern)
          .limit(20);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tipHits: TipResult[] = (tips ?? []).map((t: any) => ({
          tip: t,
          gradeName: t.grades?.name ?? "",
          gradeSlug: t.grades?.slug ?? "",
          commoditySlug: t.grades?.commodities?.slug ?? "",
          commodityName: t.grades?.commodities?.name ?? "",
        }));

        setGradeResults(gradeHits);
        setProductResults(productHits);
        setTipResults(tipHits);

        // Log search
        const totalCount =
          gradeHits.length + productHits.length + tipHits.length;
        try {
          await supabase.from("search_logs").insert({
            query: q,
            results_count: totalCount,
            searched_at: new Date().toISOString(),
          });
        } catch {
          // Non-critical
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Run initial search from URL param
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  }

  const totalResults =
    gradeResults.length + productResults.length + tipResults.length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#12b3c3] px-4 py-4 flex items-center gap-3">
        <Link href="/" aria-label="Back">
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
        <h1 className="text-white font-bold text-lg">Search</h1>
      </header>

      {/* Search input */}
      <div className="px-4 py-3">
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          autoFocus
          placeholder="Search grades, products, tips..."
          className="w-full border-2 border-[#12b3c3] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#12b3c3]/40 placeholder:text-gray-400"
        />
      </div>

      {/* Results */}
      <main className="flex-1 px-4 pb-8">
        {searching && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#12b3c3] border-t-transparent" />
          </div>
        )}

        {!searching && searched && totalResults === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">
              No results for &ldquo;{query.trim()}&rdquo; — our team has been
              notified.
            </p>
          </div>
        )}

        {!searching && gradeResults.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[#262262] font-bold text-xs uppercase tracking-wider mb-2">
              Grades
            </h2>
            <ul className="space-y-1">
              {gradeResults.map((r) => (
                <li key={r.grade.id}>
                  <Link
                    href={`/${r.commoditySlug}/${r.grade.slug}`}
                    className="block px-3 py-2.5 rounded-lg hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {r.grade.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.commodityName} &rsaquo; {r.grade.name} &middot; Grade
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!searching && productResults.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[#262262] font-bold text-xs uppercase tracking-wider mb-2">
              Products
            </h2>
            <ul className="space-y-1">
              {productResults.map((r) => (
                <li key={r.product.id}>
                  <Link
                    href={`/${r.commoditySlug}/${r.gradeSlug}?tab=products`}
                    className="block px-3 py-2.5 rounded-lg hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {r.product.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.commodityName} &rsaquo; {r.gradeName} &middot; Product
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {!searching && tipResults.length > 0 && (
          <section className="mb-6">
            <h2 className="text-[#262262] font-bold text-xs uppercase tracking-wider mb-2">
              Tips
            </h2>
            <ul className="space-y-1">
              {tipResults.map((r) => (
                <li key={r.tip.id}>
                  <Link
                    href={`/${r.commoditySlug}/${r.gradeSlug}?tab=tips`}
                    className="block px-3 py-2.5 rounded-lg hover:bg-gray-50"
                  >
                    <p className="text-sm font-medium text-gray-800">
                      {r.tip.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.commodityName} &rsaquo; {r.gradeName} &middot; Field
                      Tip
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
