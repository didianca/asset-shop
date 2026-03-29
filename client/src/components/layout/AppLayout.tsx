import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import ToastContainer from "../ui/Toast";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
}
