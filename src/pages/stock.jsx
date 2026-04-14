import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { db } from "../db";
import jsPDF from "jspdf";
import SupplierReturnModal from "../components/suppliers/SupplierReturnModal";
import pdfMake from "../pdfFonts";
import { processSupplierReturn_v2 } from "../services/returns/supplierReturn_v2";
import { adaptSupplierReturnPayloadFromModal } from "../services/returns/adapters";

// Components
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";

import StatsCards from "../components/stock/StatsCards";
import SearchBar from "../components/stock/SearchBar";
import StockTable from "../components/stock/StockTable";
import Pagination from "../components/stock/Pagination";
import AddStockModal from "../components/stock/AddStockModal";
import CategoryModal from "../components/stock/CategoryModal";

export default function Stock() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Stock state
  const [stockItems, setStockItems] = useState([]);
  const [displayedItems, setDisplayedItems] = useState([]);
  const [expandedProductId, setExpandedProductId] = useState(null);

  // Search
  const [query, setQuery] = useState("");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);

  // NEW: Proper initialization of newItem
  const [newItem, setNewItem] = useState({
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
  });

  const [newCategoryName, setNewCategoryName] = useState("");
  const [showStorageSection, setShowStorageSection] = useState(false);
const [categories, setCategories] = useState([]);

  // Branding
  const [pharmacyName, setPharmacyName] = useState("");
  const [logo, setLogo] = useState(null);

  // Currency
  const [useNewCurrency, setUseNewCurrency] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("SYP");

  // Universal search
  const [searchUniversal, setSearchUniversal] = useState("");
  const [universalResults, setUniversalResults] = useState([]);

  // NEW: Expiry warning period
  const [expiryWarningMonths, setExpiryWarningMonths] = useState(2);

  // NEW: Filters
  const [activeFilter, setActiveFilter] = useState("all");

  // NEW: Sorting
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  // NEW: Dropdown state (moved to SearchBar)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
// Supplier Return
const [showSupplierReturnModal, setShowSupplierReturnModal] = useState(false);
const [selectedReturnItems, setSelectedReturnItems] = useState([]);
const [initialSupplierId, setInitialSupplierId] = useState(null);
const [selectedSupplierId, setSelectedSupplierId] = useState(null);

  // Derived values
  const totalMedicines = stockItems.length;
  const totalValue = stockItems.reduce(
    (sum, item) => sum + (item.product?.purchasePrice || 0) * item.totalQty,
    0
  );

  // ⭐ WORKING ARABIC RESHAPER (no bidi, no dependencies)
  function reshapeArabic(text) {
    if (!text) return "";
    return text
      .replace(/[\u064B-\u0652]/g, "") // remove diacritics
      .split(" ")
      .reverse()
      .join(" ");
  }

  function safe(v) {
    if (v === undefined || v === null) return "-";
    return String(v);
  }
  async function reloadStock() {
      const products = await db.stockProducts.toArray();
      const batches = await db.stockBatches.toArray();

      const merged = products.map((p) => {
        const related = batches.filter((b) => b.stockProductId === p.id);
        const totalQty = related.reduce(
          (sum, b) => sum + (b.quantity || 0),
          0
        );

        const nearestExpiry = related
          .map((b) => b.expiry)
          .filter(Boolean)
          .sort((a, b) => new Date(a) - new Date(b))[0];

        return {
          id: p.id,
          product: p,
          totalQty,
          expiry: nearestExpiry,
          cabinet: p.cabinet,
          shelf: p.shelf,
          shelfRow: p.shelfRow,
          batches: related, // ⭐ all batches for expansion
        };
      });

      setStockItems(merged);
      setDisplayedItems(merged);
    }

  // Load settings + stock
  useEffect(() => {
    async function loadSettings() {
      const nameSetting = await db.appSettings.get("pharmacy_name");
      const logoSetting = await db.appSettings.get("pharmacy_logo");
      const newCurrencySetting = await db.appSettings.get("use_new_currency");
      const symbolSetting = await db.appSettings.get("currency_symbol");
      const expirySetting = await db.appSettings.get("expiry_warning_months");

      setPharmacyName(nameSetting?.value || "");
      setLogo(logoSetting?.value || null);
      setUseNewCurrency(newCurrencySetting?.value === true);
      setCurrencySymbol(symbolSetting?.value || "SYP");
      setExpiryWarningMonths(expirySetting?.value || 2);
    }

    
async function loadCategories() {
  const cats = await db.categories.toArray();
  setCategories(cats);
}

loadCategories();

    loadSettings();
    reloadStock();
  }, []);

  // Live search
  const handleSearchLive = (value) => {
  const q = value.trim().toLowerCase();

  const filtered = stockItems.filter((item) => {
    const p = item.product;

    return (
      (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
      (p.nameAr && p.nameAr.includes(q)) || // Arabic search (no lowercase)
      (p.barcode && p.barcode.includes(q)) ||
      (p.form && p.form.toLowerCase().includes(q))
    );
  });

  setDisplayedItems(filtered);
};


  const toggleExpand = (id) => {
    setExpandedProductId(expandedProductId === id ? null : id);
  };

  // UNIVERSAL SEARCH RESTORED
 const handleUniversalSearch = async (query) => {
  setSearchUniversal(query);

  if (!query) {
    setUniversalResults([]);
    return;
  }

  const q = query.trim();

  // English startsWith
  const resultsEn = await db.universalPharmacy
    .where("nameEn")
    .startsWithIgnoreCase(q)
    .limit(20)
    .toArray();

  // Arabic CONTAINS (not startsWith)
  const resultsAr = await db.universalPharmacy
    .filter(item => item.nameAr && item.nameAr.includes(q))
    .limit(20)
    .toArray();

  // Primary barcode startsWith
  const resultsBarcode = await db.universalPharmacy
    .where("barcode")
    .startsWith(q)
    .limit(20)
    .toArray();

  // Search inside allBarcodes array
  const resultsAllBarcodes = await db.universalPharmacy
    .filter(item => {
      try {
        const arr = JSON.parse(item.allBarcodes || "[]");
        return arr.some(b => b.startsWith(q));
      } catch {
        return false;
      }
    })
    .limit(20)
    .toArray();

  // Merge unique results
  const merged = [
    ...resultsEn,
    ...resultsAr,
    ...resultsBarcode,
    ...resultsAllBarcodes
  ].filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);

  setUniversalResults(merged);
};

