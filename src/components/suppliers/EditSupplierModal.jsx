import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db";

const medicalIcons = [
  "💊","💉","🩺","🧪","🧬","🏥","🩹","🩸","🧻","🧼"
];

export default function EditSupplierModal({ open, supplier, onClose }) {
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [icon, setIcon] = useState("🏥");
  const [imageUrl, setImageUrl] = useState("");
  const [pastBalance, setPastBalance] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (supplier && open) {
      setName(supplier.name || "");
      setPhone(supplier.phone || "");
      setIcon(supplier.icon || "🏥");
      setImageUrl(supplier.imageUrl || "");
      setPastBalance(supplier.pastBalance ?? 0);
      setNotes(supplier.notes || "");
    }
  }, [supplier, open]);

  if (!open || !supplier) return null;

  const save = async () => {
    await db.suppliers.update(supplier.id, {
      name,
      phone,
      icon,
      imageUrl,
      pastBalance: Number(pastBalance) || 0,
      notes
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xl w-[480px] max-h-[90vh] overflow-auto">
        <h2 className="text-xl font-bold mb-4">
          {t("suppliers.editSupplier")}
        </h2>

        {/* Preview */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-surface-container flex items-center justify-center">
            {imageUrl ? (
              <img
                src={imageUrl}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">{icon}</span>
            )}
          </div>
          <div>
            <div className="font-bold text-on-surface">{name || "-"}</div>
            <div className="text-sm text-on-surface-variant">
              {phone || "-"}
            </div>
          </div>
        </div>

        {/* Name */}
        <label className="block mb-1 text-sm font-semibold">
          {t("suppliers.name")}
        </label>
        <input
          className="input mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Phone */}
        <label className="block mb-1 text-sm font-semibold">
          {t("suppliers.phone")}
        </label>
        <input
          className="input mb-3"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        {/* Icon */}
        <label className="block mb-1 text-sm font-semibold">
          {t("suppliers.icon")}
        </label>
        <select
          className="input mb-3"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
        >
          {medicalIcons.map((ic) => (
            <option key={ic} value={ic}>
              {ic}
            </option>
          ))}
        </select>

        {/* Image */}
        <label className="block mb-1 text-sm font-semibold">
          {t("suppliers.imageUrl")}
        </label>
        <input
          type="file"
          accept="image/*"
          className="input mb-3"
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => setImageUrl(reader.result);
            reader.readAsDataURL(file);
          }}
        />

        {/* Balance */}
        <label className="block mb-1 text-sm font-semibold">
          {t("suppliers.pastBalance")}
        </label>
        <input
          type="number"
          className="input mb-3"
          value={pastBalance}
          onChange={(e) => setPastBalance(e.target.value)}
        />

        {/* Notes */}
        <label className="block mb-1 text-sm font-semibold">
          {t("suppliers.notes")}
        </label>
        <textarea
          className="input mb-4 min-h-[80px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-3 mt-4">
          <button
            className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface"
            onClick={onClose}
          >
            {t("suppliers.cancel")}
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-semibold"
            onClick={save}
          >
            {t("suppliers.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
