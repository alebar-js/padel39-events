"use client";

import { useState } from "react";
import { updateDaySchedule, type UpdateDayScheduleData } from "@/app/lib/actions/updateDaySchedule";
import type { DayRow } from "./page";

interface DayScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  days: DayRow[];
  tournamentSlug: string;
  tournamentId: string;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function DayScheduleModal({ 
  isOpen, 
  onClose, 
  days, 
  tournamentSlug, 
  tournamentId 
}: DayScheduleModalProps) {
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

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  if (isOpen) {
    document.addEventListener("keydown", handleKey);
  }

  const handleInputChange = (dayId: string, field: keyof UpdateDayScheduleData, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [field]: value,
      },
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[dayId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[dayId];
        return newErrors;
      });
    }
  };

  const validateField = (dayId: string, field: keyof UpdateDayScheduleData, value: string | number): string | null => {
    if (field === 'slotMinutes') {
      const minutes = Number(value);
      if (minutes < 15 || minutes > 240) {
        return 'Time slot must be between 15 and 240 minutes.';
      }
    }
    return null;
  };

  const validateAllFields = (): boolean => {
    const errors: Record<string, string> = {};
    let hasErrors = false;
    
    days.forEach((day) => {
      const data = formData[day.id];
      
      // Validate slot minutes
      const slotError = validateField(day.id, 'slotMinutes', data.slotMinutes);
      if (slotError) {
        errors[day.id] = slotError;
        hasErrors = true;
      }
    });
    
    setValidationErrors(errors);
    return !hasErrors;
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    
    // Validate all fields before saving
    if (!validateAllFields()) {
      setSaving(false);
      return;
    }

    try {
      // Update each day
      for (const day of days) {
        const data = formData[day.id];
        const result = await updateDaySchedule(data);
        if (result.error) {
          setError(result.error);
          setSaving(false);
          return;
        }
      }
      
      // Success - refresh the page to show updated data
      window.location.reload();
    } catch (err) {
      setError("Failed to update schedules. Please try again.");
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", zIndex: 99 }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "90%",
          maxWidth: 600,
          maxHeight: "80vh",
          background: "var(--paper)",
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,.15)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px 24px 16px",
            borderBottom: "1px solid var(--paper-2)",
          }}
        >
          <div className="wf-serif" style={{ fontSize: 24 }}>
            Edit Day Schedules
          </div>
          <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
            Configure start time, end time, and slot duration for each tournament day
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {error && (
            <div
              style={{
                fontSize: 13,
                color: "var(--accent-orange)",
                padding: "12px 16px",
                background: "rgba(var(--accent-orange-rgb, 220,100,40),.08)",
                borderRadius: 8,
                border: "1px solid rgba(var(--accent-orange-rgb, 220,100,40),.25)",
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
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
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "var(--ink)" }}>
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
                          width: "100%",
                          padding: "8px 10px",
                          fontSize: 14,
                          border: "1px solid var(--line-soft)",
                          borderRadius: 6,
                          background: "var(--paper)",
                          color: "var(--ink)",
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
                          width: "100%",
                          padding: "8px 10px",
                          fontSize: 14,
                          border: "1px solid var(--line-soft)",
                          borderRadius: 6,
                          background: "var(--paper)",
                          color: "var(--ink)",
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
                        min="0"
                        max="240"
                        step="15"
                        value={data.slotMinutes}
                        onChange={(e) => handleInputChange(day.id, "slotMinutes", parseInt(e.target.value) || 0)}
                        onBlur={() => {
                          const error = validateField(day.id, "slotMinutes", data.slotMinutes);
                          if (error) {
                            setValidationErrors((prev) => ({
                              ...prev,
                              [day.id]: error,
                            }));
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          fontSize: 14,
                          border: validationErrors[day.id] ? "1px solid var(--accent-orange)" : "1px solid var(--line-soft)",
                          borderRadius: 6,
                          background: "var(--paper)",
                          color: "var(--ink)",
                          fontFamily: "Poppins, sans-serif",
                        }}
                      />
                      {validationErrors[day.id] && (
                        <div style={{
                          fontSize: 11,
                          color: "var(--accent-orange)",
                          marginTop: 4,
                        }}>
                          {validationErrors[day.id]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--paper-2)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontFamily: "Poppins, sans-serif",
              background: "none",
              border: "1px solid var(--line-soft)",
              borderRadius: 6,
              cursor: saving ? "default" : "pointer",
              color: "var(--ink-muted)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 24px",
              fontSize: 13,
              fontFamily: "Poppins, sans-serif",
              background: saving ? "var(--paper-2)" : "var(--green)",
              border: "none",
              borderRadius: 6,
              cursor: saving ? "default" : "pointer",
              color: saving ? "var(--ink-muted)" : "#fff",
              fontWeight: 600,
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}