// Receive selected batches from StockTable
const handleSelectReturnItems = (items) => {
  setSelectedReturnItems(items);
};

const autofillFromUniversal = async (item) => {
  const existing = await findExistingProduct();

  setNewItem((prev) => ({
    ...prev,
    nameEn: item.nameEn || "",
    nameAr: item.nameAr || "",
    barcode: item.barcode || "",
    form: item.form || "",

    // ⭐ PRICE PROTECTION
    purchasePrice: existing?.isAccessory
      ? existing.purchasePrice
      : item.purchasePrice || 0,

    salePrice: existing?.isAccessory
      ? existing.salePrice
      : item.salePrice || 0,
  }));

  setUniversalResults([]);
  setSearchUniversal("");
};

async function addNewCategory() {
  if (!newCategoryName.trim()) return;

  // 1. Insert into Dexie
  const id = await db.categories.add({ name: newCategoryName });

  // 2. Update UI list
  setCategories(prev => [...prev, { id, name: newCategoryName }]);

  // 3. Auto-select the new category
  setNewItem(prev => ({ ...prev, categoryId: id }));

  // 4. Reset + close modal
  setNewCategoryName("");
  setShowAddCategoryModal(false);
}

  // ⭐ FINAL WORKING PDF EXPORT
  function exportFilteredPDF() {
    const isArabic = i18n.language === "ar";

    const headers = isArabic
  ? [
      reshapeArabic("سعر  الشراء"),
      reshapeArabic("سعر  البيع"),
      reshapeArabic("الصلاحية"),
      reshapeArabic("الكمية"),
      reshapeArabic("الاسم")
    ]
  : ["Purchase Price", "Sale Price", "Expiry", "Qty", "Name"];

    const body = [
      headers,
      ...displayedItems.map((item) => [
        safe(
          useNewCurrency
            ? item.product.purchasePrice / 100
            : item.product.purchasePrice
        ),
        safe(
          useNewCurrency
            ? item.product.salePrice / 100
            : item.product.salePrice
        ),
        safe(
          item.expiry ? new Date(item.expiry).toLocaleDateString() : "-"
        ),
        safe(item.totalQty),
        safe(
          isArabic
            ? reshapeArabic(item.product.nameAr)
            : item.product.nameEn
        ),
      ]),
    ];

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [40, 60, 40, 60],
      pageDirection: isArabic ? "rtl" : "ltr",
      defaultStyle: {
        font: "Noto",
        fontSize: 12,
        alignment: isArabic ? "right" : "left",
      },
      content: [
        {
          text: isArabic ? reshapeArabic("تقرير  المخزون") : "Stock Report",

          style: "header",
          alignment: "center",
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: ["auto", "auto", "auto", "auto", "*"],
            body,
          },
          layout: {
            fillColor: (rowIndex) => (rowIndex === 0 ? "#eeeeee" : null),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
        },
      },
    };

    pdfMake
      .createPdf(docDefinition)
      .download(isArabic ? "تقرير_المخزون.pdf" : "stock_report.pdf");
  }

  // FILTER LOGIC (kept here)
  function applyFilter(type) {
    setActiveFilter(type);

    if (type === "all") {
      setDisplayedItems(stockItems);
      return;
    }

    if (type === "expired") {
      setDisplayedItems(
        stockItems.filter(
          (i) => i.expiry && new Date(i.expiry) < new Date()
        )
      );
      return;
    }

    if (type === "almostExpired") {
      const warningDate = new Date();
      warningDate.setMonth(warningDate.getMonth() + expiryWarningMonths);

      setDisplayedItems(
        stockItems.filter(
          (i) =>
            i.expiry &&
            new Date(i.expiry) >= new Date() &&
            new Date(i.expiry) <= warningDate
        )
      );
      return;
    }

    if (type === "outOfStock") {
      setDisplayedItems(stockItems.filter((i) => i.totalQty === 0));
      return;
    }

    if (type === "lowStock") {
      setDisplayedItems(
        stockItems.filter(
          (i) =>
            i.totalQty > 0 &&
            i.product.minQty != null &&
            i.totalQty <= i.product.minQty
        )
      );
      return;
    }

    if (type === "inStock") {
      setDisplayedItems(
        stockItems.filter(
          (i) => i.totalQty > (i.product.minQty || 0)
        )
      );
      return;
    }
  }

  // SORTING LOGIC
  function sortBy(field) {
    let dir = sortDir === "asc" ? "desc" : "asc";
    setSortDir(dir);
    setSortField(field);

    const sorted = [...displayedItems].sort((a, b) => {
      let A = a[field];
      let B = b[field];

      if (field === "name") {
        A = a.product.nameEn.toLowerCase();
        B = b.product.nameEn.toLowerCase();
      }

      if (A < B) return dir === "asc" ? -1 : 1;
      if (A > B) return dir === "asc" ? 1 : -1;
      return 0;
    });

    setDisplayedItems(sorted);
  }

  async function findExistingProduct() {
  // Match by barcode first
  if (newItem.barcode) {
    const byBarcode = await db.stockProducts
      .where("barcode")
      .equals(newItem.barcode)
      .first();
    if (byBarcode) return byBarcode;
  }

  // Match by English name
  if (newItem.nameEn) {
    const byNameEn = await db.stockProducts
      .where("nameEn")
      .equalsIgnoreCase(newItem.nameEn)
      .first();
    if (byNameEn) return byNameEn;
  }

  // Match by Arabic name
  if (newItem.nameAr) {
    const byNameAr = await db.stockProducts
      .where("nameAr")
      .equals(newItem.nameAr)
      .first();
    if (byNameAr) return byNameAr;
  }

  return null;
}

 const handleAddStock = async () => {
  if (!newItem.nameEn && !newItem.nameAr) {
    alert("Name is required");
    return;
  }

  if (!newItem.quantity || newItem.quantity <= 0) {
    alert("Quantity must be greater than 0");
    return;
  }

  if (!newItem.expiry) {
    alert("Expiry date is required");
    return;
  }

  // AUTO-GENERATE BATCH ID IF EMPTY
  let batchId = newItem.batch;
  if (!batchId || batchId.trim() === "") {
    batchId = `BATCH-${Date.now()}`;
  }

  const existing = await findExistingProduct();
  let productId;

  if (existing) {
    productId = existing.id;

    // ⭐ PRICE PROTECTION FOR ACCESSORIES
    const finalPurchasePrice = existing.isAccessory
      ? existing.purchasePrice
      : newItem.purchasePrice;

    const finalSalePrice = existing.isAccessory
      ? existing.salePrice
      : newItem.salePrice;

    await db.stockProducts.update(productId, {
      nameEn: newItem.nameEn || existing.nameEn,
      nameAr: newItem.nameAr || existing.nameAr,
      barcode: newItem.barcode || existing.barcode,
      form: newItem.form,
      categoryId: newItem.categoryId,
      isAccessory: newItem.isAccessory,
      minQty: newItem.minQty,
      cabinet: newItem.cabinet,
      shelf: newItem.shelf,
      shelfRow: newItem.shelfRow,

      // ⭐ PROTECTED PRICES
      purchasePrice: finalPurchasePrice,
      salePrice: finalSalePrice,
    });

  } else {
    // NEW PRODUCT → always use typed prices
    productId = await db.stockProducts.add({
      nameEn: newItem.nameEn,
      nameAr: newItem.nameAr,
      barcode: newItem.barcode,
      form: newItem.form,
      categoryId: newItem.categoryId,
      isAccessory: newItem.isAccessory,
      minQty: newItem.minQty,
      cabinet: newItem.cabinet,
      shelf: newItem.shelf,
      shelfRow: newItem.shelfRow,
      purchasePrice: newItem.purchasePrice,
      salePrice: newItem.salePrice,
    });
  }

  // ⭐ BATCH PRICE PROTECTION
  await db.stockBatches.add({
    supplierId: selectedSupplierId ?? null,
    stockProductId: productId,
    batch: batchId,
    expiry: newItem.expiry,
    quantity: Number(newItem.quantity),

    purchasePrice: existing?.isAccessory
      ? existing.purchasePrice
      : newItem.purchasePrice,

    salePrice: existing?.isAccessory
      ? existing.salePrice
      : newItem.salePrice,
  });

  // reload + reset (unchanged)
  const products = await db.stockProducts.toArray();
  const batches = await db.stockBatches.toArray();

  const merged = products.map((p) => {
    const related = batches.filter((b) => b.stockProductId === p.id);
    const totalQty = related.reduce((sum, b) => sum + (b.quantity || 0), 0);

    const nearestExpiry = related
      .map((b) => b.expiry)
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b))[0];

    return {
      id: p.id,
      product: p,
      totalQty,
      expiry: nearestExpiry,
      cabinet: p.cabinet,
      shelf: p.shelf,
      shelfRow: p.shelfRow,
      batches: related,
    };
  });

  setStockItems(merged);
  setDisplayedItems(merged);

  setShowAddModal(false);
  setSearchUniversal("");
  setUniversalResults([]);
  setShowStorageSection(false);

  setNewItem({
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
  });
};
function handleReturnSingleBatch(product, batch) {
  const item = {
    productId: product.id,
    nameEn: product.nameEn,
    nameAr: product.nameAr,
    batchId: batch.id,
    batch: batch.batch,
    quantity: batch.quantity,
    purchasePrice: batch.purchasePrice,
    expiry: batch.expiry,
    supplierId: batch.supplierId,   // ⭐ ADD THIS
  };

 setSelectedReturnItems([item]);
setInitialSupplierId(batch.supplierId);  // ⭐ auto‑select supplier
setShowSupplierReturnModal(true);

}


