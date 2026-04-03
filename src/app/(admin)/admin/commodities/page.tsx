"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Commodity } from "@/lib/types";

export default function CommoditiesPage() {
  const supabase = createClient();
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  useEffect(() => {
    fetchCommodities();
  }, []);

  async function fetchCommodities() {
    try {
      const { data, error } = await supabase
        .from("commodities")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      setCommodities(data ?? []);
    } catch (err) {
      console.error("Failed to fetch commodities:", err);
    } finally {
      setLoading(false);
    }
  }

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const finalSlug = slug.trim() || generateSlug(name);
      const maxOrder = commodities.reduce((max, c) => Math.max(max, c.sort_order), 0);
      const { error } = await supabase.from("commodities").insert({
        name: name.trim(),
        slug: finalSlug,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
      setName("");
      setSlug("");
      setShowForm(false);
      await fetchCommodities();
    } catch (err) {
      console.error("Failed to create commodity:", err);
      alert("Failed to create commodity. Check the console for details.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;
    try {
      const { error } = await supabase
        .from("commodities")
        .update({ name: editName.trim(), slug: editSlug.trim() || generateSlug(editName) })
        .eq("id", id);
      if (error) throw error;
      setEditingId(null);
      await fetchCommodities();
    } catch (err) {
      console.error("Failed to update commodity:", err);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from("commodities")
        .update({ active: !currentActive })
        .eq("id", id);
      if (error) throw error;
      await fetchCommodities();
    } catch (err) {
      console.error("Failed to toggle commodity:", err);
    }
  }

  async function handleReorder(id: string, direction: "up" | "down") {
    const idx = commodities.findIndex((c) => c.id === id);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= commodities.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const current = commodities[idx];
    const swap = commodities[swapIdx];

    try {
      await supabase.from("commodities").update({ sort_order: swap.sort_order }).eq("id", current.id);
      await supabase.from("commodities").update({ sort_order: current.sort_order }).eq("id", swap.id);
      await fetchCommodities();
    } catch (err) {
      console.error("Failed to reorder:", err);
    }
  }

  if (loading) {
    return <div className="p-8 text-center" style={{ color: "#c0c8c5" }}>Loading commodities...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>Commodities</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded text-white text-sm font-medium"
          style={{ backgroundColor: "#12b3c3" }}
        >
          {showForm ? "Cancel" : "+ New Commodity"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 p-4 rounded border" style={{ borderColor: "#c0c8c5" }}>
          <div className="mb-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#262262" }}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                placeholder="e.g. Copper"
                className="w-full px-3 py-2 border rounded text-sm"
                style={{ borderColor: "#c0c8c5" }}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded text-white text-sm font-medium"
            style={{ backgroundColor: "#12b3c3" }}
          >
            {saving ? "Creating..." : "Create Commodity"}
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded border" style={{ borderColor: "#c0c8c5" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#262262" }}>
              <th className="px-4 py-3 text-left text-white font-medium">Order</th>
              <th className="px-4 py-3 text-left text-white font-medium">Name</th>
              <th className="px-4 py-3 text-left text-white font-medium">Status</th>
              <th className="px-4 py-3 text-left text-white font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {commodities.map((c, i) => (
              <tr key={c.id} className={i % 2 === 0 ? "bg-white" : ""} style={i % 2 !== 0 ? { backgroundColor: "#f3f4f3" } : undefined}>
                {editingId === c.id ? (
                  <>
                    <td className="px-4 py-3">{c.sort_order}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 border rounded text-sm"
                        style={{ borderColor: "#c0c8c5" }}
                      />
                    </td>
                    <td className="px-4 py-3">{c.active ? "Active" : "Archived"}</td>
                    <td className="px-4 py-3 space-x-2">
                      <button onClick={() => handleUpdate(c.id)} className="text-sm font-medium" style={{ color: "#12b3c3" }}>Save</button>
                      <button onClick={() => setEditingId(null)} className="text-sm" style={{ color: "#c0c8c5" }}>Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleReorder(c.id, "up")} className="text-xs px-1" style={{ color: "#262262" }}>▲</button>
                        <button onClick={() => handleReorder(c.id, "down")} className="text-xs px-1" style={{ color: "#262262" }}>▼</button>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: "#262262" }}>{c.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: c.active ? "#12b3c3" : "#c0c8c5" }}
                      >
                        {c.active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-4 py-3 space-x-3">
                      <button
                        onClick={() => { setEditingId(c.id); setEditName(c.name); setEditSlug(c.slug); }}
                        className="text-sm font-medium"
                        style={{ color: "#262262" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleActive(c.id, c.active)}
                        className="text-sm"
                        style={{ color: c.active ? "#f04e23" : "#12b3c3" }}
                      >
                        {c.active ? "Archive" : "Restore"}
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {commodities.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center" style={{ color: "#c0c8c5" }}>No commodities yet. Create your first one above.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
