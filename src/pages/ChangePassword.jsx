import { useState } from "react";
import { db } from "../db";
import { useTranslation } from "react-i18next";
import { hashPassword, verifyPassword } from "../utils/security/passwordHash";
import { useNavigate } from "react-router-dom";

export default function ChangePassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    const user = await db.users.get(1);

    // 1️⃣ Verify old password using hashing
    const valid = await verifyPassword(oldPass, user.passwordHash, user.salt);
    if (!valid) {
      setMessage(t("profile.wrongOldPassword"));
      return;
    }

    // 2️⃣ Confirm new password
    if (newPass !== confirm) {
      setMessage(t("profile.passwordMismatch"));
      return;
    }

    // 3️⃣ Hash new password
    const { hash, salt } = await hashPassword(newPass);

    // 4️⃣ Save hashed password
    await db.users.update(1, { passwordHash: hash, salt });

    setMessage(t("profile.passwordUpdated"));

    // Optional: redirect back to profile
    setTimeout(() => navigate("/profile"), 800);
  }

  return (
    <div className="p-6 mt-20 max-w-xl mx-auto">
      <div className="bg-white rounded-3xl shadow p-8">

        <h2 className="text-xl font-bold mb-6">{t("profile.changePassword")}</h2>

        <div className="space-y-4">
          <input
            type="password"
            placeholder={t("profile.oldPassword")}
            className="w-full p-3 rounded-xl bg-surface-container-high"
            value={oldPass}
            onChange={(e) => setOldPass(e.target.value)}
          />

          <input
            type="password"
            placeholder={t("profile.newPassword")}
            className="w-full p-3 rounded-xl bg-surface-container-high"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
          />

          <input
            type="password"
            placeholder={t("profile.confirmPassword")}
            className="w-full p-3 rounded-xl bg-surface-container-high"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            className="w-full py-3 bg-primary text-on-primary rounded-xl font-bold"
          >
            {t("profile.save")}
          </button>

          {message && (
            <p className="text-center text-sm text-primary mt-2">{message}</p>
          )}
        </div>

      </div>
    </div>
  );
}
