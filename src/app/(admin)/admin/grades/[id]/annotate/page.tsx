"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Product, AnnotationPin } from "@/lib/types";

const PIN_SIZE = 20;

const statusColors: Record<AnnotationPin["status"], string> = {
  acceptable: "#12b3c3",
  remove: "#f04e23",
  price_out: "#f04e23",
  review: "#c0c8c5",
};

export default function AnnotatePage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get("product_id");

  const [product, setProduct] = useState<Product | null>(null);
  const [pins, setPins] = useState<AnnotationPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // New pin form
  const [newPin, setNewPin] = useState<{
    x: number;
    y: number;
    component_name: string;
    status: AnnotationPin["status"];
    note: string;
  } | null>(null);

  // Editing existing pin
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) {
      setError("No product_id provided");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (fetchError) throw fetchError;
      setProduct(data);
      setPins(data.annotation_pins_json ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  function handleImageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (editingIndex !== null) {
      setEditingIndex(null);
      return;
    }

    const container = imageContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewPin({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
      component_name: "",
      status: "acceptable",
      note: "",
    });
  }

  function handlePinClick(index: number, e: React.MouseEvent) {
    e.stopPropagation();
    setNewPin(null);
    setEditingIndex(index);
  }

  async function savePin() {
    if (!newPin || !newPin.component_name.trim()) return;

    const updatedPins = [
      ...pins,
      {
        x: newPin.x,
        y: newPin.y,
        component_name: newPin.component_name.trim(),
        status: newPin.status,
        note: newPin.note,
      },
    ];

    await savePins(updatedPins);
    setNewPin(null);
  }

  async function updatePin() {
    if (editingIndex === null) return;
    await savePins([...pins]);
    setEditingIndex(null);
  }

  async function deletePin() {
    if (editingIndex === null) return;
    const updatedPins = pins.filter((_, i) => i !== editingIndex);
    await savePins(updatedPins);
    setEditingIndex(null);
  }

  async function savePins(updatedPins: AnnotationPin[]) {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("products")
        .update({ annotation_pins_json: updatedPins })
        .eq("id", productId!);
      if (updateError) throw updateError;
      setPins(updatedPins);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save pins");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading annotator...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-[#f04e23] text-sm">{error ?? "Product not found"}</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/admin/grades/${product.grade_id}`}
            className="text-sm mb-1 inline-block"
            style={{ color: "#12b3c3" }}
          >
            &larr; Back to Grade
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
            Annotate: {product.name}
          </h1>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-3 text-[#f04e23] text-sm">
          {error}
        </div>
      )}

      <p className="text-sm" style={{ color: "#c0c8c5" }}>
        Click on the image to place a pin. Click an existing pin to edit or
        delete it.
      </p>

      {/* Image container */}
      <div
        ref={imageContainerRef}
        className="relative w-full cursor-crosshair border rounded-lg overflow-hidden"
        style={{ borderColor: "#c0c8c5" }}
        onClick={handleImageClick}
      >
        {product.exploded_image_url ? (
          <img
            src={product.exploded_image_url}
            alt={product.name}
            className="w-full block"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-96 flex items-center justify-center"
            style={{ backgroundColor: "#c0c8c5", opacity: 0.2 }}
          >
            <span className="text-sm">No image available</span>
          </div>
        )}

        {/* Existing pins */}
        {pins.map((pin, index) => (
          <div
            key={index}
            onClick={(e) => handlePinClick(index, e)}
            className="absolute rounded-full border-2 border-white cursor-pointer shadow-md transition-transform hover:scale-125"
            style={{
              width: PIN_SIZE,
              height: PIN_SIZE,
              backgroundColor: statusColors[pin.status],
              left: `calc(${pin.x}% - ${PIN_SIZE / 2}px)`,
              top: `calc(${pin.y}% - ${PIN_SIZE / 2}px)`,
              outline:
                editingIndex === index ? "2px solid #262262" : undefined,
            }}
            title={`${pin.component_name} (${pin.status})`}
          />
        ))}

        {/* New pin preview */}
        {newPin && (
          <div
            className="absolute rounded-full border-2 border-white shadow-md animate-pulse"
            style={{
              width: PIN_SIZE,
              height: PIN_SIZE,
              backgroundColor: statusColors[newPin.status],
              left: `calc(${newPin.x}% - ${PIN_SIZE / 2}px)`,
              top: `calc(${newPin.y}% - ${PIN_SIZE / 2}px)`,
            }}
          />
        )}
      </div>

      {/* New pin form */}
      {newPin && (
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: "#c0c8c5" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "#262262" }}>
            New Pin ({newPin.x.toFixed(1)}%, {newPin.y.toFixed(1)}%)
          </h3>
          <div>
            <label className="block text-xs font-medium mb-1">
              Component Name
            </label>
            <input
              type="text"
              value={newPin.component_name}
              onChange={(e) =>
                setNewPin({ ...newPin, component_name: e.target.value })
              }
              className="w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "#c0c8c5" }}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={newPin.status}
              onChange={(e) =>
                setNewPin({
                  ...newPin,
                  status: e.target.value as AnnotationPin["status"],
                })
              }
              className="w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "#c0c8c5" }}
            >
              <option value="acceptable">Acceptable</option>
              <option value="remove">Remove</option>
              <option value="price_out">Price Out</option>
              <option value="review">Review</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Note</label>
            <textarea
              value={newPin.note}
              onChange={(e) => setNewPin({ ...newPin, note: e.target.value })}
              rows={2}
              className="w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "#c0c8c5" }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={savePin}
              disabled={saving || !newPin.component_name.trim()}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "#12b3c3" }}
            >
              {saving ? "Saving..." : "Save Pin"}
            </button>
            <button
              onClick={() => setNewPin(null)}
              className="px-4 py-1.5 rounded-lg text-sm border"
              style={{ borderColor: "#c0c8c5" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Edit existing pin form */}
      {editingIndex !== null && pins[editingIndex] && (
        <div
          className="rounded-lg border p-4 space-y-3"
          style={{ borderColor: "#c0c8c5" }}
        >
          <h3 className="text-sm font-semibold" style={{ color: "#262262" }}>
            Edit Pin: {pins[editingIndex].component_name}
          </h3>
          <div>
            <label className="block text-xs font-medium mb-1">
              Component Name
            </label>
            <input
              type="text"
              value={pins[editingIndex].component_name}
              onChange={(e) => {
                const updated = [...pins];
                updated[editingIndex] = {
                  ...updated[editingIndex],
                  component_name: e.target.value,
                };
                setPins(updated);
              }}
              className="w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "#c0c8c5" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Status</label>
            <select
              value={pins[editingIndex].status}
              onChange={(e) => {
                const updated = [...pins];
                updated[editingIndex] = {
                  ...updated[editingIndex],
                  status: e.target.value as AnnotationPin["status"],
                };
                setPins(updated);
              }}
              className="w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "#c0c8c5" }}
            >
              <option value="acceptable">Acceptable</option>
              <option value="remove">Remove</option>
              <option value="price_out">Price Out</option>
              <option value="review">Review</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Note</label>
            <textarea
              value={pins[editingIndex].note}
              onChange={(e) => {
                const updated = [...pins];
                updated[editingIndex] = {
                  ...updated[editingIndex],
                  note: e.target.value,
                };
                setPins(updated);
              }}
              rows={2}
              className="w-full rounded-lg border px-3 py-1.5 text-sm"
              style={{ borderColor: "#c0c8c5" }}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={updatePin}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: "#12b3c3" }}
            >
              {saving ? "Saving..." : "Update Pin"}
            </button>
            <button
              onClick={deletePin}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-[#f04e23] border"
              style={{ borderColor: "#f04e23" }}
            >
              Delete Pin
            </button>
            <button
              onClick={() => setEditingIndex(null)}
              className="px-4 py-1.5 rounded-lg text-sm border"
              style={{ borderColor: "#c0c8c5" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pin legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
