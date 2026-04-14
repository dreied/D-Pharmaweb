import { useParams, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import SupplierReturnModal from "../components/suppliers/SupplierReturnModal";
import { processSupplierReturn_v2 } from "../services/returns/supplierReturn_v2";
import { adaptSupplierReturnPayloadFromModal } from "../services/returns/adapters";
import AddSupplierStockWizard from "../components/suppliers/AddSupplierStockWizard";
import EditSupplierModal from "../components/suppliers/EditSupplierModal";
import DeleteSupplierModal from "../components/suppliers/DeleteSupplierModal";
import PaymentModal from "../components/suppliers/PaymentModal";
import SupplierPaymentsChart from "../components/suppliers/SupplierPaymentsChart";

import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";

import { formatPrice } from "../currency";

export default function SupplierDetailsPage() {
  const { id } = useParams();
  const supplierId = Number(id);
  const navigate = useNavigate();
  const { t } = useTranslation();

  // -----------------------------
  // Wizard state
  // -----------------------------
  const [openAddStock, setOpenAddStock] = useState(false);
  const [prefillItemFromScan, setPrefillItemFromScan] = useState(null);

  // -----------------------------
  // Other modals
  // -----------------------------
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openPay, setOpenPay] = useState(false);
const [supplierSnapshot, setSupplierSnapshot] = useState(null);

const [showGlobalReturnModal, setShowGlobalReturnModal] = useState(false);
const [showInvoiceReturnModal, setShowInvoiceReturnModal] = useState(false);
const [activeInvoiceId, setActiveInvoiceId] = useState(null);

  // -----------------------------
  // Supplier data (hooks ALWAYS run)
  // -----------------------------
  const supplier = useLiveQuery(
    () => db.suppliers.get(supplierId),
    [supplierId]
  );

  const payments = useLiveQuery(
    () =>
      db.supplierPayments
        .where("supplierId")
        .equals(supplierId)
        .reverse()
        .sortBy("timestamp"),
    [supplierId],
    []
  );

  const invoices = useLiveQuery(
    () =>
      db.supplierInvoices
        ?.where("supplierId")
        .equals(supplierId)
        .toArray() || [],
    [supplierId],
    []
  );
const purchases = useLiveQuery(
  () =>
    db.supplierStockPurchases
      .where("supplierId")
      .equals(supplierId)
      .reverse()
      .sortBy("timestamp"),
  [supplierId],
  []
);

  // -----------------------------
  // Currency settings
  // -----------------------------
  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";
const [returnItems, setReturnItems] = useState([]);

  const fmt = (value) => formatPrice(value, useNewCurrency, currencySymbol);
  const displayPrice = (v) => (useNewCurrency ? v / 100 : v);
  const handlePriceInput = (v) =>
    useNewCurrency ? Number(v) * 100 : Number(v);

  // -----------------------------
  // Totals (safe because they don't use supplier)
  // -----------------------------
  const totalPaid = useMemo(
    () => (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0),
    [payments]
  );

  const outstandingTotal = useMemo(
    () =>
      (invoices || [])
        .filter((inv) => !inv.paid)
        .reduce((sum, inv) => sum + (inv.amount || 0), 0),
    [invoices]
  );

  // -----------------------------
  // EARLY RETURN — MUST BE HERE
  // -----------------------------
  if (!supplier) return null;

  // -----------------------------
  // Now safe to use supplier.*
  // -----------------------------
  const balance = supplier.pastBalance ?? 0;
  const balanceColor =
    balance > 0
      ? "text-green-600"
      : balance < 0
      ? "text-red-600"
      : "text-on-surface-variant";

  // -----------------------------
  // Header barcode scan → open wizard
  // -----------------------------
  const handleHeaderBarcodeScan = async () => {
    const barcode = prompt("Scan barcode:");
    if (!barcode) return;

    let item = await db.universalPharmacy
      .where("barcode")
      .equals(barcode)
      .first();

    if (!item) {
      item = await db.universalPharmacy
        .filter((p) => {
          try {
            const arr = JSON.parse(p.allBarcodes || "[]");
            return arr.includes(barcode);
          } catch {
            return false;
          }
        })
        .first();
    }

    setPrefillItemFromScan({
      nameEn: item?.nameEn || "",
      nameAr: item?.nameAr || "",
      barcode: item?.barcode || barcode,
      form: item?.form || "",
      purchasePrice: item?.purchasePrice ?? 0,
      salePrice: item?.salePrice ?? 0,
    });

    setOpenAddStock(true);
  };
async function handleOpenGlobalReturn() {
  await db.open(); // ⭐ ensure Dexie is ready

  const entries = await db.supplierStockEntries

    .where("supplierId")
    .equals(supplierId)
    .toArray();

  const prepared = [];

  for (const e of entries) {
    const remaining = await getRemainingForBatch(e.batchNumber);



    if (remaining > 0) {
      prepared.push({
        productId: e.stockProductId,
        batchId: e.id,
        batch: e.batchNumber,
        quantity: remaining,
        purchasePrice: e.purchasePrice,
        expiry: e.expiryDate,
        nameEn: e.medicineName,
        nameAr: e.medicineName,
      });
    }
  }

  setReturnItems(prepared);
  setShowGlobalReturnModal(true);
}




async function handleOpenInvoiceReturn(purchaseId) {
  await db.open(); // ⭐ ensure Dexie is ready

  const entries = await db.supplierStockEntries

    .where("purchaseId")
    .equals(purchaseId)
    .toArray();

  const prepared = [];

  for (const e of entries) {
    const remaining = await getRemainingForBatch(e.batchNumber);


    if (remaining > 0) {
      prepared.push({
        productId: e.stockProductId,
        batchId: e.id,
        batch: e.batchNumber,
        quantity: remaining,
        purchasePrice: e.purchasePrice,
        expiry: e.expiryDate,
        nameEn: e.medicineName,
        nameAr: e.medicineName,
      });
    }
  }

  setReturnItems(prepared);
  setActiveInvoiceId(purchaseId);
  setShowInvoiceReturnModal(true);
}


async function getRemainingForBatch(batchString) {
  await db.open();

  const batch = await db.stockBatches
    .where("batch")
    .equals(batchString)
    .first();

  if (!batch) return 0;

  // batch.quantity is already the remaining quantity
  return batch.quantity || 0;
}


async function handleGlobalReturnScan() {
  const barcode = prompt(t("suppliers.scanBarcode"));
  if (!barcode) return;

  await db.open();

  // 1) Find product by barcode
  const product = await db.stockProducts
    .where("barcode")
    .equals(barcode)
    .first();

  if (!product) {
    alert(t("suppliers.notFoundInStock"));
    return;
  }

  // 2) Get all batches for this product
  const batches = await db.stockBatches
    .where("stockProductId")
    .equals(product.id)
    .toArray();

  if (batches.length === 0) {
    alert(t("suppliers.noBatchesFound"));
    return;
  }

  // 3) Filter batches belonging to THIS supplier
  const supplierBatches = batches.filter(
    (b) => b.supplierId === supplierId
  );

  if (supplierBatches.length === 0) {
    alert(t("suppliers.noBatchesFromThisSupplier"));
    return;
  }

  // 4) Filter batches with remaining quantity
  const prepared = supplierBatches
    .filter((b) => (b.quantity || 0) > 0)
    .map((b) => ({
      productId: product.id,
      batchId: b.id,
      batch: b.batch,
      quantity: b.quantity,
      purchasePrice: b.purchasePrice,
      expiry: b.expiry,
      nameEn: product.nameEn,
      nameAr: product.nameAr,
    }));

  if (prepared.length === 0) {
    alert(t("suppliers.noRemainingQuantity"));
    return;
  }

  // 5) Open modal
  setReturnItems(prepared);
  setShowGlobalReturnModal(true);
}



function PurchaseItemsList({ purchaseId }) {
  const { t } = useTranslation();
  const items = useLiveQuery(
    () =>
      db.supplierStockEntries
        .where("purchaseId")
        .equals(purchaseId)
        .toArray(),
    [purchaseId],
    []
  );

  if (!items) return null;

  return (
    <div className="mt-4 border-t border-outline-variant/20 pt-4">
      <h3 className="font-bold mb-2">{t("suppliers.items")}</h3>

      <div className="space-y-2">
        {items.map((it) => {
          const price = it.purchasePrice;
          const total = it.quantity * price;
          return (
            <div
              key={it.id}
              className="flex justify-between text-sm border-b border-outline-variant/10 pb-2"
            >
              <div>
                <div className="font-bold">{it.medicineName}</div>
                <div className="text-on-surface-variant">
                  {t("stock.batch")}: {it.batchNumber}
                </div>
                <div className="text-on-surface-variant">
                  {t("stock.expiry")}: {it.expiryDate}
                </div>
              </div>

              <div className="text-right">
                <div>
                  {t("stock.qty")}: {it.quantity}
                </div>
                <div>
                  {t("stock.price")}: {fmt(price).formatted} {fmt(price).symbol}
                </div>
                <div className="font-bold">
                  {fmt(total).formatted} {fmt(total).symbol}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

  // -----------------------------
  // UI Layout
  // -----------------------------
  return (
    <div className="bg-background min-h-screen">
      <SideNavBar />

      <TopAppBar
        title={supplier.name}
        onBack={() => navigate("/suppliers")}
      />

      <main className="ml-64 pt-24 p-8 space-y-10">
        {/* BACK BUTTON */}
        <button
          onClick={() => navigate("/suppliers")}
          className="flex items-center gap-2 text-on-surface hover:text-primary mb-2"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t("common.back")}
        </button>

        {/* HEADER CARD */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-8 flex flex-col lg:flex-row gap-10">
          {/* Supplier Image */}
          <div className="w-40 h-40 rounded-2xl overflow-hidden bg-surface-container-high shadow">
            {supplier.imageUrl ? (
              <img
                src={supplier.imageUrl || undefined}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl text-primary">
                {supplier.icon}
              </div>
            )}
          </div>

          {/* Supplier Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-bold text-on-surface mb-2">
                {supplier.name}
              </h1>

              <p className="text-on-surface-variant text-sm">
                {t("suppliers.phone")}: {supplier.phone || "-"}
              </p>

              <p className="text-on-surface-variant text-sm mt-1">
                {t("suppliers.notes")}: {supplier.notes || "-"}
              </p>
            </div>

 {/* ACTION BUTTONS — FINAL FIXED LAYOUT */}
<div className="flex flex-col lg:flex-row gap-10 mt-6">

  {/* GROUP A — UNDER SUPPLIER ICON */}
  <div className="flex flex-col gap-3 w-full lg:w-auto">
    {/* ADD STOCK */}
    <button
      className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-semibold shadow hover:opacity-90 flex items-center gap-2"
      onClick={() => {
        setPrefillItemFromScan(null);
        setOpenAddStock(true);
      }}
    >
      <span className="material-symbols-outlined">inventory_2</span>
      {t("suppliers.addStock")}
    </button>

    {/* SCAN TO ADD — ICON ONLY */}
    <button
  onClick={handleHeaderBarcodeScan}
  className="text-primary flex items-center justify-center"
>
 <span
  className="material-symbols-outlined"
  style={{ fontSize: "40px" }}
>
  barcode_scanner
</span>

</button>


  </div>

  {/* SPACER TO PUSH LONG GROUP NEXT TO CARDS */}
  <div className="flex-1"></div>

  {/* GROUP B — NEXT TO BALANCE CARDS */}
  <div className="flex flex-col gap-3 w-full lg:w-auto">

    {/* EDIT SUPPLIER — GREY + ICON */}
    <button
      className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-semibold shadow hover:bg-surface-container flex items-center gap-2"
      onClick={() => setOpenEdit(true)}
    >
      <span className="material-symbols-outlined">edit</span>
      {t("suppliers.editSupplier")}
    </button>

    {/* MAKE PAYMENT — GREY + ICON */}
    <button
      className="px-5 py-2.5 bg-surface-container-high text-on-surface rounded-xl font-semibold shadow hover:bg-surface-container flex items-center gap-2"
      onClick={async () => {
        const fresh = await db.suppliers.get(supplierId);
        setSupplierSnapshot(fresh);
        setOpenPay(true);
      }}
    >
      <span className="material-symbols-outlined">payments</span>
      {t("suppliers.makePayment")}
    </button>

    {/* DELETE SUPPLIER — RED + ICON */}
    <button
      className="px-5 py-2.5 bg-error text-on-error rounded-xl font-semibold shadow hover:opacity-90 flex items-center gap-2"
      onClick={() => setOpenDelete(true)}
    >
      <span className="material-symbols-outlined">delete</span>
      {t("suppliers.deleteSupplier")}
    </button>

    {/* RETURN TO SUPPLIER — GREEN + ICON */}
    <button
      onClick={() => handleOpenGlobalReturn()}
      className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold shadow hover:opacity-90 flex items-center gap-2"
    >
      <span className="material-symbols-outlined">undo</span>
      {t("suppliers.returnToSupplier")}
    </button>

    {/* SCAN TO RETURN — GREEN + UNDO + BARCODE ICONS */}
    <button
  onClick={handleGlobalReturnScan}
  className="text-green-600 flex items-center gap-2"
>
  <span
    className="material-symbols-outlined"
    style={{ fontSize: "30px" }}
  >
    undo
  </span>

  <span
    className="material-symbols-outlined"
    style={{ fontSize: "38px" }}
  >
    barcode_scanner
  </span>
</button>



  </div>

</div>






          </div>

          {/* BALANCE CARDS */}
          <div className="w-full lg:w-72 grid grid-cols-1 gap-4">
            {/* Current Balance */}
            <div className="p-4 rounded-xl bg-surface-container-high shadow">
              <div className="text-xs text-on-surface-variant">
                {t("suppliers.currentBalance")}
              </div>
              <div className={`text-2xl font-bold mt-1 ${balanceColor}`}>
                {fmt(balance).formatted} {fmt(balance).symbol}
              </div>
            </div>

            {/* Total Paid */}
            <div className="p-4 rounded-xl bg-surface-container-high shadow">
              <div className="text-xs text-on-surface-variant">
                {t("suppliers.totalPaid")}
              </div>
              <div className="text-2xl font-bold text-on-surface mt-1">
                {fmt(totalPaid).formatted} {fmt(totalPaid).symbol}
              </div>
            </div>

            {/* Outstanding */}
            <div className="p-4 rounded-xl bg-surface-container-high shadow">
              <div className="text-xs text-on-surface-variant">
                {t("suppliers.outstanding")}
              </div>
              <div className="text-2xl font-bold text-on-surface mt-1">
                {fmt(outstandingTotal).formatted} {fmt(outstandingTotal).symbol}
              </div>
            </div>
          </div>
        </div>

        {/* CHART + OUTSTANDING + CONTACT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Payments Chart */}
          <div className="xl:col-span-2 bg-surface-container-lowest rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">
              {t("suppliers.monthlyPayments")}
            </h2>
            <SupplierPaymentsChart payments={payments || []} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Outstanding Invoices */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">
                {t("suppliers.outstandingInvoices")}
              </h2>

              <div className="space-y-3 max-h-64 overflow-auto">
                {(invoices || [])
                  .filter((inv) => !inv.paid)
                  .map((inv) => {
                    const money = fmt(inv.amount || 0);
                    return (
                      <div
                        key={inv.id}
                        className="flex justify-between text-sm border-b border-outline-variant/20 pb-2"
                      >
                        <span>{inv.invoiceNumber || `#${inv.id}`}</span>
                        <span>
                          {money.formatted} {money.symbol}
                        </span>
                      </div>
                    );
                  })}

                {(!invoices ||
                  invoices.filter((i) => !i.paid).length === 0) && (
                  <div className="text-sm text-on-surface-variant">
                    {t("suppliers.noOutstanding")}
                  </div>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">
                {t("suppliers.contactInfo")}
              </h2>

              <p className="text-sm text-on-surface-variant">
                {t("suppliers.phone")}: {supplier.phone || "-"}
              </p>

              <p className="text-sm text-on-surface-variant mt-2">
                {t("suppliers.notes")}: {supplier.notes || "-"}
              </p>
            </div>
          </div>
        </div>

{/* PURCHASE HISTORY */}
<div className="bg-surface-container-lowest rounded-2xl shadow-lg p-6">
  <h2 className="text-xl font-bold mb-4">
    {t("suppliers.purchaseHistory")}
  </h2>

  <div className="space-y-4">
    {(purchases || []).map((p) => {
      const money = fmt(p.totalCost);
      return (
        <details
          key={p.id}
          className="border border-outline-variant/20 rounded-xl p-4"
        >
         <summary className="cursor-pointer flex justify-between items-center gap-3">
  <div className="flex flex-col">
    <span className="font-bold text-on-surface">
      {new Date(p.timestamp).toLocaleString()}
    </span>
    <span className="text-sm text-on-surface-variant">
      {t("suppliers.purchaseId")}: {p.id}
    </span>
  </div>

  <div className="flex items-center gap-3">
    <span className="font-bold text-primary">
      {money.formatted} {money.symbol}
    </span>

    {/* RETURN ICON BUTTON (PER INVOICE) */}
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault(); // prevent details toggle
        handleOpenInvoiceReturn(p.id);
      }}
      className="w-9 h-9 flex items-center justify-center rounded-full bg-error text-on-error hover:opacity-90"
      title={t("suppliers.returnFromThisInvoice")}
    >
      <span className="material-symbols-outlined text-sm">undo</span>
    </button>
  </div>
</summary>


          <div className="mt-4 space-y-2 text-sm">
            <div>
              {t("suppliers.totalCost")}:{" "}
              {fmt(p.totalCost).formatted} {fmt(p.totalCost).symbol}
            </div>
            <div>
              {t("suppliers.amountPaid")}:{" "}
              {fmt(p.amountPaid).formatted} {fmt(p.amountPaid).symbol}
            </div>
            <div>
              {t("suppliers.remainingBalance")}:{" "}
              {fmt(p.remainingBalance).formatted} {fmt(p.remainingBalance).symbol}
            </div>
          </div>

          {/* ITEMS */}
          <PurchaseItemsList purchaseId={p.id} />
        </details>
      );
    })}

    {(purchases || []).length === 0 && (
      <div className="text-sm text-on-surface-variant">
        {t("suppliers.noPurchases")}
      </div>
    )}
  </div>
</div>

        {/* PAYMENT HISTORY TABLE */}
        <div className="bg-surface-container-lowest rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">
            {t("suppliers.paymentHistory")}
          </h2>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-on-surface-variant border-b border-outline-variant/20">
                  <th className="py-2">{t("suppliers.date")}</th>
                  <th className="py-2">{t("suppliers.amount")}</th>
                  <th className="py-2">{t("suppliers.method")}</th>
                  <th className="py-2">{t("suppliers.note")}</th>
                </tr>
              </thead>

              <tbody>
                {(payments || []).map((p) => {
                  const money = fmt(p.amount || 0);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-outline-variant/10 last:border-0"
                    >
                      <td className="py-2">
                        {new Date(p.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2">
                        {money.formatted} {money.symbol}
                      </td>
                      <td className="py-2">{p.method || "-"}</td>
                      <td className="py-2">{p.note || "-"}</td>
                    </tr>
                  );
                })}

                {(!payments || payments.length === 0) && (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-4 text-center text-on-surface-variant"
                    >
                      {t("suppliers.noPayments")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODALS (always mounted, hook-safe) */}
        <EditSupplierModal
          open={openEdit}
          supplier={supplier}
          onClose={() => setOpenEdit(false)}
        />

        <DeleteSupplierModal
          open={openDelete}
          supplier={supplier}
          onClose={() => {
            setOpenDelete(false);
            navigate("/suppliers");
          }}
        />

       <PaymentModal
  open={openPay}
  supplier={supplierSnapshot || supplier}   // ← always newest
  onClose={() => setOpenPay(false)}
/>


        {supplier && (
  <AddSupplierStockWizard
    open={openAddStock}
    onClose={() => setOpenAddStock(false)}
    initialSupplier={supplier}   // ← FIX: freeze snapshot
    displayPrice={displayPrice}
    handlePriceInput={handlePriceInput}
    prefillItem={prefillItemFromScan}
  />
)}

{showGlobalReturnModal && (
  <SupplierReturnModal
    isOpen={showGlobalReturnModal}
    onClose={() => setShowGlobalReturnModal(false)}
    items={returnItems}
    initialSupplierId={supplierId}
    onCompleted={async (data) => {
  const payload = adaptSupplierReturnPayloadFromModal(data);
  await processSupplierReturn_v2(payload);
  alert(t("supplier.returnCompleted"));
  setShowGlobalReturnModal(false);
}}
    /*onCompleted={(data) => {
      console.log("GLOBAL RETURN DATA:", data);
      // Step 3 will implement DB logic
      setShowGlobalReturnModal(false);
    }}*/

  />
)}

{showInvoiceReturnModal && (
  <SupplierReturnModal
    isOpen={showInvoiceReturnModal}
    onClose={() => setShowInvoiceReturnModal(false)}
    items={returnItems}
    initialSupplierId={supplierId}
    onCompleted={async (data) => {
  const payload = adaptSupplierReturnPayloadFromModal(data);
  await processSupplierReturn_v2(payload);
  alert(t("supplier.returnCompleted"));
  setShowInvoiceReturnModal(false);
}}

    /*onCompleted={(data) => {
      console.log("INVOICE RETURN DATA:", data);
      // Step 3 will implement DB logic
      setShowInvoiceReturnModal(false);
    }}*/
  />
)}
      </main>
    </div>
  );
}
