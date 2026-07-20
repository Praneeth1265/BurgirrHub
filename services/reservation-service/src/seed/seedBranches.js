import { Branch } from "../models/branch.js";

const BRANCHES = [
  { name: "HSR Layout", address: "HSR Layout, Bangalore", openTime: "10:00", closeTime: "23:00", capacity: 60, availableSeats: 60, contactPhone: "9900000001" },
  { name: "Bannerghatta", address: "Bannerghatta Road, Bangalore", openTime: "10:00", closeTime: "23:00", capacity: 50, availableSeats: 50, contactPhone: "9900000002" },
  { name: "Koramangala", address: "Koramangala, Bangalore", openTime: "10:00", closeTime: "23:30", capacity: 70, availableSeats: 70, contactPhone: "9900000003" },
  { name: "White Field", address: "Whitefield, Bangalore", openTime: "10:00", closeTime: "23:00", capacity: 55, availableSeats: 55, contactPhone: "9900000004" },
  { name: "Majestic", address: "Majestic, Bangalore", openTime: "09:00", closeTime: "22:00", capacity: 40, availableSeats: 40, contactPhone: "9900000005" },
  { name: "ITPL", address: "ITPL Main Road, Bangalore", openTime: "10:00", closeTime: "22:30", capacity: 45, availableSeats: 45, contactPhone: "9900000006" },
];

// Idempotent: safe to run on every service boot.
export async function seedBranches() {
  for (const branch of BRANCHES) {
    await Branch.updateOne({ name: branch.name }, { $setOnInsert: branch }, { upsert: true });
  }
  console.log(`Branches seeded (${BRANCHES.length} known branches, idempotent)`);
}