const addButton = (
  <button
    onClick={() => {
      setNewItem({
        nameEn: "",
        nameAr: "",
        barcode: "",
        form: "",
        categoryId: "",
        isAccessory: false,
        minQty: 0,
        cabinet: "",
        shelf: "",
        shelfRow: "",
        batch: "",
        expiry: "",
        quantity: 0,
        purchasePrice: "",
        salePrice: ""
      });

      handleUniversalSearch("");
      setSearchUniversal("");
      setUniversalResults([]);
      setShowStorageSection(false);
      setShowAddModal(true);
    }}
    className="px-6 py-2.5 bg-primary text-white rounded-lg font-bold hover:opacity-90 flex items-center gap-2"
  >
    {t("stock.scanOrAdd")}
  </button>
);

const scanButton = (
  <button
    onClick={async () => {
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

      if (item) {
        autofillFromUniversal(item);
      } else {
        setNewItem({
          nameEn: "",
          nameAr: "",
          barcode,
          form: "",
          categoryId: "",
          isAccessory: false,
          minQty: 0,
          cabinet: "",
          shelf: "",
          shelfRow: "",
          batch: "",
          expiry: "",
          quantity: 0,
          purchasePrice: "",
          salePrice: ""
        });
      }

      setShowStorageSection(false);
      setShowAddModal(true);
    }}
    className="flex items-center justify-center text-primary"
    style={{ padding: 0, background: "none", border: "none" }}
  >
    <span
      className="material-symbols-outlined"
      style={{ fontSize: "38px", lineHeight: 1 }}
    >
      barcode_scanner
    </span>
  </button>
);


