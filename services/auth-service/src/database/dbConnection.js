import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
  const dbName = process.env.DB_NAME || "auth_db";

  await mongoose.connect(uri, { dbName });
  console.log(`Auth Service connected to MongoDB (db: ${dbName})`);
}
