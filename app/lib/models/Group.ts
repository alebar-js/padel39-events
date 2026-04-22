import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IGroup extends Document {
  divisionId: mongoose.Types.ObjectId;
  name: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    divisionId: { type: Schema.Types.ObjectId, ref: "Division", required: true },
    name: { type: String, required: true, trim: true },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

GroupSchema.index({ divisionId: 1, order: 1 }, { unique: true });
GroupSchema.index({ divisionId: 1, name: 1 }, { unique: true });

export const Group: Model<IGroup> =
  mongoose.models.Group ?? mongoose.model<IGroup>("Group", GroupSchema);
