// src/components/pos/ReceiptPreviewModal.jsx
import { jsPDF } from "jspdf";

export default function ReceiptPreviewModal({ image, widthPx, onClose, onChangeWidth }) {
  const savePDF = () => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [widthPx, image.height],
    });

    pdf.addImage(image.src, "PNG", 0, 0, widthPx, image.height);
    pdf.save("receipt.pdf");
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "12px",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "12px", display: "flex", gap: "8px" }}>
          <button onClick={savePDF} className="px-3 py-2 bg-blue-600 text-white rounded">Save PDF</button>
          <button onClick={() => onChangeWidth(384)} className="px-3 py-2 bg-gray-200 rounded">58mm</button>
          <button onClick={() => onChangeWidth(576)} className="px-3 py-2 bg-gray-200 rounded">80mm</button>
        </div>

        <img
          src={image.src}
          alt="Receipt Preview"
          style={{ width: widthPx + "px", display: "block" }}
        />
      </div>
    </div>
  );
}
