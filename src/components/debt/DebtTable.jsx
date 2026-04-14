import React from "react";
import { useTranslation } from "react-i18next";
import DebtRow from "./DebtRow";
import Pagination from "./Pagination";

export default function DebtTable({
  customers,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onSettleCustomer,
   onViewDetails,
  onDeleteCustomer   // ⭐ ADD THIS
}) {
  const { t } = useTranslation();

  const startIndex = (page - 1) * pageSize;
  const pageItems = customers.slice(startIndex, startIndex + pageSize);

  return (
    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-white/40 overflow-hidden">

      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-container-high flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-on-surface">
            {t("debtBook.title")}
          </h2>
          <p className="text-s text-on-surface-variant">
            {t("debtBook.subtitle")}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left table-fixed">
          <thead className="bg-surface-container-low/60">
            <tr>
              <th className="px-6 py-3 w-1/4 text-s font-semibold text-on-surface-variant">
                {t("debtBook.columns.customer")}
              </th>

              <th className="px-6 py-3 w-1/5 text-s font-semibold text-on-surface-variant">
                {t("debtBook.columns.lastPurchase")}
              </th>

              <th className="px-6 py-3 w-1/5 text-s font-semibold text-on-surface-variant">
                {t("debtBook.columns.totalDebt")}
              </th>

              <th className="px-6 py-3 w-1/5 text-s font-semibold text-on-surface-variant">
                {t("debtBook.columns.paymentHistory")}
              </th>

              <th className="px-6 py-3 w-1/5 text-s font-semibold text-on-surface-variant text-right">
                {t("debtBook.columns.actions")}
              </th>
            </tr>
          </thead>

          <tbody>
            {pageItems.map((customer) => (
              <DebtRow
                key={customer.id}
                customer={customer}
                onSettle={() => onSettleCustomer(customer)}
                onViewDetails={onViewDetails}
onDelete={onDeleteCustomer}   // ⭐ ADD THIS

              />
            ))}

            {pageItems.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-on-surface-variant"
                >
                  {t("debtBook.noCustomers")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={onPageChange}
      />
    </div>
  );
}
