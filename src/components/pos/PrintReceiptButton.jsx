// src/components/pos/PrintReceiptButton.jsx

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import ReceiptPreviewModal from "./ReceiptPreviewModal";
import ReceiptTemplate from "./ReceiptTemplate";
import {
  renderReceiptCanvas,
  connectUSB,
  connectBluetooth,
  autoConnectBluetooth,
  loadLastPrinter,
} from "../../services/thermalPrinter";
import { useTranslation } from "react-i18next";

export default function PrintReceiptButton({ saleData, pharmacySettings }) {
  const receiptRef = useRef(null);
  const { t } = useTranslation();

  const [previewImage, setPreviewImage] = useState(null);
  const [previewWidth, setPreviewWidth] = useState(576); // default 80mm

  // Auto‑connect last printer (USB + silent Bluetooth) just to pick width
  useEffect(() => {
    const autoConnect = async () => {
      const last = loadLastPrinter();
      if (!last) return;

      try {
        let conn = null;

        if (last.type === "usb") {
          conn = await connectUSB();
        } else if (last.type === "bluetooth") {
          conn = await autoConnectBluetooth(last);
        }

        if (conn) {
          const width = conn.paperWidth === 58 ? 384 : 576;
          setPreviewWidth(width);
        }
      } catch (err) {
        console.warn("Auto‑connect for preview failed:", err);
      }
    };

    autoConnect();
  }, []);

  const doPreview = async () => {
    const canvas = await renderReceiptCanvas(receiptRef.current, previewWidth);
    const img = new Image();
    img.src = canvas.toDataURL("image/png");
    setPreviewImage(img);
  };

  return (
    <>
      {/* Hidden receipt for rendering */}
      {createPortal(
        <div style={{ position: "fixed", left: "-9999px", top: 0 }}>
          <ReceiptTemplate
            ref={receiptRef}
            saleData={saleData}
            pharmacySettings={pharmacySettings}
          />
        </div>,
        document.body
      )}

      {/* Preview Button */}
      <button
        onClick={doPreview}
        className="w-full mt-3 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
      >
        👁️ {t("pos.PreviewReceipt")}
      </button>

      {/* Preview Modal */}
      {previewImage &&
        createPortal(
          <ReceiptPreviewModal
            image={previewImage}
            widthPx={previewWidth}
            onClose={() => setPreviewImage(null)}
            onChangeWidth={async (w) => {
              setPreviewWidth(w);
              await doPreview();
            }}
          />,
          document.body
        )}
    </>
  );
}
