import mongoose, { Schema, type Document, type Model } from "mongoose";

export type TournamentStatus = "LIVE" | "DRAFT" | "SCHEDULED" | "DONE";

export interface ITournament extends Document {
  name: string;
  slug: string;
  venue?: string;
  startDate: Date;
  endDate: Date;
  status: TournamentStatus;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    venue: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["LIVE", "DRAFT", "SCHEDULED", "DONE"], default: "DRAFT" },
    createdByUserId: { type: String, required: true },
  },
  { timestamps: true }
);

export const Tournament: Model<ITournament> =
  mongoose.models.Tournament ?? mongoose.model<ITournament>("Tournament", TournamentSchema);
