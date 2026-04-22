import mongoose, { Schema, type Document, type Model } from "mongoose";

export type DivisionFormat = "SINGLE_ELIM_CONSOLATION" | "GROUP_PLAYOFF";
export type MatchFormat = "ONE_SET" | "BEST_OF_3";

export interface IDivision extends Document {
  tournamentId: mongoose.Types.ObjectId;
  name: string;
  format: DivisionFormat;
  matchFormat: MatchFormat;
  createdAt: Date;
  updatedAt: Date;
}

const DivisionSchema = new Schema<IDivision>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    name: { type: String, required: true, trim: true },
    format: { type: String, enum: ["SINGLE_ELIM_CONSOLATION", "GROUP_PLAYOFF"], required: true },
    matchFormat: { type: String, enum: ["ONE_SET", "BEST_OF_3"], default: "BEST_OF_3" },
  },
  { timestamps: true }
);

export const Division: Model<IDivision> =
  mongoose.models.Division ?? mongoose.model<IDivision>("Division", DivisionSchema);
