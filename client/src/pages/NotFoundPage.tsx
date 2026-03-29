import { Link } from "react-router-dom";
import { ROUTES } from "../lib/constants";
import Button from "../components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h1 className="text-6xl font-bold text-gray-300">404</h1>
      <p className="mt-4 text-lg text-gray-600">Page not found</p>
      <Link to={ROUTES.HOME} className="mt-6">
        <Button>Back to Home</Button>
      </Link>
    </div>
  );
}
