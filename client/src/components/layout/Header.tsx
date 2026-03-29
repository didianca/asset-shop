import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { useCartStore } from "../../stores/cartStore";
import { ROUTES } from "../../lib/constants";
import Button from "../ui/Button";

export default function Header() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const cartItemCount = useCartStore((s) => s.items.length);
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to={ROUTES.HOME} className="text-xl font-bold text-indigo-600">
          Asset Shop
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to={ROUTES.HOME}
            className="text-sm font-medium text-gray-700 hover:text-indigo-600"
          >
            Home
          </Link>
          <Link
            to={ROUTES.CATALOG}
            className="text-sm font-medium text-gray-700 hover:text-indigo-600"
          >
            Catalog
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to={ROUTES.CART}
                className="relative text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                Cart
                {cartItemCount > 0 && (
                  <span className="absolute -right-4 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs text-white">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {user?.role === "admin" && (
                <Link
                  to={ROUTES.ADMIN}
                  className="text-sm font-medium text-gray-700 hover:text-indigo-600"
                >
                  Admin
                </Link>
              )}

              <Link
                to={ROUTES.DASHBOARD}
                className="text-sm font-medium text-gray-700 hover:text-indigo-600"
              >
                My Orders
              </Link>

              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to={ROUTES.LOGIN}>
                <Button variant="outline" size="sm">
                  Login
                </Button>
              </Link>
              <Link to={ROUTES.REGISTER}>
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </nav>

        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <svg
            className="h-6 w-6 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {mobileMenuOpen && (
        <nav className="border-t border-gray-200 px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <Link
              to={ROUTES.HOME}
              className="text-sm font-medium text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to={ROUTES.CATALOG}
              className="text-sm font-medium text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              Catalog
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.CART}
                  className="text-sm font-medium text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Cart ({cartItemCount})
                </Link>
                {user?.role === "admin" && (
                  <Link
                    to={ROUTES.ADMIN}
                    className="text-sm font-medium text-gray-700"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <Link
                  to={ROUTES.DASHBOARD}
                  className="text-sm font-medium text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Orders
                </Link>
                <button
                  className="text-left text-sm font-medium text-red-600"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="text-sm font-medium text-gray-700"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.REGISTER}
                  className="text-sm font-medium text-indigo-600"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