const returnButton = (
  <button
    onClick={() => {
      if (selectedReturnItems.length === 0) {
        alert(t("supplier.validation_noItems"));
        return;
      }
      setShowSupplierReturnModal(true);
    }}
    className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:opacity-90 flex items-center gap-2"
  >
    {t("supplier.returnButton")}
  </button>
);

const scanReturnButton = (
  <button
    onClick={async () => {
      const barcode = prompt(t("supplier.returnScanButton"));
      if (!barcode) return;

      const product = await db.stockProducts
        .where("barcode")
        .equals(barcode)
        .first();

      if (!product) {
        alert("Not found in stock");
        return;
      }

      const batches = await db.stockBatches
        .where("stockProductId")
        .equals(product.id)
        .toArray();

      if (batches.length === 0) {
        alert("No batches found");
        return;
      }

      const mapped = batches.map((b) => ({
        productId: product.id,
        nameEn: product.nameEn,
        nameAr: product.nameAr,
        batchId: b.id,
        batch: b.batch,
        quantity: b.quantity,
        purchasePrice: b.purchasePrice,
      }));

      setSelectedReturnItems(mapped);
      setShowSupplierReturnModal(true);
    }}
    className="flex items-center gap-1 text-green-600"
    style={{ padding: 0, background: "none", border: "none" }}
  >
    <span
      className="material-symbols-outlined"
      style={{ fontSize: "35px", lineHeight: 1 }}
    >
      undo
    </span>

    <span
      className="material-symbols-outlined"
      style={{ fontSize: "38px", lineHeight: 1 }}
    >
      barcode_scanner
    </span>
  </button>
);


 return (


  
  <div className="flex">
    
<TopAppBar />
 <div className="flex-1 ml-64 h-screen flex flex-col overflow-hidden">
  { /* <div className="flex-1 ml-64 min-h-screen flex flex-col"> */}
<SideNavBar />
      
      {/* FIXED TOP SECTION */}
    
      
      {/* 3️⃣ SCROLLABLE TABLE SECTION */}
      <main className="px-6 pb-4 flex-1 flex flex-col overflow-hidden">
         <div className="p-4 mt-14 bg-surface-container-low shrink-0">
{/*<div className="p-4 mt-14 bg-surface-container-low shrink-0 min-w-0">*/}


        <div dir="ltr" className="flex flex-col gap-6">

          {/* 1️⃣ STATS CARDS */}
          <StatsCards
            totalMedicines={totalMedicines}
            totalValue={totalValue}
            stockItems={stockItems}
            useNewCurrency={useNewCurrency}
            currencySymbol={currencySymbol}
            i18n={i18n}
            expiryWarningMonths={expiryWarningMonths}
            onFilter={applyFilter}
          />

          {/* 2️⃣ SEARCH BAR */}
          <SearchBar
            query={query}
            setQuery={setQuery}
            handleSearchLive={handleSearchLive}
            activeFilter={activeFilter}
            applyFilter={applyFilter}
            showFilterDropdown={showFilterDropdown}
            setShowFilterDropdown={setShowFilterDropdown}
            exportPDF={exportFilteredPDF}
            addButton={addButton}
            scanButton={scanButton}
            returnButton={returnButton}
            scanReturnButton={scanReturnButton}
          />

        </div>
      </div>

   <div className="flex-1 overflow-y-auto rounded-lg border mt-2">


    <StockTable
      displayedItems={displayedItems}
      expandedProductId={expandedProductId}
      toggleExpand={toggleExpand}
      navigate={navigate}
      i18n={i18n}
      useNewCurrency={useNewCurrency}
      currencySymbol={currencySymbol}
      sortBy={sortBy}
      sortField={sortField}
      sortDir={sortDir}
      onSelectReturnItems={handleSelectReturnItems}
      onReturnSingleBatch={handleReturnSingleBatch}
    />

  </div>
<div className="mt-3 shrink-0">
  <Pagination displayedItems={displayedItems} stockItems={stockItems} />
  </div>
</main>


    </div>

    {/* ADD STOCK MODAL */}
    <AddStockModal
      showAddModal={showAddModal}
      setShowAddModal={setShowAddModal}
      searchUniversal={searchUniversal}
      handleUniversalSearch={handleUniversalSearch}
      universalResults={universalResults}
      autofillFromUniversal={autofillFromUniversal}
      openBarcodeScanner={() => {
        const fake = prompt("Simulate barcode scan:");
        if (fake) handleUniversalSearch(fake);
      }}
      newItem={newItem}
      setNewItem={setNewItem}
      categories={categories}
      showStorageSection={showStorageSection}
      setShowStorageSection={setShowStorageSection}
      displayPrice={(v) => (useNewCurrency ? v / 100 : v)}
      handlePriceInput={(v) =>
        useNewCurrency ? Number(v) * 100 : Number(v)
      }
      handleAddStock={handleAddStock}
      showAddCategoryModal={showAddCategoryModal}
      setShowAddCategoryModal={setShowAddCategoryModal}
    />

    {/* CATEGORY MODAL */}
    <CategoryModal
      showAddCategoryModal={showAddCategoryModal}
      setShowAddCategoryModal={setShowAddCategoryModal}
      newCategoryName={newCategoryName}
      setNewCategoryName={setNewCategoryName}
      addNewCategory={addNewCategory}
    />

    {/* SUPPLIER RETURN MODAL */}
    <SupplierReturnModal
      isOpen={showSupplierReturnModal}
      onClose={() => setShowSupplierReturnModal(false)}
      items={selectedReturnItems}
      initialSupplierId={initialSupplierId}
      onCompleted={async (result) => {
        const payload = adaptSupplierReturnPayloadFromModal(result);
        await processSupplierReturn_v2(payload);
        await reloadStock();
        alert(t("supplier.returnCompleted") || "Return completed");
      }}
    />
  </div>
);

}
