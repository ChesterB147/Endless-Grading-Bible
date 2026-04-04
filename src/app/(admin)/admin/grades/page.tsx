"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Grade, Commodity } from "@/lib/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [filterCommodity, setFilterCommodity] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newGrade, setNewGrade] = useState({
    commodity_id: "",
    name: "",
    slug: "",
    isri_code: "",
    dispute_flag: false,
  });
  const [saving, setSaving] = useState(false);

  // Product and photo counts per grade
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [photoCounts, setPhotoCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const supabase = createClient();

      const [gradesRes, commoditiesRes] = await Promise.all([
        supabase
          .from("grades")
          .select("*, commodities(name)")
          .order("sort_order"),
        supabase.from("commodities").select("*").order("sort_order"),
      ]);

      if (gradesRes.error) throw gradesRes.error;
      if (commoditiesRes.error) throw commoditiesRes.error;

      setGrades(gradesRes.data ?? []);
      setCommodities(commoditiesRes.data ?? []);

      // Fetch product counts
      const { data: products } = await supabase
        .from("products")
        .select("grade_id");
      if (products) {
        const pCounts: Record<string, number> = {};
        for (const p of products) {
          pCounts[p.grade_id] = (pCounts[p.grade_id] || 0) + 1;
        }
        setProductCounts(pCounts);
      }

      // Fetch photo counts
      const { data: photos } = await supabase
        .from("grade_photos")
        .select("grade_id");
      if (photos) {
        const phCounts: Record<string, number> = {};
        for (const p of photos) {
          phCounts[p.grade_id] = (phCounts[p.grade_id] || 0) + 1;
        }
        setPhotoCounts(phCounts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grades");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("grades").insert({
        commodity_id: newGrade.commodity_id,
        name: newGrade.name,
        slug: newGrade.slug || slugify(newGrade.name),
        isri_code: newGrade.isri_code || null,
        dispute_flag: newGrade.dispute_flag,
        spec_json: {},
        buyer_notes_json: {},
        price_impact_json: {},
        sort_order: grades.length,
        active: true,
      });
      if (insertError) throw insertError;
      setShowModal(false);
      setNewGrade({
        commodity_id: "",
        name: "",
        slug: "",
        isri_code: "",
        dispute_flag: false,
      });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create grade");
    } finally {
      setSaving(false);
    }
  }

  async function toggleArchive(grade: Grade) {
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("grades")
        .update({ active: !grade.active })
        .eq("id", grade.id);
      if (updateError) throw updateError;
      setGrades((prev) =>
        prev.map((g) =>
          g.id === grade.id ? { ...g, active: !g.active } : g
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to toggle archive"
      );
    }
  }

  const filteredGrades =
    filterCommodity === "all"
      ? grades
      : grades.filter((g) => g.commodity_id === filterCommodity);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading grades...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
          Grades
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: "#12b3c3" }}
        >
          New Grade
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-3 text-[#f04e23] text-sm">
          {error}
        </div>
      )}

      {/* Filter */}
      <div>
        <select
          value={filterCommodity}
          onChange={(e) => setFilterCommodity(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: "#c0c8c5", color: "#262262" }}
        >
          <option value="all">All Commodities</option>
          {commodities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#c0c8c5" }}>
        <table className="w-full text-sm" style={{ color: "#262262" }}>
          <thead>
            <tr style={{ backgroundColor: "#262262" }}>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Commodity
              </th>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Grade Name
              </th>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Issues
              </th>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Photos
              </th>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Active
              </th>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredGrades.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center"
                  style={{ color: "#262262" }}
                >
                  No grades found
                </td>
              </tr>
            ) : (
              filteredGrades.map((grade, i) => (
                <tr
                  key={grade.id}
                  className={i % 2 === 0 ? "bg-white" : ""}
                  style={i % 2 !== 0 ? { backgroundColor: "#f0f2f1" } : undefined}
                >
                  <td className="px-4 py-2.5">{grade.commodities?.name ?? "—"}</td>
                  <td className="px-4 py-2.5 font-medium">{grade.name}</td>
                  <td className="px-4 py-2.5">
                    {productCounts[grade.id] ?? 0}
                  </td>
                  <td className="px-4 py-2.5">
                    {photoCounts[grade.id] ?? 0}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        grade.active ? "bg-[#12b3c3]" : "bg-[#c0c8c5]"
                      }`}
                    />
                  </td>
                  <td className="px-4 py-2.5 space-x-2">
                    <Link
                      href={`/admin/grades/${grade.id}`}
                      className="text-xs font-medium px-2 py-1 rounded"
                      style={{ color: "#12b3c3" }}
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleArchive(grade)}
                      className="text-xs font-medium px-2 py-1 rounded border"
                      style={{
                        borderColor: grade.active ? "#f04e23" : "#12b3c3",
                        color: grade.active ? "#f04e23" : "#12b3c3",
                      }}
                    >
                      {grade.active ? "Archive" : "Restore"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Grade Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" style={{ color: "#262262" }}>
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: "#262262" }}
            >
              New Grade
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>
                  Commodity
                </label>
                <select
                  value={newGrade.commodity_id}
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, commodity_id: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                >
                  <option value="">Select commodity...</option>
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>Name</label>
                <input
                  type="text"
                  value={newGrade.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewGrade({
                      ...newGrade,
                      name,
                      slug: slugify(name),
                    });
                  }}
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
                  value={newGrade.isri_code}
                  onChange={(e) =>
                    setNewGrade({ ...newGrade, isri_code: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "#c0c8c5", color: "#262262" }}
                />
              </div>
              <label className="flex items-center space-x-2 text-sm" style={{ color: "#262262" }}>
                <input
                  type="checkbox"
                  checked={newGrade.dispute_flag}
                  onChange={(e) =>
                    setNewGrade({
                      ...newGrade,
                      dispute_flag: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span>Dispute flag</span>
              </label>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm rounded-lg border"
                style={{ borderColor: "#c0c8c5", color: "#262262" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !newGrade.commodity_id || !newGrade.name}
                className="px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: "#12b3c3" }}
              >
                {saving ? "Creating..." : "Create Grade"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
