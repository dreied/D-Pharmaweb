import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { useNavigate } from "react-router-dom";
import { db } from "../db";

import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";

import SupplierStats from "../components/suppliers/SupplierStats";
import SupplierGrid from "../components/suppliers/SupplierGrid";
import RecentPayments from "../components/suppliers/RecentPayments";

import PaymentModal from "../components/suppliers/PaymentModal";
import AddSupplierModal from "../components/suppliers/AddSupplierModal";
import EditSupplierModal from "../components/suppliers/EditSupplierModal";
import DeleteSupplierModal from "../components/suppliers/DeleteSupplierModal";

import { formatPrice } from "../currency";

export default function SuppliersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
const pharmacyName =
    useLiveQuery(() => db.appSettings.get("pharmacy_name"), [], null)?.value ||
    "";

  const pharmacyLogo =
    useLiveQuery(() => db.appSettings.get("pharmacy_logo"), [], null)?.value ||
    null;
  const [search, setSearch] = useState("");
  const [paymentSupplier, setPaymentSupplier] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);

  const suppliers = useLiveQuery(() => db.suppliers.toArray(), [], []);
  const payments = useLiveQuery(
    () =>
      db.supplierPayments
        .orderBy("timestamp")
        .reverse()
        .limit(10)
        .toArray(),
    [],
    []
  );


  // Load currency settings
  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";

  const fmt = (value) => formatPrice(value, useNewCurrency, currencySymbol);

  // Search filter
  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suppliers || [];
    return (suppliers || []).filter((s) =>
      (s.name || "").toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  // Stats with currency + color logic
  const stats = useMemo(() => {
  const totalOutstandingRaw = (suppliers || []).reduce(
    (sum, s) => sum + (s.pastBalance || 0),
    0
  );

  const money = fmt(totalOutstandingRaw);

  const color =
    totalOutstandingRaw > 0
      ? "text-green-600"
      : totalOutstandingRaw < 0
      ? "text-red-600"
      : "text-on-surface-variant";

  // Count suppliers with unpaid balance
  const pendingSuppliers = (suppliers || []).filter(
    s => (s.pastBalance || 0) > 0
  ).length;

  return {
    totalOutstandingRaw,
    totalOutstandingFormatted: money.formatted,
    totalOutstandingSymbol: money.symbol,
    totalOutstandingColor: color,
    supplierCount: suppliers?.length || 0,
    pendingSuppliers
  };
}, [suppliers, useNewCurrency, currencySymbol]);


  return (
    <div className="bg-background min-h-screen">
      <SideNavBar logo={pharmacyLogo} pharmacyName={pharmacyName} />

      <TopAppBar
      />

      <main className="ml-64 pt-24 p-8 min-h-screen space-y-6">

        <SupplierStats stats={stats} />
         <div className="relative hidden md:flex items-center">
          <input
            type="text"
            className="bg-surface-container-highest rounded-full px-4 py-2 text-sm w-64 focus:ring-2 focus:ring-primary/20"
            placeholder={t("suppliers.searchPlaceholder")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <span className="material-symbols-outlined absolute right-3 text-slate-400">
            search
          </span>
        </div>

        <SupplierGrid
          suppliers={filteredSuppliers}
          onMakePayment={setPaymentSupplier}
          onAddSupplier={() => setOpenAdd(true)}
          onViewDetails={(s) => navigate(`/suppliers/${s.id}`)}
          onEditSupplier={(s) => setEditSupplier(s)}
          onDeleteSupplier={(s) => setDeleteSupplier(s)}
        />

        <RecentPayments payments={payments || []} />

        {paymentSupplier && (
  <PaymentModal
    open={true}
    supplier={paymentSupplier}
    onClose={() => setPaymentSupplier(null)}
  />
)}


        <AddSupplierModal open={openAdd} onClose={() => setOpenAdd(false)} />

        <EditSupplierModal
          open={!!editSupplier}
          supplier={editSupplier}
          onClose={() => setEditSupplier(null)}
        />

        <DeleteSupplierModal
          open={!!deleteSupplier}
          supplier={deleteSupplier}
          onClose={() => setDeleteSupplier(null)}
        />

      </main>
    </div>
  );
}
