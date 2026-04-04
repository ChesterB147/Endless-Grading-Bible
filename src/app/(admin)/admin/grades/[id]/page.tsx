"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type {
  Grade,
  GradePhoto,
  Product,
  ProductComponent,
  FieldTip,
  EdgeCase,
  GradingCheckGroup,
  GradingCheck,
} from "@/lib/types";

type Tab = "overview" | "photos" | "products" | "tips" | "exceptions";

export default function GradeEditorPage() {
  const params = useParams();
  const gradeId = params.id as string;

  const [grade, setGrade] = useState<Grade | null>(null);
  const [photos, setPhotos] = useState<GradePhoto[]>([]);
  const [products, setProducts] = useState<(Product & { product_components?: ProductComponent[] })[]>([]);
  const [tips, setTips] = useState<FieldTip[]>([]);
  const [edgeCases, setEdgeCases] = useState<EdgeCase[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Structured spec_json editors
  const [conditionsIntro, setConditionsIntro] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);
  const [examples, setExamples] = useState<string[]>([]);

  // Legacy spec_json pairs (for backwards-compatible entries)
  const [specPairs, setSpecPairs] = useState<{ key: string; value: string }[]>([]);
  const [buyerNotesPairs, setBuyerNotesPairs] = useState<{ key: string; value: string }[]>([]);
  const [priceImpactPairs, setPriceImpactPairs] = useState<{ key: string; value: string }[]>([]);

  // Expanded products
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const fetchGrade = useCallback(async () => {
    try {
      const supabase = createClient();

      const [gradeRes, photosRes, productsRes, tipsRes, edgeCasesRes] =
        await Promise.all([
          supabase.from("grades").select("*").eq("id", gradeId).single(),
          supabase
            .from("grade_photos")
            .select("*")
            .eq("grade_id", gradeId)
            .order("sort_order"),
          supabase
            .from("products")
            .select("*, product_components(*)")
            .eq("grade_id", gradeId)
            .order("sort_order"),
          supabase
            .from("field_tips")
            .select("*")
            .eq("grade_id", gradeId)
            .order("sort_order"),
          supabase
            .from("edge_cases")
            .select("*")
            .eq("grade_id", gradeId)
            .order("submitted_at", { ascending: false }),
        ]);

      if (gradeRes.error) throw gradeRes.error;

      const g = gradeRes.data as Grade;
      setGrade(g);
      setPhotos(photosRes.data ?? []);
      setProducts(productsRes.data ?? []);
      setTips(tipsRes.data ?? []);
      setEdgeCases(edgeCasesRes.data ?? []);

      // Parse spec_json for structured editors
      const sj = g.spec_json || {};
      setConditionsIntro(sj.conditions_intro ?? "");
      setConditions(sj.conditions ? sj.conditions.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setExamples(sj.examples ? sj.examples.split(",").map((s: string) => s.trim()).filter(Boolean) : []);

      // Legacy key-value pairs (exclude structured keys)
      const structuredKeys = ["conditions_intro", "conditions", "examples"];
      setSpecPairs(
        Object.entries(sj)
          .filter(([key]) => !structuredKeys.includes(key))
          .map(([key, value]) => ({ key, value }))
      );
      setBuyerNotesPairs(
        Object.entries(g.buyer_notes_json || {}).map(([key, value]) => ({
          key,
          value,
        }))
      );
      setPriceImpactPairs(
        Object.entries(g.price_impact_json || {}).map(([key, value]) => ({
          key,
          value,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grade");
    } finally {
      setLoading(false);
    }
  }, [gradeId]);

  useEffect(() => {
    fetchGrade();
  }, [fetchGrade]);

  async function handleSave() {
    if (!grade) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const supabase = createClient();

      // Build spec_json including structured keys
      const specJson: Record<string, string> = {};
      if (conditionsIntro.trim()) specJson.conditions_intro = conditionsIntro.trim();
      if (conditions.filter(Boolean).length > 0) specJson.conditions = conditions.filter(Boolean).join(", ");
      if (examples.filter(Boolean).length > 0) specJson.examples = examples.filter(Boolean).join(", ");
      for (const p of specPairs) {
        if (p.key.trim()) specJson[p.key.trim()] = p.value;
      }

      const buyerNotesJson: Record<string, string> = {};
      for (const p of buyerNotesPairs) {
        if (p.key.trim()) buyerNotesJson[p.key.trim()] = p.value;
      }
      const priceImpactJson: Record<string, string> = {};
      for (const p of priceImpactPairs) {
        if (p.key.trim()) priceImpactJson[p.key.trim()] = p.value;
      }

      // Update grade — try with new columns first, fall back to legacy columns
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gradeUpdate: Record<string, any> = {
        name: grade.name,
        slug: grade.slug,
        dispute_flag: grade.dispute_flag,
        spec_json: specJson,
        buyer_notes_json: buyerNotesJson,
        price_impact_json: priceImpactJson,
      };

      // New columns — only include if they exist on the grade object (migration applied)
      if ("description_bold" in grade) gradeUpdate.description_bold = grade.description_bold;
      if ("description_body" in grade) gradeUpdate.description_body = grade.description_body;
      if ("key_property" in grade) gradeUpdate.key_property = grade.key_property;
      if ("key_property_type" in grade) gradeUpdate.key_property_type = grade.key_property_type;
      if ("overview_image_url" in grade) gradeUpdate.overview_image_url = grade.overview_image_url;
      if ("upgrade_statement" in grade) gradeUpdate.upgrade_statement = grade.upgrade_statement;

      const { error: gradeError } = await supabase
        .from("grades")
        .update(gradeUpdate)
        .eq("id", gradeId);

      // If it fails due to unknown columns, retry with only safe columns
      if (gradeError) {
        const safeUpdate = {
          name: grade.name,
          slug: grade.slug,
          dispute_flag: grade.dispute_flag,
          spec_json: specJson,
          buyer_notes_json: buyerNotesJson,
          price_impact_json: priceImpactJson,
        };
        const { error: retryError } = await supabase
          .from("grades")
          .update(safeUpdate)
          .eq("id", gradeId);
        if (retryError) throw retryError;
        // Warn user that new fields didn't save
        setError("Saved core fields, but new fields (description, key property, etc.) require a database migration. Ask your admin to run migration-v4-descriptions.sql in Supabase SQL Editor.");
      }

      // Update photos
      for (const photo of photos) {
        await supabase
          .from("grade_photos")
          .update({ caption: photo.caption, status: photo.status })
          .eq("id", photo.id);
      }

      // Update products and components
      for (const product of products) {
        await supabase
          .from("products")
          .update({
            name: product.name,
            description: product.description,
            search_terms: product.search_terms,
            watch_out_items: product.watch_out_items ?? [],
          })
          .eq("id", product.id);

        if (product.product_components) {
          for (const comp of product.product_components) {
            await supabase
              .from("product_components")
              .update({
                name: comp.name,
                status: comp.status,
                note: comp.note,
              })
              .eq("id", comp.id);
          }
        }
      }

      // Update tips
      for (const tip of tips) {
        await supabase
          .from("field_tips")
          .update({
            title: tip.title,
            body: tip.body,
            tip_type: tip.tip_type,
            sort_order: tip.sort_order,
          })
          .eq("id", tip.id);
      }

      setSuccessMsg("Saved successfully");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const supabase = createClient();
      const filePath = `grades/${gradeId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("grading-media")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("grading-media").getPublicUrl(filePath);

      const { data: newPhoto, error: insertError } = await supabase
        .from("grade_photos")
        .insert({
          grade_id: gradeId,
          url: publicUrl,
          caption: "",
          status: "acceptable",
          sort_order: photos.length,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setPhotos([...photos, newPhoto]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      const supabase = createClient();
      const { error: delError } = await supabase
        .from("grade_photos")
        .delete()
        .eq("id", photoId);
      if (delError) throw delError;
      setPhotos(photos.filter((p) => p.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function addProduct() {
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("products")
        .insert({
          grade_id: gradeId,
          name: "New Product",
          description: "",
          search_terms: [],
          annotation_pins_json: [],
          sort_order: products.length,
        })
        .select("*, product_components(*)")
        .single();
      if (insertError) throw insertError;
      setProducts([...products, data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add product");
    }
  }

  async function addComponent(productId: string) {
    try {
      const supabase = createClient();
      const product = products.find((p) => p.id === productId);
      const { data, error: insertError } = await supabase
        .from("product_components")
        .insert({
          product_id: productId,
          name: "New Component",
          status: "acceptable",
          note: "",
          sort_order: product?.product_components?.length ?? 0,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setProducts(
        products.map((p) =>
          p.id === productId
            ? { ...p, product_components: [...(p.product_components ?? []), data] }
            : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add component");
    }
  }

  async function deleteComponent(productId: string, componentId: string) {
    try {
      const supabase = createClient();
      await supabase.from("product_components").delete().eq("id", componentId);
      setProducts(
        products.map((p) =>
          p.id === productId
            ? { ...p, product_components: (p.product_components ?? []).filter((c) => c.id !== componentId) }
            : p
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete component");
    }
  }

  async function addTip() {
    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("field_tips")
        .insert({
          grade_id: gradeId,
          title: "New Tip",
          body: "",
          tip_type: "info",
          sort_order: tips.length,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setTips([...tips, data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tip");
    }
  }

  async function deleteTip(tipId: string) {
    try {
      const supabase = createClient();
      await supabase.from("field_tips").delete().eq("id", tipId);
      setTips(tips.filter((t) => t.id !== tipId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tip");
    }
  }

  function moveTip(index: number, direction: "up" | "down") {
    const newTips = [...tips];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newTips.length) return;
    [newTips[index], newTips[swapIdx]] = [newTips[swapIdx], newTips[index]];
    newTips.forEach((t, i) => (t.sort_order = i));
    setTips(newTips);
  }

  async function approveEdgeCase(id: string) {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("edge_cases")
        .update({
          approved: true,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updateError) throw updateError;
      setEdgeCases(
        edgeCases.map((ec) =>
          ec.id === id
            ? { ...ec, approved: true, approved_at: new Date().toISOString() }
            : ec
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  }

  async function rejectEdgeCase(id: string) {
    try {
      const supabase = createClient();
      await supabase.from("edge_cases").delete().eq("id", id);
      setEdgeCases(edgeCases.filter((ec) => ec.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading grade...</div>
      </div>
    );
  }

  if (!grade) {
    return <div className="text-[#f04e23] text-sm">Grade not found</div>;
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "photos", label: "Photos" },
    { key: "products", label: "Grading Issues" },
    { key: "tips", label: "Field Tips" },
    { key: "exceptions", label: "Exceptions" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/grades"
            className="text-sm mb-1 inline-block"
            style={{ color: "#12b3c3" }}
          >
            &larr; Back to Grades
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
            {grade.name}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: "#12b3c3" }}
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-3 text-[#f04e23] text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-[#12b3c3]/30 bg-[#12b3c3]/5 p-3 text-[#12b3c3] text-sm">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "#c0c8c5", color: "#262262" }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#12b3c3] text-[#12b3c3]"
                : "border-transparent text-[#262262]/60 hover:text-[#262262]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>Name</label>
              <input
                type="text"
                value={grade.name}
                onChange={(e) => setGrade({ ...grade, name: e.target.value })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
              />
            </div>
          </div>

          <label className="flex items-center space-x-2 text-sm" style={{ color: "#262262" }}>
            <input
              type="checkbox"
              checked={grade.dispute_flag}
              onChange={(e) => setGrade({ ...grade, dispute_flag: e.target.checked })}
              className="rounded"
            />
            <span>Dispute flag</span>
          </label>

          {/* Description (bold intro) */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
              Description (bold intro)
            </label>
            <textarea
              value={grade.description_bold ?? ""}
              onChange={(e) => setGrade({ ...grade, description_bold: e.target.value || null })}
              rows={2}
              placeholder="Short bold intro line about this grade..."
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#c0c8c5", color: "#262262" }}
            />
          </div>

          {/* Description (body text) */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
              Description (body text)
            </label>
            <textarea
              value={grade.description_body ?? ""}
              onChange={(e) => setGrade({ ...grade, description_body: e.target.value || null })}
              rows={3}
              placeholder="Longer description for this grade..."
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#c0c8c5", color: "#262262" }}
            />
          </div>

          {/* Key property */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
                Key property (e.g. non-magnetic)
              </label>
              <input
                type="text"
                value={grade.key_property ?? ""}
                onChange={(e) => setGrade({ ...grade, key_property: e.target.value || null })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
                Property type
              </label>
              <select
                value={grade.key_property_type ?? ""}
                onChange={(e) => setGrade({ ...grade, key_property_type: (e.target.value || null) as Grade["key_property_type"] })}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
              >
                <option value="">None</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>

          {/* Overview Image */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
              Overview Image
            </label>
            {grade.overview_image_url && (
              <div className="mb-2">
                <img src={grade.overview_image_url} alt="Overview" className="w-48 h-32 object-cover rounded border" style={{ borderColor: "#c0c8c5" }} />
              </div>
            )}
            <label
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
              style={{ backgroundColor: "#12b3c3" }}
            >
              Upload Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const supabase = createClient();
                    const filePath = `grades/${gradeId}/overview-${Date.now()}-${file.name}`;
                    const { error: uploadError } = await supabase.storage
                      .from("grading-media")
                      .upload(filePath, file);
                    if (uploadError) throw uploadError;
                    const { data: { publicUrl } } = supabase.storage.from("grading-media").getPublicUrl(filePath);
                    setGrade({ ...grade, overview_image_url: publicUrl });
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Upload failed");
                  }
                }}
              />
            </label>
          </div>

          {/* Upgrade Statement */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
              What would make this a higher grade? (shown to customer)
            </label>
            <textarea
              value={grade.upgrade_statement ?? ""}
              onChange={(e) => setGrade({ ...grade, upgrade_statement: e.target.value || null })}
              rows={3}
              placeholder="How to upgrade this grade to a higher value..."
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#c0c8c5", color: "#262262" }}
            />
          </div>

          {/* Structured spec_json: Conditions & Examples */}
          <div className="border rounded-lg p-4" style={{ borderColor: "#12b3c3" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "#262262" }}>
              Conditions & Examples (Overview tab)
            </h3>

            {/* Conditions intro */}
            <div className="mb-3">
              <label className="block text-xs font-medium mb-1" style={{ color: "#262262" }}>
                Conditions intro (e.g. &quot;No contamination:&quot;)
              </label>
              <input
                type="text"
                value={conditionsIntro}
                onChange={(e) => setConditionsIntro(e.target.value)}
                className="w-full rounded-lg border px-3 py-1.5 text-sm"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
                placeholder="No contamination:"
              />
            </div>

            {/* Conditions list */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: "#262262" }}>Conditions</label>
                <button
                  onClick={() => setConditions([...conditions, ""])}
                  className="text-xs"
                  style={{ color: "#12b3c3" }}
                >
                  + Add
                </button>
              </div>
              {conditions.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f04e23] flex-shrink-0" />
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...conditions];
                      updated[i] = e.target.value;
                      setConditions(updated);
                    }}
                    className="flex-1 rounded border px-2 py-1 text-xs"
                    style={{ borderColor: "#c0c8c5", color: "#262262" }}
                    placeholder="e.g. plastic"
                  />
                  <button
                    onClick={() => setConditions(conditions.filter((_, idx) => idx !== i))}
                    className="text-xs text-[#f04e23]"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* Examples list */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium" style={{ color: "#262262" }}>Examples</label>
                <button
                  onClick={() => setExamples([...examples, ""])}
                  className="text-xs"
                  style={{ color: "#12b3c3" }}
                >
                  + Add
                </button>
              </div>
              {examples.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#12b3c3] flex-shrink-0" />
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...examples];
                      updated[i] = e.target.value;
                      setExamples(updated);
                    }}
                    className="flex-1 rounded border px-2 py-1 text-xs"
                    style={{ borderColor: "#c0c8c5", color: "#262262" }}
                    placeholder="e.g. brass taps"
                  />
                  <button
                    onClick={() => setExamples(examples.filter((_, idx) => idx !== i))}
                    className="text-xs text-[#f04e23]"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Spec JSON (additional key-value pairs) */}
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#262262" }}>
              Additional Specifications (spec_json)
            </h3>
            {specPairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={pair.key}
                  onChange={(e) => {
                    const updated = [...specPairs];
                    updated[i] = { ...updated[i], key: e.target.value };
                    setSpecPairs(updated);
                  }}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={pair.value}
                  onChange={(e) => {
                    const updated = [...specPairs];
                    updated[i] = { ...updated[i], value: e.target.value };
                    setSpecPairs(updated);
                  }}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
                <button
                  onClick={() => setSpecPairs(specPairs.filter((_, idx) => idx !== i))}
                  className="text-[#f04e23] text-sm px-2"
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              onClick={() => setSpecPairs([...specPairs, { key: "", value: "" }])}
              className="text-sm"
              style={{ color: "#12b3c3" }}
            >
              + Add row
            </button>
          </div>

          {/* Buyer Notes JSON */}
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#262262" }}>
              Buyer Notes (buyer_notes_json)
            </h3>
            {buyerNotesPairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={pair.key}
                  onChange={(e) => {
                    const updated = [...buyerNotesPairs];
                    updated[i] = { ...updated[i], key: e.target.value };
                    setBuyerNotesPairs(updated);
                  }}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={pair.value}
                  onChange={(e) => {
                    const updated = [...buyerNotesPairs];
                    updated[i] = { ...updated[i], value: e.target.value };
                    setBuyerNotesPairs(updated);
                  }}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
                <button
                  onClick={() => setBuyerNotesPairs(buyerNotesPairs.filter((_, idx) => idx !== i))}
                  className="text-[#f04e23] text-sm px-2"
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              onClick={() => setBuyerNotesPairs([...buyerNotesPairs, { key: "", value: "" }])}
              className="text-sm"
              style={{ color: "#12b3c3" }}
            >
              + Add row
            </button>
          </div>

          {/* Price Impact JSON */}
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: "#262262" }}>
              Price Impact (price_impact_json)
            </h3>
            {priceImpactPairs.map((pair, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Key"
                  value={pair.key}
                  onChange={(e) => {
                    const updated = [...priceImpactPairs];
                    updated[i] = { ...updated[i], key: e.target.value };
                    setPriceImpactPairs(updated);
                  }}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={pair.value}
                  onChange={(e) => {
                    const updated = [...priceImpactPairs];
                    updated[i] = { ...updated[i], value: e.target.value };
                    setPriceImpactPairs(updated);
                  }}
                  className="flex-1 rounded-lg border px-3 py-1.5 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
                <button
                  onClick={() => setPriceImpactPairs(priceImpactPairs.filter((_, idx) => idx !== i))}
                  className="text-[#f04e23] text-sm px-2"
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              onClick={() => setPriceImpactPairs([...priceImpactPairs, { key: "", value: "" }])}
              className="text-sm"
              style={{ color: "#12b3c3" }}
            >
              + Add row
            </button>
          </div>
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === "photos" && (
        <div className="space-y-4">
          <div>
            <label
              className="inline-block px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
              style={{ backgroundColor: "#12b3c3" }}
            >
              Upload Photo
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="rounded-lg border p-3"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
              >
                <img
                  src={photo.url}
                  alt={photo.caption ?? ""}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <input
                  type="text"
                  placeholder="Caption"
                  value={photo.caption ?? ""}
                  onChange={(e) =>
                    setPhotos(
                      photos.map((p) =>
                        p.id === photo.id ? { ...p, caption: e.target.value } : p
                      )
                    )
                  }
                  className="w-full rounded border px-2 py-1 text-xs mb-2"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
                <select
                  value={photo.status}
                  onChange={(e) =>
                    setPhotos(
                      photos.map((p) =>
                        p.id === photo.id
                          ? { ...p, status: e.target.value as GradePhoto["status"] }
                          : p
                      )
                    )
                  }
                  className="w-full rounded border px-2 py-1 text-xs mb-2"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                >
                  <option value="acceptable">Acceptable</option>
                  <option value="downgrade">Downgrade</option>
                  <option value="reject">Reject</option>
                </select>
                <button
                  onClick={() => deletePhoto(photo.id)}
                  className="text-xs text-[#f04e23]"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          {photos.length === 0 && (
            <p className="text-sm" style={{ color: "#262262" }}>
              No photos yet
            </p>
          )}
        </div>
      )}

      {/* Products / Grading Issues Tab */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <button
            onClick={addProduct}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "#12b3c3" }}
          >
            Add Grading Issue
          </button>

          {products.map((product) => {
            const isExpanded = expandedProducts.has(product.id);
            return (
              <div
                key={product.id}
                className="rounded-lg border p-4"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      const next = new Set(expandedProducts);
                      if (isExpanded) next.delete(product.id);
                      else next.add(product.id);
                      setExpandedProducts(next);
                    }}
                    className="font-medium text-sm"
                    style={{ color: "#262262" }}
                  >
                    {isExpanded ? "\u25BC" : "\u25B6"} {product.name}
                  </button>
                  <Link
                    href={`/admin/grades/${gradeId}/annotate?product_id=${product.id}`}
                    className="text-xs px-2 py-1 rounded"
                    style={{ color: "#12b3c3" }}
                  >
                    Annotate
                  </Link>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3 pl-4">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "#262262" }}>
                        Name
                      </label>
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) =>
                          setProducts(
                            products.map((p) =>
                              p.id === product.id ? { ...p, name: e.target.value } : p
                            )
                          )
                        }
                        className="w-full rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: "#c0c8c5", color: "#262262" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "#262262" }}>
                        Description
                      </label>
                      <textarea
                        value={product.description ?? ""}
                        onChange={(e) =>
                          setProducts(
                            products.map((p) =>
                              p.id === product.id ? { ...p, description: e.target.value } : p
                            )
                          )
                        }
                        rows={2}
                        className="w-full rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: "#c0c8c5", color: "#262262" }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: "#262262" }}>
                        Search Terms (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={product.search_terms.join(", ")}
                        onChange={(e) =>
                          setProducts(
                            products.map((p) =>
                              p.id === product.id
                                ? {
                                    ...p,
                                    search_terms: e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  }
                                : p
                            )
                          )
                        }
                        className="w-full rounded-lg border px-3 py-1.5 text-sm"
                        style={{ borderColor: "#c0c8c5", color: "#262262" }}
                      />
                    </div>

                    {/* Components */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold" style={{ color: "#262262" }}>Components</h4>
                        <button
                          onClick={() => addComponent(product.id)}
                          className="text-xs"
                          style={{ color: "#12b3c3" }}
                        >
                          + Add Component
                        </button>
                      </div>
                      {(product.product_components ?? []).map((comp) => (
                        <div key={comp.id} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) =>
                              setProducts(
                                products.map((p) =>
                                  p.id === product.id
                                    ? {
                                        ...p,
                                        product_components: (p.product_components ?? []).map((c) =>
                                          c.id === comp.id ? { ...c, name: e.target.value } : c
                                        ),
                                      }
                                    : p
                                )
                              )
                            }
                            className="flex-1 rounded border px-2 py-1 text-xs"
                            style={{ borderColor: "#c0c8c5", color: "#262262" }}
                            placeholder="Name"
                          />
                          <select
                            value={comp.status}
                            onChange={(e) =>
                              setProducts(
                                products.map((p) =>
                                  p.id === product.id
                                    ? {
                                        ...p,
                                        product_components: (p.product_components ?? []).map((c) =>
                                          c.id === comp.id
                                            ? { ...c, status: e.target.value as ProductComponent["status"] }
                                            : c
                                        ),
                                      }
                                    : p
                                )
                              )
                            }
                            className="rounded border px-2 py-1 text-xs"
                            style={{ borderColor: "#c0c8c5", color: "#262262" }}
                          >
                            <option value="acceptable">Acceptable</option>
                            <option value="remove">Remove</option>
                            <option value="price_out">Price Out</option>
                            <option value="review">Review</option>
                          </select>
                          <input
                            type="text"
                            value={comp.note ?? ""}
                            onChange={(e) =>
                              setProducts(
                                products.map((p) =>
                                  p.id === product.id
                                    ? {
                                        ...p,
                                        product_components: (p.product_components ?? []).map((c) =>
                                          c.id === comp.id ? { ...c, note: e.target.value } : c
                                        ),
                                      }
                                    : p
                                )
                              )
                            }
                            className="flex-1 rounded border px-2 py-1 text-xs"
                            style={{ borderColor: "#c0c8c5", color: "#262262" }}
                            placeholder="Note"
                          />
                          <button
                            onClick={() => deleteComponent(product.id, comp.id)}
                            className="text-xs text-[#f04e23]"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Watch Out Items */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold" style={{ color: "#f04e23" }}>Watch Out Items</h4>
                        <button
                          onClick={() => {
                            const items: string[] = Array.isArray(product.watch_out_items) ? [...product.watch_out_items] : [];
                            items.push("");
                            setProducts(products.map((p) => p.id === product.id ? { ...p, watch_out_items: items } : p));
                          }}
                          className="text-xs"
                          style={{ color: "#f04e23" }}
                        >
                          + Add Item
                        </button>
                      </div>
                      {(Array.isArray(product.watch_out_items) ? product.watch_out_items : []).map((item: string, wi: number) => (
                        <div key={wi} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const items = [...(Array.isArray(product.watch_out_items) ? product.watch_out_items : [])];
                              items[wi] = e.target.value;
                              setProducts(products.map((p) => p.id === product.id ? { ...p, watch_out_items: items } : p));
                            }}
                            className="flex-1 rounded border px-2 py-1 text-xs"
                            style={{ borderColor: "#c0c8c5", color: "#262262" }}
                            placeholder="Watch out item..."
                          />
                          <button
                            onClick={() => {
                              const items = [...(Array.isArray(product.watch_out_items) ? product.watch_out_items : [])];
                              items.splice(wi, 1);
                              setProducts(products.map((p) => p.id === product.id ? { ...p, watch_out_items: items } : p));
                            }}
                            className="text-xs text-[#f04e23]"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Grading Check Groups Editor */}
                    <GradingCheckGroupsEditor productId={product.id} />
                  </div>
                )}
              </div>
            );
          })}

          {products.length === 0 && (
            <p className="text-sm" style={{ color: "#262262" }}>
              No grading issues yet
            </p>
          )}
        </div>
      )}

      {/* Field Tips Tab */}
      {activeTab === "tips" && (
        <div className="space-y-4">
          <button
            onClick={addTip}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "#12b3c3" }}
          >
            Add Tip
          </button>

          {tips.map((tip, index) => (
            <div
              key={tip.id}
              className="rounded-lg border p-4"
              style={{ borderColor: "#c0c8c5", color: "#262262" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveTip(index, "up")}
                    disabled={index === 0}
                    className="text-xs disabled:opacity-30"
                    style={{ color: "#262262" }}
                  >
                    &#9650;
                  </button>
                  <button
                    onClick={() => moveTip(index, "down")}
                    disabled={index === tips.length - 1}
                    className="text-xs disabled:opacity-30"
                    style={{ color: "#262262" }}
                  >
                    &#9660;
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={tip.title}
                    onChange={(e) =>
                      setTips(
                        tips.map((t) =>
                          t.id === tip.id ? { ...t, title: e.target.value } : t
                        )
                      )
                    }
                    className="w-full rounded-lg border px-3 py-1.5 text-sm font-medium"
                    style={{ borderColor: "#c0c8c5", color: "#262262" }}
                    placeholder="Title"
                  />
                  <textarea
                    value={tip.body ?? ""}
                    onChange={(e) =>
                      setTips(
                        tips.map((t) =>
                          t.id === tip.id ? { ...t, body: e.target.value } : t
                        )
                      )
                    }
                    rows={2}
                    className="w-full rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: "#c0c8c5", color: "#262262" }}
                    placeholder="Body"
                  />
                  <select
                    value={tip.tip_type}
                    onChange={(e) =>
                      setTips(
                        tips.map((t) =>
                          t.id === tip.id
                            ? { ...t, tip_type: e.target.value as FieldTip["tip_type"] }
                            : t
                        )
                      )
                    }
                    className="rounded-lg border px-3 py-1.5 text-sm"
                    style={{ borderColor: "#c0c8c5", color: "#262262" }}
                  >
                    <option value="test">Test</option>
                    <option value="rule">Rule</option>
                    <option value="warning">Warning</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                <button
                  onClick={() => deleteTip(tip.id)}
                  className="text-sm text-[#f04e23]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {tips.length === 0 && (
            <p className="text-sm" style={{ color: "#262262" }}>
              No field tips yet
            </p>
          )}
        </div>
      )}

      {/* Exceptions Tab */}
      {activeTab === "exceptions" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: "#262262" }}>
            Pending
          </h3>
          {edgeCases.filter((ec) => !ec.approved).length === 0 ? (
            <p className="text-sm" style={{ color: "#262262" }}>
              No pending edge cases
            </p>
          ) : (
            edgeCases
              .filter((ec) => !ec.approved)
              .map((ec) => (
                <div
                  key={ec.id}
                  className="rounded-lg border p-4"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{ec.scenario}</p>
                      {ec.decision && (
                        <p className="text-xs" style={{ color: "#c0c8c5" }}>
                          Decision: {ec.decision}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: "#c0c8c5" }}>
                        {ec.yard ?? "\u2014"} | {ec.submitted_by ?? "\u2014"} |{" "}
                        {new Date(ec.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveEdgeCase(ec.id)}
                        className="px-3 py-1 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: "#12b3c3" }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectEdgeCase(ec.id)}
                        className="px-3 py-1 rounded text-xs font-medium border"
                        style={{ borderColor: "#f04e23", color: "#f04e23" }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}

          <h3 className="text-sm font-semibold mt-6" style={{ color: "#262262" }}>
            Approved
          </h3>
          {edgeCases.filter((ec) => ec.approved).length === 0 ? (
            <p className="text-sm" style={{ color: "#262262" }}>
              No approved edge cases
            </p>
          ) : (
            edgeCases
              .filter((ec) => ec.approved)
              .map((ec) => (
                <div
                  key={ec.id}
                  className="rounded-lg border p-4 opacity-75"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                >
                  <p className="text-sm">{ec.scenario}</p>
                  {ec.decision && (
                    <p className="text-xs mt-1" style={{ color: "#c0c8c5" }}>
                      Decision: {ec.decision}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: "#c0c8c5" }}>
                    {ec.yard ?? "\u2014"} |{" "}
                    {new Date(ec.submitted_at).toLocaleDateString()} | Outcome:{" "}
                    {ec.outcome ?? "\u2014"}
                  </p>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Grading Check Groups Editor (inline in Products tab)               */
/* ------------------------------------------------------------------ */

function GradingCheckGroupsEditor({ productId }: { productId: string }) {
  const [groups, setGroups] = useState<(GradingCheckGroup & { grading_checks: GradingCheck[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function fetchGroups() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("grading_check_groups")
        .select("*, grading_checks(*)")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      setGroups((data ?? []).map((g: GradingCheckGroup & { grading_checks: GradingCheck[] }) => ({
        ...g,
        grading_checks: (g.grading_checks ?? []).sort((a: GradingCheck, b: GradingCheck) => a.sort_order - b.sort_order),
      })));
    } catch (err) {
      console.error("Failed to fetch grading check groups:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addGroup() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("grading_check_groups")
        .insert({
          product_id: productId,
          label: "New Group",
          group_type: "custom",
          sort_order: groups.length,
        })
        .select("*, grading_checks(*)")
        .single();
      if (error) throw error;
      setGroups([...groups, { ...data, grading_checks: [] }]);
    } catch (err) {
      console.error("Failed to add group:", err);
    }
  }

  async function updateGroup(groupId: string, updates: Partial<GradingCheckGroup>) {
    try {
      const supabase = createClient();
      await supabase.from("grading_check_groups").update(updates).eq("id", groupId);
      setGroups(groups.map((g) => g.id === groupId ? { ...g, ...updates } : g));
    } catch (err) {
      console.error("Failed to update group:", err);
    }
  }

  async function deleteGroup(groupId: string) {
    try {
      const supabase = createClient();
      await supabase.from("grading_check_groups").delete().eq("id", groupId);
      setGroups(groups.filter((g) => g.id !== groupId));
    } catch (err) {
      console.error("Failed to delete group:", err);
    }
  }

  async function addCheck(groupId: string) {
    try {
      const supabase = createClient();
      const group = groups.find((g) => g.id === groupId);
      const { data, error } = await supabase
        .from("grading_checks")
        .insert({
          group_id: groupId,
          label: "New Check",
          result: "not_selected",
          explain_text: "",
          sort_order: group?.grading_checks?.length ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      setGroups(groups.map((g) =>
        g.id === groupId ? { ...g, grading_checks: [...g.grading_checks, data] } : g
      ));
    } catch (err) {
      console.error("Failed to add check:", err);
    }
  }

  async function updateCheck(groupId: string, checkId: string, updates: Partial<GradingCheck>) {
    try {
      const supabase = createClient();
      await supabase.from("grading_checks").update(updates).eq("id", checkId);
      setGroups(groups.map((g) =>
        g.id === groupId
          ? { ...g, grading_checks: g.grading_checks.map((c) => c.id === checkId ? { ...c, ...updates } : c) }
          : g
      ));
    } catch (err) {
      console.error("Failed to update check:", err);
    }
  }

  async function deleteCheck(groupId: string, checkId: string) {
    try {
      const supabase = createClient();
      await supabase.from("grading_checks").delete().eq("id", checkId);
      setGroups(groups.map((g) =>
        g.id === groupId
          ? { ...g, grading_checks: g.grading_checks.filter((c) => c.id !== checkId) }
          : g
      ));
    } catch (err) {
      console.error("Failed to delete check:", err);
    }
  }

  const groupTypeColors: Record<string, string> = {
    magnetic: "#12b3c3",
    brass_content: "#262262",
    contamination: "#f04e23",
    custom: "#c0c8c5",
  };

  if (loading) return <p className="text-xs" style={{ color: "#c0c8c5" }}>Loading checks...</p>;

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: "#c0c8c5" }}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold" style={{ color: "#262262" }}>Grading Assessment</h4>
        <button onClick={addGroup} className="text-xs" style={{ color: "#12b3c3" }}>
          + Add Group
        </button>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="mb-4 rounded border p-3" style={{ borderColor: "#c0c8c5" }}>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={group.label}
              onChange={(e) => updateGroup(group.id, { label: e.target.value })}
              className="flex-1 rounded border px-2 py-1 text-xs font-semibold"
              style={{ borderColor: "#c0c8c5", color: groupTypeColors[group.group_type] ?? "#262262" }}
            />
            <select
              value={group.group_type}
              onChange={(e) => updateGroup(group.id, { group_type: e.target.value as GradingCheckGroup["group_type"] })}
              className="rounded border px-2 py-1 text-xs"
              style={{ borderColor: "#c0c8c5", color: "#262262" }}
            >
              <option value="magnetic">Magnetic</option>
              <option value="brass_content">Brass Content</option>
              <option value="contamination">Contamination</option>
              <option value="custom">Custom</option>
            </select>
            <button onClick={() => deleteGroup(group.id)} className="text-xs text-[#f04e23]">Delete</button>
          </div>

          {/* Check rows */}
          {group.grading_checks.map((check) => (
            <div key={check.id} className="flex flex-col gap-1 mb-2 ml-2 pl-2 border-l-2" style={{ borderColor: groupTypeColors[group.group_type] ?? "#c0c8c5" }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={check.label}
                  onChange={(e) => updateCheck(group.id, check.id, { label: e.target.value })}
                  className="flex-1 rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                  placeholder="Check label"
                />
                <select
                  value={check.result}
                  onChange={(e) => updateCheck(group.id, check.id, { result: e.target.value as GradingCheck["result"] })}
                  className="rounded border px-2 py-1 text-xs"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                >
                  <option value="good">Good</option>
                  <option value="selected">Selected</option>
                  <option value="not_selected">Not Selected</option>
                  <option value="contam_present">Contam Present</option>
                  <option value="contam_clear">Contam Clear</option>
                </select>
                <button onClick={() => deleteCheck(group.id, check.id)} className="text-xs text-[#f04e23]">x</button>
              </div>
              <textarea
                value={check.explain_text ?? ""}
                onChange={(e) => updateCheck(group.id, check.id, { explain_text: e.target.value })}
                rows={1}
                className="rounded border px-2 py-1 text-xs"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
                placeholder="Explain text (shown when tapped)..."
              />
            </div>
          ))}

          <button onClick={() => addCheck(group.id)} className="text-xs ml-2" style={{ color: "#12b3c3" }}>
            + Add Check
          </button>
        </div>
      ))}
    </div>
  );
}
