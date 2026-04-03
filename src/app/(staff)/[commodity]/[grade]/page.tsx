"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import {
  Grade,
  GradePhoto,
  Product,
  FieldTip,
  EdgeCase,
  AnnotationPin,
} from "@/lib/types";

type TabName = "overview" | "photos" | "products" | "tips" | "exceptions";

const TABS: { key: TabName; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "photos", label: "Photos" },
  { key: "products", label: "Products" },
  { key: "tips", label: "Field Tips" },
  { key: "exceptions", label: "Exceptions" },
];

export default function GradeDetailPage() {
  const supabase = createClient();
  const params = useParams<{ commodity: string; grade: string }>();
  const commoditySlug = params.commodity;
  const gradeSlug = params.grade;

  const [grade, setGrade] = useState<Grade | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGrade() {
      try {
        const { data: comData, error: comError } = await supabase
          .from("commodities")
          .select("id")
          .eq("slug", commoditySlug)
          .single();

        if (comError) throw comError;

        const { data: gradeData, error: gradeError } = await supabase
          .from("grades")
          .select("*")
          .eq("commodity_id", comData.id)
          .eq("slug", gradeSlug)
          .single();

        if (gradeError) throw gradeError;
        setGrade(gradeData);

        // Track view
        try {
          await supabase.from("grade_views").insert({
            grade_id: gradeData.id,
            viewed_at: new Date().toISOString(),
          });
        } catch {
          // Non-critical, ignore view tracking failures
        }
      } catch (err) {
        console.error("Failed to fetch grade:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commoditySlug, gradeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#12b3c3] border-t-transparent" />
      </div>
    );
  }

  if (!grade) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-400 text-sm">Grade not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#12b3c3] px-4 py-4 flex items-center gap-3">
        <Link href={`/${commoditySlug}`} aria-label="Back to grades">
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
        <h1 className="text-white font-bold text-lg truncate">{grade.name}</h1>
      </header>

      {/* Tab bar */}
      <nav className="flex border-b border-[#c0c8c5] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-[#12b3c3] text-white"
                : "bg-white text-[#262262] hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <main className="flex-1">
        {activeTab === "overview" && <OverviewTab specJson={grade.spec_json} />}
        {activeTab === "photos" && <PhotosTab gradeId={grade.id} />}
        {activeTab === "products" && <ProductsTab gradeId={grade.id} />}
        {activeTab === "tips" && <FieldTipsTab gradeId={grade.id} />}
        {activeTab === "exceptions" && (
          <ExceptionsTab
            gradeId={grade.id}
            commoditySlug={commoditySlug}
            gradeSlug={gradeSlug}
          />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 1 — Overview                                                   */
/* ------------------------------------------------------------------ */

function OverviewTab({ specJson }: { specJson: Record<string, string> }) {
  const entries = Object.entries(specJson ?? {});

  if (entries.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-12">
        No specifications added yet.
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <tbody>
        {entries.map(([key, value], i) => (
          <tr key={key}>
            <td className="bg-[#262262] text-white px-4 py-2.5 font-medium w-1/3 align-top">
              {key}
            </td>
            <td
              className={`px-4 py-2.5 ${
                i % 2 === 0 ? "bg-white" : "bg-[#c0c8c5]/20"
              }`}
            >
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2 — Photos                                                     */
/* ------------------------------------------------------------------ */

function PhotosTab({ gradeId }: { gradeId: string }) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<GradePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState<GradePhoto | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from("grade_photos")
          .select("*")
          .eq("grade_id", gradeId)
          .order("sort_order");

        if (error) throw error;
        setPhotos(data ?? []);
      } catch (err) {
        console.error("Failed to fetch photos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  const statusColor: Record<string, string> = {
    acceptable: "bg-[#12b3c3]",
    reject: "bg-[#f04e23]",
    reference: "bg-[#262262]",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#12b3c3] border-t-transparent" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-12">
        No photos added yet.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 p-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            onClick={() => setFullscreen(photo)}
            className="rounded-lg overflow-hidden border border-[#c0c8c5] bg-white text-left"
          >
            <img
              src={photo.url}
              alt={photo.caption ?? "Grade photo"}
              className="w-full aspect-square object-cover"
            />
            <div className="p-2">
              {photo.caption && (
                <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                  {photo.caption}
                </p>
              )}
              <span
                className={`inline-block text-white text-[10px] font-medium px-2 py-0.5 rounded ${
                  statusColor[photo.status] ?? "bg-gray-400"
                }`}
              >
                {photo.status}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setFullscreen(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold z-50"
            onClick={() => setFullscreen(null)}
            aria-label="Close"
          >
            &times;
          </button>
          <img
            src={fullscreen.url}
            alt={fullscreen.caption ?? "Grade photo"}
            className="max-w-full max-h-full object-contain"
          />
          {fullscreen.caption && (
            <p className="absolute bottom-6 left-0 right-0 text-center text-white text-sm px-4">
              {fullscreen.caption}
            </p>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3 — Products                                                   */
/* ------------------------------------------------------------------ */

function ProductsTab({ gradeId }: { gradeId: string }) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, product_components(*)")
          .eq("grade_id", gradeId)
          .order("sort_order");

        if (error) throw error;
        setProducts(data ?? []);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  const statusDot: Record<string, string> = {
    acceptable: "bg-[#12b3c3]",
    remove: "bg-[#f04e23]",
    price_out: "bg-[#f04e23]",
    review: "bg-[#c0c8c5]",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#12b3c3] border-t-transparent" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-12">
        No products added yet.
      </p>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {products.map((product) => (
        <div
          key={product.id}
          className="border border-[#c0c8c5] rounded-lg bg-white overflow-hidden"
        >
          <button
            onClick={() =>
              setExpanded(expanded === product.id ? null : product.id)
            }
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <div>
              <h3 className="text-[#262262] font-semibold text-sm">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-gray-500 text-xs mt-0.5">{product.description}</p>
              )}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 text-gray-400 transition-transform ${
                expanded === product.id ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded === product.id && (
            <div className="border-t border-[#c0c8c5] px-4 py-3">
              {/* Exploded image with annotation pins */}
              {product.exploded_image_url && (
                <div className="relative mb-3">
                  <img
                    src={product.exploded_image_url}
                    alt={`${product.name} exploded view`}
                    className="w-full rounded"
                  />
                  {product.annotation_pins_json?.map(
                    (pin: AnnotationPin, i: number) => (
                      <div
                        key={i}
                        className={`absolute w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold ${
                          statusDot[pin.status] ?? "bg-gray-400"
                        }`}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        title={`${pin.component_name}: ${pin.note}`}
                      >
                        {i + 1}
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Component list */}
              <ul className="space-y-2">
                {(product.product_components ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((comp) => (
                    <li key={comp.id} className="flex items-start gap-2">
                      <span
                        className={`mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          statusDot[comp.status] ?? "bg-gray-400"
                        }`}
                      />
                      <div>
                        <span className="text-sm text-gray-800 font-medium">
                          {comp.name}
                        </span>
                        {comp.status === "price_out" && (
                          <span className="ml-1.5 text-[#f04e23] text-[10px] font-medium">
                            price out
                          </span>
                        )}
                        {comp.note && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {comp.note}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4 — Field Tips                                                 */
/* ------------------------------------------------------------------ */

function FieldTipsTab({ gradeId }: { gradeId: string }) {
  const supabase = createClient();
  const [tips, setTips] = useState<FieldTip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from("field_tips")
          .select("*")
          .eq("grade_id", gradeId)
          .order("sort_order");

        if (error) throw error;
        setTips(data ?? []);
      } catch (err) {
        console.error("Failed to fetch field tips:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  const borderColor: Record<string, string> = {
    test: "border-l-[#12b3c3]",
    rule: "border-l-[#262262]",
    warning: "border-l-[#f04e23]",
    info: "border-l-[#c0c8c5]",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#12b3c3] border-t-transparent" />
      </div>
    );
  }

  if (tips.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-12">
        No field tips added yet.
      </p>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {tips.map((tip) => (
        <div
          key={tip.id}
          className={`border-l-4 ${
            borderColor[tip.tip_type] ?? "border-l-gray-300"
          } rounded-r-lg bg-white border border-[#c0c8c5] border-l-0 pl-0`}
        >
          <div
            className={`border-l-4 ${
              borderColor[tip.tip_type] ?? "border-l-gray-300"
            } px-4 py-3`}
          >
            <h3 className="text-[#262262] font-bold text-sm">{tip.title}</h3>
            {tip.body && (
              <p className="text-gray-600 text-xs mt-1 leading-relaxed">
                {tip.body}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 5 — Exceptions                                                 */
/* ------------------------------------------------------------------ */

function ExceptionsTab({
  gradeId,
  commoditySlug,
  gradeSlug,
}: {
  gradeId: string;
  commoditySlug: string;
  gradeSlug: string;
}) {
  const supabase = createClient();
  const [cases, setCases] = useState<EdgeCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from("edge_cases")
          .select("*")
          .eq("grade_id", gradeId)
          .eq("approved", true)
          .order("submitted_at", { ascending: false });

        if (error) throw error;
        setCases(data ?? []);
      } catch (err) {
        console.error("Failed to fetch edge cases:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeId]);

  const outcomeBadge: Record<string, string> = {
    accepted: "bg-[#12b3c3] text-white",
    rejected: "bg-[#f04e23] text-white",
    escalated: "bg-[#c0c8c5] text-gray-800",
    resolved: "bg-[#262262] text-white",
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#12b3c3] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {cases.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">
          No approved exceptions yet.
        </p>
      ) : (
        <ul className="p-4 space-y-3">
          {cases.map((ec) => (
            <li
              key={ec.id}
              className="border border-[#c0c8c5] rounded-lg bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-xs text-gray-400">
                  {new Date(ec.submitted_at).toLocaleDateString()}
                  {ec.yard ? ` — ${ec.yard}` : ""}
                </span>
                {ec.outcome && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                      outcomeBadge[ec.outcome] ?? "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {ec.outcome}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-800">{ec.scenario}</p>
              {ec.decision && (
                <p className="text-xs text-gray-500 mt-1">
                  Decision: {ec.decision}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#c0c8c5]">
        <Link
          href={`/${commoditySlug}/${gradeSlug}/log`}
          className="block w-full bg-[#12b3c3] text-white text-center font-semibold py-3 rounded-lg"
        >
          Log Exception
        </Link>
      </div>
    </div>
  );
}
