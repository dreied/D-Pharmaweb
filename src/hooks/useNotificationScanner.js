import { useEffect } from "react";
import { scanNotifications } from "../utils/notificationScanner";

export function useNotificationScanner(intervalMinutes = 5) {
  useEffect(() => {
    // Run immediately on load
    scanNotifications();

    // Run every X minutes
    const interval = setInterval(() => {
      scanNotifications();
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes]);
}
