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

  // Editable spec_json pairs
  const [specPairs, setSpecPairs] = useState<{ key: string; value: string }[]>(
    []
  );
  const [buyerNotesPairs, setBuyerNotesPairs] = useState<
    { key: string; value: string }[]
  >([]);
  const [priceImpactPairs, setPriceImpactPairs] = useState<
    { key: string; value: string }[]
  >([]);

  // Expanded products
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(
    new Set()
  );

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

      setSpecPairs(
        Object.entries(g.spec_json || {}).map(([key, value]) => ({
          key,
          value,
        }))
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

      const specJson: Record<string, string> = {};
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

      // Update grade
      const { error: gradeError } = await supabase
        .from("grades")
        .update({
          name: grade.name,
          slug: grade.slug,
          isri_code: grade.isri_code,
          dispute_flag: grade.dispute_flag,
          spec_json: specJson,
          buyer_notes_json: buyerNotesJson,
          price_impact_json: priceImpactJson,
        })
        .eq("id", gradeId);
      if (gradeError) throw gradeError;

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
          status: "reference",
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
            ? {
                ...p,
                product_components: [...(p.product_components ?? []), data],
              }
            : p
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add component"
      );
    }
  }

  async function deleteComponent(productId: string, componentId: string) {
    try {
      const supabase = createClient();
      await supabase
        .from("product_components")
        .delete()
        .eq("id", componentId);
      setProducts(
        products.map((p) =>
          p.id === productId
            ? {
                ...p,
                product_components: (p.product_components ?? []).filter(
                  (c) => c.id !== componentId
                ),
              }
            : p
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete component"
      );
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
    return (
      <div className="text-[#f04e23] text-sm">Grade not found</div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "photos", label: "Photos" },
    { key: "products", label: "Products" },
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
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
                ISRI Code <span className="font-normal opacity-60">(optional)</span>
              </label>
              <input
                type="text"
                value={grade.isri_code ?? ""}
                onChange={(e) =>
                  setGrade({ ...grade, isri_code: e.target.value || null })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
              />
            </div>
          </div>

          <label className="flex items-center space-x-2 text-sm" style={{ color: "#262262" }}>
            <input
              type="checkbox"
              checked={grade.dispute_flag}
              onChange={(e) =>
                setGrade({ ...grade, dispute_flag: e.target.checked })
              }
              className="rounded"
            />
            <span>Dispute flag</span>
          </label>

          {/* Spec JSON */}
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "#262262" }}
            >
              Specifications (spec_json)
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
                  onClick={() =>
                    setSpecPairs(specPairs.filter((_, idx) => idx !== i))
                  }
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
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "#262262" }}
            >
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
                  onClick={() =>
                    setBuyerNotesPairs(
                      buyerNotesPairs.filter((_, idx) => idx !== i)
                    )
                  }
                  className="text-[#f04e23] text-sm px-2"
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setBuyerNotesPairs([...buyerNotesPairs, { key: "", value: "" }])
              }
              className="text-sm"
              style={{ color: "#12b3c3" }}
            >
              + Add row
            </button>
          </div>

          {/* Price Impact JSON */}
          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "#262262" }}
            >
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
                  onClick={() =>
                    setPriceImpactPairs(
                      priceImpactPairs.filter((_, idx) => idx !== i)
                    )
                  }
                  className="text-[#f04e23] text-sm px-2"
                >
                  Delete
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setPriceImpactPairs([
                  ...priceImpactPairs,
                  { key: "", value: "" },
                ])
              }
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
                        p.id === photo.id
                          ? { ...p, caption: e.target.value }
                          : p
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
                          ? {
                              ...p,
                              status: e.target.value as GradePhoto["status"],
                            }
                          : p
                      )
                    )
                  }
                  className="w-full rounded border px-2 py-1 text-xs mb-2"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                >
                  <option value="acceptable">Acceptable</option>
                  <option value="reject">Reject</option>
                  <option value="reference">Reference</option>
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

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <button
            onClick={addProduct}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: "#12b3c3" }}
          >
            Add Product
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
                    {isExpanded ? "▼" : "▶"} {product.name}
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
                              p.id === product.id
                                ? { ...p, name: e.target.value }
                                : p
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
                              p.id === product.id
                                ? { ...p, description: e.target.value }
                                : p
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
                        <div
                          key={comp.id}
                          className="flex items-center gap-2 mb-2"
                        >
                          <input
                            type="text"
                            value={comp.name}
                            onChange={(e) =>
                              setProducts(
                                products.map((p) =>
                                  p.id === product.id
                                    ? {
                                        ...p,
                                        product_components: (
                                          p.product_components ?? []
                                        ).map((c) =>
                                          c.id === comp.id
                                            ? { ...c, name: e.target.value }
                                            : c
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
                                        product_components: (
                                          p.product_components ?? []
                                        ).map((c) =>
                                          c.id === comp.id
                                            ? {
                                                ...c,
                                                status: e.target
                                                  .value as ProductComponent["status"],
                                              }
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
                                        product_components: (
                                          p.product_components ?? []
                                        ).map((c) =>
                                          c.id === comp.id
                                            ? { ...c, note: e.target.value }
                                            : c
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
                            onClick={() =>
                              deleteComponent(product.id, comp.id)
                            }
                            className="text-xs text-[#f04e23]"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {products.length === 0 && (
            <p className="text-sm" style={{ color: "#262262" }}>
              No products yet
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
                    ▲
                  </button>
                  <button
                    onClick={() => moveTip(index, "down")}
                    disabled={index === tips.length - 1}
                    className="text-xs disabled:opacity-30"
                    style={{ color: "#262262" }}
                  >
                    ▼
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={tip.title}
                    onChange={(e) =>
                      setTips(
                        tips.map((t) =>
                          t.id === tip.id
                            ? { ...t, title: e.target.value }
                            : t
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
                          t.id === tip.id
                            ? { ...t, body: e.target.value }
                            : t
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
                            ? {
                                ...t,
                                tip_type: e.target.value as FieldTip["tip_type"],
                              }
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
                        {ec.yard ?? "—"} | {ec.submitted_by ?? "—"} |{" "}
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
                        style={{
                          borderColor: "#f04e23",
                          color: "#f04e23",
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
          )}

          <h3
            className="text-sm font-semibold mt-6"
            style={{ color: "#262262" }}
          >
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
                    {ec.yard ?? "—"} |{" "}
                    {new Date(ec.submitted_at).toLocaleDateString()} | Outcome:{" "}
                    {ec.outcome ?? "—"}
                  </p>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
