"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { EdgeCase } from "@/lib/types";

interface ApprovalItem extends EdgeCase {
  grades?: { name: string };
}

export default function ApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  async function fetchApprovals() {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("edge_cases")
        .select("*, grades(name)")
        .eq("approved", false)
        .order("submitted_at", { ascending: false });
      if (fetchError) throw fetchError;
      setItems(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load approvals"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: updateError } = await supabase
        .from("edge_cases")
        .update({
          approved: true,
          approved_by: user?.id ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (updateError) throw updateError;
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    }
  }

  async function handleReject(id: string) {
    try {
      const supabase = createClient();
      const { error: deleteError } = await supabase
        .from("edge_cases")
        .delete()
        .eq("id", id);
      if (deleteError) throw deleteError;
      setItems(items.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading approvals...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
        Approvals Queue
      </h1>

      {error && (
        <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-3 text-[#f04e23] text-sm">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="rounded-lg border p-8 text-center"
          style={{ borderColor: "#c0c8c5" }}
        >
          <p className="text-lg font-medium" style={{ color: "#c0c8c5" }}>
            No pending approvals
          </p>
          <p className="text-sm mt-1" style={{ color: "#c0c8c5" }}>
            All edge case submissions have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border p-5"
              style={{ borderColor: "#c0c8c5" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "#262262" }}
                    >
                      {item.grades?.name ?? "Unknown Grade"}
                    </span>
                    {item.yard && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: "#c0c8c5",
                          color: "#262262",
                          opacity: 0.6,
                        }}
                      >
                        {item.yard}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{item.scenario}</p>
                  {item.decision && (
                    <p className="text-sm" style={{ color: "#c0c8c5" }}>
                      <span className="font-medium">Decision:</span>{" "}
                      {item.decision}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: "#c0c8c5" }}>
                    Submitted by {item.submitted_by ?? "Unknown"} on{" "}
                    {new Date(item.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: "#12b3c3" }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium border"
                    style={{ borderColor: "#f04e23", color: "#f04e23" }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
