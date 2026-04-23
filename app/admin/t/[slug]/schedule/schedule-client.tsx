"use client";

import { useState } from "react";
import { ScheduleGrid } from "./client";
import ConfigureSchedulerModal from "./configure-scheduler-modal";
import HeaderWithButton from "./header-with-button";
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
  const [showConfigModal, setShowConfigModal] = useState(false);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <HeaderWithButton
        tournamentName={tournamentName}
        tournamentSlug={tournamentSlug}
        courts={courts}
        days={days}
        matches={matches}
        onConfigure={() => setShowConfigModal(true)}
      />

      <ScheduleGrid
        courts={courts}
        days={days}
        matches={matches}
        divisions={divisions}
        tournamentSlug={tournamentSlug}
        onConfigure={() => setShowConfigModal(true)}
      />

      <ConfigureSchedulerModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        courts={courts}
        days={days}
        tournamentSlug={tournamentSlug}
        tournamentId={tournamentId}
      />
    </div>
  );
}
