import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/app/lib/db";
import { Division } from "@/app/lib/models/Division";
import { TeamsStepClient } from "./client";
import mongoose from "mongoose";

type Params = Promise<{ id: string }>;

export default async function TeamsStep({ params }: { params: Params }) {
  const { id } = await params;

  await connectDB();
  const divisions = await Division.find({ tournamentId: new mongoose.Types.ObjectId(id) })
    .sort({ createdAt: 1 })
    .lean();

  if (divisions.length === 0) redirect(`/admin/new/${id}/divisions`);

  return (
    <TeamsStepClient
      tournamentId={id}
      divisions={divisions.map((d) => ({ id: d._id.toString(), name: d.name, format: d.format }))}
    />
  );
}
