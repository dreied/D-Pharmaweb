// src/utils/seedAdmin.js
import { db } from "../db";
import { hashPassword } from "./security/passwordHash";

export async function ensureDefaultAdmin() {
  const count = await db.users.where("role").equals("admin").count();
  if (count > 0) return;

  // Default admin: username "admin", password "admin123"
  const { hash, salt } = await hashPassword("admin123");

  await db.users.add({
    username: "admin",
    role: "admin",
    passwordHash: hash,
    salt
  });

  console.warn(
    "Default admin created: username=admin, password=admin123. Please change it in Security tab."
  );
}
