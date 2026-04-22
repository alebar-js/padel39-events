import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface MatchSet {
  team1: number;
  team2: number;
}

export interface IMatch extends Document {
  divisionId: mongoose.Types.ObjectId;
  round: string;
  bracketSlot?: number;
  team1Id?: mongoose.Types.ObjectId;
  team2Id?: mongoose.Types.ObjectId;
  winnerId?: mongoose.Types.ObjectId;
  sets: MatchSet[];
  isConsolation: boolean;
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
    team1Id: { type: Schema.Types.ObjectId, ref: "Team" },
    team2Id: { type: Schema.Types.ObjectId, ref: "Team" },
    winnerId: { type: Schema.Types.ObjectId, ref: "Team" },
    sets: { type: [SetSchema], default: [] },
    isConsolation: { type: Boolean, default: false },
    courtId: { type: Schema.Types.ObjectId, ref: "Court" },
    scheduledTime: { type: Date },
    orderPosition: { type: Number },
  },
  { timestamps: true }
);

MatchSchema.index({ courtId: 1, scheduledTime: 1 }, { unique: true, sparse: true });

export const Match: Model<IMatch> =
  mongoose.models.Match ?? mongoose.model<IMatch>("Match", MatchSchema);
