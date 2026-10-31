export const isPhotoId = (id) => /^[1-9]\d{0,14}$/.test(String(id));

export function photoShareUrl(id, location = window.location.href) {
  if (!isPhotoId(id)) throw new Error("Invalid photo ID");
  const url = new URL(location);
  url.search = "";
  url.hash = "";
  url.searchParams.set("photo", String(id));
  return url.href;
}
