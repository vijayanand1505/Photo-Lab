import { useState } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import useSharedPhoto from "./useSharedPhoto";

const photo = { id: 417074, width: 1000, height: 667, src: { original: "https://images.pexels.com/photos/417074/photo.jpeg" } };
const response = () => ({ ok: true, json: async () => photo });
function useReceiver() {
  const [viewer, setViewer] = useState(null);
  return { viewer, ...useSharedPhoto(setViewer) };
}
beforeEach(() => {
  window.history.replaceState(null, "", "/?photo=417074");
  global.fetch = jest.fn().mockResolvedValue(response());
});
afterEach(() => window.history.replaceState(null, "", "/"));

test("opens the shared photo independently of gallery pages and works after a reload", async () => {
  const first = renderHook(useReceiver);
  await waitFor(() => expect(first.result.current.viewer?.photos[0]).toEqual(photo));
  expect(fetch.mock.calls[0][0]).toBe("https://api.pexels.com/v1/photos/417074");
  first.unmount();
  const freshSession = renderHook(useReceiver);
  await waitFor(() => expect(freshSession.result.current.viewer?.photos[0]).toEqual(photo));
  expect(freshSession.result.current.status).toBeNull();
});

test("closing a pending link aborts the request and prevents a late viewer", async () => {
  let resolve;
  fetch.mockImplementation(() => new Promise((complete) => { resolve = complete; }));
  window.history.replaceState(null, "", "/?photo=417074&keep=yes");
  const { result } = renderHook(useReceiver);
  expect(result.current.status.loading).toBe(true);
  const signal = fetch.mock.calls[0][1].signal;
  act(() => result.current.close());
  expect(signal.aborted).toBe(true);
  expect(window.location.search).toBe("?keep=yes");
  await act(async () => resolve(response()));
  expect(result.current.viewer).toBeNull();
  expect(result.current.status).toBeNull();
});

test("network errors can be retried and missing photos have a helpful error", async () => {
  fetch.mockRejectedValueOnce(new TypeError("offline"));
  const { result } = renderHook(useReceiver);
  await waitFor(() => expect(result.current.status?.error).toMatch(/Check your connection/));
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.viewer?.photos[0]).toEqual(photo));
});

test("a removed photo does not open an unrelated gallery photo", async () => {
  fetch.mockResolvedValueOnce({ ok: false, status: 404 });
  const { result } = renderHook(useReceiver);
  await waitFor(() => expect(result.current.status?.error).toMatch(/no longer available/));
  expect(result.current.viewer).toBeNull();
});

test.each(["", "../search", "https://example.com", "-1", "1e3", "999999999999999999"])("rejects invalid shared IDs (%s) without an API call", (id) => {
  window.history.replaceState(null, "", `/?photo=${encodeURIComponent(id)}`);
  const { result } = renderHook(useReceiver);
  expect(result.current.status.error).toMatch(/link is invalid/);
  expect(result.current.status.canRetry).toBe(false);
  expect(fetch).not.toHaveBeenCalled();
});

test("browser navigation cancels an outdated shared photo request", async () => {
  let resolve;
  fetch.mockImplementationOnce(() => new Promise((complete) => { resolve = complete; }));
  const { result } = renderHook(useReceiver);
  const signal = fetch.mock.calls[0][1].signal;
  act(() => {
    window.history.replaceState(null, "", "/");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(response()));
  expect(result.current.viewer).toBeNull();
  expect(result.current.status).toBeNull();
});
