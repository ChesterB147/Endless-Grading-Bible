"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

export default function LogExceptionPage() {
  const supabase = createClient();
  const params = useParams<{ commodity: string; grade: string }>();
  const commoditySlug = params.commodity;
  const gradeSlug = params.grade;

  const [yard, setYard] = useState("");
  const [scenario, setScenario] = useState("");
  const [decision, setDecision] = useState("");
  const [outcome, setOutcome] = useState<string>("accepted");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scenario.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Get grade ID from slugs
      const { data: comData, error: comError } = await supabase
        .from("commodities")
        .select("id")
        .eq("slug", commoditySlug)
        .single();

      if (comError) throw comError;

      const { data: gradeData, error: gradeError } = await supabase
        .from("grades")
        .select("id")
        .eq("commodity_id", comData.id)
        .eq("slug", gradeSlug)
        .single();

      if (gradeError) throw gradeError;

      // Upload photo if provided
      let photoUrl: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const filePath = `edge-cases/${gradeData.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("grading-media")
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("grading-media")
          .getPublicUrl(filePath);

        photoUrl = urlData.publicUrl;
      }

      // Insert edge case
      const { error: insertError } = await supabase.from("edge_cases").insert({
        grade_id: gradeData.id,
        yard: yard.trim() || null,
        scenario: scenario.trim(),
        decision: decision.trim() || null,
        outcome,
        photo_url: photoUrl,
        approved: false,
        submitted_by: user?.id ?? null,
        submitted_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setSuccess(true);
    } catch (err: unknown) {
      console.error("Failed to submit exception:", err);
      setError(err instanceof Error ? err.message : "Failed to submit exception. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="bg-[#12b3c3] px-4 py-4 flex items-center gap-3">
          <Link href={`/${commoditySlug}/${gradeSlug}`} aria-label="Back">
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
          <h1 className="text-white font-bold text-lg">Log Exception</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-14 h-14 rounded-full bg-[#12b3c3]/10 flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 text-[#12b3c3]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[#262262] font-bold text-lg mb-1">Exception Logged</h2>
          <p className="text-gray-500 text-sm text-center mb-6">
            Your exception has been submitted for review.
          </p>
          <Link
            href={`/${commoditySlug}/${gradeSlug}`}
            className="bg-[#12b3c3] text-white font-semibold px-6 py-2.5 rounded-lg text-sm"
          >
            Back to Grade
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-[#12b3c3] px-4 py-4 flex items-center gap-3">
        <Link href={`/${commoditySlug}/${gradeSlug}`} aria-label="Back">
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
        <h1 className="text-white font-bold text-lg">Log Exception</h1>
      </header>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 p-4 space-y-4">
        {error && (
          <div className="bg-[#f04e23]/10 border border-[#f04e23]/30 rounded-lg px-4 py-3">
            <p className="text-[#f04e23] text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-[#262262] text-sm font-medium mb-1">
            Yard
          </label>
          <input
            type="text"
            value={yard}
            onChange={(e) => setYard(e.target.value)}
            className="w-full border border-[#c0c8c5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#12b3c3]/40 focus:border-[#12b3c3]"
            placeholder="Enter yard name"
          />
        </div>

        <div>
          <label className="block text-[#262262] text-sm font-medium mb-1">
            Scenario <span className="text-[#f04e23]">*</span>
          </label>
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            required
            rows={4}
            className="w-full border border-[#c0c8c5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#12b3c3]/40 focus:border-[#12b3c3] resize-none"
            placeholder="Describe the scenario..."
          />
        </div>

        <div>
          <label className="block text-[#262262] text-sm font-medium mb-1">
            Decision
          </label>
          <textarea
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            rows={3}
            className="w-full border border-[#c0c8c5] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#12b3c3]/40 focus:border-[#12b3c3] resize-none"
            placeholder="What was decided?"
          />
        </div>

        <div>
          <label className="block text-[#262262] text-sm font-medium mb-1">
            Outcome
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full border border-[#c0c8c5] rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#12b3c3]/40 focus:border-[#12b3c3]"
          >
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div>
          <label className="block text-[#262262] text-sm font-medium mb-1">
            Photo (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#12b3c3]/10 file:text-[#12b3c3] hover:file:bg-[#12b3c3]/20"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !scenario.trim()}
          className="w-full bg-[#12b3c3] text-white font-semibold py-3 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Submitting..." : "Submit Exception"}
        </button>
      </form>
    </div>
  );
}
