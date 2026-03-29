import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as authApi from "../api/auth.api";
import { ROUTES } from "../lib/constants";
import Spinner from "../components/ui/Spinner";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import type { ApiError } from "../types/api";
import { AxiosError } from "axios";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    authApi
      .verifyEmail(token)
      .then(({ data }) => {
        setStatus("success");
        setMessage(data.message);
      })
      .catch((err: AxiosError<ApiError>) => {
        setStatus("error");
        setMessage(
          err.response?.data?.message ?? "Verification failed. The link may have expired.",
        );
      });
  }, [token]);

  return (
    <div className="flex justify-center pt-10">
      <Card className="w-full max-w-md p-6 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Email Verification
        </h1>

        {status === "loading" && (
          <div className="flex justify-center py-8">
            <Spinner className="h-8 w-8" />
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
            <Link to={ROUTES.LOGIN}>
              <Button>Go to Login</Button>
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {message}
            </div>
            <Link to={ROUTES.REGISTER}>
              <Button variant="outline">Register Again</Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
