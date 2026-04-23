"use client";

import { useState } from "react";
import { addCourt, removeCourt, updateCourtName } from "@/app/lib/actions/manageCourts";
import { updateDaySchedule, type UpdateDayScheduleData } from "@/app/lib/actions/updateDaySchedule";
import type { CourtRow, DayRow } from "./page";

type Tab = "courts" | "days";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  courts: CourtRow[];
  days: DayRow[];
  tournamentSlug: string;
  tournamentId: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function CourtsTab({
  courts,
  tournamentSlug,
  tournamentId,
}: {
  courts: CourtRow[];
  tournamentSlug: string;
  tournamentId: string;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  async function handleAddCourt() {
    setIsAdding(true);
    setError("");
    const result = await addCourt(tournamentId, tournamentSlug);
    setIsAdding(false);
    if (result.error) setError(result.error);
  }

  async function handleRemoveCourt(courtId: string) {
    if (!confirm("Are you sure you want to remove this court?")) return;
    setError("");
    const result = await removeCourt(courtId, tournamentSlug);
    if (result.error) setError(result.error);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(var(--accent-orange-rgb, 220,100,40),.08)",
          color: "var(--accent-orange)",
          borderRadius: 6,
          fontSize: 13,
          border: "1px solid rgba(var(--accent-orange-rgb, 220,100,40),.25)",
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleAddCourt}
        disabled={isAdding}
        style={{
          alignSelf: "flex-start",
          padding: "8px 16px",
          fontSize: 13,
          fontFamily: "Poppins, sans-serif",
          background: "var(--green)",
          border: "none",
          borderRadius: 6,
          cursor: isAdding ? "default" : "pointer",
          color: "#fff",
          fontWeight: 500,
        }}
      >
        {isAdding ? "Adding…" : "+ Add Court"}
      </button>

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
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUpdateName(court.id);
                  if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                }}
                onBlur={() => handleUpdateName(court.id)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: 14,
                  border: "1px solid var(--green)",
                  borderRadius: 4,
                  background: "var(--paper)",
                  color: "var(--ink)",
                  fontFamily: "Poppins, sans-serif",
                }}
                autoFocus
              />
            ) : (
              <>
                <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 500 }}>{court.name}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => { setEditingId(court.id); setEditName(court.name); }}
                    style={{
                      padding: "6px 12px", fontSize: 12,
                      background: "var(--paper-3)", border: "1px solid var(--paper-4)",
                      borderRadius: 4, cursor: "pointer", color: "var(--ink)",
                    }}
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleRemoveCourt(court.id)}
                    style={{
                      padding: "6px 12px", fontSize: 12,
                      background: "rgba(var(--accent-orange-rgb, 220,100,40),.08)",
                      border: "1px solid var(--accent-orange)",
                      borderRadius: 4, cursor: "pointer", color: "var(--accent-orange)",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {courts.length === 0 && (
          <div className="muted" style={{ fontSize: 13 }}>No courts yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}

function DaysTab({
  days,
  tournamentSlug,
  onClose,
}: {
  days: DayRow[];
  tournamentSlug: string;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Record<string, UpdateDayScheduleData>>(() => {
    const initial: Record<string, UpdateDayScheduleData> = {};
    days.forEach((day) => {
      initial[day.id] = {
        dayId: day.id,
        startTime: day.startTime,
        endTime: day.endTime,
        slotMinutes: day.slotMinutes,
      };
    });
    return initial;
  });

  function handleInputChange(dayId: string, field: keyof UpdateDayScheduleData, value: string | number) {
    setFormData((prev) => ({ ...prev, [dayId]: { ...prev[dayId], [field]: value } }));
    if (validationErrors[dayId]) {
      setValidationErrors((prev) => { const next = { ...prev }; delete next[dayId]; return next; });
    }
  }

  function validateAll(): boolean {
    const errors: Record<string, string> = {};
    days.forEach((day) => {
      const mins = Number(formData[day.id].slotMinutes);
      if (mins < 15 || mins > 240) errors[day.id] = "Slot duration must be between 15 and 240 minutes.";
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateAll()) return;
    setSaving(true);
    setError("");
    for (const day of days) {
      const result = await updateDaySchedule(formData[day.id]);
      if (result.error) { setError(result.error); setSaving(false); return; }
    }
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div style={{
          fontSize: 13, color: "var(--accent-orange)",
          padding: "12px 16px",
          background: "rgba(var(--accent-orange-rgb, 220,100,40),.08)",
          borderRadius: 8,
          border: "1px solid rgba(var(--accent-orange-rgb, 220,100,40),.25)",
        }}>
          {error}
        </div>
      )}

      {days.map((day) => {
        const data = formData[day.id];
        return (
          <div
            key={day.id}
            style={{
              padding: 16,
              border: "1px solid var(--paper-2)",
              borderRadius: 8,
              background: "var(--paper-1)",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: "var(--ink)" }}>
              {fmtDate(day.date)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  Start Time
                </label>
                <input
                  type="time"
                  value={data.startTime}
                  onChange={(e) => handleInputChange(day.id, "startTime", e.target.value)}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 14,
                    border: "1px solid var(--line-soft)", borderRadius: 6,
                    background: "var(--paper)", color: "var(--ink)",
                    fontFamily: "Poppins, sans-serif",
                  }}
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  Last Game Start
                </label>
                <input
                  type="time"
                  value={data.endTime}
                  onChange={(e) => handleInputChange(day.id, "endTime", e.target.value)}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 14,
                    border: "1px solid var(--line-soft)", borderRadius: 6,
                    background: "var(--paper)", color: "var(--ink)",
                    fontFamily: "Poppins, sans-serif",
                  }}
                />
              </div>
              <div>
                <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  Slot Duration (min)
                </label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={data.slotMinutes}
                  onChange={(e) => handleInputChange(day.id, "slotMinutes", parseInt(e.target.value) || 0)}
                  onBlur={() => {
                    const mins = Number(data.slotMinutes);
                    if (mins < 15 || mins > 240) {
                      setValidationErrors((prev) => ({ ...prev, [day.id]: "Slot duration must be between 15 and 240 minutes." }));
                    }
                  }}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 14,
                    border: validationErrors[day.id] ? "1px solid var(--accent-orange)" : "1px solid var(--line-soft)",
                    borderRadius: 6, background: "var(--paper)", color: "var(--ink)",
                    fontFamily: "Poppins, sans-serif",
                  }}
                />
                {validationErrors[day.id] && (
                  <div style={{ fontSize: 11, color: "var(--accent-orange)", marginTop: 4 }}>
                    {validationErrors[day.id]}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
        <button
          onClick={onClose}
          disabled={saving}
          style={{
            padding: "10px 20px", fontSize: 13, fontFamily: "Poppins, sans-serif",
            background: "none", border: "1px solid var(--line-soft)",
            borderRadius: 6, cursor: saving ? "default" : "pointer", color: "var(--ink-muted)",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "10px 24px", fontSize: 13, fontFamily: "Poppins, sans-serif",
            background: saving ? "var(--paper-2)" : "var(--green)",
            border: "none", borderRadius: 6,
            cursor: saving ? "default" : "pointer",
            color: saving ? "var(--ink-muted)" : "#fff",
            fontWeight: 600,
          }}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

export default function ConfigureSchedulerModal({
  isOpen,
  onClose,
  courts,
  days,
  tournamentSlug,
  tournamentId,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("courts");

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 999 }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 600,
          maxHeight: "85vh",
          background: "var(--paper)",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,.18)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "Poppins, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "24px 24px 0", borderBottom: "1px solid var(--paper-2)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
            <div className="wf-serif" style={{ fontSize: 22 }}>Configure Scheduler</div>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "var(--ink-muted)", padding: 4, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 0 }}>
            {(["courts", "days"] as Tab[]).map((tab) => {
              const label = tab === "courts" ? "Courts" : "Day Schedules";
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "10px 20px",
                    fontSize: 13,
                    fontFamily: "Poppins, sans-serif",
                    fontWeight: active ? 600 : 400,
                    background: "none",
                    border: "none",
                    borderBottom: active ? "2px solid var(--green)" : "2px solid transparent",
                    cursor: "pointer",
                    color: active ? "var(--ink)" : "var(--ink-muted)",
                    transition: "color 120ms",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {activeTab === "courts" ? (
            <CourtsTab
              courts={courts}
              tournamentSlug={tournamentSlug}
              tournamentId={tournamentId}
            />
          ) : (
            <DaysTab
              days={days}
              tournamentSlug={tournamentSlug}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </>
  );
}
