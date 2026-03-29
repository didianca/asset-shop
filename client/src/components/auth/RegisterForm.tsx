import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as authApi from "../../api/auth.api";
import { ROUTES } from "../../lib/constants";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { ApiError } from "../../types/api";
import { AxiosError } from "axios";

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      await authApi.register({ email, password, firstName, lastName });
      setSuccess(true);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      const data = axiosError.response?.data;
      setError(data?.message ?? "Registration failed");
      if (data?.errors) setFieldErrors(data.errors);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg bg-green-50 p-4">
          <h3 className="font-medium text-green-800">
            Registration successful!
          </h3>
          <p className="mt-1 text-sm text-green-700">
            Check your email to verify your account before logging in.
          </p>
        </div>
        <Link
          to={ROUTES.LOGIN}
          className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-500"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="firstName"
          label="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          error={fieldErrors.firstName?.[0]}
          required
          autoComplete="given-name"
        />
        <Input
          id="lastName"
          label="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          error={fieldErrors.lastName?.[0]}
          required
          autoComplete="family-name"
        />
      </div>

      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email?.[0]}
        required
        autoComplete="email"
      />

      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password?.[0]}
        required
        autoComplete="new-password"
        minLength={8}
      />
      <p className="text-xs text-gray-500">Must be at least 8 characters</p>

      <Button type="submit" isLoading={isLoading} className="w-full">
        Register
      </Button>

      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          to={ROUTES.LOGIN}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Login
        </Link>
      </p>
    </form>
  );
}
