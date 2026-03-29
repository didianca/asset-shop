import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { useUiStore } from "../../stores/uiStore";
import { useCartStore } from "../../stores/cartStore";
import * as authApi from "../../api/auth.api";
import { ROUTES } from "../../lib/constants";
import Input from "../ui/Input";
import Button from "../ui/Button";
import type { ApiError } from "../../types/api";
import { AxiosError } from "axios";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((s) => s.login);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const addToast = useUiStore((s) => s.addToast);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from
    ?.pathname ?? ROUTES.HOME;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { data } = await authApi.login({ email, password });
      login(data.token);
      await fetchCart();
      addToast("Logged in successfully", "success");
      navigate(from, { replace: true });
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(axiosError.response?.data?.message ?? "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        id="email"
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        autoComplete="email"
      />

      <Input
        id="password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        autoComplete="current-password"
      />

      <Button type="submit" isLoading={isLoading} className="w-full">
        Login
      </Button>

      <p className="text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link
          to={ROUTES.REGISTER}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Register
        </Link>
      </p>
    </form>
  );
}
