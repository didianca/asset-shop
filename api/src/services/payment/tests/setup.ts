import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Infrastructure-level env vars (DATABASE_URL, etc.)
config({ path: resolve(__dirname, "../../../../.env") });

// Service-specific env vars
config({ path: resolve(__dirname, "../.env") });

// Fallback values for CI where .env does not exist
process.env.STRIPE_SECRET_KEY ??= "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_dummy";
