import { useEffect, useState } from "react";
import { db } from "../db/index";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function UniversalViewer() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";

  if (!isAdmin) {
    return (
      <div className="p-6 text-red-600 font-bold text-xl">
        Access denied — Admin only
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
          CONTROLS
      =========================== */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        {/* Left side: searches */}
        <div className="flex flex-wrap gap-3">
          <input
            className="input"
            placeholder="Search all fields..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <input
            className="input"
            placeholder="Search by name..."
            value={nameSearch}
            onChange={(e) => setNameSearch(e.target.value)}
          />
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
              Add Product
            </button>
          )}

          <div className="flex flex-wrap gap-2 text-sm">
            {Object.entries(visibleColumns).map(([key, value]) => (
              <label key={key} className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() =>
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                />
                <span className="capitalize">{key}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* ===========================
          TABLE + SCROLL CONTAINER
      =========================== */}
      <div className="overflow-x-auto overflow-y-auto max-h-[70vh] rounded-xl border border-outline-variant/20">
        <table className="min-w-[1800px] w-full">
          <thead className="bg-surface-container-high sticky top-0 z-10">
            <tr>
              {visibleColumns.id && (
                <th className="p-3 cursor-pointer" onClick={() => toggleSort("id")}>
                  ID {sortField === "id" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
              )}

              {visibleColumns.nameAr && (
                <th className="p-3 cursor-pointer" onClick={() => toggleSort("nameAr")}>
                  Arabic Name {sortField === "nameAr" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
              )}

              {visibleColumns.nameEn && (
                <th className="p-3 cursor-pointer" onClick={() => toggleSort("nameEn")}>
                  English Name {sortField === "nameEn" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
              )}

              {visibleColumns.company && (
                <th className="p-3 cursor-pointer" onClick={() => toggleSort("company")}>
                  Company {sortField === "company" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
              )}

              {visibleColumns.form && (
                <th className="p-3 cursor-pointer" onClick={() => toggleSort("form")}>
                  Form {sortField === "form" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
              )}

              {visibleColumns.purchasePrice && (
                <th
                  className="p-3 cursor-pointer"
                  onClick={() => toggleSort("purchasePrice")}
                >
                  Purchase Price{" "}
                  {sortField === "purchasePrice" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
              )}

              {visibleColumns.salePrice && (
                <th
                  className="p-3 cursor-pointer"
                  onClick={() => toggleSort("salePrice")}
                >
                  Sale Price {sortField === "salePrice" && (sortDir === "asc" ? "▲" : "▼")}
                </th>
              )}

              {visibleColumns.barcodes && <th className="p-3">Barcodes</th>}
              {visibleColumns.indications && <th className="p-3">Indications</th>}
              {visibleColumns.antidotes && <th className="p-3">Antidotes</th>}
              {visibleColumns.dosage && <th className="p-3">Dosage</th>}
              {visibleColumns.fact && <th className="p-3">Fact</th>}

              <th className="p-3">Edit</th>
              <th className="p-3">Delete</th>
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
                    {isAdmin && (
                      <button
                        className="text-primary font-semibold"
                        onClick={() => setEditingItem(p)}
                      >
                        Edit
                      </button>
                    )}
                  </td>

                  <td className="p-3">
                    {isAdmin && (
                      <button
                        className="text-red-500 font-semibold"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </button>
                    )}
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
          Previous
        </button>

        <span className="text-on-surface-variant font-semibold">
          Page {page} of {Math.ceil(displayed.length / pageSize)}
        </span>

        <button
          className="px-3 py-1 bg-primary text-white rounded-lg disabled:opacity-40"
          disabled={page * pageSize >= displayed.length}
          onClick={() => setPage(page + 1)}
        >
          Next
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
            "
          >
            <h2 className="text-xl font-bold mb-2">
              Edit Product — {editingItem.id}
            </h2>

            {/* Arabic Name */}
            <div>
              <label className="block mb-1 font-semibold">Arabic Name</label>
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
              <label className="block mb-1 font-semibold">English Name</label>
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
              <label className="block mb-1 font-semibold">Company</label>
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
              <label className="block mb-1 font-semibold">Form</label>
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
              <label className="block mb-1 font-semibold">Purchase Price</label>
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
              <label className="block mb-1 font-semibold">Sale Price</label>
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
                Barcodes (comma separated)
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
              <label className="block mb-1 font-semibold">Indications</label>
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
              <label className="block mb-1 font-semibold">Antidotes</label>
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
              <label className="block mb-1 font-semibold">Dosage</label>
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
              <label className="block mb-1 font-semibold">Fact</label>
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
                Cancel
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
                Save
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
            <h2 className="text-xl font-bold mb-2">Add New Product</h2>

            {/* Arabic Name */}
            <div>
              <label className="block mb-1 font-semibold">Arabic Name</label>
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
              <label className="block mb-1 font-semibold">English Name</label>
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
              <label className="block mb-1 font-semibold">Company</label>
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
              <label className="block mb-1 font-semibold">Form</label>
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
              <label className="block mb-1 font-semibold">Purchase Price</label>
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
              <label className="block mb-1 font-semibold">Sale Price</label>
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
                Barcodes (comma separated)
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
              <label className="block mb-1 font-semibold">Indications</label>
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
              <label className="block mb-1 font-semibold">Antidotes</label>
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
              <label className="block mb-1 font-semibold">Dosage</label>
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
              <label className="block mb-1 font-semibold">Fact</label>
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
                Cancel
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
                  Add Product
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
