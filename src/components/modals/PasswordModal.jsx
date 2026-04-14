import { useState } from "react";

export default function PasswordModal({ title, onConfirm, onCancel }) {
  const [password, setPassword] = useState("");
  const [resultMessage, setResultMessage] = useState(null);

  async function handleConfirm() {
    const result = await onConfirm(password);

    if (result?.message) {
      setResultMessage(result.message);

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        onCancel();
      }, 1500);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-3xl shadow-xl w-full max-w-sm space-y-4">

        <h2 className="text-xl font-bold text-on-surface">{title}</h2>

        <input
          type="password"
          className="w-full p-3 rounded-xl bg-surface-container-low border border-outline-variant text-on-surface"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {resultMessage && (
          <div className="text-center text-sm text-on-surface mt-3">
            {resultMessage}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
