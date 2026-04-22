"use client";

import { useState } from "react";
import { addCourt, removeCourt, updateCourtName } from "@/app/lib/actions/manageCourts";
import type { CourtRow } from "./page";

interface CourtModalProps {
  isOpen: boolean;
  onClose: () => void;
  courts: CourtRow[];
  tournamentSlug: string;
  tournamentId: string;
}

export default function CourtModal({ isOpen, onClose, courts, tournamentSlug, tournamentId }: CourtModalProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  async function handleAddCourt() {
    setIsAdding(true);
    setError("");
    const result = await addCourt(tournamentId, tournamentSlug);
    setIsAdding(false);
    if (result.error) {
      setError(result.error);
    }
  }

  async function handleRemoveCourt(courtId: string) {
    if (!confirm("Are you sure you want to remove this court?")) return;
    setError("");
    const result = await removeCourt(courtId, tournamentSlug);
    if (result.error) {
      setError(result.error);
    }
  }

  async function handleUpdateName(courtId: string) {
    if (!editName.trim()) return;
    setError("");
    const result = await updateCourtName(courtId, editName.trim(), tournamentSlug);
    if (result.error) {
      setError(result.error);
    } else {
      setEditingId(null);
      setEditName("");
    }
  }

  function startEditing(court: CourtRow) {
    setEditingId(court.id);
    setEditName(court.name);
  }

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: "var(--paper)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 600,
          width: "90%",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>Edit Courts</div>
            <div style={{ fontSize: 14, color: "var(--ink-muted)", marginTop: 4 }}>
              {courts.length} court{courts.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "4px 8px",
              fontSize: 16,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-muted)",
              borderRadius: 4,
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: "12px 16px", 
            background: "var(--accent-orange-tint)", 
            color: "var(--accent-orange)", 
            borderRadius: 6, 
            marginBottom: 16,
            fontSize: 14 
          }}>
            {error}
          </div>
        )}

        {/* Add Court Button */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={handleAddCourt}
            disabled={isAdding}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontFamily: "Poppins, sans-serif",
              background: "var(--green)",
              border: "none",
              borderRadius: 6,
              cursor: isAdding ? "default" : "pointer",
              color: "#fff",
              fontWeight: 500,
            }}
          >
            {isAdding ? "Adding..." : "+ Add Court"}
          </button>
        </div>

        {/* Courts List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {courts.map((court) => (
            <div
              key={court.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                background: "var(--paper-2)",
                borderRadius: 8,
                border: "1px solid var(--paper-3)",
              }}
            >
              {editingId === court.id ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUpdateName(court.id);
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditName("");
                      }
                    }}
                    onBlur={() => handleUpdateName(court.id)}
                    style={{
                      padding: "6px 10px",
                      fontSize: 14,
                      border: "1px solid var(--green)",
                      borderRadius: 4,
                      background: "var(--paper)",
                      color: "var(--ink)",
                      flex: 1,
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>
                    {court.name}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => startEditing(court)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        background: "var(--paper-3)",
                        border: "1px solid var(--paper-4)",
                        borderRadius: 4,
                        cursor: "pointer",
                        color: "var(--ink)",
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleRemoveCourt(court.id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        background: "var(--accent-orange-tint)",
                        border: "1px solid var(--accent-orange)",
                        borderRadius: 4,
                        cursor: "pointer",
                        color: "var(--accent-orange)",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--paper-2)" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              background: "var(--paper-2)",
              border: "1px solid var(--paper-3)",
              borderRadius: 6,
              cursor: "pointer",
              color: "var(--ink)",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
