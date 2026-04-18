import { useEffect, useState, useContext } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useTranslation } from "react-i18next";
import { db } from "../../db/index";
import { findSalesByBarcode } from "../../services/saleResolver";
import { useRef } from "react";
import ReceiptTemplate from "./ReceiptTemplate";
import { connectUSB, renderReceiptToImage, printReceipt, getCurrentConnection } from "../../services/thermalPrinter";
import SideNavBar from "../SideNavBar";
import TopAppBar from "../TopAppBar";
import PharmacyLayoutModal from "../layout/PharmacyLayoutModal";

import { SearchBar } from "./SearchBar";
import { CartItem } from "./CartItem";
import { CheckoutSummary } from "./CheckoutSummary";
import { ThemeContext } from "../../App";
import { useAppSettings } from "../../useAppSettings";
import { formatPrice } from "../../currency";

import {
  addCashToPharmacyBox,
  checkAndResetPharmacyBox
} from "../../services/pharmacyBoxService";

import { useNavigate } from "react-router-dom";
import SelectSaleModal from "./SelectSaleModal";
import ReturnSaleModal_v2 from "./ReturnSaleModal_v2";

export default function POSPage() {
  const { t } = useTranslation();
  const { theme } = useContext(ThemeContext);

  const [currencySymbol, setCurrencySymbol] = useState("SYP");
  const [useNewCurrency, setUseNewCurrency] = useState(false);
const [isLayoutOpen, setIsLayoutOpen] = useState(false);
const [highlightData, setHighlightData] = useState(null);

  const [showSelectSaleModal, setShowSelectSaleModal] = useState(false);
  const [saleSelectionList, setSaleSelectionList] = useState([]);
  const [returnSaleId, setReturnSaleId] = useState(null);
const [lastSale, setLastSale] = useState(null);
  useAppSettings(setCurrencySymbol, setUseNewCurrency);
const [showMap, setShowMap] = useState(false);
const [mapHighlight, setMapHighlight] = useState(null);

  const [resetInterval, setResetInterval] = useState("daily");
  const navigate = useNavigate();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaysSales =
    useLiveQuery(
      () =>
        db.sales
          .where("date")
          .between(startOfToday.toISOString(), endOfToday.toISOString())
          .toArray(),
      [],
      []
    ) || [];

  const todaysTotal = todaysSales.reduce((sum, sale) => sum + sale.total, 0);

  const todaysTotalFormatted = formatPrice(
    todaysTotal,
    useNewCurrency,
    currencySymbol
  ).formatted;

  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    function updateTime() {
      const now = new Date();
      const formatted = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      setLastUpdated(formatted);
    }

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function loadReset() {
      const setting = await db.appSettings.get("cashbox_reset_interval");
      setResetInterval(setting?.value || "daily");
    }
    loadReset();
  }, []);

  const pharmacyName =
    useLiveQuery(() => db.appSettings.get("pharmacy_name"), [], null)?.value ||
    "";

  const pharmacyLogo =
    useLiveQuery(() => db.appSettings.get("pharmacy_logo"), [], null)?.value ||
    null;
 const pharmacyPhone = useLiveQuery(() => db.appSettings.get("pharmacy_phone"), [], null)?.value || "";
const pharmacyAddress = useLiveQuery(() => db.appSettings.get("pharmacy_address"), [], null)?.value || "";
const pharmacyAddressAr = useLiveQuery(() => db.appSettings.get("pharmacy_address_ar"), [], null)?.value || "";

    
const receiptRef = useRef(null);
const [pharmacySettings, setPharmacySettings] = useState({});

useEffect(() => {
  async function loadPharmacy() {
    const name = await db.appSettings.get("pharmacy_name");
    const nameAr = await db.appSettings.get("pharmacy_name_ar");
    const addr = await db.appSettings.get("pharmacy_address");
    const addrAr = await db.appSettings.get("pharmacy_address_ar");
    const phone = await db.appSettings.get("pharmacy_phone");
    setPharmacySettings({
      pharmacyName: name?.value || "",
      pharmacyAddress: addr?.value || "",
      pharmacyAddressAr: addrAr?.value || "",
      pharmacyPhone: phone?.value || "",
    });
  }
  loadPharmacy();
}, []);

