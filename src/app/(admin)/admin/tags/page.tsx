"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Tag, UserProfile } from "@/lib/types";

const TAG_CATEGORIES = [
  "commodity",
  "product_category",
  "contains",
  "field_action",
  "flag",
] as const;

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [userRole, setUserRole] = useState<UserProfile["role"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New tag form
  const [newCategory, setNewCategory] = useState<string>(TAG_CATEGORIES[0]);
  const [newName, setNewName] = useState("");
  const [newColour, setNewColour] = useState("#12b3c3");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const supabase = createClient();

      const [tagsRes, userRes] = await Promise.all([
        supabase.from("tags").select("*").order("category").order("name"),
        supabase.auth.getUser(),
      ]);

      if (tagsRes.error) throw tagsRes.error;
      setTags(tagsRes.data ?? []);

      // Fetch user profile for role check
      if (userRes.data.user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role")
          .eq("id", userRes.data.user.id)
          .single();
        if (profile) setUserRole(profile.role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tags");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddTag() {
    if (!newName.trim()) return;
    setAdding(true);

    try {
      const supabase = createClient();
      const { data, error: insertError } = await supabase
        .from("tags")
        .insert({
          category: newCategory,
          name: newName.trim(),
          colour: newColour,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      setTags([...tags, data]);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add tag");
    } finally {
      setAdding(false);
    }
  }

  async function handleDeleteTag(tagId: string) {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("tags")
        .delete()
        .eq("id", tagId);
      if (deleteError) throw deleteError;
      setTags(tags.filter((t) => t.id !== tagId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag");
    }
  }

  const groupedTags = TAG_CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = tags.filter((t) => t.category === cat);
      return acc;
    },
    {} as Record<string, Tag[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading tags...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
        Tags
      </h1>

      {error && (
        <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-3 text-[#f04e23] text-sm">
          {error}
        </div>
      )}

      {/* Add tag form */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "#c0c8c5" }}
      >
        <h2
          className="text-sm font-semibold mb-3"
          style={{ color: "#262262" }}
        >
          Add New Tag
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#c0c8c5" }}
            >
              {TAG_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#c0c8c5" }}
              placeholder="Tag name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Colour</label>
            <input
              type="color"
              value={newColour}
              onChange={(e) => setNewColour(e.target.value)}
              className="h-9 w-12 rounded border cursor-pointer"
              style={{ borderColor: "#c0c8c5" }}
            />
          </div>
          <button
            onClick={handleAddTag}
            disabled={adding || !newName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#12b3c3" }}
          >
            {adding ? "Adding..." : "Add Tag"}
          </button>
        </div>
      </div>

      {/* Tags by category */}
      {TAG_CATEGORIES.map((category) => (
        <div key={category}>
          <h2
            className="text-sm font-semibold mb-3 capitalize"
            style={{ color: "#262262" }}
          >
            {category.replace("_", " ")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {groupedTags[category].length === 0 ? (
              <p className="text-xs" style={{ color: "#c0c8c5" }}>
                No tags in this category
              </p>
            ) : (
              groupedTags[category].map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: `${tag.colour}15`,
                    color: tag.colour,
                    border: `1px solid ${tag.colour}40`,
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: tag.colour }}
                  />
                  {tag.name}
                  {userRole === "super_admin" && (
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="ml-1 hover:opacity-70"
                      title="Delete tag"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
