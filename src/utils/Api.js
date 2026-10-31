import { isPhotoId } from "./sharing";

export const EMPTY_FILTERS = { orientation: "", size: "", color: "" };

export function buildPhotoUrl({ query = "", filters = EMPTY_FILTERS, page = 1 }) {
  const filtered = Object.values(filters).some(Boolean);
  const params = new URLSearchParams({ page, per_page: 24 });
  if (query || filtered) {
    params.set("query", query || "nature");
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
  }
  return `https://api.pexels.com/v1/${query || filtered ? "search" : "curated"}?${params}`;
}

async function requestPhotos(apiUrl, signal, photoId) {
  let requestUrl = apiUrl;
  const options = { signal };
  if (process.env.NODE_ENV === "production") {
    const upstream = new URL(apiUrl);
    upstream.searchParams.set("endpoint", photoId ? "photo" : upstream.pathname.split("/").pop());
    if (photoId) upstream.searchParams.set("id", String(photoId));
    requestUrl = `/api/photos?${upstream.searchParams}`;
  } else {
    options.headers = { Authorization: process.env.REACT_APP_SECRET_KEY || "" };
  }
  const response = await fetch(requestUrl, options);
  if (!response.ok) {
    if (response.status === 404 && photoId) throw new Error("This photo is no longer available. You can still browse other photos.");
    if (response.status === 429) throw new Error("We've reached the photo request limit. Please try again a little later.");
    if (response.status === 401 || response.status === 403) throw new Error("The photo service couldn't authorize this request. Please check the Pexels API key.");
    throw new Error("We couldn't load your photos. Please try again.");
  }
  return response.json();
}

export async function getImages(apiUrl, signal) {
  const data = await requestPhotos(apiUrl, signal);
  if (!Array.isArray(data.photos)) throw new Error("The photo service returned an unexpected response. Please try again.");
  return data;
}

export async function getPhoto(id, signal) {
  if (!isPhotoId(id)) throw new Error("This photo link is invalid.");
  const photo = await requestPhotos(`https://api.pexels.com/v1/photos/${id}`, signal, id);
  if (photo.id !== Number(id) || !photo.src?.original || !(photo.width > 0 && photo.height > 0)) {
    throw new Error("The photo service returned an unexpected response. Please try again.");
  }
  return photo;
}

export function photoSource(photo, width) {
  const source = photo?.src?.original || photo?.src?.large2x || photo?.src?.large;
  if (!source) return "";
  try {
    const url = new URL(source);
    if (url.hostname === "images.pexels.com") {
      url.search = new URLSearchParams({ auto: "compress", cs: "tinysrgb", w: Math.min(width, photo.width || width) }).toString();
    }
    return url.toString();
  } catch { return source; }
}

export function photoSrcSet(photo) {
  const widths = [...new Set([320, 480, 768, 1100].map((width) => Math.min(width, photo.width || width)))];
  return widths.map((width) => `${photoSource(photo, width)} ${width}w`).join(", ");
}
