// src/components/pos/ReceiptTemplate.jsx
import { forwardRef } from "react";
import i18n from "../../i18n";
import { formatPrice } from "../../currency";

const ReceiptTemplate = forwardRef(({ saleData, pharmacySettings }, ref) => {
  const isAr = i18n.language === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const {
    receiptNumber,
    date,
    time,
    items,
    subtotal,
    tax,
    discount,
    total,
    paymentMethod,
    customerName,
    previousBalance,
    paidNow,
    newBalance,
    currencySymbol,
    useNewCurrency,
  } = saleData;

  const {
    pharmacyName = "",
    pharmacyAddress = "",
    pharmacyAddressAr = "",
    pharmacyPhone = "",
    pharmacyLogo = null,
  } = pharmacySettings;

  const fmt = (val) => formatPrice(val, useNewCurrency, currencySymbol);

  return (
    <div
      ref={ref}
      dir={dir}
      style={{
        width: "576px",
        fontFamily: isAr
          ? "'Noto Naskh Arabic', 'Cairo', Arial, sans-serif"
          : "'Segoe UI', Arial, sans-serif",
        backgroundColor: "#fff",
        color: "#000",
        padding: "16px",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
    >
      {/* ─── Header ─── */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        {pharmacyLogo && (
          <div style={{ marginBottom: "8px" }}>
            <img
              src={pharmacyLogo}
              alt="Logo"
              style={{
                width: "120px",
                height: "auto",
                objectFit: "contain",
                margin: "0 auto",
              }}
            />
          </div>
        )}

        {/* ⭐ ONLY ONE NAME */}
        <div style={{ fontSize: "22px", fontWeight: 700 }}>
          { pharmacyName}
        </div>

        {/* Address */}
        {(pharmacyAddressAr || pharmacyAddress) && (
          <div style={{ fontSize: "12px", marginTop: "4px" }}>
            {isAr ? pharmacyAddressAr : pharmacyAddress}
          </div>
        )}

        {/* Phone */}
        {pharmacyPhone && (
          <div style={{ fontSize: "12px" }}>
            {isAr ? "هاتف" : "Phone"}: {pharmacyPhone}
          </div>
        )}
      </div>

      <Dashes />

      {/* ─── Receipt Info ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          marginBottom: "4px",
        }}
      >
        <span>
          {isAr ? "رقم الفاتورة" : "Receipt #"}: {receiptNumber}
        </span>
        <span>{date}</span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px",
          marginBottom: "8px",
        }}
      >
        <span>{time}</span>
        {customerName && (
          <span>
            {isAr ? "العميل" : "Customer"}: {customerName}
          </span>
        )}
      </div>

      <Dashes />

      {/* ─── Items Header ─── */}
      <div
        style={{
          display: "flex",
          fontWeight: 700,
          fontSize: "13px",
          marginBottom: "6px",
        }}
      >
        <span style={{ flex: 2 }}>{isAr ? "الصنف" : "Item"}</span>
        <span style={{ flex: 1, textAlign: "center" }}>
          {isAr ? "الكمية" : "Qty"}
        </span>
        <span style={{ flex: 1, textAlign: "center" }}>
          {isAr ? "السعر" : "Price"}
        </span>
        <span style={{ flex: 1, textAlign: isAr ? "left" : "right" }}>
          {isAr ? "الإجمالي" : "Total"}
        </span>
      </div>

      <Dashes />

      {/* ─── Items ─── */}
      {items.map((item, i) => (
        <div key={i}>
          <div
            style={{
              display: "flex",
              fontSize: "13px",
              marginBottom: "4px",
            }}
          >
            {/* ⭐ ONLY ONE NAME */}
            <span style={{ flex: 2 }}>
              {isAr ? item.nameAr : item.nameEn}
            </span>

            <span style={{ flex: 1, textAlign: "center" }}>
              {item.quantity}
            </span>

            <span style={{ flex: 1, textAlign: "center" }}>
              {fmt(item.price).formatted}
            </span>

            <span style={{ flex: 1, textAlign: isAr ? "left" : "right" }}>
              {fmt(item.price * item.quantity).formatted}
            </span>
          </div>
        </div>
      ))}

      <Dashes />

      {/* ─── Totals ─── */}
      <TotalRow
        label={isAr ? "المجموع الفرعي" : "Subtotal"}
        value={fmt(subtotal).formatted}
      />

      {discount > 0 && (
        <TotalRow
          label={isAr ? "الخصم" : "Discount"}
          value={`-${fmt(discount).formatted}`}
        />
      )}

      {tax > 0 && (
        <TotalRow
          label={isAr ? "الضريبة" : "Tax"}
          value={fmt(tax).formatted}
        />
      )}

      <Dashes />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: "18px",
          marginBottom: "8px",
        }}
      >
        <span>{isAr ? "الإجمالي" : "Total"}</span>
        <span>
          {fmt(total).formatted} {fmt(total).symbol}
        </span>
      </div>

      {/* ─── Payment Info ─── */}
      <div
        style={{
          textAlign: "center",
          fontSize: "12px",
          marginBottom: "8px",
        }}
      >
        {isAr ? "طريقة الدفع" : "Payment"}:{" "}
        {paymentMethod === "cash"
          ? isAr
            ? "نقداً"
            : "Cash"
          : isAr
          ? "آجل"
          : "Debt"}
      </div>

      {/* ─── Debt Details ─── */}
      {paymentMethod === "debt" && (
        <>
          <Dashes />
          <TotalRow
            label={isAr ? "الرصيد السابق" : "Previous Balance"}
            value={fmt(previousBalance).formatted}
          />
          {paidNow > 0 && (
            <TotalRow
              label={isAr ? "المدفوع الآن" : "Paid Now"}
              value={fmt(paidNow).formatted}
            />
          )}
          <TotalRow
            label={isAr ? "الرصيد الجديد" : "New Balance"}
            value={fmt(newBalance).formatted}
            bold
          />
        </>
      )}

      <Dashes />

      {/* ─── Footer ─── */}
      <div
        style={{
          textAlign: "center",
          fontSize: "12px",
          marginTop: "8px",
          fontWeight: 600,
        }}
      >
        {isAr ? "شكراً لزيارتكم" : "Thank you for your visit"}
      </div>
    </div>
  );
});

ReceiptTemplate.displayName = "ReceiptTemplate";

function Dashes() {
  return (
    <div
      style={{ borderBottom: "1px dashed #000", margin: "8px 0" }}
    />
  );
}

function TotalRow({ label, value, bold }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "4px",
        fontWeight: bold ? 700 : 400,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default ReceiptTemplate;
