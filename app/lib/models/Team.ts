import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ITeam extends Document {
  divisionId: mongoose.Types.ObjectId;
  player1: string;
  player2: string;
  seed?: number;
  groupId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    player1: { type: String, required: true, trim: true },
    player2: { type: String, required: true, trim: true },
    seed: { type: Number },
    groupId: { type: Schema.Types.ObjectId, ref: "Group" },
  },
  { timestamps: true }
);

// In dev / hot-reload, a previously compiled model may be cached with an older
// schema (e.g. missing `groupId`), causing fields to be silently dropped.
const existingTeamModel = mongoose.models.Team as Model<ITeam> | undefined;
if (existingTeamModel && !existingTeamModel.schema.path("groupId")) {
  delete mongoose.models.Team;
}

export const Team: Model<ITeam> =
  (mongoose.models.Team as Model<ITeam> | undefined) ??
  mongoose.model<ITeam>("Team", TeamSchema);
