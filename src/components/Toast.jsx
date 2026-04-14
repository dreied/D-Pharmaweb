import { useEffect } from "react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        px-6 py-3 rounded-xl shadow-xl text-white text-lg font-semibold z-50
        ${type === "error" ? "bg-red-600" : "bg-green-600"}
      `}
    >
      {message}
    </div>
  );
}
