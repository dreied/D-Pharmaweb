// src/components/PharmacyCubemapViewer3D.jsx
import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import * as THREE from "three";

const ROOM_SIZE = 10;
const HALF = ROOM_SIZE / 2;

const WALL_TRANSFORMS = {
  front: { position: [0, 0, -HALF], rotation: [0, 0, 0], cameraYaw: 0 },
  back: { position: [0, 0, HALF], rotation: [0, Math.PI, 0], cameraYaw: Math.PI },
  left: { position: [-HALF, 0, 0], rotation: [0, Math.PI / 2, 0], cameraYaw: Math.PI / 2 },
  right: { position: [HALF, 0, 0], rotation: [0, -Math.PI / 2, 0], cameraYaw: -Math.PI / 2 },
};

function RedRowBorder({ w, h }) {
  const t = 0.06;
  const z = 0.03;
  return (
    <group>
      <mesh position={[0, h / 2, z]}>
        <planeGeometry args={[w, t]} />
        <meshBasicMaterial
          color="#ef4444"
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <mesh position={[0, -h / 2, z]}>
        <planeGeometry args={[w, t]} />
        <meshBasicMaterial
          color="#ef4444"
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <mesh position={[-w / 2, 0, z]}>
        <planeGeometry args={[t, h]} />
        <meshBasicMaterial
          color="#ef4444"
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <mesh position={[w / 2, 0, z]}>
        <planeGeometry args={[t, h]} />
        <meshBasicMaterial
          color="#ef4444"
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Viewer must show EXACTLY what the editor has already decided.
 * So we do NOT recompute numbering here.
 * We just respect shelf.label, with special casing for doors.
 */
function getDisplayShelfLabel(shelf) {
  if (shelf.type === "door-top") return "باب علوي";
  if (shelf.type === "door-bottom") return "باب سفلي";
  return shelf.label; // already renumbered by editor (قسم 2, قسم 3, قسم 5, ...)
}

function CabinetOverlay({ cabinet, highlight }) {
  const x = (cabinet.x + cabinet.width / 2 - 0.5) * ROOM_SIZE;
  const y = -(cabinet.y + cabinet.height / 2 - 0.5) * ROOM_SIZE;
  const w = cabinet.width * ROOM_SIZE;
  const h = cabinet.height * ROOM_SIZE;

  const isHighlightedCabinet =
    highlight && String(highlight.cabinetLabel) === String(cabinet.label);

  return (
    <group position={[x, y, 0.2]}>
      {/* Cabinet body */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color={cabinet.color}
          side={THREE.DoubleSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      {/* Cabinet border */}
      <lineSegments position={[0, 0, 0.01]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(w, h)]} />
        <lineBasicMaterial
          color={cabinet.color}
          linewidth={2}
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>

      {/* Cabinet label */}
      <Html position={[0, h / 2 + 0.25, 0.02]} center distanceFactor={8}>
        <div
          style={{
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            color: "#fff",
            background: cabinet.color,
            pointerEvents: "none",
          }}
        >
          {cabinet.label}
        </div>
      </Html>

      {/* Shelves + rows */}
      {cabinet.shelves.map((shelf, si) => {
        const shY = (0.5 - (shelf.yTop + shelf.yBottom) / 2) * h;
        const shH = (shelf.yBottom - shelf.yTop) * h;

        const isHighlightedShelf =
          isHighlightedCabinet &&
          String(highlight?.shelfLabel) === String(shelf.label);

        return (
          <group key={shelf.id} position={[0, shY, 0.21]}>
            {/* Shelf background */}
            <mesh>
              <planeGeometry args={[w * 0.96, shH]} />
              <meshBasicMaterial
                color={shelf.color}
                side={THREE.DoubleSide}
                depthWrite={false}
                depthTest={false}
              />
            </mesh>

            {/* Shelf label (uses final label from editor) */}
            <Html
              position={[-w * 0.48 + 0.3, shH / 2 - 0.25, 0.01]}
              center={false}
              distanceFactor={8}
            >
              <div
                style={{
                  padding: "2px 6px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#fff",
                  background: "rgba(0,0,0,0.35)",
                  borderRadius: 4,
                  pointerEvents: "none",
                }}
              >
                {getDisplayShelfLabel(shelf)}
              </div>
            </Html>

            {/* Rows */}
            {shelf.rows.map((row, ri) => {
              const rowCount = shelf.rows.length || 1;
              const rowH = shH / rowCount;
              const ry = shH / 2 - rowH * (ri + 0.5);
              const rowW = w * 0.96;

              const isHighlightedRow =
                isHighlightedShelf &&
                String(highlight?.rowLabel) === String(row.label);

              return (
                <group key={row.id} position={[0, ry, 0.22]}>
                  {/* Divider line between rows */}
                  {ri > 0 && (
                    <mesh position={[0, rowH / 2, 0.001]}>
                      <planeGeometry args={[rowW, 0.01]} />
                      <meshBasicMaterial
                        color="rgba(255,255,255,0.25)"
                        transparent
                        depthWrite={false}
                        depthTest={false}
                      />
                    </mesh>
                  )}

                  {/* Small row label */}
                  <Html position={[0, 0, 0.02]} center distanceFactor={8}>
                    <div
                      style={{
                        padding: "2px 4px",
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.95)",
                        pointerEvents: "none",
                      }}
                    >
                      {row.label}
                    </div>
                  </Html>

                  {/* Red highlight box: ONLY medicine name */}
                  {isHighlightedRow && highlight?.medicineName && (
                    <>
                      <RedRowBorder w={rowW} h={rowH} />
                      <Html
                        position={[0, -rowH * 0.15, 0.03]}
                        center
                        distanceFactor={6}
                      >
                        <div
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 800,
                            color: "#fff",
                            background: "#ef4444",
                            border: "2px solid #fff",
                            boxShadow: "0 4px 12px rgba(239,68,68,0.6)",
                            whiteSpace: "nowrap",
                            pointerEvents: "none",
                            textAlign: "center",
                          }}
                        >
                          {highlight.medicineName}
                        </div>
                      </Html>
                    </>
                  )}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function Wall({ wallId, dataUrl, cabinets, highlight }) {
  const tr = WALL_TRANSFORMS[wallId];

  const texture = useMemo(() => {
    if (!dataUrl) return null;
    const tex = new THREE.TextureLoader().load(dataUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [dataUrl]);

  const wallCabinets = cabinets.filter((c) => c.wall === wallId);

  return (
    <group position={tr.position} rotation={tr.rotation}>
      <mesh>
        <planeGeometry args={[ROOM_SIZE, ROOM_SIZE]} />
        {texture ? (
          <meshBasicMaterial
            map={texture}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={false}
          />
        ) : (
          <meshBasicMaterial
            color="#cccccc"
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={false}
          />
        )}
      </mesh>

      {wallCabinets.map((cab) => (
        <CabinetOverlay
          key={cab.id}
          cabinet={cab}
          highlight={highlight}
        />
      ))}
    </group>
  );
}

function CameraController({ targetWall }) {
  const { camera } = useThree();
  const targetYaw = useRef(null);

  useEffect(() => {
    if (targetWall) targetYaw.current = WALL_TRANSFORMS[targetWall].cameraYaw;
  }, [targetWall]);

  useFrame(() => {
    if (targetYaw.current === null) return;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const currentYaw = Math.atan2(-dir.x, -dir.z);

    let diff = targetYaw.current - currentYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    if (Math.abs(diff) < 0.005) {
      targetYaw.current = null;
      return;
    }

    const ease = 0.06;
    const newYaw = currentYaw + diff * ease;

    // Distance from origin: 6 → camera sits nicely inside the room,
    // far enough to see full cabinet height (no top/bottom truncation).
    const r = 3.8;

    camera.position.set(Math.sin(newYaw) * r, 0, Math.cos(newYaw) * r);
    camera.lookAt(Math.sin(newYaw) * 10, 0, Math.cos(newYaw) * 10);
  });

  return null;
}

export default function PharmacyCubemapViewer3D({
  layout,
  highlight,
  onSave,
  savingState = "idle",
  className,
  style,
}) {
  const { t } = useTranslation();
  const [targetWall, setTargetWall] = useState(null);

  useEffect(() => {
    if (!highlight) return;
    const cab = (layout?.cabinets || []).find(
      (c) => String(c.label) === String(highlight.cabinetLabel)
    );
    if (cab) setTargetWall(cab.wall);
  }, [highlight, layout?.cabinets]);

  const saveLabel =
    savingState === "saving"
      ? t("pharmacy.viewer.saving", "Saving…")
      : savingState === "saved"
      ? t("pharmacy.viewer.saved", "Saved ✓")
      : t("pharmacy.viewer.save", "Save");

  return (
    <div className={className} style={{ position: "relative", ...style }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60, near: 0.01, far: 100 }}
        gl={{ antialias: true }}
        style={{ background: "#d0d0d0" }}
      >
        <ambientLight intensity={1} />

       {targetWall && (
  <Wall
    wallId={targetWall}
    dataUrl={layout?.walls?.find((w) => w.id === targetWall)?.dataUrl}
    cabinets={layout.cabinets}
    highlight={highlight}
  />
)}


        <CameraController targetWall={targetWall} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          rotateSpeed={-0.3}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={(3 * Math.PI) / 4}
        />
      </Canvas>

      {onSave && (
        <button
          onClick={onSave}
          disabled={savingState === "saving"}
          title={saveLabel}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            color: "#fff",
            background:
              savingState === "saved"
                ? "#10b981"
                : savingState === "saving"
                ? "#6b7280"
                : "#3b82f6",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {saveLabel}
        </button>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          padding: 8,
          background: "rgba(0,0,0,0.6)",
          borderRadius: 999,
        }}
      >
        {/*{["front", "right", "back", "left"].map((w) => (
          <button
            key={w}
            onClick={() => setTargetWall(w)}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              border: "none",
              background: "transparent",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "rgba(255,255,255,0.15)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            {t(`pharmacy.viewer.wall.${w}`, w)}
          </button>
        ))}*/}
      </div>
    </div>
  );
}
