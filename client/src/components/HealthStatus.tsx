import { useEffect, useState } from "react";
import type { HealthResponse } from "../types/api";

function HealthStatus() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("api/health")
      .then((res) => {
        if (!res.ok) throw new Error("Server error");
        return res.json();
      })
      .then((data: HealthResponse) => setHealth(data))
      .catch(() => setError("Could not reach the server"));
  }, []);

  if (error) return <p>{error}</p>;
  if (!health) return null;

  return <p>{health.message}</p>;
}

export default HealthStatus;
