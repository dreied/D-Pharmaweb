import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { loadUniversalIfEmpty } from "./db/loadUniversal";
import { db } from "./db/index";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { LicenseProvider } from "./context/LicenseContext";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

async function init() {
  // Load universal dataset
  await loadUniversalIfEmpty();

  // Load saved language
  const langSetting = await db.appSettings.get("language");
  const savedLang = langSetting?.value || "ar";

  // Load i18n BEFORE rendering
  const { default: i18n } = await import("./i18n");

  // Ensure i18n is initialized
  await i18n.init();

  // Apply language BEFORE rendering
  await i18n.changeLanguage(savedLang);

  // Now render the app
  createRoot(document.getElementById("root")).render(
    <AuthProvider>
      <LicenseProvider>
        <App />
      </LicenseProvider>
    </AuthProvider>
  );
}

init();
