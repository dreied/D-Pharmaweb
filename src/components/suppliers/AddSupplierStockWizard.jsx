import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { db } from "../../db";

import ProductEntryScreen from "./ProductEntryScreen";
import SupplierStockSummaryModal from "./SupplierStockSummaryModal";
import SupplierStockPaymentModal from "./SupplierStockPaymentModal";
import { generateNextBatch } from "../../utils/batchGenerator";

function emptyItem() {
  return {
    nameEn: "",
    nameAr: "",
    barcode: "",
    form: "",
    categoryId: null,
    isAccessory: false,
    minQty: 0,
    cabinet: "",
    shelf: "",
    shelfRow: "",
    batch: "",
    expiry: "",
    quantity: 0,
    purchasePrice: 0,
    salePrice: 0,
  };
}



export default function AddSupplierStockWizard({
  open,
  onClose,
  initialSupplier,
  displayPrice,
  handlePriceInput,
  prefillItem,
}) {
  const { t } = useTranslation();

  // 🔥 Supplier is now REAL STATE
  const [supplier, setSupplier] = useState(initialSupplier);

  const [items, setItems] = useState([emptyItem()]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showStorage, setShowStorage] = useState(false);

  const [showSummary, setShowSummary] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [summaryTotalCost, setSummaryTotalCost] = useState(0);

  // Reset wizard when opened
  useEffect(() => {
    if (open) {
      
      setItems([prefillItem ? { ...emptyItem(), ...prefillItem } : emptyItem()]);
      setCurrentIndex(0);
      setSearchValue("");
      setSearchResults([]);
      setShowStorage(false);
      setShowSummary(false);
      setShowPayment(false);
      setSummaryTotalCost(0);
    }
  }, [open, prefillItem]);

  const currentItem = items[currentIndex];

  // -------------------------------
  // SEARCH + SCAN
  // -------------------------------
  async function handleUniversalSearch(query) {
    setSearchValue(query);
    if (!query) return setSearchResults([]);

    const q = query.trim();

    const resultsEn = await db.universalPharmacy
      .where("nameEn")
      .startsWithIgnoreCase(q)
      .limit(20)
      .toArray();

    const resultsAr = await db.universalPharmacy
      .filter((item) => item.nameAr && item.nameAr.includes(q))
      .limit(20)
      .toArray();

    const resultsBarcode = await db.universalPharmacy
      .where("barcode")
      .startsWith(q)
      .limit(20)
      .toArray();

    const resultsAllBarcodes = await db.universalPharmacy
      .filter((item) => {
        try {
          const arr = JSON.parse(item.allBarcodes || "[]");
          return arr.some((b) => b.startsWith(q));
        } catch {
          return false;
        }
      })
      .limit(20)
      .toArray();

    const merged = [
      ...resultsEn,
      ...resultsAr,
      ...resultsBarcode,
      ...resultsAllBarcodes,
    ].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);

    setSearchResults(merged);
  }

  async function handleScan() {
    const barcode = prompt("Scan barcode:");
    if (!barcode) return;

    let u = await db.universalPharmacy.where("barcode").equals(barcode).first();

    if (!u) {
      u = await db.universalPharmacy
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

    const isEmpty =
      !currentItem.nameEn &&
      !currentItem.nameAr &&
      !currentItem.barcode &&
      !currentItem.form &&
      !currentItem.quantity;

    if (isEmpty) {
      updateCurrentItem({
        nameEn: u?.nameEn || "",
        nameAr: u?.nameAr || "",
        barcode: u?.barcode || barcode,
        form: u?.form || "",
        purchasePrice: u?.purchasePrice ?? 0,
        salePrice: u?.salePrice ?? 0,
      });
    } else {
      const newRow = {
        ...emptyItem(),
        nameEn: u?.nameEn || "",
        nameAr: u?.nameAr || "",
        barcode: u?.barcode || barcode,
        form: u?.form || "",
        purchasePrice: u?.purchasePrice ?? 0,
        salePrice: u?.salePrice ?? 0,
      };
      setItems((prev) => [...prev, newRow]);
      setCurrentIndex((prev) => prev + 1);
      setShowStorage(false);
    }

    setSearchValue("");
    setSearchResults([]);
  }

  // -------------------------------
  // ITEM UPDATE
  // -------------------------------
  function updateCurrentItem(patch) {
    setItems((prev) => {
      const updated = [...prev];
      const current = updated[currentIndex] || emptyItem();

      const nextPatch = { ...patch };
      if (!current.batch && patch.expiry && !patch.batch) {
  // Generate batch OUTSIDE setState
  generateNextBatch(current.nameEn || current.nameAr).then((batch) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[currentIndex] = { ...updated[currentIndex], batch };
      return updated;
    });
  });
}



      updated[currentIndex] = { ...current, ...nextPatch };
      return updated;
    });
  }

  function canProceed() {
    return currentItem.expiry && Number(currentItem.quantity) > 0;
  }

  // -------------------------------
  // NAVIGATION
  // -------------------------------
  function handleNextProduct() {
    if (!canProceed()) {
      alert(t("suppliers.mustFillExpiryAndQuantity"));
      return;
    }

    setItems((prev) => {
      if (currentIndex === prev.length - 1) {
        return [...prev, emptyItem()];
      }
      return prev;
    });

    setCurrentIndex((i) => i + 1);
    setShowStorage(false);
    setSearchValue("");
    setSearchResults([]);
  }

  function handleBack() {
    if (currentIndex === 0) return onClose();
    setCurrentIndex((i) => Math.max(0, i - 1));
    setShowStorage(false);
    setSearchValue("");
    setSearchResults([]);
  }

  // -------------------------------
  // SUMMARY
  // -------------------------------
  function handleContinueToSummary() {
    if (!canProceed()) {
      alert(t("suppliers.mustFillExpiryAndQuantity"));
      return;
    }

    const valid = items.filter(
      (row) =>
        (row.nameEn || row.nameAr) &&
        row.quantity > 0 &&
        row.expiry
    );

    if (valid.length === 0) {
      alert("No valid items to save");
      return;
    }

    let totalCost = 0;
    for (const row of valid) {
      totalCost += Number(row.quantity) * Number(row.purchasePrice);
    }

    setItems(valid);
    setSummaryTotalCost(totalCost);
    setShowSummary(true);
  }

  // -------------------------------
  // SAVE + OPEN PAYMENT
  // -------------------------------
  async function saveAllAndOpenPayment() {
// ⭐ Create purchase invoice BEFORE adding items
const purchaseId = await db.supplierStockPurchases.add({
  supplierId: supplier.id,
  supplierName: supplier.name,
  totalCost: summaryTotalCost,
  amountPaid: 0,
  remainingBalance: summaryTotalCost,
  timestamp: new Date().toISOString(),
  type: "purchase",
});

    let totalCost = summaryTotalCost;

    for (const row of items) {
      const existing = await db.stockProducts
        .where("barcode")
        .equals(row.barcode)
        .first();

      let productId;

      if (existing) {
        await db.stockProducts.update(existing.id, {
          nameEn: row.nameEn || existing.nameEn,
          nameAr: row.nameAr || existing.nameAr,
          barcode: row.barcode || existing.barcode,
          form: row.form,
          categoryId: row.categoryId,
          isAccessory: row.isAccessory,
          minQty: row.minQty,
          cabinet: row.cabinet,
          shelf: row.shelf,
          shelfRow: row.shelfRow,
          purchasePrice: row.purchasePrice,
          salePrice: row.salePrice,
        });

        productId = existing.id;
      } else {
        productId = await db.stockProducts.add({
          nameEn: row.nameEn,
          nameAr: row.nameAr,
          barcode: row.barcode,
          form: row.form,
          categoryId: row.categoryId,
          isAccessory: row.isAccessory,
          minQty: row.minQty,
          cabinet: row.cabinet,
          shelf: row.shelf,
          shelfRow: row.shelfRow,
          purchasePrice: row.purchasePrice,
          salePrice: row.salePrice,
        });
      }


      const batchId = row.batch || `BATCH-${Date.now()}`;

      await db.stockBatches.add({
        supplierId: supplier.id,
        stockProductId: productId,
        batch: batchId,
        expiry: row.expiry,
        quantity: Number(row.quantity),
        purchasePrice: row.purchasePrice,
        salePrice: row.salePrice,
      });

      await db.supplierStockEntries.add({
        purchaseId, // ⭐ NEW
        supplierId: supplier.id,
        supplierName: supplier.name,
        stockProductId: productId,
        medicineName: row.nameEn || row.nameAr,
        quantity: Number(row.quantity),
        purchasePrice: row.purchasePrice,
        expiryDate: row.expiry,
        batchNumber: batchId,
        timestamp: new Date().toISOString(),
      });
    }

    // 🔥 Correct balance update
    await db.suppliers.update(supplier.id, {
      pastBalance: (supplier.pastBalance || 0) + totalCost,
    });

    // 🔥 Reload supplier so PaymentModal gets correct data
    const updatedSupplier = await db.suppliers.get(supplier.id);
    setSupplier(updatedSupplier);

    setShowSummary(false);
    setTimeout(() => {
  setShowPayment(true);
}, 0);

  }

  // -------------------------------
  // RENDER
  // -------------------------------
  if (!open) return null;

  return (
    <>
      {/* MAIN WIZARD WINDOW */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
        <div className="bg-surface-container-lowest w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-xl flex flex-col overflow-y-auto">
          
          {/* HEADER */}
          <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary-dim">
              {t("suppliers.addStockFor")} {supplier.name}{" "}
              <span className="text-sm text-on-surface-variant">
                ({t("suppliers.product")} {currentIndex + 1} / {items.length})
              </span>
            </h2>

            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-error"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* PRODUCT ENTRY SCREEN */}
          <div className="p-6">
            <ProductEntryScreen
              item={currentItem}
              onChange={updateCurrentItem}
              searchValue={searchValue}
              onSearchChange={handleUniversalSearch}
              searchResults={searchResults}
              onSelectSearchResult={(u) => {
                updateCurrentItem({
                  nameEn: u.nameEn || "",
                  nameAr: u.nameAr || "",
                  barcode: u.barcode || "",
                  form: u.form || "",
                  purchasePrice: u.purchasePrice ?? 0,
                  salePrice: u.salePrice ?? 0,
                });
                setSearchValue("");
                setSearchResults([]);
              }}
              onScan={handleScan}
              showStorage={showStorage}
              onToggleStorage={() => setShowStorage((v) => !v)}
              displayPrice={displayPrice}
              handlePriceInput={handlePriceInput}
            />
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-outline-variant/20 flex justify-between gap-3">
            <button
              onClick={handleBack}
              className="px-6 py-2.5 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high"
            >
              {currentIndex === 0 ? t("common.cancel") : t("common.back")}
            </button>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (items.length === 1) {
                    alert("Cannot delete the only product");
                    return;
                  }
                  setItems((prev) => {
                    const updated = prev.filter((_, i) => i !== currentIndex);
                    return updated;
                  });
                  setCurrentIndex((i) => Math.max(0, i - 1));
                }}
                className="px-6 py-2.5 bg-error text-white rounded-lg font-bold hover:opacity-90"
              >
                {t("common.delete")}
              </button>

              <button
                onClick={handleNextProduct}
                className="px-6 py-2.5 bg-surface-container-high text-on-surface rounded-lg font-bold hover:opacity-90"
              >
                {t("suppliers.nextProduct")}
              </button>

              <button
                onClick={handleContinueToSummary}
                className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:opacity-90"
              >
                {t("suppliers.continueToSummary")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY MODAL */}
      {showSummary && (
        <SupplierStockSummaryModal
          items={items}
          totalCost={summaryTotalCost}
          onBack={() => setShowSummary(false)}
          onConfirm={saveAllAndOpenPayment}
          onEdit={(index) => {
            setShowSummary(false);
            setCurrentIndex(index);
          }}
        />
      )}

      {/* PAYMENT MODAL */}
      {showPayment && (
        <SupplierStockPaymentModal
          supplier={supplier}
          totalCost={summaryTotalCost}
          onDone={() => {
            setShowPayment(false);
            onClose();
          }}
          onClose={() => {
            setShowPayment(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
