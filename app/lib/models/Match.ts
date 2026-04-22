import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface MatchSet {
  team1: number;
  team2: number;
}

export type MatchPhase = "GROUP" | "PLAYOFF";

export interface IMatch extends Document {
  divisionId: mongoose.Types.ObjectId;
  round: string;
  bracketSlot?: number;
  phase?: MatchPhase;
  groupId?: mongoose.Types.ObjectId;
  team1Id?: mongoose.Types.ObjectId;
  team2Id?: mongoose.Types.ObjectId;
  winnerId?: mongoose.Types.ObjectId;
  sets: MatchSet[];
  isConsolation: boolean;
  isGroupStage: boolean;
  courtId?: mongoose.Types.ObjectId;
  scheduledTime?: Date;
  orderPosition?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SetSchema = new Schema<MatchSet>(
  {
    team1: { type: Number, required: true },
    team2: { type: Number, required: true },
  },
  { _id: false }
);

const MatchSchema = new Schema<IMatch>(
  {
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    round: { type: String, required: true },
    bracketSlot: { type: Number },
    phase: { type: String, enum: ["GROUP", "PLAYOFF"] },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
    team1Id: { type: Schema.Types.ObjectId, ref: "Team" },
    team2Id: { type: Schema.Types.ObjectId, ref: "Team" },
    winnerId: { type: Schema.Types.ObjectId, ref: "Team" },
    sets: { type: [SetSchema], default: [] },
    isConsolation: { type: Boolean, default: false },
    isGroupStage: { type: Boolean, default: false },
    courtId: { type: Schema.Types.ObjectId, ref: "Court" },
    scheduledTime: { type: Date },
    orderPosition: { type: Number },
  },
  { timestamps: true }
);

MatchSchema.index({ courtId: 1, scheduledTime: 1 }, { unique: true, sparse: true });

// In dev / hot-reload, a previously compiled model may be cached with an older
// schema, causing fields to be silently dropped.
const existingMatchModel = mongoose.models.Match as Model<IMatch> | undefined;
if (
  existingMatchModel &&
  (!existingMatchModel.schema.path("team1Id") ||
    !existingMatchModel.schema.path("team2Id") ||
    !existingMatchModel.schema.path("groupId"))
) {
  delete mongoose.models.Match;
}

export const Match: Model<IMatch> =
  (mongoose.models.Match as Model<IMatch> | undefined) ??
  mongoose.model<IMatch>("Match", MatchSchema);