useEffect(() => {
  if (!lastSale) return;
  
  const autoPrint = async () => {
    await new Promise(r => setTimeout(r, 500)); // wait for render
    const conn = getCurrentConnection();
    if (!conn) return; // skip if no printer connected
    
    try {
      const imageData = await renderReceiptToImage(receiptRef.current);
      await printReceipt(imageData, conn);
    } catch (err) {
      console.error("Auto-print failed:", err);
    }
  };
  
  autoPrint();
}, [lastSale]);
  const customers = useLiveQuery(() => db.customers.toArray(), [], []) || [];

  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  const [searchResults, setSearchResults] = useState([]);

  async function liveSearch(term) {
    if (!term || term.length < 1) {
      setSearchResults([]);
      return;
    }

    const lower = term.toLowerCase();

    const results = await db.stockProducts
      .filter(
        (p) =>
          p.nameEn?.toLowerCase().includes(lower) ||
          p.nameAr?.toLowerCase().includes(lower)
      )
      .limit(20)
      .toArray();

    setSearchResults(results);
  }
function openMapForProduct(p) {
  if (!p) return;

  setMapHighlight({
    cabinetId: p.cabinet || null,
    shelfId: p.shelf || null,
    row: p.shelfRow || null,
  });

  setShowMap(true);
}

  function handleSelectProduct(p) {
    addProductToCart(p);
    setSearchResults([]);
  }

  async function handleBarcodeScan(barcode) {
    if (!barcode) return;

    let product =
      (await db.stockProducts.where("barcode").equals(barcode).first()) ||
      null;

    if (!product) {
      const alt = await db.productBarcodes
        .where("barcode")
        .equals(barcode)
        .first();
      if (alt) product = await db.stockProducts.get(alt.stockProductId);
    }

    if (product) addProductToCart(product);
  }

  function buildLocation(p) {
    const parts = [];
    if (p.cabinet) parts.push(`Cabinet ${p.cabinet}`);
    if (p.cabinetRow) parts.push(`Row ${p.cabinetRow}`);
    if (p.shelf) parts.push(`Shelf ${p.shelf}`);
    if (p.shelfRow) parts.push(`Row ${p.shelfRow}`);
    return parts.join(", ");
  }

  function calculateEnvelopePrice(boxPrice, envelopes) {
    if (!envelopes || envelopes <= 0) return boxPrice;
    if (envelopes === 1) return boxPrice;

    let p = boxPrice / envelopes;
    p = p * 1.2;

    const step = 500;
    const remainder = p % step;

    if (remainder < step / 2) p -= remainder;
    else p += step - remainder;

    return Math.round(p);
  }

  function handleUnitTypeChange(id, unitType) {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (unitType === "box") {
          return {
            ...item,
            unitType,
            envelopesInside: null,
            price: item.originalPrice
          };
        }

        const count = item.envelopesInside;
        const newPrice =
          count && count > 0
            ? calculateEnvelopePrice(item.originalPrice, count)
            : item.originalPrice;

        return {
          ...item,
          unitType,
          price: newPrice
        };
      })
    );
  }

  function handleEnvelopeCountChange(id, count) {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        if (count == null || count <= 0) {
          return {
            ...item,
            envelopesInside: count,
            price: item.originalPrice
          };
        }

        const newPrice = calculateEnvelopePrice(item.originalPrice, count);

        return {
          ...item,
          envelopesInside: count,
          price: newPrice
        };
      })
    );
  }

  async function addProductToCart(p) {
    const available = await getTotalStock(p.id);

    setCartItems((items) => {
      const existing = items.find((item) => item.productId === p.id);

      if (existing) {
        const newQty = existing.quantity + 1;

        if (newQty > available) {
          alert(`Only ${available} pieces available in stock`);
          return items;
        }

        return items.map((item) =>
          item.productId === p.id
            ? { ...item, quantity: newQty }
            : item
        );
      }

      if (available < 1) {
        alert("This item is out of stock");
        return items;
      }

       return [
    ...items,
    {
      id: p.id,
      productId: p.id,
      icon: "pill",
      iconColorClass: "text-primary",
      iconBgClass: "bg-sky-50 border-sky-100",
      nameEn: p.nameEn || "",
      nameAr: p.nameAr || "",
      description: p.form || "",
      quantity: 1,

      price: p.salePrice || 0,
      salePrice: p.salePrice || 0,
      purchasePrice: p.purchasePrice || 0,

      originalPrice: p.salePrice || 0,

      unitType: "box",
      envelopesInside: null,

      location: buildLocation(p),
      availableStock: available,
      minQty: p.minQty || 0,

      // ✅ Store structured location for map highlight
      cabinet: p.cabinet || null,
      shelf: p.shelf || null,
      shelfRow: p.shelfRow || null,
    }
  ];
    });
  }

  const increase = async (id) => {
    const item = cartItems.find((it) => it.id === id);
    if (!item) return;

    const available = await getTotalStock(item.productId);
    const newQty = item.quantity + 1;

    if (newQty > available) {
      alert(`Only ${available} pieces available in stock`);
      return;
    }

    setCartItems((items) =>
      items.map((it) =>
        it.id === id
          ? { ...it, quantity: newQty, availableStock: available }
          : it
      )
    );
  };

  const decrease = (id) =>
    setCartItems((items) =>
      items.map((it) =>
        it.id === id && it.quantity > 1
          ? { ...it, quantity: it.quantity - 1 }
          : it
      )
    );

  const setQuantity = async (id, newQty) => {
    const item = cartItems.find((it) => it.id === id);
    if (!item) return;

    const available = await getTotalStock(item.productId);

    if (newQty > available) {
      alert(`Only ${available} pieces available in stock`);
      return;
    }

    if (newQty < 1) return;

    setCartItems((items) =>
      items.map((it) =>
        it.id === id
          ? { ...it, quantity: newQty, availableStock: available }
          : it
      )
    );
  };

  const removeItem = (id) =>
    setCartItems((items) => items.filter((it) => it.id !== id));

  const subtotalRaw = cartItems.reduce(
    (sum, it) => sum + it.price * it.quantity,
    0
  );

  const [taxPercent, setTaxPercent] = useState(0);
  const taxAmountRaw = subtotalRaw * (taxPercent / 100);
  const totalRaw = subtotalRaw + taxAmountRaw;

  const subtotal = formatPrice(subtotalRaw, useNewCurrency, currencySymbol);
  const taxAmount = formatPrice(taxAmountRaw, useNewCurrency, currencySymbol);
  const total = formatPrice(totalRaw, useNewCurrency, currencySymbol);

  async function getTotalStock(productId) {
    const batches = await db.stockBatches
      .where("stockProductId")
      .equals(productId)
      .toArray();
    return batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
  }

  async function subtractStockFEFOAndCreateSaleItems(cartItems, saleId) {
    for (const item of cartItems) {
      let qtyToRemove = item.quantity;

      let batches = await db.stockBatches
        .where("stockProductId")
        .equals(item.productId)
        .toArray();

      batches.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));

      for (const batch of batches) {
        if (qtyToRemove <= 0) break;

        const available = batch.quantity || 0;
        if (available <= 0) continue;

        const taken = Math.min(available, qtyToRemove);

        await db.stockBatches.update(batch.id, {
          quantity: available - taken
        });

        await db.saleItems.add({
          saleId,
          productId: item.productId,
          batchId: batch.id,
          batchNumber: batch.batch,
          quantity: taken,
          price: item.price,
total: item.price * taken

        });

        qtyToRemove -= taken;
      }
    }
  }

  async function handleAddToDebt(partialPaid = 0) {
    if (cartItems.length === 0) return;
    if (!selectedCustomerId) return;

    const now = new Date().toISOString();

    const customer = await db.customers.get(selectedCustomerId);
    const previousBalance = customer?.balance || 0;

    const paidNow = Math.min(Number(partialPaid) || 0, totalRaw);
    const debtPart = totalRaw - paidNow;
    const newBalance = previousBalance + debtPart;

    const saleId = await db.sales.add({
      customerId: selectedCustomerId,
      paymentMethod: "debt",
      total: totalRaw,
      date: now,
      previousBalance,
      paidNow,
      newBalance,
      isDebt: true
    });

    await subtractStockFEFOAndCreateSaleItems(cartItems, saleId);

    await db.customers.update(selectedCustomerId, {
      balance: newBalance,
      lastUpdated: now
    });

    setCartItems([]);
    const customerObj = await db.customers.get(selectedCustomerId);
setLastSale({
  receiptNumber: `INV-${saleId}`,
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  items: cartItems.map(it => ({
    nameEn: it.nameEn,
    nameAr: it.nameAr,
    quantity: it.quantity,
    price: it.price,
  })),
  subtotal: subtotalRaw,
  tax: taxAmountRaw,
  discount: 0,
  total: totalRaw,
  paymentMethod: "debt",
  customerName: customerObj?.name || "",
  previousBalance,
  paidNow,
  newBalance,
  currencySymbol,
  useNewCurrency,
});
    setSelectedCustomerId(null);
  }

