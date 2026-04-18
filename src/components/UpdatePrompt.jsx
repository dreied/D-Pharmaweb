import { useEffect, useState } from "react";
import { Snackbar, Alert, Button, Stack } from "@mui/material";
import { useTranslation } from "react-i18next";
import { registerSW } from "virtual:pwa-register";

export default function UpdatePrompt() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [updateServiceWorker, setUpdateServiceWorker] = useState(null);

  // Read version injected by Vite
  const version = __APP_VERSION__;

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setOpen(true);
      },
      onRegisteredSW(sw) {
        setUpdateServiceWorker(() => sw?.update);
      }
    });
  }, []);

  const handleRefresh = () => {
    updateServiceWorker?.();
    window.location.reload();
  };

  const handleLater = () => {
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert
        severity="info"
        variant="filled"
        sx={{
          width: "100%",
          direction: document.documentElement.dir,
          bgcolor:
            document.documentElement.classList.contains("theme-emerald")
              ? "rgb(5, 150, 105)" // emerald
              : "rgb(25, 118, 210)", // blue
          color: "white",
          display: "flex",
          alignItems: "center",
          gap: 2
        }}
        action={
          <Stack direction="row" spacing={1}>
            <Button
              color="inherit"
              size="small"
              onClick={handleLater}
              sx={{ fontWeight: "bold" }}
            >
              {t("update.later")}
            </Button>

            <Button
              color="inherit"
              size="small"
              onClick={handleRefresh}
              sx={{ fontWeight: "bold" }}
            >
              {t("update.refresh")}
            </Button>
          </Stack>
        }
      >
        {t("update.newVersion")} — v{version}
      </Alert>
    </Snackbar>
  );
}
