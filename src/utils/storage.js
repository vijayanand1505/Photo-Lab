import { useEffect, useState } from "react";

export function readStored(key, fallback, validate = () => true) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value !== null && validate(value) ? value : fallback;
  } catch { return fallback; }
}

export const isPhoto = (photo) => photo && typeof photo === "object" && Number.isFinite(photo.id) && photo.src && typeof photo.src.original === "string";
export const validFavorites = (value) => Array.isArray(value) && value.every(isPhoto);
export const validCollections = (value) => Array.isArray(value) && value.every((collection) =>
  collection && typeof collection.id === "string" && typeof collection.name === "string" && validFavorites(collection.photos)
);

export function usePersistentState(key, fallback, validate, onError) {
  const [value, setValue] = useState(() => readStored(key, fallback, validate));
  const [persistence, setPersistence] = useState({ value: null, status: "saving" });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setPersistence({ value, status: "saved" });
    }
    catch {
      setPersistence({ value, status: "temporary" });
      onError("Your browser couldn't save these changes. They will only last for this visit.", "error");
    }
  }, [key, value, onError]);
  return [value, setValue, persistence.value === value ? persistence.status : "saving"];
}