function openLayoutEditorWithHighlight(item) {
  setHighlightData({
    cabinet: item.cabinet,
    shelf: item.shelf,
    row: item.shelfRow,
    medicineName: item.nameAr || item.nameEn
  });

  setIsLayoutOpen(true);
}



  async function handleCashPay(totalRawValue) {
    if (!totalRawValue || isNaN(totalRawValue)) return;
    if (cartItems.length === 0) return;

    const now = new Date().toISOString();

    await checkAndResetPharmacyBox(resetInterval);

    const saleId = await db.sales.add({
      customerId: selectedCustomerId || null,
      paymentMethod: "cash",
      total: totalRawValue,
      date: now
    });

    await subtractStockFEFOAndCreateSaleItems(cartItems, saleId);

    await addCashToPharmacyBox(totalRawValue);

    setCartItems([]);
    setLastSale({
  receiptNumber: `INV-${saleId}`,
  date: new Date().toLocaleDateString(),
  time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  items: cartItems.map(it => ({
    nameEn: it.nameEn,
    nameAr: it.nameAr,
    quantity: it.quantity,
    price: it.price,
  })),
  subtotal: subtotalRaw,
  tax: taxAmountRaw,
  discount: 0,
  total: totalRawValue,
  paymentMethod: "cash",
  currencySymbol,
  useNewCurrency,
});
    setSelectedCustomerId(null);
  }

