import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICourt extends Document {
  tournamentId: mongoose.Types.ObjectId;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourtSchema = new Schema<ICourt>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

CourtSchema.index({ tournamentId: 1, order: 1 });
CourtSchema.index({ tournamentId: 1, name: 1 }, { unique: true });

export const Court: Model<ICourt> =
  mongoose.models.Court ?? mongoose.model<ICourt>("Court", CourtSchema);
