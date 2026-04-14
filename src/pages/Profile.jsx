import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === "ar";

  const user = useLiveQuery(() => db.users.get(1), []);
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (user?.avatar) setAvatar(user.avatar);
  }, [user]);

  async function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const base64 = await fileToBase64(file);
    setAvatar(base64);

    await db.users.update(1, { avatar: base64 });
  }

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  if (!user) return null;

  return (
    <div className="p-6 mt-20 max-w-xl mx-auto">

      <div className="bg-surface-container-lowest rounded-3xl shadow-lg p-8 space-y-8">

        {/* AVATAR */}
        <div className="flex flex-col items-center">
          <label className="relative cursor-pointer group">
            <div className="
              w-32 h-32 rounded-full bg-primary text-on-primary
              flex items-center justify-center text-4xl font-bold shadow
              overflow-hidden transition-all
              group-hover:opacity-80
            ">
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </div>

            <div className="
              absolute bottom-1 right-1 bg-primary text-on-primary
              w-9 h-9 rounded-full flex items-center justify-center shadow
              opacity-90 group-hover:scale-110 transition
            ">
              <span className="material-symbols-outlined text-lg">edit</span>
            </div>

            <input type="file" className="hidden" onChange={handleAvatarUpload} />
          </label>

          <h2 className="mt-4 text-2xl font-bold text-on-surface">
            {user.username}
          </h2>

          <p className="text-on-surface-variant text-sm mt-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-primary text-base">badge</span>
            {t("profile.role")}: {user.role}
          </p>
        </div>

        {/* ACTIONS */}
        <div className="space-y-4">

          <button
            onClick={() => navigate("/change-password")}
            className="
              w-full py-3 rounded-xl bg-primary text-on-primary font-bold
              flex items-center justify-center gap-2
            "
          >
            <span className="material-symbols-outlined">lock</span>
            {t("profile.changePassword")}
          </button>

        </div>

      </div>
    </div>
  );
}
