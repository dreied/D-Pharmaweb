// src/utils/update.js

export const BASE_URL =
  "https://raw.githubusercontent.com/dreied/pharmacy-data/main";

// تحميل آخر نسخة من GitHub
export async function fetchLatestVersion() {
  const res = await fetch(`${BASE_URL}/version.json?cacheBust=${Date.now()}`);
  if (!res.ok) throw new Error("Failed to fetch version.json");
  const data = await res.json();
  return Number(data.version);
}

// تحميل ملف المنتجات الخام من GitHub (بدون تطبيع)
export async function fetchLatestProductData(onProgress) {
  return await fetchWithProgress(`${BASE_URL}/D-Pharma.json`, onProgress);
}

// fetch مع progress + كاب 100%
export async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);

  const contentLength = res.headers.get("Content-Length");
  if (!contentLength) {
    // بدون طول معروف: رجّع JSON عادي
    return await res.json();
  }

  const total = parseInt(contentLength, 10);
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
    loaded += value.length;

    const percent = Math.min(100, Math.round((loaded / total) * 100));
    if (onProgress) onProgress(percent);
  }

  const blob = new Blob(chunks, { type: "application/json" });
  const text = await blob.text();
  return JSON.parse(text);
}

// تطبيع صف واحد من JSON GitHub إلى شكل Dexie
export function normalizeRow(row) {
  const barcodes = (row["barcode_ArraabPharm_17"] || "")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  return {
    id: row["prdID_ArraabPharm_17"],
    nameAr: row["name_ArraabPharm_17"] || "",
    nameEn: row["updateName_ArraabPharm_17"] || "",
    purchasePrice:
      row["lastpurchasedPrice_ArraabPharm_17"] != null
        ? Number(row["lastpurchasedPrice_ArraabPharm_17"])
        : null,
    salePrice:
      row["endUserPrice_ArraabPharm_17"] != null
        ? Number(row["endUserPrice_ArraabPharm_17"])
        : null,
    form: row["formation_ArraabPharm_17"] || "",
    barcode: barcodes[0] || "",
    allBarcodes: JSON.stringify(barcodes),
    date: row["date_ArraabPharm_17"] || "",
    boxFashion: row["updateBoxFashion_ArraabPharm_17"] || "",
    company: row["category_ArraabPharm_17"] || "",
    indications: row["c1_ArraabPharm_17"] || "",
    antidotes: row["c2_ArraabPharm_17"] || "",
    c3: row["c3_ArraabPharm_17"] || "",
    dosage: row["c4_ArraabPharm_17"] || "",
    fact: row["Fact_ArraabPharm_17"] || ""
  };
}

// تطبيع بيانات Dexie القديمة لتطابق الجديدة قبل diff
export function normalizeOldItem(item) {
  let parsedBarcodes = [];
  try {
    parsedBarcodes = item.allBarcodes
      ? JSON.parse(item.allBarcodes)
      : [];
  } catch {
    parsedBarcodes = [];
  }

  return {
    ...item,
    purchasePrice:
      item.purchasePrice != null ? Number(item.purchasePrice) : null,
    salePrice: item.salePrice != null ? Number(item.salePrice) : null,
    allBarcodes: JSON.stringify(parsedBarcodes),
    barcode: item.barcode ? String(item.barcode).trim() : "",
    nameAr: item.nameAr || "",
    nameEn: item.nameEn || "",
    company: item.company || "",
    form: item.form || "",
    indications: item.indications || "",
    antidotes: item.antidotes || "",
    c3: item.c3 || "",
    dosage: item.dosage || "",
    fact: item.fact || ""
  };
}

// diff كامل مع oldItem/newItem
export function computeDiff(oldData, newData) {
  const diff = [];

  const oldMap = new Map(oldData.map((item) => [item.id, item]));
  const newMap = new Map(newData.map((item) => [item.id, item]));

  // added + modified
  for (const [id, newItem] of newMap.entries()) {
    const oldItem = oldMap.get(id);

    if (!oldItem) {
      diff.push({ id, type: "added", item: newItem });
      continue;
    }

    const changedFields = [];

    for (const key of Object.keys(newItem)) {
      const oldVal = oldItem[key];
      const newVal = newItem[key];

      const normOld =
        oldVal === null || oldVal === undefined
          ? null
          : String(oldVal).trim();
      const normNew =
        newVal === null || newVal === undefined
          ? null
          : String(newVal).trim();

      if (normOld !== normNew) {
        changedFields.push({
          field: key,
          old: oldItem[key],
          new: newItem[key]
        });
      }
    }

    if (changedFields.length > 0) {
      diff.push({
        id,
        type: "modified",
        oldItem,
        newItem,
        changes: changedFields
      });
    }
  }

  // removed
  for (const [id, oldItem] of oldMap.entries()) {
    if (!newMap.has(id)) {
      diff.push({
        id,
        type: "removed",
        item: oldItem
      });
    }
  }

  return diff;
}

// تحديث Dexie ببيانات مطبّعة
export async function updateUniversalPharmacy(db, normalizedData) {
  await db.universalPharmacy.clear();
  await db.universalPharmacy.bulkAdd(normalizedData);
  return normalizedData.length;
}
