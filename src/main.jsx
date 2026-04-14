import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { loadUniversalIfEmpty } from "./db/loadUniversal";
import { db } from "./db/index";
import "./i18n";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { LicenseProvider } from "./context/LicenseContext";

// PWA service worker registration
import { registerSW } from "virtual:pwa-register";

// Register service worker immediately
registerSW({
  immediate: true
});

async function init() {
  // Load universal dataset if needed
  await loadUniversalIfEmpty();

  // Load saved language from Dexie
  const langSetting = await db.appSettings.get("language");
  const savedLang = langSetting?.value || "ar";


  // Apply language BEFORE rendering
  import("./i18n").then(({ default: i18n }) => {
    i18n.changeLanguage(savedLang);
  });

  // Render app
  createRoot(document.getElementById("root")).render(
    <AuthProvider>
      <LicenseProvider>
        <App />
      </LicenseProvider>
    </AuthProvider>
  );
}

init();
