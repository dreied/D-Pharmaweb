import { db } from "../db";
import { t } from "i18next";

export async function addNotification(type, name, link) {
  const message = t(`notifications.${type}`, { name });

  await db.notifications.add({
    type,
    message,
    link,
    read: false,
    createdAt: Date.now()
  });
}
