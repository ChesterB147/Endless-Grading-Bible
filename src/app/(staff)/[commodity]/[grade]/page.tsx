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
  AnnotationPin,
} from "@/lib/types";

type TabName = "overview" | "photos" | "grading" | "tips";

const TABS: { key: TabName; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "photos", label: "Photos" },
  { key: "grading", label: "Grading Issues" },
  { key: "tips", label: "Field Tips" },
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

      {/* Tab content — constrained width on desktop */}
      <main className="flex-1">
        <div className="w-full max-w-[900px] mx-auto">
          {activeTab === "overview" && <OverviewTab grade={grade} />}
          {activeTab === "photos" && <PhotosTab gradeId={grade.id} />}
          {activeTab === "grading" && (
            <GradingIssuesTab gradeId={grade.id} grade={grade} />
          )}
          {activeTab === "tips" && <FieldTipsTab gradeId={grade.id} />}
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 1 — Overview (complete redesign)                               */
/* ------------------------------------------------------------------ */

function OverviewTab({ grade }: { grade: Grade }) {
  const supabase = createClient();
  const [photos, setPhotos] = useState<GradePhoto[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPhotos() {
      const { data } = await supabase
        .from("grade_photos")
        .select("*")
        .eq("grade_id", grade.id)
        .eq("status", "acceptable")
        .order("sort_order")
        .limit(4);
      setPhotos(data ?? []);
    }
    fetchPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade.id]);

  // Parse spec_json for conditions and examples
  const specJson = grade.spec_json ?? {};
  // Support both new multi-group format and legacy single-group format
  let conditionGroups: { intro: string; items: string[] }[] = [];
  if (specJson.condition_groups && Array.isArray(specJson.condition_groups)) {
    conditionGroups = specJson.condition_groups.map((g: { intro?: string; items?: string[] }) => ({
      intro: g.intro ?? "",
      items: g.items ?? [],
    }));
  } else if (specJson.conditions_intro || specJson.conditions) {
    const legacyItems = specJson.conditions ? specJson.conditions.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
    conditionGroups = [{ intro: specJson.conditions_intro ?? "", items: legacyItems }];
  }
  const examplesRaw = specJson.examples ?? "";
  const examples = examplesRaw ? examplesRaw.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
  const hasConditionsOrExamples = conditionGroups.length > 0 || examples.length > 0;

  return (
    <div className="flex flex-col">
      {/* SECTION 1 — Grade Banner */}
      <div className="px-4 py-5" style={{ backgroundColor: "#262262" }}>
        <h2 className="text-white text-xl" style={{ fontWeight: 500 }}>{grade.name}</h2>
      </div>

      {/* SECTION 2 — Description Block */}
      {(grade.description_bold || grade.description_body || grade.key_property) && (
        <div className="bg-white px-3.5 py-3">
          {grade.description_bold && (
            <p className="text-gray-800 leading-relaxed" style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
              {grade.description_bold}
            </p>
          )}
          {grade.description_body && (
            <p className="text-gray-500 mt-1.5 leading-relaxed" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {grade.description_body}
            </p>
          )}
          {grade.key_property && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: "#f0f0f0" }}>
              {grade.key_property_type === "positive" ? (
                <span className="text-[#1aad46] font-bold text-xs">&#10003;</span>
              ) : (
                <span className="text-[#f04e23] font-bold text-xs">&times;</span>
              )}
              <span className="text-xs font-medium" style={{ color: "#262262" }}>{grade.key_property}</span>
            </div>
          )}
        </div>
      )}

      {/* SECTION 3 — Photo Grid */}
      <div>
        <div className="flex items-center justify-between px-3.5 py-2" style={{ backgroundColor: "#12b3c3" }}>
          <span className="text-white text-xs font-semibold">Examples</span>
          <span className="text-white/60 text-[10px]">Tap any photo to expand</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-200">
          {[0, 1, 2, 3].map((i) => {
            const photo = photos[i];
            return photo ? (
              <button
                key={photo.id}
                onClick={() => setLightboxUrl(photo.url)}
                className="relative block w-full bg-white h-[110px] md:h-[200px]"
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? "Example photo"}
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div key={i} className="bg-gray-100 h-[110px] md:h-[200px]" />
            );
          })}
        </div>
      </div>

      {/* SECTION 4 — Conditions and Examples */}
      {hasConditionsOrExamples && (
        <div className="flex mx-3 md:mx-4 mt-3 border rounded-lg overflow-hidden" style={{ borderColor: "#c0c8c5" }}>
          {/* Conditions column */}
          <div className="flex-1 min-w-0 border-r" style={{ borderColor: "#c0c8c5" }}>
            <div className="px-4 py-1.5" style={{ backgroundColor: "#262262" }}>
              <span className="text-white text-[11px] font-semibold uppercase tracking-wider">Conditions</span>
            </div>
            <div className="px-4 py-3" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {conditionGroups.map((group, gi) => (
                <div key={gi} className={gi > 0 ? "mt-2.5 pt-2.5 border-t border-gray-200" : ""}>
                  {group.intro && (
                    <div className="flex items-start gap-1.5 mb-1.5">
                      <span className="text-[#f04e23] font-bold flex-shrink-0">&times;</span>
                      <span className="text-gray-700 font-medium">{group.intro}</span>
                    </div>
                  )}
                  {group.items.map((item: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f04e23] flex-shrink-0 mt-1.5" />
                      <span className="text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {/* Examples column */}
          <div className="flex-1 min-w-0">
            <div className="px-4 py-1.5" style={{ backgroundColor: "#12b3c3" }}>
              <span className="text-white text-[11px] font-semibold uppercase tracking-wider">Examples</span>
            </div>
            <div className="px-4 py-3" style={{ fontSize: 12, lineHeight: 1.5 }}>
              {examples.map((item: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12b3c3] flex-shrink-0 mt-1.5" />
                  <span className="text-gray-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5 — CTA Block */}
      <div className="mx-3 mt-3 mb-4 rounded-lg border overflow-hidden" style={{ borderColor: "#12b3c3" }}>
        <div className="px-3 py-2" style={{ backgroundColor: "#12b3c3" }}>
          <span className="text-white text-xs font-semibold">Check a specific product &rarr;</span>
        </div>
        <div className="px-3 py-2.5" style={{ backgroundColor: "#f2fbfc" }}>
          <p className="text-gray-500" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Tap Grading Issues above to see exploded diagrams, contamination checks, and grading assessments for specific products in this grade.
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl font-bold z-50"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close"
          >
            &times;
          </button>
          <img
            src={lightboxUrl}
            alt="Photo"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
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
/*  Tab 3 — Grading Issues (complete rebuild)                          */
/* ------------------------------------------------------------------ */

const RESULT_CONFIG: Record<string, {
  bg: string; text: string; textColor: string; render: boolean;
  rowBg: string; rowBorder: string;
  expandBg: string; expandText: string;
}> = {
  good: {
    bg: "bg-[#1aad46]", text: "\u2713 No", textColor: "text-white", render: true,
    rowBg: "#f2fbf5", rowBorder: "#1aad46",
    expandBg: "#f2fbf5", expandText: "#1aad46",
  },
  selected: {
    bg: "bg-[#12b3c3]", text: "\u2713 Yes", textColor: "text-white", render: true,
    rowBg: "#e8f8fa", rowBorder: "#12b3c3",
    expandBg: "#e8f8fa", expandText: "#12b3c3",
  },
  not_selected: {
    bg: "", text: "", textColor: "", render: false,
    rowBg: "#f9f9f9", rowBorder: "transparent",
    expandBg: "#f5f5f5", expandText: "#888",
  },
  contam_present: {
    bg: "bg-[#f04e23]", text: "\u2717 Present", textColor: "text-white", render: true,
    rowBg: "#fff4f2", rowBorder: "#f04e23",
    expandBg: "#fff4f2", expandText: "#f04e23",
  },
  contam_clear: {
    bg: "", text: "No", textColor: "text-gray-500", render: true,
    rowBg: "#f9f9f9", rowBorder: "transparent",
    expandBg: "#f5f5f5", expandText: "#888",
  },
};

const GROUP_HEADING_COLOR: Record<string, { bg: string; text: string }> = {
  magnetic: { bg: "#12b3c3", text: "#ffffff" },
  brass_content: { bg: "#262262", text: "#ffffff" },
  contamination: { bg: "#f04e23", text: "#ffffff" },
  custom: { bg: "#c0c8c5", text: "#262262" },
};

function GradingIssuesTab({
  gradeId,
  grade,
}: {
  gradeId: string;
  grade: Grade;
}) {
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [pinDetail, setPinDetail] = useState<AnnotationPin | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        // Try full query with grading checks first
        const fullRes = await supabase
          .from("products")
          .select("*, product_components(*), grading_check_groups(*, grading_checks(*))")
          .eq("grade_id", gradeId)
          .order("sort_order");

        let data = fullRes.data;

        // If the full query fails (tables may not exist yet), fall back to basic query
        if (fullRes.error) {
          console.warn("Full product query failed, trying without grading checks:", fullRes.error.message);
          const fallback = await supabase
            .from("products")
            .select("*, product_components(*)")
            .eq("grade_id", gradeId)
            .order("sort_order");
          data = fallback.data;
          if (fallback.error) throw fallback.error;
        }

        setProducts(data ?? []);
        // Auto-expand first product
        if (data && data.length > 0) {
          setExpandedProduct(data[0].id);
        }
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
    <div className="p-3 space-y-3">
      {products.map((product) => {
        const isExpanded = expandedProduct === product.id;
        const groups = (product.grading_check_groups ?? []).sort(
          (a, b) => a.sort_order - b.sort_order
        );
        const watchOuts: string[] = Array.isArray(product.watch_out_items)
          ? product.watch_out_items
          : [];

        return (
          <div
            key={product.id}
            className="border rounded-lg bg-white overflow-hidden"
            style={{ borderColor: "#c0c8c5" }}
          >
            {/* PRODUCT ROW — accordion header */}
            <button
              onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div className="flex-1 min-w-0">
                <h3 className="text-sm" style={{ color: "#262262", fontWeight: 500 }}>{product.name}</h3>
                {product.description && (
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{product.description}</p>
                )}
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 flex-shrink-0 ml-2 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="#c0c8c5"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isExpanded && (
              <div>
                {/* A. EXPLODED IMAGE */}
                {product.exploded_image_url && (
                  <div className="relative mx-3 mb-3 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedImage(product.id)}
                      className="w-full relative"
                    >
                      <img
                        src={product.exploded_image_url}
                        alt={`${product.name} exploded view`}
                        className="w-full rounded-lg"
                      />
                      {/* Annotation pins */}
                      {product.annotation_pins_json?.map(
                        (pin: AnnotationPin, i: number) => (
                          <div
                            key={i}
                            className={`absolute w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] text-white font-bold cursor-pointer ${
                              statusDot[pin.status] ?? "bg-gray-400"
                            }`}
                            style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPinDetail(pinDetail?.component_name === pin.component_name ? null : pin);
                            }}
                          >
                            {i + 1}
                          </div>
                        )
                      )}
                      {/* Tap to expand pill */}
                      <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full">
                        Tap to expand
                      </span>
                    </button>
                    {/* Pin detail card */}
                    {pinDetail && (
                      <div className="mx-1 mt-2 p-2.5 rounded-lg border bg-white" style={{ borderColor: "#c0c8c5" }}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${statusDot[pinDetail.status] ?? "bg-gray-400"}`} />
                          <span className="text-xs font-medium" style={{ color: "#262262" }}>{pinDetail.component_name}</span>
                        </div>
                        {pinDetail.note && <p className="text-xs text-gray-500 mt-1">{pinDetail.note}</p>}
                      </div>
                    )}
                    {/* Colour key */}
                    <div className="flex items-center gap-4 mt-2 px-1">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#12b3c3]" />
                        <span className="text-[10px] text-gray-500">Keep</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#f04e23]" />
                        <span className="text-[10px] text-gray-500">Remove</span>
                      </div>
                    </div>
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

                {/* B. COMPONENT PILLS */}
                {(product.product_components ?? []).length > 0 && (
                  <div className="px-3 pb-2 flex flex-nowrap gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {(product.product_components ?? [])
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((comp) => (
                        <span
                          key={comp.id}
                          className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white border flex-shrink-0"
                          style={{ borderColor: "#c0c8c5" }}
                        >
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              statusDot[comp.status] ?? "bg-gray-400"
                            }`}
                          />
                          <span className="font-medium" style={{ color: "#262262" }}>{comp.name}</span>
                        </span>
                      ))}
                  </div>
                )}

                {/* C. GRADING ASSESSMENT BLOCK */}
                {groups.length > 0 && (
                  <div className="mx-3 mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                      Grading assessment — tap any row to learn more
                    </p>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                      <div className="flex items-center gap-1">
                        <span className="bg-[#1aad46] text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">&check; No</span>
                        <span className="text-[9px] text-gray-400">Good result</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="bg-[#12b3c3] text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">&check; Yes</span>
                        <span className="text-[9px] text-gray-400">Grade match</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="bg-[#f04e23] text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">&times; Present</span>
                        <span className="text-[9px] text-gray-400">Contamination</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-gray-500 text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#f0f0f0" }}>No</span>
                        <span className="text-[9px] text-gray-400">Not present</span>
                      </div>
                    </div>

                    {/* Assessment block */}
                    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "#c0c8c5" }}>
                      {groups.map((group) => {
                        const checks = (group.grading_checks ?? []).sort(
                          (a, b) => a.sort_order - b.sort_order
                        );
                        const headingColor = GROUP_HEADING_COLOR[group.group_type] ?? GROUP_HEADING_COLOR.custom;

                        return (
                          <div key={group.id}>
                            {/* Group heading bar */}
                            <div
                              className="px-3 py-1.5"
                              style={{ backgroundColor: headingColor.bg, color: headingColor.text }}
                            >
                              <span className="text-[11px] font-semibold uppercase tracking-wide">
                                {group.label}
                              </span>
                            </div>

                            {/* Check rows */}
                            {checks.map((check, ci) => {
                              const rc = RESULT_CONFIG[check.result] ?? RESULT_CONFIG.not_selected;
                              const isOpen = expandedCheck === check.id;
                              const hasBorder = rc.rowBorder !== "transparent";

                              return (
                                <div key={check.id}>
                                  <button
                                    onClick={() =>
                                      setExpandedCheck(isOpen ? null : check.id)
                                    }
                                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left ${
                                      ci > 0 ? "border-t" : ""
                                    }`}
                                    style={{
                                      backgroundColor: rc.rowBg,
                                      borderTopColor: "#e5e7eb",
                                      borderLeft: hasBorder ? `3px solid ${rc.rowBorder}` : "3px solid transparent",
                                    }}
                                  >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-xs font-medium flex-1" style={{ color: "#262262" }}>
                                        {check.label}
                                      </span>
                                      {/* Chevron */}
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className={`h-3 w-3 flex-shrink-0 transition-transform text-gray-400 ${isOpen ? "rotate-180" : ""}`}
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                    {rc.render ? (
                                      <span
                                        className={`${rc.bg} ${rc.textColor} text-[10px] font-semibold px-2.5 py-0.5 rounded-full ml-2 whitespace-nowrap`}
                                        style={!rc.bg ? { backgroundColor: "#f0f0f0" } : undefined}
                                      >
                                        {rc.text}
                                      </span>
                                    ) : (
                                      <span className="ml-2 w-14" />
                                    )}
                                  </button>

                                  {/* Expanded explain_text */}
                                  {isOpen && check.explain_text && (
                                    <div
                                      className="px-4 pb-3 border-t"
                                      style={{
                                        backgroundColor: rc.expandBg,
                                        borderTopColor: "#e5e7eb",
                                      }}
                                    >
                                      <p
                                        className="text-xs leading-relaxed pt-2.5 italic"
                                        style={{ color: rc.expandText }}
                                      >
                                        {check.explain_text}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* D. FINAL GRADE BAR */}
                <div className="mx-3 mb-3 rounded-lg px-4 py-3" style={{ backgroundColor: "#262262" }}>
                  <p className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">Final grade</p>
                  <p className="text-white text-lg" style={{ fontWeight: 500 }}>{grade.name}</p>
                </div>

                {/* E. UPGRADE STATEMENT BLOCK */}
                {grade.upgrade_statement && (
                  <div className="mx-3 mb-3 rounded-lg border overflow-hidden" style={{ borderColor: "#12b3c3" }}>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "#12b3c3" }}>
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs">&uarr;</span>
                      <span className="text-white text-xs font-semibold">What would make this {grade.name}?</span>
                    </div>
                    <div className="px-3 py-2.5" style={{ backgroundColor: "#f2fbfc" }}>
                      <p className="text-xs leading-relaxed text-gray-600">
                        {grade.upgrade_statement}
                      </p>
                    </div>
                  </div>
                )}

                {/* F. WATCH OUT BLOCK */}
                {watchOuts.length > 0 && (
                  <div className="mx-3 mb-3 rounded-lg border overflow-hidden" style={{ borderColor: "#f04e23" }}>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: "#f04e23" }}>
                      <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold">!</span>
                      <span className="text-white text-xs font-semibold">Watch out for this product</span>
                    </div>
                    <div className="px-3 py-2.5" style={{ backgroundColor: "#fff8f6" }}>
                      <ul className="space-y-2">
                        {watchOuts.map((item, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#f04e23] flex-shrink-0 mt-1.5" />
                            <span className="text-xs leading-relaxed" style={{ color: "#262262" }}>
                              {item}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
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

