import { adjustPixels, editGeometry } from "./model";
import { photoSource } from "../../utils/Api";
import { CREATOR_NAME, CREATOR_URL } from "../../utils/credits";

export function loadCanvasImage(source, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let timer;
    const cleanup = () => { clearTimeout(timer); image.onload = null; image.onerror = null; signal?.removeEventListener("abort", abort); };
    const abort = () => { cleanup(); image.src = ""; reject(new DOMException("Cancelled", "AbortError")); };
    image.crossOrigin = "anonymous";
    image.onload = () => { cleanup(); resolve(image); };
    image.onerror = () => { cleanup(); reject(new Error("This photo couldn't be loaded for editing or export. Check your connection and try again.")); };
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    timer = setTimeout(() => { cleanup(); image.src = ""; reject(new Error("The photo took too long to load. Please try again.")); }, 25000);
    image.src = source;
  });
}

export function renderEdit(canvas, image, edit, maxEdge = 1000) {
  const geometry = editGeometry(image.naturalWidth, image.naturalHeight, edit, maxEdge);
  canvas.width = geometry.width;
  canvas.height = geometry.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Your browser couldn't open the photo canvas.");
  const { source, scale } = geometry;
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.scale(edit.flipX ? -1 : 1, 1);
  context.rotate(edit.rotation * Math.PI / 180);
  context.drawImage(image, source.x, source.y, source.width, source.height,
    -source.width * scale / 2, -source.height * scale / 2, source.width * scale, source.height * scale);
  context.restore();
  if (edit.brightness !== 100 || edit.contrast !== 100 || edit.saturation !== 100) {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    adjustPixels(pixels.data, edit);
    context.putImageData(pixels, 0, 0);
  }
  if (edit.text.trim()) {
    const size = Math.max(10, canvas.width * edit.textSize / 100);
    context.font = `600 ${size}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = edit.textColor;
    context.shadowColor = "rgba(0,0,0,.65)";
    context.shadowBlur = size * .13;
    const lines = edit.text.split("\n").slice(0, 3);
    lines.forEach((line, index) => context.fillText(line, canvas.width * edit.textX / 100,
      canvas.height * edit.textY / 100 + (index - (lines.length - 1) / 2) * size * 1.2, canvas.width * .92));
  }
  return geometry;
}

export function canvasBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    try { canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The image couldn't be exported. Please try again.")), type, .94); }
    catch { reject(new Error("This photo doesn't allow image export. Try a different photo.")); }
  });
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportBoard(board, signal) {
  const requested = new Map();
  board.items.forEach((item) => {
    const ratio = (item.photo.width || 3) / (item.photo.height || 4);
    const needed = item.fit === "cover" ? Math.max(item.width, item.height * ratio) : Math.min(item.width, item.height * ratio);
    const width = Math.ceil(Math.min(1600, Math.max(320, needed)));
    const previous = requested.get(item.photo.id);
    if (!previous || previous.width < width) requested.set(item.photo.id, { photo: item.photo, width });
  });
  const sources = new Map();
  requested.forEach(({ photo, width }) => {
    sources.set(photo.id, loadCanvasImage(photoSource(photo, width), signal));
  });
  const images = new Map(await Promise.all([...sources].map(async ([id, promise]) => [id, await promise])));
  if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const canvas = document.createElement("canvas");
  canvas.width = board.width;
  canvas.height = board.height + (board.credits && board.items.length ? 100 : 0);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser couldn't open the moodboard canvas.");
  context.fillStyle = board.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  board.items.forEach((item) => {
    const image = images.get(item.photo.id);
    const scale = item.fit === "contain" ? Math.min(item.width / image.naturalWidth, item.height / image.naturalHeight) : Math.max(item.width / image.naturalWidth, item.height / image.naturalHeight);
    context.save(); context.beginPath(); context.rect(item.x, item.y, item.width, item.height); context.clip();
    context.drawImage(image, item.x + (item.width - image.naturalWidth * scale) / 2,
      item.y + (item.height - image.naturalHeight * scale) / 2, image.naturalWidth * scale, image.naturalHeight * scale);
    context.restore();
  });
  if (board.credits && board.items.length) {
    context.fillStyle = "rgba(255,255,255,.94)";
    context.fillRect(0, board.height, board.width, 100);
    context.fillStyle = "#25362b";
    context.font = "16px sans-serif";
    context.textBaseline = "top";
    const names = [...new Set(board.items.map((item) => item.photo.photographer))].join(" · ");
    context.fillText(`${board.name} — Photo Lab · Made by ${CREATOR_NAME}`, 28, board.height + 12, board.width - 56);
    context.fillText(`Photography: ${names} / Pexels`, 28, board.height + 40, board.width - 56);
    context.font = "14px sans-serif";
    context.fillText(CREATOR_URL, 28, board.height + 68, board.width - 56);
  }
  return canvasBlob(canvas);
}
