import { Toaster } from "react-hot-toast";

export default function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className:
          "bg-white text-gray-900 border border-gray-200 shadow-lg rounded px-4 py-2",
        success: { className: "bg-green-100 text-green-900 border-green-300" },
        error: { className: "bg-red-100 text-red-900 border-red-300" },
      }}
    />
  );
}
