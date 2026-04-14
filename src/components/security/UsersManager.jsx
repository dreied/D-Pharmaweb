// src/components/security/UsersManager.jsx
import { useEffect, useState } from "react";
import { db } from "../../db";
import { hashPassword } from "../../utils/security/passwordHash";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

export default function UsersManager() {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const isRTL = i18n.language === "ar";

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editUser, setEditUser] = useState(null);
  const [roleUser, setRoleUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  // Add user fields
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    role: "user",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset password fields
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);
useEffect(() => {
  setSearch(""); // always empty on page load
}, []);
useEffect(() => {
  if (!showAddModal && !editUser && !roleUser && !resetUser && !confirmDelete) {
    setSearch("");
  }
}, [showAddModal, editUser, roleUser, resetUser, confirmDelete]);

  async function loadUsers() {
    const all = await db.users.toArray();
    setUsers(all);
  }

  async function addUser() {
    if (!newUser.username || !newUser.password) {
      alert(t("users.fillAllFields"));
      return;
    }

    if (newUser.password !== confirmPassword) {
      alert(t("users.passwordMismatch"));
      return;
    }

    const { hash, salt } = await hashPassword(newUser.password);

    await db.users.add({
      username: newUser.username,
      role: newUser.role,
      passwordHash: hash,
      salt,
    });

    setNewUser({ username: "", password: "", role: "user" });
    setConfirmPassword("");
    setShowAddModal(false);
    loadUsers();
  }

  async function deleteUser(id) {
    if (id === currentUser.id) {
      alert(t("users.cannotDeleteSelf"));
      return;
    }

    await db.users.delete(id);
    setConfirmDelete(null);
    loadUsers();
  }

  async function saveUsername() {
    if (!editUser.username.trim()) return;

    await db.users.update(editUser.id, {
      username: editUser.username.trim(),
    });

    setEditUser(null);
    loadUsers();
  }

  async function saveRole() {
    await db.users.update(roleUser.id, {
      role: roleUser.role,
    });

    setRoleUser(null);
    loadUsers();
  }

  async function resetPassword() {
    if (!newPassword || newPassword !== confirmNewPassword) {
      alert(t("users.passwordMismatch"));
      return;
    }

    const { hash, salt } = await hashPassword(newPassword);

    await db.users.update(resetUser.id, {
      passwordHash: hash,
      salt,
    });

    setResetUser(null);
    setNewPassword("");
    setConfirmNewPassword("");
    alert(t("users.passwordResetSuccess"));
  }

  // Admin protection
  if (!currentUser || currentUser.role !== "admin") {
    return (
      <div className="p-4 text-red-600 font-bold">
        {t("users.accessDenied")}
      </div>
    );
  }

  // Search + Filter
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(search.toLowerCase());
    const matchesRole = filterRole === "all" ? true : u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">

      {/* SEARCH + FILTER */}
      <div className="flex gap-3">
        <input
          className="flex-1 p-2 rounded-xl bg-surface-container-low border border-outline-variant"
          placeholder={t("users.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="p-2 rounded-xl bg-surface-container-low border border-outline-variant"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">{t("users.allRoles")}</option>
          <option value="user">{t("users.roleUser")}</option>
          <option value="admin">{t("users.roleAdmin")}</option>
        </select>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-2"
        >
          <span className="material-symbols-outlined">person_add</span>
          {t("users.addUser")}
        </button>
      </div>

      {/* USER LIST */}
      <div className="space-y-3">
        {filteredUsers.map((u) => (
          <div
            key={u.id}
            className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {u.username[0].toUpperCase()}
              </div>

              <div>
                <div className="font-bold text-lg">{u.username}</div>
                <div className="text-sm text-on-surface-variant flex items-center gap-2">
                  {t("users.role")}:
                  <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      u.role === "admin"
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">

              <button
                onClick={() => setEditUser(u)}
                className="px-3 py-1 bg-primary/10 text-primary rounded-xl flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                {t("users.changeUsername")}
              </button>

              <button
                onClick={() => setRoleUser(u)}
                className="px-3 py-1 bg-secondary/10 text-secondary rounded-xl flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">manage_accounts</span>
                {t("users.changeRole")}
              </button>

              <button
                onClick={() => setResetUser(u)}
                className="px-3 py-1 bg-tertiary/10 text-tertiary rounded-xl flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">lock_reset</span>
                {t("users.resetPassword")}
              </button>

              <button
                onClick={() => setConfirmDelete(u)}
                className="px-3 py-1 bg-error text-white rounded-xl flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                {t("users.delete")}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <Modal>
          <h3 className="modal-title">{t("users.addUser")}</h3>

          <input
            className="modal-input"
            placeholder={t("users.username")}
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
          />

          {/* PASSWORD */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="modal-input"
              placeholder={t("users.password")}
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
            />
            <span
              className="material-symbols-outlined absolute right-3 top-3 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "visibility_off" : "visibility"}
            </span>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="modal-input"
              placeholder={t("users.confirmNewPassword")}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <span
              className="material-symbols-outlined absolute right-3 top-3 cursor-pointer"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? "visibility_off" : "visibility"}
            </span>
          </div>

          {/* ROLE */}
          <select
            className="modal-input"
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value })
            }
          >
            <option value="user">{t("users.roleUser")}</option>
            <option value="admin">{t("users.roleAdmin")}</option>
          </select>

          <ModalActions
            onCancel={() => setShowAddModal(false)}
            onConfirm={addUser}
            confirmLabel={t("users.add")}
            cancelLabel={t("users.cancel")}
          />
        </Modal>
      )}

      {/* CHANGE USERNAME MODAL */}
      {editUser && (
        <Modal>
          <h3 className="modal-title">{t("users.changeUsername")}</h3>

          <input
            className="modal-input"
            value={editUser.username}
            onChange={(e) =>
              setEditUser({ ...editUser, username: e.target.value })
            }
          />

          <ModalActions
            onCancel={() => setEditUser(null)}
            onConfirm={saveUsername}
            confirmLabel={t("users.save")}
            cancelLabel={t("users.cancel")}
          />
        </Modal>
      )}

      {/* CHANGE ROLE MODAL */}
      {roleUser && (
        <Modal>
          <h3 className="modal-title">{t("users.changeRole")}</h3>

          <select
            className="modal-input"
            value={roleUser.role}
            onChange={(e) =>
              setRoleUser({ ...roleUser, role: e.target.value })
            }
          >
            <option value="user">{t("users.roleUser")}</option>
            <option value="admin">{t("users.roleAdmin")}</option>
          </select>

          <ModalActions
            onCancel={() => setRoleUser(null)}
            onConfirm={saveRole}
            confirmLabel={t("users.updateRole")}
            cancelLabel={t("users.cancel")}
          />
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetUser && (
        <Modal>
          <h3 className="modal-title">{t("users.resetPassword")}</h3>

          {/* NEW PASSWORD */}
          <div className="relative">
            <input
              type={showResetPassword ? "text" : "password"}
              className="modal-input"
              placeholder={t("users.newPassword")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <span
              className="material-symbols-outlined absolute right-3 top-3 cursor-pointer"
              onClick={() => setShowResetPassword(!showResetPassword)}
            >
              {showResetPassword ? "visibility_off" : "visibility"}
            </span>
          </div>

          {/* CONFIRM NEW PASSWORD */}
          <div className="relative">
            <input
              type={showResetConfirmPassword ? "text" : "password"}
              className="modal-input"
              placeholder={t("users.confirmNewPassword")}
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
            <span
              className="material-symbols-outlined absolute right-3 top-3 cursor-pointer"
              onClick={() =>
                setShowResetConfirmPassword(!showResetConfirmPassword)
              }
            >
              {showResetConfirmPassword ? "visibility_off" : "visibility"}
            </span>
          </div>

          <ModalActions
            onCancel={() => setResetUser(null)}
            onConfirm={resetPassword}
            confirmLabel={t("users.reset")}
            cancelLabel={t("users.cancel")}
          />
        </Modal>
      )}

      {/* DELETE CONFIRMATION */}
      {confirmDelete && (
        <Modal>
          <h3 className="modal-title text-error">{t("users.confirmDelete")}</h3>

          <p className="text-on-surface">
            {t("users.deleteUserPrompt")}{" "}
            <span className="font-bold">{confirmDelete.username}</span>?
          </p>

          <ModalActions
            onCancel={() => setConfirmDelete(null)}
            onConfirm={() => deleteUser(confirmDelete.id)}
            confirmLabel={t("users.delete")}
            cancelLabel={t("users.cancel")}
          />
        </Modal>
      )}
    </div>
  );
}

/* ============================
   REUSABLE MODAL COMPONENTS
============================ */
function Modal({ children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-surface-container-low p-6 rounded-3xl w-full max-w-md shadow-xl space-y-4">
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onCancel, onConfirm, confirmLabel, cancelLabel }) {
  return (
    <div className="flex justify-end gap-3 mt-4">
      <button
        className="px-4 py-2 bg-outline text-on-surface rounded-xl"
        onClick={onCancel}
      >
        {cancelLabel}
      </button>

      <button
        className="px-4 py-2 bg-primary text-white rounded-xl font-bold"
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
