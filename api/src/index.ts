import { config } from "dotenv";
import { resolve } from "path";

// Load each service's .env. Add new service paths here as services are added.
config({ path: resolve(process.cwd(), "src/services/auth/.env") });

import app from "./app.js";

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
