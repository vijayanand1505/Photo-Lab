import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SharePhoto from "./SharePhoto";

const photo = { id: 417074, alt: "Mountain lake", photographer: "Pixabay", width: 1000, height: 667, src: { original: "https://images.pexels.com/photos/417074/photo.jpeg" } };
const clipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");
const nativeShare = Object.getOwnPropertyDescriptor(navigator, "share");

beforeEach(() => {
  window.history.replaceState(null, "", "/?query=private#gallery");
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: jest.fn().mockResolvedValue() } });
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
});
afterEach(() => {
  if (clipboard) Object.defineProperty(navigator, "clipboard", clipboard); else delete navigator.clipboard;
  if (nativeShare) Object.defineProperty(navigator, "share", nativeShare); else delete navigator.share;
  window.history.replaceState(null, "", "/");
});

test("copies a Photo Lab link containing only the selected photo ID", async () => {
  render(<SharePhoto photo={photo} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  await screen.findByRole("button", { name: "Link copied" });
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith("http://localhost/?photo=417074");
  expect(screen.getByRole("status")).toHaveTextContent("Anyone with this link can open the photo in Photo Lab");
  expect(screen.queryByRole("button", { name: "Share via…" })).not.toBeInTheDocument();
});

test.each(["unavailable", "denied"])("offers manual copying when the clipboard is %s", async (failure) => {
  if (failure === "unavailable") Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  else navigator.clipboard.writeText.mockRejectedValue(new Error("Permission denied"));
  render(<SharePhoto photo={photo} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Copy link" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Couldn't copy automatically"));
  const input = screen.getByLabelText("Photo link");
  expect(input).toHaveFocus();
  expect(input.selectionEnd - input.selectionStart).toBe(input.value.length);
});

test("native sharing sends the same project link with photographer attribution", async () => {
  const share = jest.fn().mockResolvedValue();
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  render(<SharePhoto photo={photo} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Share via…" }));
  expect(share).toHaveBeenCalledWith({ title: "Photo Lab", text: "Photo by Pixabay on Photo Lab", url: "http://localhost/?photo=417074" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Share via…" })).toBeEnabled());
});

test.each([["AbortError", ""], ["NotAllowedError", "Copy the link instead"]])("native %s leaves a usable copy fallback", async (name, message) => {
  Object.defineProperty(navigator, "share", { configurable: true, value: jest.fn().mockRejectedValue(Object.assign(new Error(), { name })) });
  render(<SharePhoto photo={photo} onClose={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Share via…" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Share via…" })).toBeEnabled());
  if (message) expect(screen.getByRole("status")).toHaveTextContent(message);
  else expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(screen.getByRole("button", { name: "Copy link" })).toBeEnabled();
});
