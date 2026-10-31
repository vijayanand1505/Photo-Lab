import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../App";
import AppContext from "../../utils/Context";

const photos = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, alt: `Creative photo ${index + 1}`, width: 1200 + index * 100, height: 1800, photographer: `Artist ${index + 1}`, photographer_url: "https://www.pexels.com/@artist", url: "https://www.pexels.com/photo/1", avg_color: "#789080", src: { original: `https://images.pexels.com/photos/${index + 1}/image.jpeg` } }));
const mount = () => render(<AppContext><App /></AppContext>);
const nav = (name) => within(screen.getByRole("navigation", { name: "Main navigation" })).getByRole("button", { name });
const tools = (index = 1) => fireEvent.click(screen.getByRole("button", { name: `Photo tools for Creative photo ${index}` }));
const choosePhotos = (count) => {
  const picker = screen.getByRole("dialog", { name: /Add photos/ });
  for (let index = 1; index <= count; index++) fireEvent.click(within(picker).getByRole("button", { name: `Choose Creative photo ${index}` }));
  fireEvent.click(within(picker).getByRole("button", { name: `Add ${count} ${count === 1 ? "photo" : "photos"}` }));
};

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ photos }) });
});
afterEach(() => jest.restoreAllMocks());

test("homepage tool cards open the editor chooser and new moodboard form", async () => {
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(screen.getByRole("button", { name: "Edit a photo" }));
  expect(screen.getByRole("dialog", { name: "Choose a photo to edit" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close photo chooser" }));
  fireEvent.click(screen.getByRole("button", { name: "Create a moodboard" }));
  expect(screen.getByRole("dialog", { name: "New moodboard" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Moodboard name"), { target: { value: "New ideas" } });
  fireEvent.click(screen.getByRole("button", { name: "Create moodboard" }));
  expect(screen.getByText("Saved automatically in this browser")).toBeInTheDocument();
});

test("moodboard save status explains when storage is unavailable", async () => {
  jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota exceeded"); });
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(screen.getByRole("button", { name: "Create a moodboard" }));
  fireEvent.change(screen.getByLabelText("Moodboard name"), { target: { value: "Temporary ideas" } });
  fireEvent.click(screen.getByRole("button", { name: "Create moodboard" }));
  expect(screen.getByText("Not saved · Available for this visit only")).toBeInTheDocument();
  expect(screen.queryByText("Saved automatically in this browser")).not.toBeInTheDocument();
});

test("editor adjustments support undo, redo, and persistent text drafts", async () => {
  const app = mount();
  await screen.findByRole("button", { name: "View Creative photo 1" });
  tools(); fireEvent.click(screen.getByRole("button", { name: "Edit photo" }));
  const editor = screen.getByRole("dialog", { name: "Photo editor" });
  fireEvent.change(within(editor).getByRole("slider", { name: "Brightness" }), { target: { value: "150" } });
  fireEvent.click(within(editor).getByRole("button", { name: "Undo" }));
  expect(within(editor).getByRole("slider", { name: "Brightness" })).toHaveValue("100");
  fireEvent.click(within(editor).getByRole("button", { name: "Redo" }));
  expect(within(editor).getByRole("slider", { name: "Brightness" })).toHaveValue("150");
  fireEvent.focus(within(editor).getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("tooltip", { name: "Undo (Ctrl/Cmd+Z)" })).toBeVisible();
  fireEvent.keyDown(within(editor).getByRole("button", { name: "Undo" }), { key: "Escape" });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(editor).toBeInTheDocument();
  fireEvent.click(within(editor).getByRole("button", { name: "Text", exact: true }));
  fireEvent.change(within(editor).getByLabelText("Overlay text"), { target: { value: "A brighter day" } });
  expect(JSON.parse(localStorage.getItem("photo-lab:edit-drafts"))[1].text).toBe("A brighter day");
  fireEvent.click(within(editor).getByRole("button", { name: "Close photo editor" }));
  app.unmount();
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  tools(); fireEvent.click(screen.getByRole("button", { name: "Edit photo" }));
  expect(screen.getByRole("slider", { name: "Brightness" })).toHaveValue("150");
  fireEvent.click(screen.getByRole("button", { name: "Text", exact: true }));
  expect(screen.getByLabelText("Overlay text")).toHaveValue("A brighter day");
});

test("comparison shows metadata, fits images, and allows nested editing", async () => {
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(screen.getByRole("button", { name: "Compare photos" }));
  fireEvent.click(screen.getByRole("button", { name: "Add photos", exact: true })); choosePhotos(2);
  const comparison = screen.getByRole("dialog", { name: "Compare photos" });
  expect(within(comparison).getAllByText("Portrait")).toHaveLength(2);
  expect(within(comparison).getByText("2.2 MP")).toBeInTheDocument();
  fireEvent.change(within(comparison).getByLabelText("Comparison image fit"), { target: { value: "cover" } });
  expect(within(comparison).getByAltText("Creative photo 1")).toHaveStyle({ objectFit: "cover" });
  fireEvent.click(within(comparison).getByRole("button", { name: "Edit Creative photo 1" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "Close photo editor" }), { key: "Escape" });
  expect(screen.getByRole("dialog", { name: "Compare photos" })).toBeInTheDocument();
  fireEvent.click(within(comparison).getByRole("button", { name: "Remove Creative photo 1 from comparison" }));
  expect(within(comparison).getByText(/Add at least two/)).toBeInTheDocument();
  fireEvent.click(within(comparison).getByRole("button", { name: "Close photo comparison" }));
  expect(screen.getByRole("button", { name: "Compare", exact: true })).toBeDisabled();
});

test("comparison selection is limited to four photos", async () => {
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(screen.getByRole("button", { name: "Compare photos" }));
  fireEvent.click(screen.getByRole("button", { name: "Add photos", exact: true })); choosePhotos(4);
  expect(screen.getByRole("button", { name: "Add photos", exact: true })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Close photo comparison" }));
  tools(5); fireEvent.click(screen.getByRole("button", { name: /Select for comparison/ }));
  expect(screen.getByText(/up to four photos/)).toBeInTheDocument();
  expect(document.querySelectorAll(".photo-card.is-comparing")).toHaveLength(4);
});

test("moodboards persist layouts, keyboard movement, resizing, duplication, and removal", async () => {
  const app = mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(nav(/Moodboards/)); fireEvent.click(screen.getByRole("button", { name: "New moodboard" }));
  fireEvent.change(screen.getByLabelText("Moodboard name"), { target: { value: "Summer ideas" } });
  fireEvent.click(screen.getByRole("button", { name: "Create moodboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Add photos", exact: true })); choosePhotos(2);
  fireEvent.change(screen.getByLabelText("Moodboard layout"), { target: { value: "grid" } });
  const stored = () => JSON.parse(localStorage.getItem("photo-lab:boards"))[0];
  const originalX = stored().items[0].x;
  const item = screen.getByRole("button", { name: "Move Creative photo 1" });
  fireEvent.focus(item); fireEvent.keyDown(item, { key: "ArrowRight" });
  await waitFor(() => expect(stored().items[0].x).toBe(originalX + 10));
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(stored().items[0].x).toBe(originalX);
  fireEvent.change(screen.getByRole("slider", { name: "Photo width" }), { target: { value: "600" } });
  expect(stored().items[0].width).toBe(600);
  fireEvent.click(screen.getByRole("button", { name: "Duplicate" })); expect(stored().items).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" })); expect(stored().items).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Moodboard background"), { target: { value: "#aabbcc" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Include photo credits" }));
  app.unmount(); mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(nav(/Moodboards/)); fireEvent.click(screen.getByRole("button", { name: "Open moodboard Summer ideas" }));
  expect(screen.getByLabelText("Moodboard background")).toHaveValue("#aabbcc");
  expect(screen.getByRole("checkbox", { name: "Include photo credits" })).not.toBeChecked();
  expect(screen.getAllByRole("button", { name: /Move Creative photo/ })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Delete this moodboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Keep moodboard" }));
  expect(screen.getByLabelText("Moodboard name")).toHaveValue("Summer ideas");
  fireEvent.click(screen.getByRole("button", { name: "Delete this moodboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete moodboard", exact: true }));
  expect(screen.getByText("No moodboards yet")).toBeInTheDocument();
});

test("a gallery photo can create a moodboard directly from its tools", async () => {
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  tools(); fireEvent.click(screen.getByRole("button", { name: /Add to moodboard/ }));
  fireEvent.change(screen.getByLabelText("Create a new moodboard"), { target: { value: "Forest story" } });
  fireEvent.click(screen.getByRole("button", { name: "Create & add photo" }));
  fireEvent.click(nav(/Moodboards/)); fireEvent.click(screen.getByRole("button", { name: "Open moodboard Forest story" }));
  expect(screen.getByRole("button", { name: "Move Creative photo 1" })).toBeInTheDocument();
});

test("crop presets describe the exported orientation after rotation and stay in sync with undo", async () => {
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  tools(); fireEvent.click(screen.getByRole("button", { name: "Edit photo", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Crop", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Rotate 90°" }));
  fireEvent.change(screen.getByLabelText("Crop ratio"), { target: { value: "0.8" } });
  expect(screen.getByText("960 × 1200 px export")).toBeInTheDocument();
  expect(screen.getByLabelText("Crop ratio")).toHaveValue("0.8");
  fireEvent.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByLabelText("Crop ratio")).toHaveValue("0");
  expect(screen.getByText("1800 × 1200 px export")).toBeInTheDocument();
});

test("moodboard undo restores removed items without discarding later edits or navigation", async () => {
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(screen.getByRole("button", { name: "Create a moodboard" }));
  fireEvent.change(screen.getByLabelText("Moodboard name"), { target: { value: "Restore ideas" } });
  fireEvent.click(screen.getByRole("button", { name: "Create moodboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Add photos", exact: true })); choosePhotos(2);
  fireEvent.click(screen.getByRole("button", { name: "Move Creative photo 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove photo", exact: true }));
  fireEvent.change(screen.getByLabelText("Moodboard background"), { target: { value: "#123456" } });
  fireEvent.click(nav(/Explore/)); fireEvent.click(nav(/Moodboards/));
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  expect(screen.getByRole("button", { name: "Move Creative photo 1" })).toBeInTheDocument();
  expect(screen.getByLabelText("Moodboard background")).toHaveValue("#123456");
  fireEvent.click(screen.getByRole("button", { name: "Delete this moodboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete moodboard", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  fireEvent.click(screen.getByRole("button", { name: "Open moodboard Restore ideas" }));
  expect(screen.getAllByRole("button", { name: /Move Creative photo/ })).toHaveLength(2);
});

test("canvas zoom, pan, fit, and mobile quick actions preserve export geometry", async () => {
  mount(); await screen.findByRole("button", { name: "View Creative photo 1" });
  fireEvent.click(screen.getByRole("button", { name: "Create a moodboard" }));
  fireEvent.change(screen.getByLabelText("Moodboard name"), { target: { value: "Canvas controls" } });
  fireEvent.click(screen.getByRole("button", { name: "Create moodboard" }));
  fireEvent.click(screen.getByRole("button", { name: "Add photos", exact: true })); choosePhotos(1);
  fireEvent.click(screen.getByRole("button", { name: "Move Creative photo 1" }));
  const stored = () => JSON.parse(localStorage.getItem("photo-lab:boards"))[0];
  const original = JSON.stringify(stored());
  fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
  expect(screen.getByLabelText("Canvas zoom")).toHaveTextContent("125%");
  fireEvent.click(screen.getByRole("button", { name: "Pan canvas" }));
  expect(screen.getByRole("button", { name: "Pan canvas" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Fit canvas to screen" }));
  expect(screen.getByLabelText("Canvas zoom")).toHaveTextContent("100%");
  expect(JSON.stringify(stored())).toBe(original);
  fireEvent.click(screen.getByRole("button", { name: "Duplicate selected photo" }));
  expect(stored().items).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Center selected photo" }));
  const item = stored().items[1];
  expect(item.x).toBe((1600 - item.width) / 2);
  fireEvent.click(screen.getByRole("button", { name: "Remove selected photo" }));
  fireEvent.click(screen.getByRole("button", { name: "Undo removal" }));
  expect(stored().items).toHaveLength(2);
});
