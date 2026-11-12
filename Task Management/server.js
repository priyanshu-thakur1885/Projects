import { connectToDatabase } from "./src/config/database.js";
import { env } from "./src/config/env.js";
import { app } from "./src/app.js";

await connectToDatabase();

app.listen(env.port, () => {
  console.log(`Task Management API running at http://localhost:${env.port}`);
});
