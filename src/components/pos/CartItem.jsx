// src/components/pos/CartItem.jsx
import { useTranslation } from "react-i18next";
import { LocationInfo } from "./LocationInfo";
import { UnitDropdown } from "./UnitDropdown";

export function CartItem({
  icon,
  iconColorClass,
  iconBgClass,
  nameEn,
  nameAr,
  description,
  quantity,
  displayPrice,
  oldPrice,
  location,
  onIncrease,
  onDecrease,
  onDelete,
  availableStock,
  onSetQuantity,
  minQty,

  // NEW PROPS
  originalPrice,
  unitType,
  envelopesInside,
  onUnitTypeChange,
  onEnvelopeCountChange
}) {
  const { i18n, t } = useTranslation();
  const displayName =
    i18n.language === "ar" ? nameAr || nameEn : nameEn || nameAr;

  return (
   <div className="relative overflow-visible bg-white/80 backdrop-blur-sm p-5 rounded-xl shadow-sm flex flex-col gap-4 group hover:shadow-md transition-shadow border border-slate-200/50">

      
      {/* TOP ROW */}
      <div className="flex items-center gap-6">
        
        {/* ICON */}
        <div
          className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 border ${iconBgClass}`}
        >
          <span className={`material-symbols-outlined text-3xl ${iconColorClass}`}>
            {icon}
          </span>
        </div>

        {/* NAME + DESCRIPTION */}
        <div className="flex-1">
          <h3 className="font-headline font-bold text-lg text-on-surface">
            {displayName}
          </h3>
          <p className="text-sm text-outline">{description}</p>

          {/* UNIT SELECTOR */}
          <div className="flex flex-col gap-2 mt-3">
           <div className="relative z-50">
  <UnitDropdown
    value={unitType}
    onChange={onUnitTypeChange}
    t={t}
  />
</div>


            {unitType === "envelope" && (
              <div>
                <label className="text-sm text-outline-variant">
                  {t("pos.envelopesInside")}
                </label>

                <input
                  type="number"
                  min="1"
                  placeholder="0"
                  className="mt-1 w-20 px-2 py-1 rounded-md border border-outline bg-surface-container-lowest text-sm"
                  value={envelopesInside ?? null}
                  onChange={(e) => onEnvelopeCountChange(Number(e.target.value))}
                />
              </div>
            )}
          </div>
        </div>

        {/* QUANTITY + PRICE + DELETE */}
        <div className="flex items-center gap-4">
          
          {/* QUANTITY CONTROLS */}
          <div className="flex items-center bg-surface-container-low rounded-lg p-1">
            <button
              className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-md transition-colors text-primary"
              onClick={onDecrease}
            >
              <span className="material-symbols-outlined text-lg">remove</span>
            </button>

            <input
              type="number"
              className="w-16 text-center font-headline font-bold bg-transparent outline-none text-lg"
              value={quantity}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (isNaN(val) || val < 1) return;
                if (availableStock !== undefined && val > availableStock) return;
                onSetQuantity(val);
              }}
            />

            <button
              className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                quantity >= availableStock
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "hover:bg-white text-primary"
              }`}
              onClick={onIncrease}
              disabled={quantity >= availableStock}
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>

          {/* PRICE */}
          <div className="text-right min-w-[80px]">
            {oldPrice && (
              <p className="text-sm text-outline line-through">{oldPrice}</p>
            )}
            <p className="font-headline font-extrabold text-primary flex items-baseline gap-1">
              <span className="text-on-surface">{displayPrice.formatted}</span>
<span className="text-primary/70 text-sm">{displayPrice.symbol}</span>

            </p>
          </div>

          {/* DELETE BUTTON */}
          <button
            className="text-error/40 hover:text-error transition-colors p-2"
            onClick={onDelete}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>

      {/* LOCATION */}
      {location && <LocationInfo locationText={location} />}

      {/* LOW STOCK WARNING */}
      {availableStock !== undefined && minQty > 0 &&
        (() => {
          const remaining = availableStock - quantity;
          if (remaining <= minQty && remaining >= 0) {
            return (
              <p className="text-red-600 text-xs font-bold">
                {i18n.language === "ar"
                  ? `متبقي ${remaining} في المخزون`
                  : `Only ${remaining} left in stock`}
              </p>
            );
          }
          return null;
        })()}
    </div>
  );
}
