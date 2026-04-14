import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db";
import { formatPrice } from "../../currency";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function SupplierPaymentsChart({ payments }) {
  // Load currency settings
  const appSettings = useLiveQuery(() => db.appSettings.toArray(), []);
  const useNewCurrency =
    appSettings?.find((s) => s.key === "use_new_currency")?.value || false;
  const currencySymbol =
    appSettings?.find((s) => s.key === "currency_symbol")?.value || "SYP";

  const fmt = (value) => formatPrice(value, useNewCurrency, currencySymbol);

  // Group payments by month
  const byMonth = new Map();

  (payments || []).forEach((p) => {
    const d = new Date(p.timestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    byMonth.set(key, (byMonth.get(key) || 0) + (p.amount || 0));
  });

  const labels = Array.from(byMonth.keys()).sort();
  const dataValues = labels.map((k) => byMonth.get(k));

  const data = {
    labels,
    datasets: [
      {
        label: "Payments",
        data: dataValues,
        backgroundColor: "rgba(25, 118, 210, 0.7)"
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const money = fmt(ctx.raw);
            return `${money.formatted} ${money.symbol}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: "rgba(148, 163, 184, 0.2)" },
        ticks: {
          beginAtZero: true,
          callback: (value) => {
            const money = fmt(value);
            return `${money.formatted} ${money.symbol}`;
          }
        }
      }
    }
  };

  return <Bar data={data} options={options} />;
}
