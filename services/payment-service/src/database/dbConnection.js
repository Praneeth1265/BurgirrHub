import mongoose from "mongoose";

export async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
  const dbName = process.env.DB_NAME || "payment_db";

  await mongoose.connect(uri, { dbName });
  console.log(`Payment Service connected to MongoDB (db: ${dbName})`);
}
