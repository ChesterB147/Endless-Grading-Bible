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

type TabName = "overview" | "photos" | "grading" | "tips" | "exceptions";

const TABS: { key: TabName; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "photos", label: "Photos" },
  { key: "grading", label: "Grading Issues" },
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
          // Non-critical
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
        {activeTab === "grading" && (
          <GradingIssuesTab gradeId={grade.id} upgradeStatement={grade.upgrade_statement} />
        )}
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
/*  Tab 2 — Photos (updated labels)                                    */
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

  const statusConfig: Record<string, { bg: string; label: string }> = {
    acceptable: { bg: "bg-[#12b3c3]", label: "Acceptable" },
    downgrade: { bg: "bg-[#262262]", label: "Downgrade" },
    reject: { bg: "bg-[#f04e23]", label: "Reject" },
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
        {photos.map((photo) => {
          const config = statusConfig[photo.status] ?? { bg: "bg-gray-400", label: photo.status };
          return (
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
                  className={`inline-block text-white text-[10px] font-medium px-2 py-0.5 rounded ${config.bg}`}
                >
                  {config.label}
                </span>
              </div>
            </button>
          );
        })}
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
/*  Tab 3 — Grading Issues (replaces Products)                         */
/* ------------------------------------------------------------------ */

const RESULT_CONFIG: Record<string, { bg: string; text: string; textColor: string; render: boolean }> = {
  good: { bg: "bg-[#1aad46]", text: "\u2713 No", textColor: "text-white", render: true },
  selected: { bg: "bg-[#12b3c3]", text: "\u2713 Yes", textColor: "text-white", render: true },
  not_selected: { bg: "", text: "", textColor: "", render: false },
  contam_present: { bg: "bg-[#f04e23]", text: "\u2717 Present", textColor: "text-white", render: true },
  contam_clear: { bg: "bg-[#f0f0f0]", text: "No", textColor: "text-gray-500", render: true },
};

const GROUP_HEADING_COLOR: Record<string, string> = {
  magnetic: "#12b3c3",
  brass_content: "#262262",
  contamination: "#f04e23",
  custom: "#c0c8c5",
};

const RESULT_EXPAND_COLOR: Record<string, string> = {
  good: "#1aad46",
  selected: "#12b3c3",
  contam_present: "#f04e23",
  contam_clear: "#c0c8c5",
  not_selected: "#c0c8c5",
};

function GradingIssuesTab({
  gradeId,
  upgradeStatement,
}: {
  gradeId: string;
  upgradeStatement: string | null;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*, product_components(*), grading_check_groups(*, grading_checks(*))")
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
        No grading issues added yet.
      </p>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {products.map((product) => {
        const groups = (product.grading_check_groups ?? []).sort(
          (a, b) => a.sort_order - b.sort_order
        );
        const watchOuts: string[] = Array.isArray(product.watch_out_items)
          ? product.watch_out_items
          : [];

        return (
          <div
            key={product.id}
            className="border border-[#c0c8c5] rounded-lg bg-white overflow-hidden"
          >
            {/* Product header */}
            <div className="px-4 py-3 border-b border-[#c0c8c5]">
              <h3 className="text-[#262262] font-bold text-sm">{product.name}</h3>
              {product.description && (
                <p className="text-gray-500 text-xs mt-0.5">{product.description}</p>
              )}
            </div>

            {/* Exploded image — full width, tap to expand */}
            {product.exploded_image_url && (
              <div className="relative">
                <button
                  onClick={() =>
                    setExpandedImage(
                      expandedImage === product.id ? null : product.id
                    )
                  }
                  className="w-full"
                >
                  <img
                    src={product.exploded_image_url}
                    alt={`${product.name} exploded view`}
                    className="w-full"
                  />
                </button>
                {/* Annotation pins */}
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

            {/* Fullscreen image overlay */}
            {expandedImage === product.id && product.exploded_image_url && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                onClick={() => setExpandedImage(null)}
              >
                <button
                  className="absolute top-4 right-4 text-white text-2xl font-bold z-50"
                  onClick={() => setExpandedImage(null)}
                >
                  &times;
                </button>
                <img
                  src={product.exploded_image_url}
                  alt={`${product.name} expanded`}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}

            {/* Component pills row */}
            {(product.product_components ?? []).length > 0 && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-[#c0c8c5]">
                {(product.product_components ?? [])
                  .sort((a, b) => a.sort_order - b.sort_order)
                  .map((comp) => (
                    <span
                      key={comp.id}
                      className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-gray-50 border border-[#c0c8c5]"
                    >
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          statusDot[comp.status] ?? "bg-gray-400"
                        }`}
                      />
                      <span className="text-[#262262] font-medium">{comp.name}</span>
                      {comp.status === "price_out" && (
                        <span className="text-[#f04e23] text-[9px] font-medium">
                          price out
                        </span>
                      )}
                    </span>
                  ))}
              </div>
            )}

            {/* Grading assessment block — grouped checks */}
            {groups.length > 0 && (
              <div className="px-4 py-3 space-y-4">
                {groups.map((group) => {
                  const checks = (group.grading_checks ?? []).sort(
                    (a, b) => a.sort_order - b.sort_order
                  );
                  const headingColor =
                    GROUP_HEADING_COLOR[group.group_type] ?? "#c0c8c5";

                  return (
                    <div key={group.id}>
                      {/* Group heading */}
                      <div
                        className="text-xs font-bold uppercase tracking-wide mb-2 px-1"
                        style={{ color: headingColor }}
                      >
                        {group.label}
                      </div>

                      {/* Check rows */}
                      <div className="rounded-lg border border-[#c0c8c5] overflow-hidden">
                        {checks.map((check, ci) => {
                          const rc =
                            RESULT_CONFIG[check.result] ?? RESULT_CONFIG.not_selected;
                          const isExpanded = expandedCheck === check.id;
                          const expandColor =
                            RESULT_EXPAND_COLOR[check.result] ?? "#c0c8c5";

                          return (
                            <div key={check.id}>
                              <button
                                onClick={() =>
                                  setExpandedCheck(
                                    isExpanded ? null : check.id
                                  )
                                }
                                className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${
                                  ci > 0 ? "border-t border-[#c0c8c5]" : ""
                                }`}
                              >
                                <span className="text-[#262262] text-xs font-medium flex-1">
                                  {check.label}
                                </span>
                                {rc.render && (
                                  <span
                                    className={`${rc.bg} ${rc.textColor} text-[10px] font-semibold px-2.5 py-0.5 rounded-full ml-2 whitespace-nowrap`}
                                  >
                                    {rc.text}
                                  </span>
                                )}
                              </button>

                              {/* Expanded explain_text */}
                              {isExpanded && check.explain_text && (
                                <div
                                  className="px-3 pb-2.5 -mt-1"
                                >
                                  <div
                                    className="text-xs leading-relaxed p-2.5 rounded-md"
                                    style={{
                                      backgroundColor: `${expandColor}10`,
                                      borderLeft: `3px solid ${expandColor}`,
                                      color: "#333",
                                    }}
                                  >
                                    {check.explain_text}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upgrade statement block */}
            {upgradeStatement && (
              <div className="mx-4 mb-3 rounded-lg p-3" style={{ backgroundColor: "#12b3c310", borderLeft: "4px solid #12b3c3" }}>
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#12b3c3" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#12b3c3" }}>
                      Upgrade path
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "#262262" }}>
                      {upgradeStatement}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Watch out block */}
            {watchOuts.length > 0 && (
              <div className="mx-4 mb-3 rounded-lg p-3" style={{ backgroundColor: "#f04e2310", borderLeft: "4px solid #f04e23" }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "#f04e23" }}>
                  Watch out
                </p>
                <ul className="space-y-1.5">
                  {watchOuts.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#f04e23] text-xs mt-0.5 flex-shrink-0">&#x26A0;</span>
                      <span className="text-xs leading-relaxed" style={{ color: "#262262" }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
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
                  {ec.yard ? ` \u2014 ${ec.yard}` : ""}
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