return (
  <div className="bg-background text-on-background antialiased overflow-visible">
    <TopAppBar />
    <SideNavBar logo={pharmacyLogo} pharmacyName={pharmacyName} />

    {/* 2‑COLUMN LAYOUT UNDER TOPAPPBAR */}
    <main className="ml-64 pt-16 h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex h-full" dir="ltr">


        {/* LEFT COLUMN — header + cart */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* HEADER (Sales Today + Search) */}
          <div className="px-6 py-2 bg-surface-container-low/40 backdrop-blur-sm border-b border-slate-200/50">

            {/* Sales Today */}
            <div className="mb-2">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-l-4 border-secondary inline-block">
                <div className="flex justify-between items-start mb-4">
                  <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                    {t("stock.stats.salesToday")}
                  </span>
                  <div className="bg-secondary-container/20 p-2 rounded-lg text-secondary">
                    <span className="material-symbols-outlined">payments</span>
                  </div>
                </div>

                <div className="text-4xl font-black text-on-secondary-container">
                  {todaysTotalFormatted}
                </div>

                <div className="text-xs text-on-surface-variant mt-1 font-medium">
                  {t("stock.stats.updated", { time: lastUpdated })}
                </div>
              </div>
            </div>

            {/* Search Row */}
            <div className="flex items-center gap-4">
              <button
  onClick={async () => {
    const barcode = window.prompt(t("pos.enterBarcodeForReturn"));
    if (!barcode) return;

    let matches = await findSalesByBarcode(barcode);
    matches = matches.filter(
      (m) =>
        m &&
        m.sale &&
        m.items &&
        Array.isArray(m.items) &&
        m.product
    );

    if (matches.length === 0) {
      alert(t("pos.noSaleFoundForReturn"));
      return;
    }

    if (matches.length === 1) {
      setReturnSaleId(matches[0].sale.id);
      return;
    }

    setSaleSelectionList(matches);
    setShowSelectSaleModal(true);
  }}
  className="flex items-center gap-1 text-green-600"
  style={{ padding: 0, background: "none", border: "none" }}
>
  <span
    className="material-symbols-outlined"
    style={{ fontSize: "36px", lineHeight: 1 }}
  >
    undo
  </span>

  <span
    className="material-symbols-outlined"
    style={{ fontSize: "36px", lineHeight: 1 }}
  >
    barcode_scanner
  </span>
</button>


              <div className="flex-1">
                <SearchBar
                  onSearch={liveSearch}
                  onBarcodeScan={handleBarcodeScan}
                  onSelect={handleSelectProduct}
                  searchResults={searchResults}
                />
              </div>
            </div>
          </div>

          {/* CART AREA */}
          <div className="flex-1 overflow-y-auto px-8 pt-4">

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-headline font-extrabold text-sky-900 tracking-tight">
                {t("pos.currentSale")}
              </h2>
              <span className="text-sm font-medium text-outline">
                {t("pos.itemsInBasket", { count: cartItems.length })}
              </span>
            </div>

            <div className="space-y-4">
              {cartItems.map((item) => (
                <CartItem
                  key={item.id}
                  {...item}
                  availableStock={item.availableStock}
                  minQty={item.minQty}
                  displayPrice={formatPrice(
                    item.price,
                    useNewCurrency,
                    currencySymbol
                  )}
                  onIncrease={() => increase(item.id)}
                  onDecrease={() => decrease(item.id)}
                  onDelete={() => removeItem(item.id)}
                  onSetQuantity={(newQty) => setQuantity(item.id, newQty)}
                  originalPrice={item.originalPrice}
                  unitType={item.unitType}
                  envelopesInside={item.envelopesInside}
                  onUnitTypeChange={(unit) => handleUnitTypeChange(item.id, unit)}
                  onEnvelopeCountChange={(count) =>
                    handleEnvelopeCountChange(item.id, count)
                  }
                  onShowInMap={() => openLayoutEditorWithHighlight(item)}


                />
              ))}
            </div>

            <div className="flex justify-between items-center mb-4 mt-6">
              <button
                onClick={() => setCartItems([])}
                className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition"
              >
                {t("pos.clearCart")}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN — checkout sticky */}
        <div className="w-96 h-full sticky top-16 overflow-y-auto">
          <CheckoutSummary
  taxPercent={taxPercent}
  subtotalFormatted={subtotal.formatted}
  subtotalSymbol={subtotal.symbol}
  taxFormatted={taxAmount.formatted}
  taxSymbol={taxAmount.symbol}
  totalFormatted={total.formatted}
  totalSymbol={total.symbol}
  totalRaw={totalRaw}
  customers={customers}
  selectedCustomerId={selectedCustomerId}
  onCustomerChange={setSelectedCustomerId}
  onTaxChange={setTaxPercent}
  theme={theme}
  onCashPay={handleCashPay}
  onAddToDebt={handleAddToDebt}

  lastSale={lastSale}   // ⭐ ADD THIS
  pharmacySettings={{   // ⭐ ADD THIS
    pharmacyName,
    pharmacyAddress,
    pharmacyAddressAr,
    pharmacyPhone,
    pharmacyLogo,
  }}
/>

        </div>
      </div>
<div style={{ position: "fixed", left: "-9999px" }}>
  {lastSale && (
    <ReceiptTemplate
      ref={receiptRef}
      saleData={lastSale}
      pharmacySettings={{
        pharmacyName: pharmacyName,
        pharmacyAddress: pharmacyAddress,
        pharmacyAddressAr: pharmacyAddressAr,
        pharmacyPhone: pharmacyPhone,
      }}
    />
  )}
</div>

      {showSelectSaleModal && (
        <SelectSaleModal
          list={saleSelectionList}
          onSelect={(id) => {
            setShowSelectSaleModal(false);
            setReturnSaleId(id);
          }}
          onClose={() => setShowSelectSaleModal(false)}
        />
      )}

      {returnSaleId && (
        <ReturnSaleModal_v2
          saleId={returnSaleId}
          onClose={() => setReturnSaleId(null)}
        />
      )}

      {isLayoutOpen && (
  <PharmacyLayoutModal
    open={isLayoutOpen}
    onClose={() => setIsLayoutOpen(false)}
    highlight={highlightData}
  />
)}


    </main>
  </div>
);


}
