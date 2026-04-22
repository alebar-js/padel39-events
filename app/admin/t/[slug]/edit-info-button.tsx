"use client";

import { useState } from "react";
import { Btn } from "@/app/components/primitives";
import TournamentModal, {
  type TournamentModalDivision,
  type TournamentModalTournament,
} from "./tournament-modal";

interface Props {
  tournament: TournamentModalTournament;
  divisions: TournamentModalDivision[];
}

export default function EditInfoButton({ tournament, divisions }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Btn small onClick={() => setIsOpen(true)}>
        Edit info
      </Btn>
      <TournamentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        tournament={tournament}
        divisions={divisions}
      />
    </>
  );
}
