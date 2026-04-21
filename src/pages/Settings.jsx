import { useState, useEffect, useContext } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db/index";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../App";
import ActivationSettings from "../components/settings/ActivationSettings";
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
/* ============================
   MUI v5 (Date Picker + Inputs)
   ============================ */
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import PharmacyLayoutEditor from "../components/layout/PharmacyLayoutEditor";


import { ar } from "date-fns/locale";
import { useAuth } from "../context/AuthContext";

import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonthOutlined";

import { chooseBackupFolder, saveBackupToFolder, loadBackupFolder } from "../utils/backupFolder";
import { createBackupData } from "../utils/backup/createBackup";
import { createBackupZip } from "../utils/backup/createZip";
import { encryptBackup } from "../utils/backup/encrypt";
import { decryptBackup } from "../utils/backup/decrypt";
import { restoreFromEncryptedBackup } from "../utils/backup/restoreFromEncrypted";
import BackupHistory from "../components/BackupHistory";
import PasswordModal from "../components/modals/PasswordModal";

import { uploadToGoogleDrive } from "../utils/googleDrive";
import {
  BASE_URL,
  fetchLatestVersion,
  fetchLatestProductData,
  normalizeRow,
  normalizeOldItem,
  updateUniversalPharmacy
} from "../utils/update";


async function fetchWithProgress(url, onProgress, isAdmin) {
  if (!isAdmin) {
    throw new Error("Access denied");
  }

  const response = await fetch(url);

  if (!response.ok) throw new Error("Network error");

  const contentLength = response.headers.get("Content-Length");

  if (!contentLength) {
    const data = await response.json();
    onProgress(100);
    return data;
  }

  const total = parseInt(contentLength, 10);
  let loaded = 0;

  const reader = response.body.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    const percent = Math.min(100, Math.round((loaded / total) * 100));
    onProgress(percent);
  }

  const full = new Uint8Array(loaded);
  let position = 0;

  for (let chunk of chunks) {
    full.set(chunk, position);
    position += chunk.length;
  }

  const text = new TextDecoder("utf-8").decode(full);
  return JSON.parse(text);
}


export default function Settings() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

const appVersion = __APP_VERSION__ ;

  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useContext(ThemeContext);

  const [activeTab, setActiveTab] = useState("general");

const [pharmacyAddress, setPharmacyAddress] = useState("");
const [pharmacyAddressAr, setPharmacyAddressAr] = useState("");
const [pharmacyPhone, setPharmacyPhone] = useState("");

  const [pharmacyName, setPharmacyName] = useState("");
  const [logoPreview, setLogoPreview] = useState(null);
  const [passwordModal, setPasswordModal] = useState(null);
  const [useNewCurrency, setUseNewCurrency] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [resetInterval, setResetInterval] = useState("daily");

  const [currentVersion, setCurrentVersion] = useState(1);
  const [latestVersion, setLatestVersion] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [changes, setChanges] = useState([]);
const [verifyMessage, setVerifyMessage] = useState(null);
const [restoreMessage, setRestoreMessage] = useState(null);
const [showLayoutEditor, setShowLayoutEditor] = useState(false);

  /* ============================
     EXPIRY WARNING (NEW SYSTEM)
     ============================ */
  const [expiryWarningMonths, setExpiryWarningMonths] = useState(1);
  const [expiryWarningDate, setExpiryWarningDate] = useState(null);

  const [backupFolderPath, setBackupFolderPath] = useState(null);
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const [backupFrequency, setBackupFrequency] = useState("manual");
const [selectedFileName, setSelectedFileName] = useState("");
const [homeResetInterval, setHomeResetInterval] = useState("monthly");
const [homeResetTime, setHomeResetTime] = useState("23:59");

