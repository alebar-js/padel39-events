import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ITeam extends Document {
  divisionId: mongoose.Types.ObjectId;
  player1: string;
  player2: string;
  seed?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    player1: { type: String, required: true, trim: true },
    player2: { type: String, required: true, trim: true },
    seed: { type: Number },
  },
  { timestamps: true }
);

export const Team: Model<ITeam> =
  mongoose.models.Team ?? mongoose.model<ITeam>("Team", TeamSchema);
