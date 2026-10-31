import { isPhoto } from "../../utils/storage";

export const uid = () => window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
export const DEFAULT_EDIT = {
  crop: { x: 0, y: 0, width: 100, height: 100 }, rotation: 0, flipX: false,
  brightness: 100, contrast: 100, saturation: 100, text: "", textColor: "#ffffff", textSize: 6, textX: 50, textY: 85,
};
export const validEdit = (edit) => edit && [0, 90, 180, 270].includes(edit.rotation) && typeof edit.flipX === "boolean" &&
  ["brightness", "contrast", "saturation"].every((key) => Number.isFinite(edit[key]) && edit[key] >= 0 && edit[key] <= 200) &&
  typeof edit.text === "string" && /^#[0-9a-f]{6}$/i.test(edit.textColor) &&
  Number.isFinite(edit.textSize) && edit.textSize >= 2 && edit.textSize <= 15 &&
  [edit.textX, edit.textY].every((value) => Number.isFinite(value) && value >= 0 && value <= 100) &&
  edit.crop && ["x", "y", "width", "height"].every((key) => Number.isFinite(edit.crop[key])) &&
  edit.crop.x >= 0 && edit.crop.y >= 0 && edit.crop.width >= 10 && edit.crop.height >= 10 &&
  edit.crop.x + edit.crop.width <= 100.01 && edit.crop.y + edit.crop.height <= 100.01;
export const validDrafts = (drafts) => drafts && !Array.isArray(drafts) && typeof drafts === "object" && Object.values(drafts).every(validEdit);
export const validBoards = (boards) => Array.isArray(boards) && boards.every((board) =>
  board && typeof board.id === "string" && typeof board.name === "string" && /^#[0-9a-f]{6}$/i.test(board.background) &&
  board.width === 1600 && board.height === 1000 && typeof board.credits === "boolean" &&
  ["freeform", "grid", "collage"].includes(board.layout) && Array.isArray(board.items) && board.items.length <= 24 &&
  board.items.every((item) => item && typeof item.id === "string" && isPhoto(item.photo) &&
    ["x", "y", "width", "height"].every((key) => Number.isFinite(item[key])) && item.x >= 0 && item.y >= 0 &&
    item.width >= 80 && item.height >= 80 && item.x + item.width <= 1600.01 && item.y + item.height <= 1000.01 && ["cover", "contain"].includes(item.fit))
);

export function cropToRatio(width, height, ratio) {
  if (!ratio) return { ...DEFAULT_EDIT.crop };
  const cropWidth = Math.min(width, height * ratio);
  const cropHeight = Math.min(height, width / ratio);
  return { width: cropWidth / width * 100, height: cropHeight / height * 100, x: (width - cropWidth) / width * 50, y: (height - cropHeight) / height * 50 };
}

export function editGeometry(width, height, edit, maxEdge = 2400) {
  const crop = edit.crop;
  const source = { x: width * crop.x / 100, y: height * crop.y / 100, width: width * crop.width / 100, height: height * crop.height / 100 };
  const rotated = edit.rotation % 180 !== 0;
  const scale = Math.min(1, maxEdge / Math.max(source.width, source.height));
  return { source, scale, width: Math.max(1, Math.round((rotated ? source.height : source.width) * scale)), height: Math.max(1, Math.round((rotated ? source.width : source.height) * scale)) };
}

export function adjustPixels(data, edit) {
  const brightness = edit.brightness / 100;
  const contrast = edit.contrast / 100;
  const saturation = edit.saturation / 100;
  for (let i = 0; i < data.length; i += 4) {
    const luminance = data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722;
    for (let channel = 0; channel < 3; channel++) {
      const saturated = luminance + (data[i + channel] - luminance) * saturation;
      data[i + channel] = clamp((saturated * brightness - 128) * contrast + 128, 0, 255);
    }
  }
  return data;
}

export function boundItem(item, board) {
  const width = clamp(item.width, 80, board.width);
  const height = clamp(item.height, 80, board.height);
  return { ...item, width, height, x: clamp(item.x, 0, board.width - width), y: clamp(item.y, 0, board.height - height) };
}

export function layoutBoard(board, layout) {
  if (!board.items.length || layout === "freeform") return { ...board, layout };
  const padding = 48, gap = 24;
  if (layout === "collage" && board.items.length > 1) {
    const leadWidth = (board.width - padding * 2 - gap) * .57;
    const rest = layoutBoard({ ...board, width: board.width - padding * 2 - leadWidth - gap, height: board.height - padding * 2, items: board.items.slice(1) }, "grid");
    return { ...board, layout, items: [{ ...board.items[0], x: padding, y: padding, width: leadWidth, height: board.height - padding * 2 },
      ...rest.items.map((item) => ({ ...item, x: item.x + padding + leadWidth + gap, y: item.y + padding }))] };
  }
  const columns = board.items.length === 1 ? 1 : Math.ceil(Math.sqrt(board.items.length * board.width / board.height));
  const rows = Math.ceil(board.items.length / columns);
  const width = (board.width - padding * 2 - gap * (columns - 1)) / columns;
  const height = (board.height - padding * 2 - gap * (rows - 1)) / rows;
  return { ...board, layout, items: board.items.map((item, index) => ({ ...item, x: padding + index % columns * (width + gap), y: padding + Math.floor(index / columns) * (height + gap), width, height })) };
}

export function addBoardPhotos(board, photos) {
  const items = [...board.items];
  photos.slice(0, 24 - items.length).forEach((photo) => {
    const index = items.length;
    const width = 420;
    items.push(boundItem({ id: uid(), photo, x: 60 + index % 4 * 290, y: 60 + index % 3 * 170,
      width, height: Math.min(650, width * (photo.height || 4) / (photo.width || 3)), fit: "cover" }, board));
  });
  return layoutBoard({ ...board, items }, board.layout);
}

export function createBoard(name, photos = []) {
  return addBoardPhotos({ id: uid(), name: name.trim().slice(0, 60) || "Untitled moodboard", width: 1600, height: 1000, background: "#f4f1e8", layout: "freeform", credits: true, items: [] }, photos);
}
