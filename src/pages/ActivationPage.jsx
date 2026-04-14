import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  getTrialInfo,
  saveActivationFromCode,
  getDeviceId,
  setDeviceId,
  getLicenseState,
} from "../utils/license";

import {
  saveFolderHandle,
  loadFolderHandle,
  readDeviceId,
  tryAutoDetectFolder,
} from "../utils/deviceFolder";

const SYNC_KEY = "dpharmacy_last_sync";

export default function ActivationPage() {
  const { t } = useTranslation();

  const [status, setStatus] = useState("loading");
  const [trialInfo, setTrialInfo] = useState(null);
  const [activationCode, setActivationCode] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      let handle = await loadFolderHandle();

      if (!handle) {
        const auto = await tryAutoDetectFolder();
        if (auto) {
          handle = auto;
          await saveFolderHandle(auto);
        }
      }

      if (handle) {
        try {
          const id = await readDeviceId(handle);
          setDeviceId(id);
        } catch {
          // ignore
        }
      }

      await maybeSyncWithServer();

      const info = getTrialInfo();
      setStatus(info.status);
      setTrialInfo(info);
    })();
  }, []);

  async function maybeSyncWithServer() {
    const lastSync = localStorage.getItem(SYNC_KEY);
    const now = Date.now();

    if (lastSync && now - Number(lastSync) < 24 * 60 * 60 * 1000) {
      return;
    }

    const id = getDeviceId();
    if (!id) return;

    try {
      const res = await fetch("https://your-server.com/sync-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: id }),
      });

      const data = await res.json();

      if (data.status === "deactivated") {
        const state = { status: "deactivated", deviceId: id };
        localStorage.setItem("dpharmacy_license", JSON.stringify(state));
      }

      localStorage.setItem(SYNC_KEY, String(now));
    } catch {
      // offline, ignore
    }
  }

  async function selectFolder() {
    try {
      const handle = await window.showDirectoryPicker();
      await saveFolderHandle(handle);

      const id = await readDeviceId(handle);
      setDeviceId(id);

      const info = getTrialInfo();
      setStatus(info.status);
      setTrialInfo(info);

      setMessage(t("activation.device_loaded"));
    } catch (e) {
      setMessage(t("activation.device_load_failed") + ": " + e.message);
    }
  }

  async function activate() {
    try {
      await saveActivationFromCode(activationCode.trim());

      const info = getTrialInfo();
      setStatus(info.status);
      setTrialInfo(info);

      setMessage(t("activation.success"));
    } catch (e) {
      setMessage(e.message || t("activation.error_generic"));
    }
  }

  async function connectToServer() {
    try {
      const id = getDeviceId();
      if (!id) {
        setMessage(t("activation.no_device"));
        return;
      }

      const res = await fetch("https://your-server.com/online-activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: id }),
      });

      if (!res.ok) throw new Error();

      const { activationCode } = await res.json();
      await saveActivationFromCode(activationCode);

      const info = getTrialInfo();
      setStatus(info.status);
      setTrialInfo(info);

      setMessage(t("activation.server_success"));
    } catch {
      setMessage(t("activation.server_offline"));
    }
  }

  function sendViaWhatsApp() {
    const id = getDeviceId();
    if (!id) {
      setMessage(t("activation.no_device"));
      return;
    }

    const msg = encodeURIComponent(
      `${t("activation.whatsapp_message")}\n${id}`
    );

    window.open(`https://wa.me/963937749701?text=${msg}`, "_blank");
  }

  function openFilePicker() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".txt")) {
      setMessage(t("activation.file_invalid"));
      return;
    }

    try {
      const text = await file.text();
      const trimmed = text.trim();
      if (!trimmed) {
        setMessage(t("activation.file_invalid"));
        return;
      }

      setActivationCode(trimmed);
      await activate();
    } catch {
      setMessage(t("activation.file_read_error"));
    }
  }

  const deviceId = getDeviceId();
  const licenseState = getLicenseState();

  const isDeactivated = licenseState.status === "deactivated";

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "var(--surface)" }}
    >
      <div
        className="w-full max-w-2xl rounded-3xl p-8 shadow-xl space-y-6"
        style={{ background: "var(--surface-container-high)" }}
      >
        <h1
          className="text-2xl font-bold flex items-center gap-2"
          style={{ color: "var(--on-surface)" }}
        >
          <span className="material-symbols-outlined text-primary">verified</span>
          {t("activation.title")}
        </h1>

        {isDeactivated && (
          <div className="p-4 rounded-2xl bg-red-50 text-center">
            <h2 className="text-lg font-bold text-red-600">
              {t("activation.deactivated_title")}
            </h2>
            <p className="text-sm opacity-80">
              {t("activation.deactivated_msg")}
            </p>
          </div>
        )}

        {trialInfo && (
          <div className="p-4 rounded-2xl" style={{ background: "var(--surface-container)" }}>
            <p className="font-bold mb-1">
              {t("activation.status")}: {t(`activation.${status}`)}
            </p>

            {status === "trial" && (
              <>
                <p>{t("activation.trial_used")}: {trialInfo.daysUsed}</p>
                <p>{t("activation.trial_left")}: {trialInfo.daysLeft}</p>
              </>
            )}

            {status === "activated" && (
              <>
                <p>{t("activation.plan")}: {trialInfo.plan}</p>
                <p>
                  {t("activation.expires")}:{" "}
                  {trialInfo.activatedUntil
                    ? new Date(trialInfo.activatedUntil).toLocaleDateString()
                    : "-"}
                </p>
              </>
            )}

            {status === "expired" && (
              <p className="text-red-500 font-bold">
                {t("activation.expired_msg")}
              </p>
            )}

            {status === "no_device_id" && (
              <p className="text-red-500 font-bold">
                {t("activation.no_device")}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={selectFolder}
            className="px-4 py-2 rounded-xl font-bold shadow"
            style={{ background: "var(--primary)", color: "var(--on-primary)" }}
          >
            {t("activation.select_folder")}
          </button>

          <button
            onClick={connectToServer}
            className="px-4 py-2 rounded-xl font-bold shadow"
            style={{ background: "var(--secondary)", color: "var(--on-secondary)" }}
          >
            {t("activation.connect_server")}
          </button>

          <button
            onClick={openFilePicker}
            className="px-4 py-2 rounded-xl font-bold shadow"
            style={{ background: "var(--primary-container)", color: "var(--on-primary-container)" }}
          >
            {t("activation.select_file")}
          </button>

          <div className="flex flex-col items-center gap-2">
            <i
              className="fa-brands fa-whatsapp text-5xl cursor-pointer"
              style={{ color: "#25D366" }}
              onClick={sendViaWhatsApp}
            ></i>

            <p
              className="text-sm font-semibold cursor-pointer"
              onClick={sendViaWhatsApp}
              style={{ color: "var(--primary)" }}
            >
              {t("activation.send_whatsapp")}
            </p>
          </div>
        </div>

        {deviceId && (
          <div className="p-4 rounded-2xl" style={{ background: "var(--surface-container)" }}>
            <p className="font-bold mb-1">{t("activation.device_id")}:</p>
            <p className="text-sm break-all opacity-80">{deviceId}</p>

            <button
              onClick={() => navigator.clipboard.writeText(deviceId)}
              className="mt-2 px-3 py-1 rounded-lg text-sm"
              style={{
                background: "var(--primary-container)",
                color: "var(--on-primary-container)",
              }}
            >
              {t("activation.copy")}
            </button>
          </div>
        )}

        <textarea
          value={activationCode}
          onChange={(e) => setActivationCode(e.target.value)}
          rows={4}
          placeholder={t("activation.paste_code")}
          className="w-full rounded-xl p-3"
          style={{
            background: "var(--surface-container-low)",
            border: "1px solid var(--outline-variant)",
            color: "var(--on-surface)",
          }}
        />

        <button
          onClick={activate}
          className="w-full py-3 rounded-xl font-bold shadow text-lg"
          style={{ background: "var(--primary)", color: "var(--on-primary)" }}
        >
          {t("activation.activate")}
        </button>

        {message && (
          <p
            className="mt-2 text-sm text-center"
            style={{
              color:
                message.toLowerCase().includes("success") ||
                message.toLowerCase().includes("activated")
                  ? "var(--primary)"
                  : "var(--error)",
            }}
          >
            {message}
          </p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
