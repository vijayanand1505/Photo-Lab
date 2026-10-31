import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import AppContext from "./utils/Context";

const photo = (id, alt) => ({ id, alt, width: 1800, height: 2400, photographer: `Artist ${id}`, photographer_url: `https://www.pexels.com/@artist${id}`, url: `https://www.pexels.com/photo/${id}`, avg_color: "#789080", src: { original: `https://images.pexels.com/photos/${id}/photo.jpeg` } });
const first = photo(1, "Forest morning");
const second = photo(2, "Ocean afternoon");
const response = (photos = [first, second], extra = {}) => ({ ok: true, json: async () => ({ photos, ...extra }) });
const mount = () => render(<AppContext><App /></AppContext>);
const submitSearch = (value) => {
  fireEvent.change(screen.getByRole("searchbox"), { target: { value } });
  fireEvent.submit(screen.getByRole("search"));
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = "light";
  global.fetch = jest.fn().mockResolvedValue(response());
});

afterEach(() => jest.restoreAllMocks());

test("search waits for submit, encodes input, and resets pagination", async () => {
  fetch.mockResolvedValue(response([first], { next_page: "page2" }));
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "ocean & sky" } });
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Load more photos" }));
  await waitFor(() => expect(new URL(fetch.mock.calls[1][0]).searchParams.get("page")).toBe("2"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Load more photos" })).toBeEnabled());
  fireEvent.submit(screen.getByRole("search"));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  const url = new URL(fetch.mock.calls[2][0]);
  expect(url.searchParams.get("query")).toBe("ocean & sky");
  expect(url.searchParams.get("page")).toBe("1");
  await screen.findByRole("button", { name: "View Forest morning" });
  expect(screen.getAllByRole("button", { name: "View Forest morning" })).toHaveLength(1);
});

test("outdated requests are aborted and cannot replace newer results", async () => {
  let resolveOld;
  fetch.mockResolvedValueOnce(response([first])).mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce(response([second]));
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  submitSearch("forest");
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const signal = fetch.mock.calls[1][1].signal;
  submitSearch("ocean");
  await screen.findByRole("button", { name: "View Ocean afternoon" });
  expect(signal.aborted).toBe(true);
  await act(async () => resolveOld(response([first])));
  expect(screen.queryByRole("button", { name: "View Forest morning" })).not.toBeInTheDocument();
});

test("a failed next page keeps existing photos and retry requests the failed page", async () => {
  fetch.mockResolvedValueOnce(response([first], { next_page: "page2" })).mockRejectedValueOnce(new TypeError("network")).mockResolvedValueOnce(response([first, second]));
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.click(screen.getByRole("button", { name: "Load more photos" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "View Forest morning" })).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Loading photos" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  await screen.findByRole("button", { name: "View Ocean afternoon" });
  expect(new URL(fetch.mock.calls[2][0]).searchParams.get("page")).toBe("2");
  expect(screen.getAllByRole("button", { name: "View Forest morning" })).toHaveLength(1);
});

