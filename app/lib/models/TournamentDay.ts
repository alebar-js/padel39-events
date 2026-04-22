import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ITournamentDay extends Document {
  tournamentId: mongoose.Types.ObjectId;
  date: Date;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  courtIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const TournamentDaySchema = new Schema<ITournamentDay>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true, match: HHMM },
    endTime: { type: String, required: true, match: HHMM },
    slotMinutes: { type: Number, required: true, min: 1 },
    courtIds: [{ type: Schema.Types.ObjectId, ref: "Court" }],
  },
  { timestamps: true }
);

TournamentDaySchema.index({ tournamentId: 1, date: 1 }, { unique: true });

export const TournamentDay: Model<ITournamentDay> =
  mongoose.models.TournamentDay ??
  mongoose.model<ITournamentDay>("TournamentDay", TournamentDaySchema);
