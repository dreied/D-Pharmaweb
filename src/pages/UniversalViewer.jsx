import { useEffect, useState } from "react";
import { db } from "../db/index";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";

export default function UniversalViewer() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="p-6 text-red-600 font-bold text-xl">
        {t("viewer.accessDenied")}
      </div>
    );
  }

  const navigate = useNavigate();

  // -----------------------------
  // STATE
  // -----------------------------
  const [products, setProducts] = useState([]);
  const [displayed, setDisplayed] = useState([]);

  const [search, setSearch] = useState("");
  const [nameSearch, setNameSearch] = useState("");

  const [companyFilter, setCompanyFilter] = useState("");
  const [formFilter, setFormFilter] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [barcodeFilter, setBarcodeFilter] = useState("");

  const [sortField, setSortField] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [editingItem, setEditingItem] = useState(null);

  const emptyProduct = {
    nameAr: "",
    nameEn: "",
    company: "",
    form: "",
    purchasePrice: "",
    salePrice: "",
    allBarcodes: JSON.stringify([]),
    barcode: "",
    indications: "",
    antidotes: "",
    dosage: "",
    fact: "",
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState(emptyProduct);

  const [visibleColumns, setVisibleColumns] = useState({
    id: true,
    nameAr: true,
    nameEn: true,
    company: true,
    form: true,
    purchasePrice: true,
    salePrice: true,
    barcodes: true,
    indications: true,
    antidotes: true,
    dosage: true,
    fact: true,
  });

  const columnLabels = {
    id: t("viewer.columns.id"),
    nameAr: t("viewer.columns.nameAr"),
    nameEn: t("viewer.columns.nameEn"),
    company: t("viewer.columns.company"),
    form: t("viewer.columns.form"),
    purchasePrice: t("viewer.columns.purchasePrice"),
    salePrice: t("viewer.columns.salePrice"),
    barcodes: t("viewer.columns.barcodes"),
    indications: t("viewer.columns.indications"),
    antidotes: t("viewer.columns.antidotes"),
    dosage: t("viewer.columns.dosage"),
    fact: t("viewer.columns.fact"),
  };

  // ---------------------------------------------------
  // ONE-TIME CLEANUP: Remove leading "1" from companies
  // ---------------------------------------------------
  useEffect(() => {
  async function cleanOnce() {
    const flag = localStorage.getItem("uv_company_cleanup_done");
    if (flag) return;

    const all = await db.universalPharmacy.toArray();
    const updated = all.filter(p => p.company?.startsWith("1"))
                       .map(p => ({ ...p, company: p.company.substring(1) }));

    if (updated.length > 0) {
      await db.universalPharmacy.bulkPut(updated);
      console.log(`Cleaned ${updated.length} company names`);
    }

    localStorage.setItem("uv_company_cleanup_done", "1");
  }
  cleanOnce();
}, []);


  // -----------------------------
  // LOAD DATA
  // -----------------------------
  useEffect(() => {
    async function load() {
      const data = await db.universalPharmacy.toArray();
      setProducts(data);
      setDisplayed(data);
    }
    load();
  }, []);

  // -----------------------------
  // SORTING
  // -----------------------------
  function sortData(data) {
    return [...data].sort((a, b) => {
      const A = a[sortField] ?? "";
      const B = b[sortField] ?? "";

      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  function toggleSort(field) {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  // -----------------------------
  // FILTER + SEARCH
  // -----------------------------
  useEffect(() => {
    let data = [...products];

    // Global search
    if (search.trim() !== "") {
      const q = search.trim();
      data = data.filter((p) =>
        (p.nameAr?.includes(q) ||
          p.nameEn?.toLowerCase().includes(q.toLowerCase()) ||
          p.company?.includes(q) ||
          p.form?.includes(q) ||
          JSON.parse(p.allBarcodes || "[]").some((b) => b.includes(q)))
      );
    }

    // Name-only search
    if (nameSearch.trim() !== "") {
      const q = nameSearch.trim().toLowerCase();
      data = data.filter(
        (p) =>
          p.nameAr?.includes(nameSearch.trim()) ||
          p.nameEn?.toLowerCase().includes(q)
      );
    }

    // Company filter
    if (companyFilter !== "") {
      data = data.filter((p) => p.company === companyFilter);
    }

    // Form filter
    if (formFilter !== "") {
      data = data.filter((p) => p.form === formFilter);
    }

    // Price range
    if (priceMin !== "") {
      data = data.filter((p) => Number(p.salePrice) >= Number(priceMin));
    }
    if (priceMax !== "") {
      data = data.filter((p) => Number(p.salePrice) <= Number(priceMax));
    }

    // Barcode filter
    if (barcodeFilter === "single") {
      data = data.filter(
        (p) => JSON.parse(p.allBarcodes || "[]").length === 1
      );
    }
    if (barcodeFilter === "multi") {
      data = data.filter(
        (p) => JSON.parse(p.allBarcodes || "[]").length > 1
      );
    }

    // Sort
    data = sortData(data);

    setDisplayed(data);
    setPage(1);
  }, [
    search,
    nameSearch,
    companyFilter,
    formFilter,
    priceMin,
    priceMax,
    barcodeFilter,
    sortField,
    sortDir,
    products,
  ]);

  // -----------------------------
  // UNIQUE FILTER VALUES
  // -----------------------------
  const companies = [...new Set(products.map((p) => p.company).filter(Boolean))];
  const forms = [...new Set(products.map((p) => p.form).filter(Boolean))];

  return (
    <div className="p-6 space-y-6">

      {/* ===========================
          CONTROLS + SCAN BUTTON
      =========================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* BACK BUTTON */}
<button
  onClick={() => navigate(-1)}
  className="flex items-center gap-2 px-3 py-2 bg-surface-container-low hover:bg-surface-container-high rounded-lg shadow text-primary font-bold"
>
  <span className="material-symbols-outlined">arrow_back</span>
  {t("viewer.back")}
</button>

        {/* Left side: searches */}
        <div className="flex flex-wrap gap-3">
          <input
            className="input w-[180px]"
            placeholder={t("viewer.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            className="input w-[180px]"
            placeholder={t("viewer.nameSearch")}
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
          />

          {/* SCAN BARCODE BUTTON */}
          <button
            className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90"
            onClick={() => {
              const code = prompt(t("viewer.scanPrompt"));
              if (code && code.trim() !== "") {
                setSearch(code.trim());
              }
            }}
          >
            {t("viewer.scanBarcode")}
          </button>
        </div>
        {/* Right side: Add product + column visibility */}
        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90"
              onClick={() => {
                setNewProduct(emptyProduct);
                setShowAddModal(true);
              }}
            >
              {t("viewer.addProduct")}
            </button>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            {Object.keys(visibleColumns).map((key) => (
              <label key={key} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={visibleColumns[key]}
                  onChange={() =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                />
                <span>{columnLabels[key]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ===========================
          FILTERS (compact + searchable)
      =========================== */}
      <div className="flex flex-wrap gap-3 mb-4">

        {/* Company (searchable) */}
        <div className="relative">
          <input
            className="input w-[160px]"
            placeholder={t("viewer.filters.companySearch")}
            onChange={(e) => setCompanyFilter(e.target.value)}
            list="company-list"
          />
          <datalist id="company-list">
            {companies.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {/* Form (searchable) */}
        <div className="relative">
          <input
            className="input w-[160px]"
            placeholder={t("viewer.filters.formSearch")}
            onChange={(e) => setFormFilter(e.target.value)}
            list="form-list"
          />
          <datalist id="form-list">
            {forms.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        {/* Price Min */}
        <input
          type="number"
          className="input w-[120px]"
          placeholder={t("viewer.filters.minPrice")}
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
        />

        {/* Price Max */}
        <input
          type="number"
          className="input w-[120px]"
          placeholder={t("viewer.filters.maxPrice")}
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
        />

        {/* Barcode Filter */}
        <select
          className="input w-[150px]"
          value={barcodeFilter}
          onChange={(e) => setBarcodeFilter(e.target.value)}
        >
          <option value="">{t("viewer.filters.barcode.all")}</option>
          <option value="single">{t("viewer.filters.barcode.single")}</option>
          <option value="multi">{t("viewer.filters.barcode.multi")}</option>
        </select>
      </div>

      {/* ===========================
          TABLE + RESIZABLE COLUMNS
      =========================== */}
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl border border-outline-variant/20">
        <table className="min-w-[1800px] w-full table-fixed">

          <thead className="bg-surface-container-high sticky top-0 z-10">
            <tr>
              {Object.keys(visibleColumns).map((key) =>
                visibleColumns[key] ? (
                  <th
                    key={key}
                    className="p-3 cursor-pointer relative group select-none"
                    onClick={() => toggleSort(key)}
                    style={{ position: "relative" }}
                  >
                    {columnLabels[key]}{" "}
                    {sortField === key && (sortDir === "asc" ? "▲" : "▼")}

                    {/* RESIZE HANDLE */}
                    <div
                      onMouseDown={(e) => initResize(e, key)}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent group-hover:bg-primary/40"
                    ></div>
                  </th>
                ) : null
              )}

              <th className="p-3">{t("viewer.edit")}</th>
              <th className="p-3">{t("viewer.delete")}</th>
            </tr>
          </thead>

          <tbody>
            {displayed
              .slice((page - 1) * pageSize, page * pageSize)
              .map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-outline-variant/10 hover:bg-surface-container-low"
                >
                  {visibleColumns.id && <td className="p-3">{p.id}</td>}
                  {visibleColumns.nameAr && <td className="p-3">{p.nameAr}</td>}
                  {visibleColumns.nameEn && <td className="p-3">{p.nameEn}</td>}
                  {visibleColumns.company && <td className="p-3">{p.company}</td>}
                  {visibleColumns.form && <td className="p-3">{p.form}</td>}
                  {visibleColumns.purchasePrice && (
                    <td className="p-3">{p.purchasePrice}</td>
                  )}
                  {visibleColumns.salePrice && (
                    <td className="p-3">{p.salePrice}</td>
                  )}

                  {visibleColumns.barcodes && (
                    <td className="p-3">
                      {JSON.parse(p.allBarcodes || "[]").map((b) => (
                        <span
                          key={b}
                          className="px-2 py-1 bg-primary/10 text-primary rounded-lg text-xs mr-1"
                        >
                          {b}
                        </span>
                      ))}
                    </td>
                  )}

                  {visibleColumns.indications && (
                    <td className="p-3 max-w-[250px] truncate">{p.indications}</td>
                  )}
                  {visibleColumns.antidotes && (
                    <td className="p-3 max-w-[250px] truncate">{p.antidotes}</td>
                  )}
                  {visibleColumns.dosage && (
                    <td className="p-3 max-w-[250px] truncate">{p.dosage}</td>
                  )}
                  {visibleColumns.fact && (
                    <td className="p-3 max-w-[250px] truncate">{p.fact}</td>
                  )}

                  <td className="p-3">
                    <button
                      className="text-primary font-semibold"
                      onClick={() => setEditingItem(p)}
                    >
                      {t("viewer.edit")}
                    </button>
                  </td>

                  <td className="p-3">
                    <button
                      className="text-red-500 font-semibold"
                      onClick={() => {
                        if (!confirm(t("confirm.delete"))) return;
                        handleDelete(p.id);
                      }}
                    >
                      {t("viewer.delete")}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ===========================
          PAGINATION
      =========================== */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          className="px-3 py-1 bg-primary text-white rounded-lg disabled:opacity-40"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          {t("viewer.prev")}
        </button>

        <span className="text-on-surface-variant font-semibold">
          {t("viewer.page")} {page} {t("viewer.of")}{" "}
          {Math.ceil(displayed.length / pageSize)}
        </span>

        <button
          className="px-3 py-1 bg-primary text-white rounded-lg disabled:opacity-40"
          disabled={page * pageSize >= displayed.length}
          onClick={() => setPage(page + 1)}
        >
          {t("viewer.next")}
        </button>
      </div>

      {/* ===========================
          EDIT MODAL
      =========================== */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            className="
              bg-surface-container-low 
              p-6 
              rounded-3xl 
              w-full 
              max-w-2xl 
              shadow-xl 
              space-y-4
              max-h-[90vh] 
              overflow-y-auto
              relative
            "
          >
            {/* X CLOSE BUTTON */}
            <button
              className="absolute top-3 right-3 text-2xl font-bold text-gray-500 hover:text-black"
              onClick={() => setEditingItem(null)}
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-2">
              {t("modal.editTitle")} — {editingItem.id}
            </h2>

            {/* Arabic Name */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.nameAr")}
              </label>
              <input
                className="input w-full"
                value={editingItem.nameAr || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, nameAr: e.target.value })
                }
              />
            </div>

            {/* English Name */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.nameEn")}
              </label>
              <input
                className="input w-full"
                value={editingItem.nameEn || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, nameEn: e.target.value })
                }
              />
            </div>

            {/* Company */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.company")}
              </label>
              <input
                className="input w-full"
                value={editingItem.company || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, company: e.target.value })
                }
              />
            </div>

            {/* Form */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.form")}
              </label>
              <input
                className="input w-full"
                value={editingItem.form || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, form: e.target.value })
                }
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.purchasePrice")}
              </label>
              <input
                type="number"
                className="input w-full"
                value={editingItem.purchasePrice ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    purchasePrice: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Sale Price */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.salePrice")}
              </label>
              <input
                type="number"
                className="input w-full"
                value={editingItem.salePrice ?? ""}
                onChange={(e) =>
                  setEditingItem({
                    ...editingItem,
                    salePrice: Number(e.target.value),
                  })
                }
              />
            </div>
            {/* Barcodes */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.barcodes")}
              </label>
              <input
                className="input w-full"
                value={JSON.parse(editingItem.allBarcodes || "[]").join(",")}
                onChange={(e) => {
                  const arr = e.target.value
                    .split(",")
                    .map((b) => b.trim())
                    .filter(Boolean);

                  setEditingItem({
                    ...editingItem,
                    allBarcodes: JSON.stringify(arr),
                    barcode: arr[0] || "",
                  });
                }}
              />
            </div>

            {/* Indications */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.indications")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={editingItem.indications || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, indications: e.target.value })
                }
              />
            </div>

            {/* Antidotes */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.antidotes")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={editingItem.antidotes || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, antidotes: e.target.value })
                }
              />
            </div>

            {/* Dosage */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.dosage")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={editingItem.dosage || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, dosage: e.target.value })
                }
              />
            </div>

            {/* Fact */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.fact")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={editingItem.fact || ""}
                onChange={(e) =>
                  setEditingItem({ ...editingItem, fact: e.target.value })
                }
              />
            </div>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 bg-outline text-on-surface rounded-lg"
                onClick={() => setEditingItem(null)}
              >
                {t("modal.cancel")}
              </button>

              <button
                className="px-4 py-2 bg-primary text-white rounded-lg"
                onClick={async () => {
                  await db.universalPharmacy.put(editingItem);

                  const data = await db.universalPharmacy.toArray();
                  setProducts(data);
                  setDisplayed(data);

                  setEditingItem(null);
                }}
              >
                {t("modal.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===========================
          EXPORT JSON BUTTON
      =========================== */}
      {isAdmin && (
        <div className="flex justify-end mb-4">
          <button
            className="px-4 py-2 bg-primary text-white rounded-lg font-bold hover:opacity-90 flex items-center gap-2"
            onClick={async () => {
              const data = await db.universalPharmacy.toArray();

              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });

              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "D-Pharma.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <span className="material-symbols-outlined">download</span>
            Export JSON
          </button>
        </div>
      )}

      {/* ===========================
          IMPORT JSON BUTTON
      =========================== */}
      {isAdmin && (
        <div className="flex justify-end mb-6">
          <label className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-bold hover:bg-primary/20 cursor-pointer flex items-center gap-2">
            <span className="material-symbols-outlined">upload</span>
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                  const text = await file.text();
                  const json = JSON.parse(text);

                  const normalized = json.map((p) => {
                    const arr = Array.isArray(p.allBarcodes)
                      ? p.allBarcodes
                      : JSON.parse(p.allBarcodes || "[]");

                    return {
                      ...p,
                      allBarcodes: JSON.stringify(arr),
                      barcode: arr[0] || "",
                    };
                  });

                  await db.universalPharmacy.clear();
                  await db.universalPharmacy.bulkAdd(normalized);

                  const data = await db.universalPharmacy.toArray();
                  setProducts(data);
                  setDisplayed(data);

                  alert("Database imported successfully!");
                } catch (err) {
                  console.error(err);
                  alert("Invalid JSON file.");
                }
              }}
            />
          </label>
        </div>
      )}

      {/* ===========================
          ADD PRODUCT MODAL
      =========================== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            className="
              bg-surface-container-low 
              p-6 
              rounded-3xl 
              w-full 
              max-w-2xl 
              shadow-xl 
              space-y-4
              max-h-[90vh] 
              overflow-y-auto
            "
          >
            <h2 className="text-xl font-bold mb-2">{t("viewer.addProduct")}</h2>

            {/* Arabic Name */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.nameAr")}
              </label>
              <input
                className="input w-full"
                value={newProduct.nameAr}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, nameAr: e.target.value })
                }
              />
            </div>

            {/* English Name */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.nameEn")}
              </label>
              <input
                className="input w-full"
                value={newProduct.nameEn}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, nameEn: e.target.value })
                }
              />
            </div>

            {/* Company */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.company")}
              </label>
              <input
                className="input w-full"
                value={newProduct.company}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, company: e.target.value })
                }
              />
            </div>

            {/* Form */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.form")}
              </label>
              <input
                className="input w-full"
                value={newProduct.form}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, form: e.target.value })
                }
              />
            </div>

            {/* Purchase Price */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.purchasePrice")}
              </label>
              <input
                type="number"
                className="input w-full"
                value={newProduct.purchasePrice}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    purchasePrice: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Sale Price */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.salePrice")}
              </label>
              <input
                type="number"
                className="input w-full"
                value={newProduct.salePrice}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    salePrice: Number(e.target.value),
                  })
                }
              />
            </div>

            {/* Barcodes */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.barcodes")}
              </label>
              <input
                className="input w-full"
                value={JSON.parse(newProduct.allBarcodes).join(",")}
                onChange={(e) => {
                  const arr = e.target.value
                    .split(",")
                    .map((b) => b.trim())
                    .filter(Boolean);

                  setNewProduct({
                    ...newProduct,
                    allBarcodes: JSON.stringify(arr),
                    barcode: arr[0] || "",
                  });
                }}
              />
            </div>

            {/* Indications */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.indications")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={newProduct.indications}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, indications: e.target.value })
                }
              />
            </div>

            {/* Antidotes */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.antidotes")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={newProduct.antidotes}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, antidotes: e.target.value })
                }
              />
            </div>

            {/* Dosage */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.dosage")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={newProduct.dosage}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, dosage: e.target.value })
                }
              />
            </div>

            {/* Fact */}
            <div>
              <label className="block mb-1 font-semibold">
                {t("viewer.columns.fact")}
              </label>
              <textarea
                className="input w-full"
                rows={2}
                value={newProduct.fact}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, fact: e.target.value })
                }
              />
            </div>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                className="px-4 py-2 bg-outline text-on-surface rounded-lg"
                onClick={() => setShowAddModal(false)}
              >
                {t("modal.cancel")}
              </button>

              {isAdmin && (
                <button
                  className="px-4 py-2 bg-primary text-white rounded-lg"
                  onClick={async () => {
                    const maxId = Math.max(...products.map((p) => p.id), 0);
                    const newId = maxId + 1;
                    const newItem = {
                      ...newProduct,
                      id: newId,
                    };
                    await db.universalPharmacy.add(newItem);
                    const data = await db.universalPharmacy.toArray();
                    setProducts(data);
                    setDisplayed(data);
                    setShowAddModal(false);
                    setNewProduct(emptyProduct);
                  }}
                >
                  {t("viewer.addProduct")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===========================
   COLUMN RESIZE HANDLER
=========================== */
function initResize(e, key) {
  const th = e.target.parentElement;
  const startX = e.pageX;
  const startWidth = th.offsetWidth;

  function onMouseMove(ev) {
    const newWidth = startWidth + (ev.pageX - startX);
    th.style.width = newWidth + "px";
  }

  function onMouseUp() {
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
}
