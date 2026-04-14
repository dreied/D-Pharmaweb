import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { db } from "../db";
import ProductForm from "../components/product/ProductForm";
import BatchTable from "../components/product/BatchTable";
import ConfirmDeleteModal from "../components/product/ConfirmDeleteModal";

import "../styles/editProduct.css";

export default function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [useNewCurrency, setUseNewCurrency] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("SYP");

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [batches, setBatches] = useState([]);

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  async function load() {
    const productId = Number(id);

    const p = await db.stockProducts.get(productId);
    if (!p) {
      setLoading(false);
      return;
    }
    setProduct(p);

    const b = await db.stockBatches
      .where("stockProductId")
      .equals(productId)
      .toArray();

    setBatches(b);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  // DELETE PRODUCT
  function deleteProduct() {
    setShowConfirmDelete(true);
  }

  async function confirmDelete() {
    const productId = Number(id);

    await db.stockProducts.delete(productId);
    await db.stockBatches.where("stockProductId").equals(productId).delete();

    navigate("/dashboard");
  }

  // SAVE PRODUCT (called directly after ProductForm confirmation)
  async function saveProduct(updated) {
    await db.stockProducts.update(product.id, updated);
    await load(); // refresh UI
  }

  if (loading) {
    return (
      <div className="page-container">
        <h2>{t("loading")}</h2>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
        <h2>{t("productNotFound")}</h2>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-primary font-bold hover:underline"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t("back")}
        </button>

        <h2 className="text-2xl font-bold text-primary">
          {t("editProduct")}
        </h2>

        <div className="w-10"></div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductForm product={product} onSave={saveProduct} />

        <BatchTable
          batches={batches}
          reload={load}
          useNewCurrency={useNewCurrency}
          currencySymbol={currencySymbol}
        />
      </div>

      {/* DELETE BUTTON */}
      <div className="mt-8 flex justify-end">
        <button
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-red-700 transition"
          onClick={deleteProduct}
        >
          <span className="material-symbols-outlined">delete</span>
          {t("deleteProduct")}
        </button>
      </div>

      {/* CONFIRM DELETE MODAL */}
      {showConfirmDelete && (
        <ConfirmDeleteModal
          title={t("deleteProduct")}
          message={t("deleteProductConfirm")}
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirmDelete(false)}
        />
      )}
    </div>
  );
}
