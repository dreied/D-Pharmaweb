import { useEffect, useState } from "react";
import { db } from "../../db/index";

import { hashPassword, verifyPassword } from "../../utils/security/passwordHash";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

export default function BackupPasswordManager() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const [hasPassword, setHasPassword] = useState(false);
  const [oldPass, setOldPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const entry = await db.appSettings.get("backupPasswordHash");
    setHasPassword(!!entry);
  }

  async function setPassword() {
    if (newPass !== confirmPass) return alert(t("security.backupPassword.mismatch"));

    const { hash, salt } = await hashPassword(newPass);

    await db.appSettings.put({ key: "backupPasswordHash", value: hash });
    await db.appSettings.put({ key: "backupPasswordSalt", value: salt });

    alert(t("security.backupPassword.setSuccess"));
    load();
  }

  async function changePassword() {
    const hash = (await db.appSettings.get("backupPasswordHash"))?.value;
    const salt = (await db.appSettings.get("backupPasswordSalt"))?.value;

    const valid = await verifyPassword(oldPass, hash, salt);
    if (!valid) return alert(t("security.backupPassword.invalidOld"));

    if (newPass !== confirmPass) return alert(t("security.backupPassword.mismatch"));

    const { hash: newHash, salt: newSalt } = await hashPassword(newPass);

    await db.appSettings.put({ key: "backupPasswordHash", value: newHash });
    await db.appSettings.put({ key: "backupPasswordSalt", value: newSalt });

    alert(t("security.backupPassword.changed"));
    load();
  }

  return (
    <div className="space-y-4">

      {currentUser.role !== "admin" && (
        <div className="text-on-surface-variant">
          {t("security.backupPassword.adminOnly")}
        </div>
      )}

      {currentUser.role === "admin" && (
        <>
          {!hasPassword && (
            <div className="space-y-3">
              <h3 className="font-bold">{t("security.backupPassword.setTitle")}</h3>

              <input
                type="password"
                className="w-full p-2 rounded-xl bg-surface-container-low border border-outline-variant"
                placeholder={t("security.backupPassword.new")}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />

              <input
                type="password"
                className="w-full p-2 rounded-xl bg-surface-container-low border border-outline-variant"
                placeholder={t("security.backupPassword.confirm")}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
              />

              <button
                onClick={setPassword}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold"
              >
                {t("security.backupPassword.set")}
              </button>
            </div>
          )}

          {hasPassword && (
            <div className="space-y-3">
              <h3 className="font-bold">{t("security.backupPassword.changeTitle")}</h3>

              <input
                type="password"
                className="w-full p-2 rounded-xl bg-surface-container-low border border-outline-variant"
                placeholder={t("security.backupPassword.old")}
                value={oldPass}
                onChange={e => setOldPass(e.target.value)}
              />

              <input
                type="password"
                className="w-full p-2 rounded-xl bg-surface-container-low border border-outline-variant"
                placeholder={t("security.backupPassword.new")}
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
              />

              <input
                type="password"
                className="w-full p-2 rounded-xl bg-surface-container-low border border-outline-variant"
                placeholder={t("security.backupPassword.confirm")}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
              />

              <button
                onClick={changePassword}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold"
              >
                {t("security.backupPassword.change")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
