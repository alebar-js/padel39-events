import mongoose, { Schema, type Document, type Model } from "mongoose";

export type DivisionFormat = "SINGLE_ELIM_CONSOLATION" | "GROUP_PLAYOFF";
export type MatchFormat = "ONE_SET" | "BEST_OF_3";
export type PlayoffQualifyingMode = "MANUAL" | "AUTO";
export type GroupPlayoffState = "GROUP_STAGE" | "PLAYOFF_STAGE";

export interface IGroupPlayoffConfig {
  groupSize: number;
  playoffSize: number;
  qualifyingMode: PlayoffQualifyingMode;
}

export interface IDivision extends Document {
  tournamentId: mongoose.Types.ObjectId;
  name: string;
  format: DivisionFormat;
  matchFormat: MatchFormat;
  groupPlayoffConfig?: IGroupPlayoffConfig;
  groupPlayoffState?: GroupPlayoffState;
  createdAt: Date;
  updatedAt: Date;
}

const GroupPlayoffConfigSchema = new Schema<IGroupPlayoffConfig>(
  {
    groupSize: { type: Number, required: true, min: 2 },
    playoffSize: { type: Number, required: true, min: 2 },
    qualifyingMode: { type: String, enum: ["MANUAL", "AUTO"], required: true },
  },
  { _id: false }
);

const DivisionSchema = new Schema<IDivision>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    name: { type: String, required: true, trim: true },
    format: { type: String, enum: ["SINGLE_ELIM_CONSOLATION", "GROUP_PLAYOFF"], required: true },
    matchFormat: { type: String, enum: ["ONE_SET", "BEST_OF_3"], default: "BEST_OF_3" },
    groupPlayoffConfig: { type: GroupPlayoffConfigSchema, required: false },
    groupPlayoffState: { type: String, enum: ["GROUP_STAGE", "PLAYOFF_STAGE"], required: false },
  },
  { timestamps: true }
);

export const Division: Model<IDivision> =
  mongoose.models.Division ?? mongoose.model<IDivision>("Division", DivisionSchema);
