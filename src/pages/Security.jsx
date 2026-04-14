import { useState } from "react";
import UsersManager from "../components/security/UsersManager";
import BackupPasswordManager from "../components/security/BackupPasswordManager";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Security() {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const isRTL = i18n.language === "ar";

  return (
    <div className="p-6 space-y-6">

      {/* BACK BUTTON AT TOP */}
      <button
        onClick={() => navigate(-1)}
        className={`flex items-center gap-2 text-primary font-bold hover:opacity-80 ${
          isRTL ? "flex-row-reverse" : ""
        }`}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        {t("users.back")}
      </button>

      {/* PAGE TITLE */}
      <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">shield_person</span>
        {t("security.title")}
      </h1>

      {/* ADMIN ONLY NOTICE */}
      {currentUser.role !== "admin" && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container">
          {t("security.adminOnly")}
        </div>
      )}

      {/* USER MANAGEMENT */}
      <div className="p-6 rounded-3xl bg-surface-container-high shadow space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">group</span>
          {t("security.users.title")}
        </h2>

        <UsersManager />
      </div>

      {/* BACKUP PASSWORD MANAGEMENT */}
      <div className="p-6 rounded-3xl bg-surface-container-high shadow space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">lock</span>
          {t("security.backupPassword.title")}
        </h2>

        <BackupPasswordManager />
      </div>
    </div>
  );
}
