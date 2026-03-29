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
process.env.AWS_S3_ACCESS_KEY ??= "test_access_key";
process.env.AWS_S3_SECRET_ACCESS_KEY ??= "test_secret_key";
process.env.AWS_S3_REGION ??= "us-east-1";
process.env.S3_BUCKET_NAME ??= "test-bucket";
