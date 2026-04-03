"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import type { UserProfile } from "@/lib/types";

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserProfile["role"]>("contributor");
  const [inviteYard, setInviteYard] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setUsers(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setError(null);

    try {
      // NOTE: supabase.auth.admin.inviteUserByEmail requires the service role key.
      // This must be implemented server-side (e.g., in a Route Handler or Server Action)
      // using the service role client. The call below is a placeholder and will fail
      // with the anon key.
      const supabase = createClient();
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        inviteEmail.trim(),
        {
          data: {
            role: inviteRole,
            yard: inviteYard.trim() || null,
          },
        }
      );

      if (inviteError) {
        // Expected to fail from client side -- needs server-side implementation
        throw new Error(
          `Invite requires server-side implementation with service role key. Error: ${inviteError.message}`
        );
      }

      setInviteEmail("");
      setInviteYard("");
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleUpdateUser(
    userId: string,
    updates: Partial<Pick<UserProfile, "role" | "yard" | "active">>
  ) {
    setSaving(userId);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", userId);
      if (updateError) throw updateError;
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, ...updates } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#c0c8c5] text-sm">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "#262262" }}>
        Users
      </h1>

      {error && (
        <div className="rounded-lg border border-[#f04e23]/30 bg-[#f04e23]/5 p-3 text-[#f04e23] text-sm">
          {error}
        </div>
      )}

      {/* Invite form */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "#c0c8c5" }}
      >
        <h2
          className="text-sm font-semibold mb-3"
          style={{ color: "#262262" }}
        >
          Invite User
        </h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm w-64"
              style={{ borderColor: "#c0c8c5" }}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as UserProfile["role"])
              }
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: "#c0c8c5" }}
            >
              <option value="contributor">Contributor</option>
              <option value="editor">Editor</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Yard</label>
            <input
              type="text"
              value={inviteYard}
              onChange={(e) => setInviteYard(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm w-40"
              style={{ borderColor: "#c0c8c5" }}
              placeholder="Yard name"
            />
          </div>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#12b3c3" }}
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "#c0c8c5" }}>
          Note: Invite functionality requires server-side implementation with
          Supabase service role key.
        </p>
      </div>

      {/* Users table */}
      <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#c0c8c5" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#262262" }}>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Name
              </th>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Role
              </th>
              <th className="px-4 py-2.5 text-left text-white font-medium">
                Yard
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
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center"
                  style={{ color: "#c0c8c5" }}
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user, i) => (
                <tr
                  key={user.id}
                  className={i % 2 === 0 ? "bg-white" : ""}
                  style={
                    i % 2 !== 0
                      ? { backgroundColor: "#f7f8f8" }
                      : undefined
                  }
                >
                  <td className="px-4 py-2.5 font-medium">
                    {user.name ?? "—"}
                    {user.email && (
                      <span
                        className="block text-xs"
                        style={{ color: "#c0c8c5" }}
                      >
                        {user.email}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleUpdateUser(user.id, {
                          role: e.target.value as UserProfile["role"],
                        })
                      }
                      disabled={saving === user.id}
                      className="rounded border px-2 py-1 text-xs"
                      style={{ borderColor: "#c0c8c5" }}
                    >
                      <option value="contributor">Contributor</option>
                      <option value="editor">Editor</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="text"
                      value={user.yard ?? ""}
                      onChange={(e) =>
                        setUsers(
                          users.map((u) =>
                            u.id === user.id
                              ? { ...u, yard: e.target.value || null }
                              : u
                          )
                        )
                      }
                      onBlur={() =>
                        handleUpdateUser(user.id, { yard: user.yard })
                      }
                      className="rounded border px-2 py-1 text-xs w-32"
                      style={{ borderColor: "#c0c8c5" }}
                      placeholder="Yard"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={user.active}
                      onChange={(e) =>
                        handleUpdateUser(user.id, {
                          active: e.target.checked,
                        })
                      }
                      disabled={saving === user.id}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() =>
                        handleUpdateUser(user.id, {
                          role: user.role,
                          yard: user.yard,
                          active: user.active,
                        })
                      }
                      disabled={saving === user.id}
                      className="text-xs font-medium px-2 py-1 rounded disabled:opacity-50"
                      style={{ color: "#12b3c3" }}
                    >
                      {saving === user.id ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
