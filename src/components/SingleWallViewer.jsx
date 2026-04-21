import { useTranslation } from "react-i18next";

export default function SingleWallViewer({ layout, wall, highlight }) {
  const { t } = useTranslation();

  if (!layout || !wall) {
    return (
      <div style={{ padding: 32, textAlign: "center", color: "#6b7280" }}>
        {t("singleWallViewer.noWall", "No wall selected")}
      </div>
    );
  }

  const wallData = layout.walls.find((w) => w.id === wall);
  const cabinets = layout.cabinets.filter((c) => c.wall === wall);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#f3f4f6",
        overflow: "hidden",
      }}
    >
      {/* Wall photo */}
      {wallData?.dataUrl && (
        <img
          src={wallData.dataUrl}
          alt={t(`pharmacyEditor3D.wall.${wall}`, wallData.label)}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {/* Cabinets */}
      {cabinets.map((cab) => (
        <div
          key={cab.id}
          style={{
            position: "absolute",
            left: `${cab.x * 100}%`,
            top: `${cab.y * 100}%`,
            width: `${cab.width * 100}%`,
            height: `${cab.height * 100}%`,
            border: `2px solid ${cab.color}`,
            background: "rgba(255,255,255,0.1)",
          }}
        >
          {/* Cabinet label */}
          <div
            style={{
              position: "absolute",
              top: -20,
              left: 0,
              background: cab.color,
              color: "#fff",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {cab.label}
          </div>

          {/* Shelves */}
          {cab.shelves.map((s) => {
            const top = (s.yTop ?? 0) * 100;
            const h = ((s.yBottom ?? 0) - (s.yTop ?? 0)) * 100;

            return (
              <div
                key={s.id}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: `${top}%`,
                  height: `${h}%`,
                  background: s.color,
                  borderTop: "1px solid rgba(0,0,0,0.25)",
                }}
              >
                {/* Shelf label */}
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    left: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {s.label}
                </div>

                {/* Rows */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {s.rows.map((r) => {
                    const isHighlighted =
                      highlight?.cabinetLabel === cab.label &&
                      highlight?.shelfLabel === s.label &&
                      highlight?.rowLabel === r.label;

                    return (
                      <div
                        key={r.id}
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          borderTop: "1px solid rgba(255,255,255,0.25)",
                          padding: "0 6px",
                        }}
                      >
                        {/* Row label always on the left */}
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.9)",
                          }}
                        >
                          {r.label}
                        </span>

                        {/* Capsule only if highlighted */}
                        {isHighlighted && (
                          <div
                            style={{
                              padding: "4px 12px",
                              borderRadius: "999px",
                              background: "#dc2626",
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 12,
                              animation: "blink 1s infinite",
                              boxShadow: "0 0 8px rgba(220,38,38,0.7)",
                              margin: "0 auto", // keep centered
                            }}
                          >
                            {highlight.medicineName}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
