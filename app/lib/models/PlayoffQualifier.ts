import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPlayoffQualifier extends Document {
  divisionId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
  groupRank: number;
  seed?: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayoffQualifierSchema = new Schema<IPlayoffQualifier>(
  {
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    groupRank: { type: Number, required: true, min: 1 },
    seed: { type: Number },
  },
  { timestamps: true }
);

PlayoffQualifierSchema.index({ divisionId: 1, teamId: 1 }, { unique: true });
PlayoffQualifierSchema.index({ divisionId: 1, groupId: 1, groupRank: 1 }, { unique: true });

export const PlayoffQualifier: Model<IPlayoffQualifier> =
  mongoose.models.PlayoffQualifier ??
  mongoose.model<IPlayoffQualifier>("PlayoffQualifier", PlayoffQualifierSchema);
