import mongoose from "mongoose";
import { connectToDatabase } from "../src/config/database.js";
import "../src/config/env.js";
import { User } from "../src/models/user.model.js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run make-admin -- user@example.com");
  process.exit(1);
}

try {
  await connectToDatabase();
  const user = await User.findOneAndUpdate(
    { email },
    { role: "admin" },
    { new: true, runValidators: true }
  );

  if (!user) {
    console.error(`No account found for ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`${user.email} now has admin access`);
  }
} catch (error) {
  console.error("Could not update account role:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
