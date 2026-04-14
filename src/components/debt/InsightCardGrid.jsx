import React from "react";
import InsightCard from "./InsightCard";

export default function InsightCardGrid({ cards, summary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      
      {/* SUMMARY CARD FIRST */}
      {summary}

      {/* OTHER CARDS */}
      {cards.map((card, idx) => (
        <InsightCard key={idx} {...card} />
      ))}
    </div>
  );
}