// load from appSettings on mount similar to other settings
// (e.g. useEffect + db.appSettings.get("homeCashBoxResetInterval") ...)

  /* ============================
     LOAD SETTINGS
     ============================ */
  useEffect(() => {
    let cancelled = false;

    async function runAutoBackup() {
      const freq = await db.appSettings.get("backupFrequency");
      const last = await db.appSettings.get("lastBackupTime");

      if (!freq || freq.value === "manual") return;

      const now = new Date();
      const lastDate = last ? new Date(last.value) : null;

      let shouldBackup = false;

      if (freq.value === "daily") {
        shouldBackup = !lastDate || now - lastDate > 24 * 60 * 60 * 1000;
      }

      if (freq.value === "weekly") {
        shouldBackup = !lastDate || now - lastDate > 7 * 24 * 60 * 60 * 1000;
      }

      if (shouldBackup) {
        const structured = await createBackupData();
        const zipBlob = await createBackupZip(structured);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        await saveBackupToFolder(zipBlob, `pharmacy-backup-${timestamp}.zip`);

        await db.appSettings.put({
          key: "lastBackupTime",
          value: now.toISOString()
        });
        await autoCleanupBackups(20);

      }
    }

    async function loadLocalSettings() {
      const nameSetting = await db.appSettings.get("pharmacy_name");
      const logoSetting = await db.appSettings.get("pharmacy_logo");
      const newCurrencySetting = await db.appSettings.get("use_new_currency");
      const symbolSetting = await db.appSettings.get("currency_symbol");
      const expiryMonthsSetting = await db.appSettings.get("expiry_warning_months");
      const expiryDateSetting = await db.appSettings.get("expiry_warning_date");
      const resetSetting = await db.appSettings.get("cashbox_reset_interval");

      if (cancelled) return;
const nameArSetting = await db.appSettings.get("pharmacy_name_ar");
const addrSetting = await db.appSettings.get("pharmacy_address");
const addrArSetting = await db.appSettings.get("pharmacy_address_ar");
const phoneSetting = await db.appSettings.get("pharmacy_phone");


setPharmacyAddress(addrSetting?.value || "");
setPharmacyAddressAr(addrArSetting?.value || "");
setPharmacyPhone(phoneSetting?.value || "");

      setPharmacyName(nameSetting?.value || "");
      setLogoPreview(logoSetting?.value || null);
      setUseNewCurrency(newCurrencySetting?.value === true);
      setCurrencySymbol(symbolSetting?.value || "SYP");
      setExpiryWarningMonths(expiryMonthsSetting?.value || 2);
      setExpiryWarningDate(
        expiryDateSetting?.value ? new Date(expiryDateSetting.value) : null
      );
      setResetInterval(resetSetting?.value || "daily");
    }

    async function loadBackupInfo() {
      const folder = await loadBackupFolder();
      if (!cancelled && folder) setBackupFolderPath(folder.name);

      const savedTime = await db.appSettings.get("lastBackupTime");
      if (!cancelled && savedTime) setLastBackupTime(savedTime.value);

      const freq = await db.appSettings.get("backupFrequency");
      if (!cancelled && freq) setBackupFrequency(freq.value);
    }

    async function loadUniversalVersion() {
      const savedVersion = await db.appSettings.get("universalVersion");
      const savedLast = await db.appSettings.get("universalLastUpdated");

      if (cancelled) return;

      setCurrentVersion(savedVersion?.value ?? 1);
      if (savedLast) setLastUpdated(savedLast.value);
    }

    async function autoCheckUpdates() {
      try {
        const savedVersion = await db.appSettings.get("universalVersion");
        const current = savedVersion?.value ?? 1;

        const latest = await fetchLatestVersion();
        if (cancelled) return;

        setLatestVersion(latest);
        setUpdateAvailable(latest > current);
      } catch (err) {
        console.error("Auto-check failed:", err);
      }
    }

    (async () => {
      await runAutoBackup();
      await loadLocalSettings();
      await loadBackupInfo();
      await loadUniversalVersion();
      await autoCheckUpdates();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCheckUpdate() {
    setCheckingUpdate(true);

    try {
      const latest = await fetchLatestVersion();
      setLatestVersion(latest);

      const saved = await db.appSettings.get("universalVersion");
      const localVersion = saved?.value ?? 1;
      setCurrentVersion(localVersion);

      setUpdateAvailable(latest > localVersion);
    } catch (err) {
      console.error("Check update failed:", err);
    }

    setCheckingUpdate(false);
  }

  function computeDiff(oldData, newData) {
    const diff = [];

    const oldMap = new Map(oldData.map((item) => [item.id, item]));
    const newMap = new Map(newData.map((item) => [item.id, item]));

    for (const [id, newItem] of newMap.entries()) {
      const oldItem = oldMap.get(id);

      if (!oldItem) {
        diff.push({
          id,
          type: "added",
          item: newItem
        });
        continue;
      }

      const changedFields = [];

      for (const key of Object.keys(newItem)) {
        const oldVal = oldItem[key];
        const newVal = newItem[key];

        const normalizedOld = oldVal === null ? null : String(oldVal).trim();
        const normalizedNew = newVal === null ? null : String(newVal).trim();

        if (normalizedOld !== normalizedNew) {
          changedFields.push({
            field: key,
            old: oldItem[key],
            new: newItem[key]
          });
        }
      }

      if (changedFields.length > 0) {
        diff.push({
          id,
          type: "modified",
          oldItem,
          newItem,
          changes: changedFields
        });
      }
    }

    for (const [id, oldItem] of oldMap.entries()) {
      if (!newMap.has(id)) {
        diff.push({
          id,
          type: "removed",
          item: oldItem
        });
      }
    }

    return diff;
  }

  async function handleDownloadUpdate() {
    try {
      setDownloadProgress(0);
      setDownloadingUpdate(true);

      const oldRaw = await db.universalPharmacy.toArray();
      const oldData = oldRaw.map(normalizeOldItem);

      const rawNewData = await fetchLatestProductData((percent) =>
        setDownloadProgress(percent)
      );

      const newData = rawNewData.map(normalizeRow);

      const diff = computeDiff(oldData, newData);
      setChanges(diff);

      const count = await updateUniversalPharmacy(db, newData);

      await db.appSettings.put({
        key: "universalVersion",
        value: latestVersion
      });

      await db.appSettings.put({
        key: "universalLastUpdated",
        value: new Date().toISOString()
      });

      setCurrentVersion(latestVersion);
      alert(`Updated to version ${latestVersion}. Loaded ${count} items.`);
      setUpdateAvailable(false);
    } catch (err) {
      console.error("Update failed:", err);
      alert("Update failed. Check console.");
    } finally {
      setDownloadingUpdate(false);
    }
  }

  // FIXED: use real folder handle (Option A), no appSettings write
  async function handleChooseBackupFolder() {
    const handle = await chooseBackupFolder();
    if (!handle) return;
    setBackupFolderPath(handle.name);
  }

  async function handleCreateBackup() {
    setPasswordModal({
      title: t("backup.enterPasswordToEncrypt"),
      action: async (password) => {
        try {
          const structured = await createBackupData();
          const zipBytes = await createBackupZip(structured);
          const encrypted = await encryptBackup(zipBytes, password);

          const timestamp = structured.metadata.timestamp.replace(/[:.]/g, "-");
          const filename = `pharmacy-backup-${timestamp}.enc.json`;

          const blob = new Blob([JSON.stringify(encrypted)], {
            type: "application/json"
          });

          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();

          await db.backupHistory.add({
            timestamp: structured.metadata.timestamp,
            filename
          });

          alert(t("backup.created"));
        } catch (err) {
          console.error(err);
          alert(t("backup.failed"));
        }

        setPasswordModal(null);
      }
    });
  }

  async function handleRestoreRequest(item) {
  setPasswordModal({
    title: t("backup.enterPasswordToRestore"),
    onConfirm: async (password) => {
      try {
        const folder = await loadBackupFolder();
        if (!folder) {
          return { message: t("settings.backup.noFolder") };
        }

        const fileHandle = await folder.getFileHandle(item.filename);
        const file = await fileHandle.getFile();
        const text = await file.text();
        const encObj = JSON.parse(text);

        await restoreFromEncryptedBackup(encObj, password);

        return { message: t("backup.restored") };
      } catch (err) {
        console.error(err);
        return { message: t("backup.restoreFailed") };
      }
    },
    onCancel: () => setPasswordModal(null)
  });
}



async function handleVerifyRequest(item) {
  try {
    const folder = await loadBackupFolder();
    if (!folder) {
      setVerifyMessage(t("settings.backup.noFolder"));
      return;
    }

    const fileHandle = await folder.getFileHandle(item.filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed.encrypted) || !parsed.salt || !parsed.iv) {
      setVerifyMessage(t("settings.backup.invalidEncrypted"));
      return;
    }

    setVerifyMessage(t("settings.backup.verifyOK"));
  } catch (err) {
    console.error(err);
    setVerifyMessage(t("settings.backup.verifyFailed"));
  }
}




 async function handleEncryptedRestore(e) {
  const file = e.target.files[0];
  if (!file) return;

  setPasswordModal({
    title: t("backup.enterPasswordToRestore"),
    onConfirm: async (password) => {
      try {
        const text = await file.text();
        const encryptedObj = JSON.parse(text);

        await restoreFromEncryptedBackup(encryptedObj, password);

        return { message: t("backup.restored") };
      } catch (err) {
        console.error(err);
        return { message: t("backup.restoreFailed") };
      }
    },
    onCancel: () => setPasswordModal(null)
  });
}





 async function handleSaveZipToFolder() {
  setPasswordModal({
    title: t("backup.enterPasswordToEncrypt"),
    onConfirm: async (password) => {
      try {
        const structured = await createBackupData();
        const zipBytes = await createBackupZip(structured);

        const encrypted = await encryptBackup(zipBytes, password);

        const timestamp = structured.metadata.timestamp.replace(/[:.]/g, "-");
        const filename = `pharmacy-backup-${timestamp}.enc.json`;

        const blob = new Blob([JSON.stringify(encrypted)], {
          type: "application/json"
        });

        await saveBackupToFolder(blob, filename);

        const now = new Date().toISOString();
        setLastBackupTime(now);
        await db.appSettings.put({ key: "lastBackupTime", value: now });

        await db.backupHistory.add({
          timestamp: structured.metadata.timestamp,
          filename
        });

        window.dispatchEvent(new Event("backup-history-updated"));

        return { message: t("settings.backup.saved") };
      } catch (err) {
        console.error(err);
        return { message: t("backup.failed") };
      }
    },
    onCancel: () => setPasswordModal(null)
  });
}





  async function handleBackupFrequencyChange(freq) {
    setBackupFrequency(freq);
    await db.appSettings.put({ key: "backupFrequency", value: freq });
  }

  async function handleGoogleDriveBackup() {
    const structured = await createBackupData();
    const zipBlob = await createBackupZip(structured);

    await uploadToGoogleDrive(zipBlob, "pharmacy-backup.zip");

    alert("Backup uploaded to Google Drive!");
  }

  async function autoCleanupBackups(limit = 20) {
  const all = await db.backupHistory.orderBy("timestamp").reverse().toArray();

  if (all.length <= limit) return;

  const toDelete = all.slice(limit); // keep newest X

  for (const item of toDelete) {
    await db.backupHistory.delete(item.id);
  }
}


  async function saveExpiryMonths(months) {
    setExpiryWarningMonths(months);

    const newDate = new Date();
    newDate.setMonth(newDate.getMonth() + months);
    setExpiryWarningDate(newDate);

    await db.appSettings.put({ key: "expiry_warning_months", value: months });
    await db.appSettings.put({
      key: "expiry_warning_date",
      value: newDate.toISOString()
    });
  }

  async function saveExpiryDate(date) {
    setExpiryWarningDate(date);

    const now = new Date();
    const diffMonths =
      (date.getFullYear() - now.getFullYear()) * 12 +
      (date.getMonth() - now.getMonth());

    const months = Math.max(1, diffMonths);
    setExpiryWarningMonths(months);

    await db.appSettings.put({ key: "expiry_warning_months", value: months });
    await db.appSettings.put({
      key: "expiry_warning_date",
      value: date.toISOString()
    });
  }

  async function saveName() {
    await db.appSettings.put({
      key: "pharmacy_name",
      value: pharmacyName
    });
    
await db.appSettings.put({ key: "pharmacy_address", value: pharmacyAddress });
await db.appSettings.put({ key: "pharmacy_address_ar", value: pharmacyAddressAr });
await db.appSettings.put({ key: "pharmacy_phone", value: pharmacyPhone });

    alert(t("settings.saved"));
  }

 async function saveResetInterval(value) {
  setResetInterval(value);
  await db.appSettings.put({
    key: "cashbox_reset_interval",
    value
  });
  alert(t("settings.saved"));
}


  async function uploadLogo(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setLogoPreview(base64);

      await db.appSettings.put({
        key: "pharmacy_logo",
        value: base64
      });

      alert(t("settings.saved"));
    };
    reader.readAsDataURL(file);
  }

  async function changeLang(lang) {
    await db.appSettings.put({ key: "language", value: lang });
    i18n.changeLanguage(lang);
  }

  async function toggleNewCurrency() {
    const next = !useNewCurrency;
    setUseNewCurrency(next);
    await db.appSettings.put({
      key: "use_new_currency",
      value: next
    });
    alert(t("settings.saved"));
  }

  async function setSymbol(symbol) {
    setCurrencySymbol(symbol);
    await db.appSettings.put({
      key: "currency_symbol",
      value: symbol
    });
    alert(t("settings.saved"));
  }

  async function changeTheme(next) {
    setTheme(next);
    await db.appSettings.put({
      key: "theme",
      value: next
    });
    alert(t("settings.saved"));
  }

  const spinner = (
    <div className="flex justify-center py-4">
      <span className="material-symbols-outlined animate-spin text-primary text-4xl">
        progress_activity
      </span>
    </div>
  );

return (
  <div
    dir={i18n.language === "ar" ? "rtl" : "ltr"}
    className="bg-medical font-body text-on-background antialiased min-h-screen relative"
  >
    <div className="fixed inset-0 bg-background/90 -z-10" />

    <TopAppBar />

    <div className="flex pt-16">
      <SideNavBar />

      <main className="flex-1 px-6 py-8 space-y-6 md:ml-64">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {
            if (window.history.length > 2) navigate(-1);
            else navigate("/dashboard");
          }}
          className="p-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest transition"
        >
          <span className="material-symbols-outlined text-primary">arrow_back</span>
        </button>

        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
      </div>

      {/* TABS */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          ["general", t("settings.tabs.general")],
          ["inventory", t("settings.tabs.inventory")],
          ["pos", t("settings.tabs.pos")],
          ["backup", t("settings.tabs.backup")],
          ["about", t("settings.tabs.about")],
          ["update", t("settings.update.title")],
          ["activation", t("settings.tabs.activation")],

        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`
              px-4 py-2 rounded-full font-medium transition
              ${
                activeTab === key
                  ? "bg-primary text-on-primary shadow"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ============================
          GENERAL TAB
      ============================ */}
      {activeTab === "general" && (
        <div className="space-y-6">
          {/* THEME SELECTOR */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">palette</span>
              {t("settings.theme")}
            </h2>

            <div className="flex gap-3">
              <button
                onClick={() => changeTheme("blue")}
                className={`
                  px-4 py-2 rounded-full font-bold transition
                  ${
                    theme === "blue"
                      ? "bg-primary text-on-primary shadow"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }
                `}
              >
                🎨 {t("settings.themeBlue")}
              </button>

              <button
                onClick={() => changeTheme("emerald")}
                className={`
                  px-4 py-2 rounded-full font-bold transition
                  ${
                    theme === "emerald"
                      ? "bg-primary text-on-primary shadow"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }
                `}
              >
                🌿 {t("settings.themeGreen")}
              </button>
            </div>
          </div>

          {/* LANGUAGE SELECTOR */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">language</span>
              {t("settings.language")}
            </h2>

            <div className="flex gap-3">
              <button
                onClick={() => changeLang("en")}
                className={`
                  px-4 py-2 rounded-full font-bold transition flex items-center gap-2
                  ${
                    i18n.language === "en"
                      ? "bg-primary text-on-primary shadow"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }
                `}
              >
                🇺🇸 English
              </button>

              <button
                onClick={() => changeLang("ar")}
                className={`
                  px-4 py-2 rounded-full font-bold transition flex items-center gap-2
                  ${
                    i18n.language === "ar"
                      ? "bg-primary text-on-primary shadow"
                      : "bg-surface-container-low hover:bg-surface-container-high"
                  }
                `}
              >
                🇸🇦 العربية
              </button>
            </div>
          </div>

          {/* PHARMACY NAME */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">store</span>
              {t("settings.pharmacyName")}
            </h2>

            <input
              className="input w-full bg-surface-container-low rounded-xl px-4 py-3 text-on-surface"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
            />

<input value={pharmacyAddress} onChange={e => setPharmacyAddress(e.target.value)} placeholder="Address in English" />
<input value={pharmacyAddressAr} onChange={e => setPharmacyAddressAr(e.target.value)} placeholder="العنوان بالعربي" />
<input value={pharmacyPhone} onChange={e => setPharmacyPhone(e.target.value)} placeholder="رقم الهاتف" />

            <button
              onClick={saveName}
              className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold shadow"
            >
              {t("common.confirm")}
            </button>
          </div>

          {/* LOGO UPLOAD */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">image</span>
              {t("settings.pharmacyLogo")}
            </h2>

            {logoPreview && (
              <div className="flex items-center gap-4">
                <img
                  src={logoPreview}
                  className="w-24 h-24 rounded-xl object-contain bg-surface-container-low"
                />

                <button
                  onClick={async () => {
                    await db.appSettings.delete("pharmacy_logo");
                    setLogoPreview(null);
                    alert(t("settings.saved"));
                  }}
                  className="px-4 py-2 bg-error text-on-error rounded-xl font-bold shadow"
                >
                  {t("settings.removeLogo")}
                </button>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              onChange={uploadLogo}
              className="text-on-surface"
            />
          </div>
          {/* LAYOUT EDITOR */}
<div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
  <h2 className="text-xl font-bold flex items-center gap-2">
    <span className="material-symbols-outlined text-primary">map</span>
    {t("settings.pharmacyLayout")}
  </h2>

  <p className="text-sm text-on-surface-variant">
    {t("settings.pharmacyLayoutDescription")}
  </p>

 <button
  onClick={() => navigate("/pharmacy-layout")}
  className="px-6 py-2 bg-primary text-on-primary rounded-xl font-bold shadow flex items-center gap-2"
>
  <span className="material-symbols-outlined">edit</span>
  {t("settings.editLayout")}
</button>

</div>

        </div>
      )}

      {/* ============================
          POS TAB
      ============================ */}
      {activeTab === "pos" && (
        <div className="space-y-6">
          {/* CURRENCY SYMBOL */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">payments</span>
              {t("settings.currencySymbol")}
            </h2>

            <div className="flex gap-3">
              {[
                { key: "SYP", label: "🇸🇾 SYP / ل.س" },
                { key: "$", label: "🇺🇸 USD $" }
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSymbol(opt.key)}
                  className={`
                    px-4 py-2 rounded-full font-bold transition flex items-center gap-2
                    ${
                      currencySymbol === opt.key
                        ? "bg-primary text-on-primary shadow"
                        : "bg-surface-container-low hover:bg-surface-container-high"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* NEW CURRENCY TOGGLE */}
            <h2 className="text-xl font-bold mt-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">swap_horiz</span>
              {t("settings.useNewCurrency")}
            </h2>

            <button
              onClick={toggleNewCurrency}
              className={`
                relative flex items-center h-12 w-40 rounded-full transition-all duration-300
                overflow-hidden
                ${
                  useNewCurrency
                    ? "bg-primary shadow-[0_0_12px_var(--primary)]"
                    : "bg-surface-container-high border border-outline"
                }
              `}
            >
              {/* LEFT HALF (OLD) */}
              <div
                className={`
                  flex-1 flex items-center justify-center transition-opacity duration-300
                  ${useNewCurrency ? "opacity-0" : "opacity-100"}
                `}
              >
                <span className="text-sm font-bold text-on-surface">
                  {t("settings.oldCurrency")}
                </span>
              </div>

              {/* RIGHT HALF (NEW) */}
              <div
                className={`
                  flex-1 flex items-center justify-center transition-opacity duration-300
                  ${useNewCurrency ? "opacity-100" : "opacity-0"}
                `}
              >
                <span className="text-sm font-bold text-on-primary">
                  {t("settings.newCurrency")}
                </span>
              </div>

              {/* THUMB */}
              <span
                className={`
                  absolute h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center
                  text-sm font-bold transition-all duration-300
                  ${useNewCurrency ? "right-2" : "left-2"}
                `}
              >
                {useNewCurrency
                  ? t("settings.newShort")
                  : t("settings.oldShort")}
              </span>
            </button>
          </div>

{/* PHARMACY CASHBOX AUTO RESET */}
<div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
  <h2 className="text-xl font-bold flex items-center gap-2">
    <span className="material-symbols-outlined text-primary">savings</span>
    {t("settings.cashBoxReset")}
  </h2>

  <p className="text-sm text-on-surface-variant">
    {t("cashbox.autoResetDescription")}
  </p>

  {/* DISABLED — TOGGLE — ENABLED */}
  <div className="flex items-center justify-center gap-6 mt-3">

    {/* LEFT LABEL (DISABLED) */}
    <div className="flex items-center gap-1">
      <span className={`
        material-symbols-outlined text-lg transition-colors
        ${resetInterval === "manual" ? "text-error" : "text-on-surface-variant"}
      `}>
        close
      </span>

      <span className={`
        text-sm font-bold transition-colors
        ${resetInterval === "manual" ? "text-error" : "text-on-surface-variant"}
      `}>
        {t("settings.disabled")}
      </span>
    </div>

    {/* PREMIUM SWITCH */}
    <button
      onClick={() =>
        saveResetInterval(resetInterval === "daily" ? "manual" : "daily")
      }
      className={`
        relative w-16 h-9 rounded-full transition-all duration-500
        flex items-center overflow-hidden
        ${
          resetInterval === "daily"
            ? "bg-primary shadow-[0_0_12px_var(--primary)]"
            : "bg-error shadow-[0_0_12px_var(--error)]"
        }
      `}
    >
      {/* GLOW */}
      <span
        className={`
          absolute inset-0 rounded-full opacity-40 blur-md transition-all duration-500
          ${
            resetInterval === "daily"
              ? "bg-primary"
              : "bg-error"
          }
        `}
      ></span>

      {/* KNOB — TRUE RTL/LTR SUPPORT */}
      <span
        className={`
          absolute w-8 h-8 bg-white rounded-full shadow-lg transform transition-all duration-500

          ${
            resetInterval === "daily"
              ? "ltr:translate-x-7 rtl:-translate-x-7"
              : "ltr:translate-x-1 rtl:-translate-x-1"
          }
        `}
      ></span>
    </button>

    {/* RIGHT LABEL (ENABLED) */}
    <div className="flex items-center gap-1">
      <span className={`
        material-symbols-outlined text-lg transition-colors
        ${resetInterval === "daily" ? "text-primary" : "text-on-surface-variant"}
      `}>
        check_circle
      </span>

      <span className={`
        text-sm font-bold transition-colors
        ${resetInterval === "daily" ? "text-primary" : "text-on-surface-variant"}
      `}>
        {t("settings.enabled")}
      </span>
    </div>

  </div>
</div>

{/* DIVIDER */}
<div className="my-6 border-t border-outline-variant/40"></div>

{/* HOME CASHBOX SETTINGS */}
<div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
  <h2 className="text-xl font-bold flex items-center gap-2">
    <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
    {t("homecash.homeCashBoxReset")}
  </h2>

  <label className="block text-sm font-medium mb-1">
    {t("homecash.homeCashBoxResetTime")}
  </label>

  <input
    type="time"
    value={homeResetTime}
    onChange={(e) => {
      setHomeResetTime(e.target.value);
      db.appSettings.put({
        key: "homeCashBoxResetTime",
        value: e.target.value
      });
    }}
    className="px-3 py-2 rounded-xl bg-surface-container-low border border-outline"
  />
</div>




  </div>
)}

     {/* ============================
      INVENTORY TAB
============================ */}
{activeTab === "inventory" && (
  <div className="space-y-6">

    {/* EXPIRY WARNING PERIOD */}
    <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">event</span>
        {t("settings.expiryWarningPeriod")}
      </h2>

      {/* MONTHS INPUT */}
      <Box>
        <TextField
          label={t("settings.expireInMonths")}
          type="number"
          value={expiryWarningMonths}
          onChange={(e) => {
            const months = Math.max(1, Number(e.target.value));
            saveExpiryMonths(months);

            // sync date
            const newDate = addMonths(new Date(), months);
            saveExpiryDate(newDate);
          }}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {t("settings.months")}
              </InputAdornment>
            )
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "var(--outline)" },
              "&:hover fieldset": { borderColor: "var(--primary)" },
              "&.Mui-focused fieldset": { borderColor: "var(--primary)" }
            },
            "& .MuiInputBase-input": {
              color: "var(--on-surface)"
            },
            "& .MuiFormLabel-root": {
              color: "var(--on-surface-variant)"
            },
            "& .Mui-focused .MuiFormLabel-root": {
              color: "var(--primary)"
            }
          }}
        />
      </Box>

      {/* DATE PICKER */}
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ar}>
        <DatePicker
          label={t("settings.expiryWarningDate")}
          value={expiryWarningDate}
          onChange={(newValue) => {
            if (!newValue) {
              saveExpiryDate(null);
              return;
            }

            saveExpiryDate(newValue);

            // sync months
            const now = new Date();
            const diffMonths =
              (newValue.getFullYear() - now.getFullYear()) * 12 +
              (newValue.getMonth() - now.getMonth());

            saveExpiryMonths(Math.max(1, diffMonths));
          }}
          onKeyDown={(e) => {
            if (e.key === "Delete" || e.key === "Backspace") {
              saveExpiryDate(null);
            }
          }}
          slots={{
            openPickerIcon: CalendarMonthIcon
          }}
          slotProps={{
            textField: {
              fullWidth: true,
              InputProps: {
                sx: {
                  direction: i18n.language === "ar" ? "rtl" : "ltr",

                  "& .MuiButtonBase-root": {
                    order: i18n.language === "ar" ? 0 : 1
                  },

                  "& .MuiInputBase-input": {
                    textAlign: i18n.language === "ar" ? "right" : "left",
                    paddingRight: i18n.language === "ar" ? "14px" : undefined
                  }
                }
              },

              sx: {
                "& .MuiOutlinedInput-root": {
                  "& fieldset": { borderColor: "var(--outline)" },
                  "&:hover fieldset": { borderColor: "var(--primary)" },
                  "&.Mui-focused fieldset": { borderColor: "var(--primary)" }
                },

                "& .MuiFormLabel-root": {
                  right: i18n.language === "ar" ? 14 : "auto",
                  left: i18n.language === "ar" ? "auto" : 14,
                  transformOrigin: i18n.language === "ar" ? "right" : "left",
                  marginRight: i18n.language === "ar" ? "6px" : 0
                },

                "& .MuiFormLabel-root.MuiInputLabel-shrink": {
                  transform: i18n.language === "ar"
                    ? "translate(-14px, -24px) scale(0.75)"
                    : "translate(14px, -24px) scale(0.75)",
                  marginRight: i18n.language === "ar" ? "6px" : 0
                }
              }
            }
          }}
        />
      </LocalizationProvider>
    </div>

  </div>
)}


      {/* ============================
          BACKUP TAB
      ============================ */}
      {activeTab === "backup" && (
        <div className="space-y-6">
          {/* BACKUP INFO */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">info</span>
              {t("settings.backup.info")}
            </h2>

            <p className="text-on-surface-variant text-sm">
              {backupFolderPath
                ? `${t("settings.backup.folderSelected")}: ${backupFolderPath}`
                : t("settings.backup.noFolder")}
            </p>

            <p className="text-on-surface-variant text-sm">
              {lastBackupTime
                ? `${t("settings.backup.lastBackup")}: ${new Date(
                    lastBackupTime
                  ).toLocaleString()}`
                : t("settings.backup.noBackupYet")}
            </p>
          </div>

          {/* CREATE BACKUP */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                cloud_download
              </span>
              {t("settings.backup.create")}
            </h2>

            <div className="flex flex-col gap-3">
              {/*<button
                onClick={handleCreateBackup}
                className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold shadow flex items-center gap-2"
              >
                <span className="material-symbols-outlined">download</span>
                {t("settings.backup.download")}
              </button>*/}

              <button
                onClick={handleChooseBackupFolder}
                className="px-6 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold shadow flex items-center gap-2"
              >
                <span className="material-symbols-outlined">folder_open</span>
                {t("settings.backup.chooseFolder")}
              </button>

              <button
                onClick={handleSaveZipToFolder}
                className="px-6 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold shadow flex items-center gap-2"
              >
                <span className="material-symbols-outlined">archive</span>
                {t("settings.backup.saveInsideFolder")}
              </button>
            </div>
          </div>

          {/* CLOUD BACKUP */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">cloud</span>
              {t("settings.backup.cloud")}
            </h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoogleDriveBackup}
                className="px-6 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold shadow flex items-center gap-2"
              >
                <span className="material-symbols-outlined">cloud_upload</span>
                Google Drive
              </button>
            </div>
          </div>

          {/* AUTOMATIC BACKUP */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                schedule
              </span>
              {t("settings.backup.auto")}
            </h2>

            <div className="flex gap-3 flex-wrap">
              {[
                ["daily", t("settings.backup.daily")],
                ["weekly", t("settings.backup.weekly")],
                ["manual", t("settings.backup.manual")]
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleBackupFrequencyChange(key)}
                  className={`
                    px-4 py-2 rounded-full font-bold transition
                    ${
                      backupFrequency === key
                        ? "bg-primary text-on-primary shadow"
                        : "bg-surface-container-low hover:bg-surface-container-high"
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* RESTORE BACKUP */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">restore</span>
              {t("settings.backup.restore")}
            </h2>

            <div className="flex items-center gap-3 mt-3">
  <label className="px-4 py-2 rounded-xl bg-primary text-on-primary cursor-pointer">
    {t("settings.backup.chooseFile")}
    <input
      type="file"
      accept=".json,.enc"
      className="hidden"
      onChange={handleEncryptedRestore}
    />
  </label>

  <span className="text-on-surface-variant text-sm">
    {selectedFileName || t("settings.backup.noFileChosen")}
  </span>
</div>


          </div>

          {/* BACKUP HISTORY */}
          <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>
              {t("settings.backup.history")}
            </h2>

           <BackupHistory
  onRequestRestore={handleRestoreRequest}
  onRequestVerify={handleVerifyRequest}
  verifyMessage={verifyMessage}
/>


          </div>
        </div>
      )}

     {/* ============================
      UPDATE TAB
============================ */}
{activeTab === "update" && (
  <div className="space-y-6">

    {/* ============================
        UPDATE CARD (your original)
    ============================= */}
    <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">
          system_update
        </span>
        {t("settings.update.title")}
      </h2>

      <p className="text-on-surface-variant text-sm">
        {t("settings.update.description")}
      </p>

      {checkingUpdate && spinner}
      {downloadingUpdate && spinner}

      {downloadingUpdate && (
        <>
          <div className="w-full bg-surface-container-low rounded-xl overflow-hidden mt-3">
            <div
              className="bg-primary h-3 transition-all"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>

          <p className="text-sm text-on-surface-variant text-center mt-1">
            {downloadProgress}%
          </p>
        </>
      )}

      <div className="flex flex-col gap-3">
        <button
          onClick={handleCheckUpdate}
          className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold shadow flex items-center gap-2"
        >
          <span className="material-symbols-outlined">sync</span>
          {t("settings.update.check")}
        </button>

        {updateAvailable && (
          <button
            onClick={handleDownloadUpdate}
            className="px-6 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold shadow flex items-center gap-2"
          >
            <span className="material-symbols-outlined">download</span>
            {t("settings.update.download")}
          </button>
        )}
      </div>

      {latestVersion && (
        <p className="text-sm text-on-surface-variant">
          {t("settings.update.latest")}: {latestVersion}
        </p>
      )}

      {currentVersion && (
        <p className="text-sm text-on-surface-variant">
          {t("settings.update.current")}: {currentVersion}
        </p>
      )}

      {lastUpdated && (
        <p className="text-sm text-on-surface-variant">
          {t("settings.update.lastUpdated")}:{" "}
          {new Date(lastUpdated).toLocaleString()}
        </p>
      )}

      {changes.length > 0 && (
        <div className="p-4 bg-surface-container-low rounded-xl mt-4">
          <h3 className="font-bold text-lg mb-2">
            {t("settings.update.changes")}
          </h3>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {changes.map((c, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-surface-container-high"
              >
                {c.type === "added" && (
                  <p className="text-green-600 font-bold">
                    + Added: {c.item.nameEn}
                  </p>
                )}

                {c.type === "removed" && (
                  <p className="text-red-600 font-bold">
                    – Removed: ID {c.id}
                  </p>
                )}

                {c.type === "modified" && (
                  <div>
                    <p className="text-yellow-600 font-bold">
                      ~ Modified: ID {c.id}
                    </p>

                    {c.changes.map((f, j) => (
                      <p
                        key={j}
                        className="text-sm text-on-surface-variant"
                      >
                        {f.field}: <b>{f.old}</b> → <b>{f.new}</b>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* ============================
        UNIVERSAL VIEWER SECTION
    ============================= */}
    {isAdmin && (
      <div className="p-6 rounded-3xl bg-surface-container-high shadow-sm space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">dataset</span>
          {t("settings.update.universalViewer.title")}
        </h2>

        <p className="text-on-surface-variant text-sm">
          {t("settings.update.universalViewer.description")}
        </p>

        <button
          onClick={() => navigate("/universal")}
          className="px-4 py-3 bg-primary text-on-primary rounded-xl font-bold shadow flex items-center gap-2 hover:opacity-90"
        >
          <span className="material-symbols-outlined">open_in_new</span>
          {t("settings.update.universalViewer.openButton")}
        </button>
      </div>
    )}

  </div>
)}


{/* ============================
      ACTIVATION TAB
============================ */}
{activeTab === "activation" && (
  <div className="space-y-6">
    <ActivationSettings />
   

  </div>
  
)}

      {/* ============================
          FALLBACK / ABOUT
      ============================ */}
  {activeTab === "about" && (
  <div className="py-10 px-6 max-w-sm mx-auto space-y-8">

    {/* App Version */}
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-primary text-3xl">info</span>
      <p className="text-lg font-semibold">
        {t("settings.appVersion")}: <span className="font-bold">{__APP_VERSION__}</span>
      </p>
    </div>

    {/* Developer */}
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-primary text-3xl">person</span>
      <p className="text-lg font-semibold">
        {t("settings.developerName")}: <span className="font-bold">E. Dureid Laila</span>
      </p>
    </div>

    {/* Email */}
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-primary text-3xl">mail</span>
      <a
        href="mailto:ak47benjamen@gmail.com"
        className="text-lg font-semibold text-primary hover:underline"
      >
        ak47benjamen@gmail.com
      </a>
    </div>

    {/* Phone */}
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-primary text-3xl">call</span>
      <p className="text-lg font-semibold">0937749701</p>
    </div>

<div className="flex justify-center pt-4">
  <a
    href="https://wa.me/963937749701"
    target="_blank"
    rel="noopener noreferrer"
  >
    <i 
  className="fa-brands fa-whatsapp text-6xl"
  style={{ color: "#25D366" }}
></i>

  </a>
</div>


  </div>
)}





      {passwordModal && (
  <PasswordModal
    title={passwordModal.title}
    onConfirm={passwordModal.onConfirm}
    onCancel={() => setPasswordModal(null)}
  />
)}
{restoreMessage && (
  <div className="p-3 rounded-xl bg-surface-container-high text-on-surface text-sm">
    {restoreMessage}
  </div>
)}

   {showLayoutEditor && (
  <PharmacyLayoutEditor
    open={showLayoutEditor}
    onClose={() => setShowLayoutEditor(false)}
  />
)}

     </main>
    </div>
  </div>
);
}
