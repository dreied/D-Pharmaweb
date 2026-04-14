import React from "react";

const toneToClass = {
  normal: "bg-secondary-container",
  overdue: "bg-error-container",
  neutral: "bg-surface-container-highest"
};

export default function PaymentHistoryBar({ pattern }) {
  return (
    <div className="flex gap-1">
      {pattern.map((tone, idx) => (
        <div
          key={idx}
          className={`w-3 h-7 rounded-md ${toneToClass[tone] || toneToClass.normal}`}
        />
      ))}
    </div>
  );
}