test("filters use supported search parameters and can be removed", async () => {
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.change(screen.getByRole("combobox", { name: "Orientation" }), { target: { value: "portrait" } });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  const url = new URL(fetch.mock.calls[1][0]);
  expect(url.pathname).toBe("/v1/search");
  expect(url.searchParams.get("query")).toBe("nature");
  expect(url.searchParams.get("orientation")).toBe("portrait");
  await screen.findByRole("button", { name: "View Forest morning" });
  expect(screen.queryByRole("combobox", { name: "Image size" })).not.toBeInTheDocument();
  const filtersToggle = screen.getByRole("button", { name: "Filters" });
  fireEvent.click(filtersToggle);
  expect(filtersToggle).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByRole("button", { name: "Filter by blue" }));
  await waitFor(() => expect(new URL(fetch.mock.calls[2][0]).searchParams.get("color")).toBe("blue"));
  expect(filtersToggle).toHaveTextContent("1");
  fireEvent.keyDown(screen.getByRole("button", { name: "Filter by blue" }), { key: "Escape" });
  expect(filtersToggle).toHaveFocus();
  expect(filtersToggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByRole("button", { name: "Remove color filter: blue" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
  await waitFor(() => expect(new URL(fetch.mock.calls[3][0]).pathname).toBe("/v1/curated"));
  await screen.findByRole("button", { name: "View Forest morning" });
});

test("favorites act independently of previews and persist after remounting", async () => {
  const app = mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.click(screen.getByRole("button", { name: "Add to favorites: Forest morning" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("photo-lab:favorites"))[0].id).toBe(1);
  expect(screen.getByText("Saved", { exact: false, selector: ".saved-badge" })).toBeVisible();
  app.unmount();
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.click(screen.getByRole("button", { name: /Favorites/ }));
  expect(screen.getByRole("button", { name: "View Forest morning" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "View Ocean afternoon" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Remove from favorites: Forest morning" }));
  expect(screen.getByText("No favorites yet")).toBeInTheDocument();
});

test("collections support adding, removing, renaming, and confirmed deletion", async () => {
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.click(screen.getByRole("button", { name: "Add photo by Artist 1 to a collection" }));
  let dialog = screen.getByRole("dialog", { name: "Save to a collection" });
  fireEvent.change(within(dialog).getByLabelText("Create a new collection"), { target: { value: "Moodboard" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Create" }));
  expect(within(dialog).getByRole("button", { name: /Moodboard/ })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(within(dialog).getByRole("button", { name: /Moodboard/ }));
  expect(within(dialog).getByRole("button", { name: /Moodboard/ })).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(within(dialog).getByRole("button", { name: /Moodboard/ }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Done" }));
  fireEvent.click(screen.getByRole("button", { name: /Collections/ }));
  fireEvent.click(screen.getByRole("button", { name: "Open Moodboard, 1 photos" }));
  expect(screen.getByRole("button", { name: "View Forest morning" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Rename" }));
  dialog = screen.getByRole("dialog", { name: "Rename collection" });
  fireEvent.change(within(dialog).getByLabelText("Collection name"), { target: { value: "Quiet moments" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
  expect(screen.getByRole("heading", { name: "Quiet moments" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete Quiet moments" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep collection" }));
  expect(screen.getByRole("heading", { name: "Quiet moments" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete Quiet moments" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete collection" }));
  expect(screen.getByText("No collections yet")).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("photo-lab:collections"))).toEqual([]);
});

test("viewer uses loaded photos, navigates by keyboard, and restores focus", async () => {
  mount();
  const open = await screen.findByRole("button", { name: "View Forest morning" });
  open.focus();
  fireEvent.click(open);
  const close = screen.getByRole("button", { name: "Close photo preview" });
  expect(close).toHaveFocus();
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.keyDown(close, { key: "ArrowRight" });
  expect(screen.getByRole("dialog", { name: "Photo by Artist 2" })).toBeInTheDocument();
  fireEvent.keyDown(close, { key: "ArrowLeft" });
  expect(screen.getByRole("dialog", { name: "Photo by Artist 1" })).toBeInTheDocument();
  fireEvent.keyDown(close, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(open).toHaveFocus();
});

test("theme choice survives a new session and malformed saved data does not crash", async () => {
  localStorage.setItem("photo-lab:favorites", "invalid json");
  localStorage.setItem("photo-lab:collections", JSON.stringify([{ bad: true }]));
  const app = mount();
  fireEvent.click(screen.getByRole("button", { name: "Switch to dark mode" }));
  expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  expect(JSON.parse(localStorage.getItem("photo-lab:theme"))).toBe("dark");
  app.unmount();
  mount();
  expect(screen.getByRole("button", { name: "Switch to light mode" })).toBeInTheDocument();
  await screen.findByRole("button", { name: "View Forest morning" });
});

test("empty search results offer a reset that clears both query and filters", async () => {
  fetch.mockResolvedValueOnce(response()).mockResolvedValueOnce(response([])).mockResolvedValueOnce(response());
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  submitSearch("unfindable");
  fireEvent.click(await screen.findByRole("button", { name: "Clear search & filters" }));
  await screen.findByRole("button", { name: "View Forest morning" });
  expect(screen.getByRole("searchbox")).toHaveValue("");
  expect(new URL(fetch.mock.calls[2][0]).pathname).toBe("/v1/curated");
});

test("downloads use the selected dimensions and release their object URL", async () => {
  URL.createObjectURL = jest.fn(() => "blob:photo");
  URL.revokeObjectURL = jest.fn();
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  fetch.mockResolvedValueOnce(response()).mockResolvedValueOnce({ ok: true, headers: { get: () => null }, blob: async () => new Blob(["photo"], { type: "image/jpeg" }) });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "View Forest morning" }));
  fireEvent.change(screen.getByLabelText("Download size"), { target: { value: "small" } });
  fireEvent.click(screen.getByRole("button", { name: "Download photo" }));
  await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  expect(new URL(fetch.mock.calls[1][0]).searchParams.get("w")).toBe("640");
  expect(await screen.findByRole("button", { name: "Download photo" })).toBeEnabled();
  await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:photo"), { timeout: 2000 });
});

test.each([[401, /couldn't authorize/], [429, /request limit/]])("HTTP %s errors stop loading and offer recovery", async (status, message) => {
  fetch.mockResolvedValueOnce({ ok: false, status });
  mount();
  const alert = await screen.findByRole("alert");
  expect(within(alert).getByText(message)).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Loading photos" })).not.toBeInTheDocument();
  fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
  await screen.findByRole("button", { name: "View Forest morning" });
});

test("storage failures keep favorites usable and explain that they are temporary", async () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota exceeded"); });
  mount();
  await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.click(screen.getByRole("button", { name: "Add to favorites: Forest morning" }));
  expect(screen.getByRole("button", { name: "Remove from favorites: Forest morning" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/only last for this visit/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Favorites/ }));
  expect(screen.getByRole("button", { name: "View Forest morning" })).toBeInTheDocument();
});

test("a failed download shows feedback and can be retried", async () => {
  jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  fetch.mockResolvedValueOnce(response()).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true, headers: { get: () => null }, blob: async () => new Blob(["photo"], { type: "image/jpeg" }) });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "View Forest morning" }));
  fireEvent.click(screen.getByRole("button", { name: "Download photo" }));
  await screen.findByText(/Couldn't download this photo/);
  fireEvent.click(screen.getByRole("button", { name: "Download photo" }));
  await screen.findByText(/Photo downloaded/);
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("streamed downloads report actual progress and can be cancelled", async () => {
  fetch.mockResolvedValueOnce(response()).mockImplementationOnce(async (url, { signal }) => {
    let reads = 0;
    return { ok: true, headers: { get: (name) => name === "content-length" ? "4" : "image/jpeg" }, body: { getReader: () => ({ read: () => {
      if (reads++ === 0) return Promise.resolve({ value: new Uint8Array([1, 2]), done: false });
      return new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new DOMException("Cancelled", "AbortError")), { once: true }));
    } }) } };
  });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "View Forest morning" }));
  fireEvent.click(screen.getByRole("button", { name: "Download photo" }));
  await waitFor(() => expect(screen.getByRole("progressbar")).toHaveAttribute("value", "50"));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel download" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Download photo" })).toBeEnabled());
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByText(/Couldn't download/)).not.toBeInTheDocument();
});

test("unmounting nested dialogs restores page scrolling", async () => {
  const app = mount();
  fireEvent.click(await screen.findByRole("button", { name: "View Forest morning" }));
  fireEvent.click(screen.getByRole("button", { name: "Save photo to a collection" }));
  expect(screen.getAllByRole("dialog")).toHaveLength(2);
  expect(document.body.style.overflow).toBe("hidden");
  app.unmount();
  expect(document.body.style.overflow).toBe("");
});

test("undoing favorite removals preserves later additions and avoids duplicates", async () => {
  mount(); await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.click(screen.getByRole("button", { name: "Add to favorites: Forest morning" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to favorites: Ocean afternoon" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from favorites: Forest morning" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove from favorites: Ocean afternoon" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to favorites: Forest morning" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  expect(JSON.parse(localStorage.getItem("photo-lab:favorites")).map((photo) => photo.id)).toEqual([2, 1]);
});

test("a deleted collection and its previously removed photo can both be restored", async () => {
  localStorage.setItem("photo-lab:collections", JSON.stringify([{ id: "saved", name: "Saved project", photos: [first, second] }]));
  mount(); await screen.findByRole("button", { name: "View Forest morning" });
  fireEvent.click(screen.getByRole("button", { name: /^Collections/ }));
  fireEvent.click(screen.getByRole("button", { name: "Open Saved project, 2 photos" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove photo by Artist 1 from Saved project" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Saved project" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete collection" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  fireEvent.click(screen.getByRole("button", { name: "Open Saved project, 1 photos" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  expect(screen.getByRole("button", { name: "View Forest morning" })).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem("photo-lab:collections"))[0].photos.map((photo) => photo.id)).toEqual([1, 2]);
});
