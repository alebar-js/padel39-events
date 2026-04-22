"use client";

import { useState } from "react";
import { ScheduleGrid } from "./client";
import CourtModal from "./court-modal";
import HeaderWithButton from "./header-with-button";
import DayScheduleModal from "./day-schedule-modal";
import type { CourtRow, DayRow, MatchRow, DivisionRow } from "./page";

interface ScheduleClientProps {
  tournamentName: string;
  tournamentSlug: string;
  courts: CourtRow[];
  days: DayRow[];
  matches: MatchRow[];
  divisions: DivisionRow[];
  tournamentId: string;
}

export default function ScheduleClient({ 
  tournamentName,
  tournamentSlug, 
  courts, 
  days, 
  matches, 
  divisions, 
  tournamentId 
}: ScheduleClientProps) {
  const [showCourtModal, setShowCourtModal] = useState(false);
  const [showDayScheduleModal, setShowDayScheduleModal] = useState(false);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <HeaderWithButton 
        tournamentName={tournamentName}
        tournamentSlug={tournamentSlug}
        courts={courts}
        days={days}
        matches={matches}
        onEditCourts={() => setShowCourtModal(true)}
      />
      
      <ScheduleGrid
        courts={courts}
        days={days}
        matches={matches}
        divisions={divisions}
        tournamentSlug={tournamentSlug}
        onEditCourts={() => setShowCourtModal(true)}
        onEditDaySchedules={() => setShowDayScheduleModal(true)}
      />
      
      <CourtModal 
        isOpen={showCourtModal}
        onClose={() => setShowCourtModal(false)}
        courts={courts} 
        tournamentSlug={tournamentSlug} 
        tournamentId={tournamentId} 
      />
      <DayScheduleModal
        isOpen={showDayScheduleModal}
        onClose={() => setShowDayScheduleModal(false)}
        days={days}
        tournamentSlug={tournamentSlug}
        tournamentId={tournamentId}
      />
    </div>
  );
}
