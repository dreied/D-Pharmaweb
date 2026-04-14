import { useEffect, useState } from "react";
import { db } from "../db/index";
import { useTranslation } from "react-i18next";

export default function BackupHistory({
  onRequestRestore,
  onRequestVerify,
  verifyMessage
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);

  useEffect(() => {
    load();

    function refresh() {
      load();
    }

    window.addEventListener("backup-history-updated", refresh);
    return () => window.removeEventListener("backup-history-updated", refresh);
  }, []);

  async function load() {
    const all = await db.backupHistory.orderBy("timestamp").reverse().toArray();
    setItems(all);
  }

  async function handleDelete(id) {
    await db.backupHistory.delete(id);
    load();
  }

  function handleVerify(item) {
    if (typeof onRequestVerify === "function") {
      onRequestVerify(item);
    }
  }

  function handleRestore(item) {
    if (typeof onRequestRestore === "function") {
      onRequestRestore(item);
    }
  }

  return (
    <div className="space-y-3">

      {/* VERIFY MESSAGE */}
      {verifyMessage && (
        <div className="p-3 rounded-xl bg-surface-container-high text-on-surface text-sm text-center">
          {verifyMessage}
        </div>
      )}

      {items.length === 0 && (
        <p className="text-on-surface-variant text-sm">
          {t("settings.backup.noBackupYet")}
        </p>
      )}

      {items.map((item) => (
        <div
          key={item.id}
          className="p-3 rounded-xl bg-surface-container-low flex justify-between items-center"
        >
          <div>
            <p className="font-bold">{item.filename}</p>
            <p className="text-xs text-on-surface-variant">
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleVerify(item)}
              className="px-3 py-1 bg-primary text-on-primary rounded-lg text-sm"
            >
              {t("settings.backup.verify")}
            </button>

            <button
              onClick={() => handleRestore(item)}
              className="px-3 py-1 bg-surface-container-high text-on-surface rounded-lg text-sm"
            >
              {t("settings.backup.restore")}
            </button>

            <button
              onClick={() => handleDelete(item.id)}
              className="px-3 py-1 bg-error text-on-error rounded-lg text-sm"
            >
              {t("settings.backup.delete")}
            </button>
          </div>
        </div>
      ))}

    </div>
  );
}
