import mongoose from "mongoose";

const uri = process.env.MONGODB_URI!;

// Reuse connection across hot reloads in dev
const globalWithMongoose = global as typeof global & {
  _mongooseConn: typeof mongoose | null;
  _mongoosePromise: Promise<typeof mongoose> | null;
};

if (!globalWithMongoose._mongooseConn) globalWithMongoose._mongooseConn = null;
if (!globalWithMongoose._mongoosePromise) globalWithMongoose._mongoosePromise = null;

export async function connectDB(): Promise<typeof mongoose> {
  if (globalWithMongoose._mongooseConn) return globalWithMongoose._mongooseConn;
  if (!globalWithMongoose._mongoosePromise) {
    globalWithMongoose._mongoosePromise = mongoose.connect(uri);
  }
  globalWithMongoose._mongooseConn = await globalWithMongoose._mongoosePromise;
  return globalWithMongoose._mongooseConn;
}
