import { useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db";

export default function AddSupplierModal({ open, onClose }) {
  const { t } = useTranslation();

  const medicalIcons = ["💊","💉","🩺","🧪","🧬","🏥","🩹","🧻","🧼","🩸"];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [icon, setIcon] = useState("🏥");
  const [imageUrl, setImageUrl] = useState("");
  const [pastBalance, setPastBalance] = useState(0);

  if (!open) return null;

  const saveSupplier = async () => {
    await db.suppliers.add({
      name,
      phone,
      icon,
      imageUrl,
      pastBalance: Number(pastBalance),
      createdAt: Date.now()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl w-[420px]">

        <h2 className="text-xl font-bold mb-4">{t("suppliers.addSupplier")}</h2>

        {/* Name */}
        <label className="block mb-2">{t("suppliers.name")}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />

        {/* Phone */}
        <label className="block mt-4 mb-2">{t("suppliers.phone")}</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />

        {/* Icon Dropdown */}
        <label className="block mt-4 mb-2">{t("suppliers.icon")}</label>
        <select className="input" value={icon} onChange={(e) => setIcon(e.target.value)}>
          {medicalIcons.map((ic) => (
            <option key={ic} value={ic}>{ic}</option>
          ))}
        </select>

        {/* Image Picker */}
        <label className="block mt-4 mb-2">{t("suppliers.imageUrl")}</label>
        <input
          type="file"
          accept="image/*"
          className="input"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setImageUrl(reader.result);
            reader.readAsDataURL(file);
          }}
        />

        {/* Past Balance */}
        <label className="block mt-4 mb-2">{t("suppliers.pastBalance")}</label>
        <input
          type="number"
          className="input"
          value={pastBalance}
          onChange={(e) => setPastBalance(e.target.value)}
        />

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">
            {t("suppliers.cancel")}
          </button>

          <button onClick={saveSupplier} className="px-4 py-2 rounded-lg bg-primary text-white">
            {t("suppliers.save")}
          </button>
        </div>

      </div>
    </div>
  );
}
