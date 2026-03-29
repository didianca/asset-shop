import RegisterForm from "../components/auth/RegisterForm";
import Card from "../components/ui/Card";

export default function RegisterPage() {
  return (
    <div className="flex justify-center pt-10">
      <Card className="w-full max-w-md p-6">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Create Account
        </h1>
        <RegisterForm />
      </Card>
    </div>
  );
}
