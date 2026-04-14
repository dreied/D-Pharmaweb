// src/services/thermalPrinter.js
// Thermal Printer Service — USB (Web Serial) & Bluetooth (Web Bluetooth)
// Renders receipt as image for full Arabic text support

const ESC = 0x1b;
const GS = 0x1d;

const COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]),
  CUT: new Uint8Array([GS, 0x56, 0x00]),
  FEED_LINES: (n) => new Uint8Array([ESC, 0x64, n]),
};

let currentConnection = null;
const LAST_PRINTER_KEY = "last_printer_info";

// ─── Remember last printer ───
export function saveLastPrinter(info) {
  try {
    localStorage.setItem(LAST_PRINTER_KEY, JSON.stringify(info));
  } catch (e) {
    console.warn("Failed to save last printer:", e);
  }
}

export function loadLastPrinter() {
  try {
    const raw = localStorage.getItem(LAST_PRINTER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.warn("Failed to load last printer:", e);
    return null;
  }
}

// ─── USB (Web Serial API) ───
export async function connectUSB() {
  if (!("serial" in navigator)) {
    throw new Error("Web Serial API غير مدعوم — استخدم Chrome أو Edge");
  }

  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
  const writer = port.writable.getWriter();

  currentConnection = {
    type: "usb",
    model: "GENERIC",
    dpi: 203,
    paperWidth: 80, // mm (assumed)
    write: async (data) => await writer.write(data),
    disconnect: async () => {
      writer.releaseLock();
      await port.close();
      currentConnection = null;
    },
  };

  saveLastPrinter({ type: "usb" });
  return currentConnection;
}

// ─── Internal: create Bluetooth connection from device ───
async function createBluetoothConnection(device) {
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(
    "000018f0-0000-1000-8000-00805f9b34fb"
  );
  const characteristic = await service.getCharacteristic(
    "00002af1-0000-1000-8000-00805f9b34fb"
  );

  currentConnection = {
    type: "bluetooth",
    model: "GENERIC",
    dpi: 203,
    paperWidth: 58, // common default; you can override later
    deviceId: device.id,
    write: async (data) => {
      const chunkSize = 100;
      for (let i = 0; i < data.length; i += chunkSize) {
        await characteristic.writeValue(data.slice(i, i + chunkSize));
        await new Promise((r) => setTimeout(r, 50));
      }
    },
    disconnect: async () => {
      if (device.gatt.connected) {
        device.gatt.disconnect();
      }
      currentConnection = null;
    },
  };

  saveLastPrinter({ type: "bluetooth", deviceId: device.id });
  return currentConnection;
}

// ─── Bluetooth (Web Bluetooth API) — manual connect ───
export async function connectBluetooth() {
  if (!("bluetooth" in navigator)) {
    throw new Error("Web Bluetooth API غير مدعوم — استخدم Chrome");
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
    optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
  });

  return await createBluetoothConnection(device);
}

// ─── Bluetooth — silent auto‑connect last device ───
export async function autoConnectBluetooth(last) {
  try {
    if (!("bluetooth" in navigator)) return null;
    if (!last?.deviceId) return null;

    const devices = await navigator.bluetooth.getDevices();
    if (!devices.length) return null;

    const device = devices.find((d) => d.id === last.deviceId);
    if (!device) return null;

    return await createBluetoothConnection(device);
  } catch (err) {
    console.warn("Silent Bluetooth auto‑connect failed:", err);
    return null;
  }
}

// ─── Image → ESC/POS raster ───
function imageToEscPos(canvas) {
  const ctx = canvas.getContext("2d");
  const { width, height } = canvas;
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const widthBytes = Math.ceil(width / 8);

  const result = [
    GS,
    0x76,
    0x30,
    0x00,
    widthBytes & 0xff,
    (widthBytes >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
  ];

  for (let y = 0; y < height; y++) {
    for (let bx = 0; bx < widthBytes; bx++) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = bx * 8 + bit;
        if (x < width) {
          const idx = (y * width + x) * 4;
          const gray =
            0.299 * pixels[idx] +
            0.587 * pixels[idx + 1] +
            0.114 * pixels[idx + 2];
          if (gray < 128) byte |= 1 << (7 - bit);
        }
      }
      result.push(byte);
    }
  }
  return new Uint8Array(result);
}

// ─── Render HTML element → Canvas ───
export async function renderReceiptCanvas(element, widthPx = 576) {
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    width: widthPx,
    windowWidth: widthPx,
  });

  const resized = document.createElement("canvas");
  resized.width = widthPx;
  resized.height = Math.round((canvas.height / canvas.width) * widthPx);
  resized.getContext("2d").drawImage(canvas, 0, 0, resized.width, resized.height);

  return resized;
}

// ─── Render HTML element → ESC/POS image ───
export async function renderReceiptToImage(element, widthPx = 576) {
  const canvas = await renderReceiptCanvas(element, widthPx);
  return imageToEscPos(canvas);
}

// ─── Print ───
export async function printReceipt(imageData, connection) {
  const conn = connection || currentConnection;
  if (!conn) throw new Error("لا يوجد اتصال بالطابعة");

  await conn.write(COMMANDS.INIT);
  await conn.write(imageData);
  await conn.write(COMMANDS.FEED_LINES(4));
  await conn.write(COMMANDS.CUT);
}

export function getCurrentConnection() {
  return currentConnection;
}

export async function disconnectPrinter() {
  if (currentConnection) await currentConnection.disconnect();
}
