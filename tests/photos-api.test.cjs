const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/photos");
const originalFetch = global.fetch;
const originalKey = process.env.PEXELS_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.PEXELS_API_KEY;
  else process.env.PEXELS_API_KEY = originalKey;
});

function response() {
  return {
    headers: {}, statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

test("rejects writes and unrecognized endpoints before calling Pexels", async () => {
  global.fetch = () => assert.fail("Unexpected upstream request");
  for (const [method, url, status] of [["POST", "/api/photos", 405], ["GET", "/api/photos?endpoint=https://example.com", 400]]) {
    const res = response();
    await handler({ method, url }, res);
    assert.equal(res.statusCode, status);
  }
});

test("missing configuration reports an unavailable service", async () => {
  delete process.env.PEXELS_API_KEY;
  const res = response();
  await handler({ method: "GET", url: "/api/photos" }, res);
  assert.equal(res.statusCode, 503);
});

test("forwards search and filters to a fixed host using a server-only key", async () => {
  process.env.PEXELS_API_KEY = "test-server-key";
  global.fetch = async (url, options) => {
    assert.equal(url.origin, "https://api.pexels.com");
    assert.equal(url.pathname, "/v1/search");
    assert.equal(url.searchParams.get("query"), "mountains");
    assert.equal(url.searchParams.get("orientation"), "portrait");
    assert.equal(url.searchParams.get("page"), "2");
    assert.equal(url.searchParams.get("per_page"), "24");
    assert.equal(url.searchParams.has("token"), false);
    assert.equal(options.headers.Authorization, "test-server-key");
    return { ok: true, json: async () => ({ photos: [{ id: 1 }] }) };
  };
  const res = response();
  await handler({ method: "GET", url: "/api/photos?endpoint=search&query=mountains&orientation=portrait&page=2&per_page=80&token=bad" }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { photos: [{ id: 1 }] });
  assert.match(res.headers["Cache-Control"], /s-maxage=300/);
  assert.equal(JSON.stringify(res).includes("test-server-key"), false);
});

test("preserves authorization and quota errors without exposing upstream details", async () => {
  process.env.PEXELS_API_KEY = "test-server-key";
  for (const status of [401, 429]) {
    global.fetch = async () => ({ ok: false, status });
    const res = response();
    await handler({ method: "GET", url: "/api/photos" }, res);
    assert.equal(res.statusCode, status);
    assert.equal(res.headers["Cache-Control"], undefined);
  }
});

test("handles network failures and malformed photo responses", async () => {
  process.env.PEXELS_API_KEY = "test-server-key";
  for (const fetcher of [async () => { throw new Error("network"); }, async () => ({ ok: true, json: async () => ({}) })]) {
    global.fetch = fetcher;
    const res = response();
    await handler({ method: "GET", url: "/api/photos" }, res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.headers["Cache-Control"], undefined);
  }
});

test("shared photo lookup uses an ID at the fixed Pexels photo endpoint", async () => {
  process.env.PEXELS_API_KEY = "test-server-key";
  const photo = { id: 417074, width: 1000, height: 667, src: { original: "https://images.pexels.com/photos/417074/photo.jpeg" } };
  global.fetch = async (url, options) => {
    assert.equal(url.href, "https://api.pexels.com/v1/photos/417074");
    assert.equal(options.headers.Authorization, "test-server-key");
    return { ok: true, json: async () => photo };
  };
  const res = response();
  await handler({ method: "GET", url: "/api/photos?endpoint=photo&id=417074&query=ignored&per_page=80" }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, photo);
  assert.match(res.headers["Cache-Control"], /s-maxage=300/);
});

test("rejects missing, malformed, and out-of-range shared IDs without fetching", async () => {
  global.fetch = () => assert.fail("Unexpected upstream request");
  for (const id of ["", "-1", "0", "1e3", "../search", "https://example.com", "999999999999999999"]) {
    const res = response();
    await handler({ method: "GET", url: `/api/photos?endpoint=photo&id=${encodeURIComponent(id)}` }, res);
    assert.equal(res.statusCode, 400);
  }
});

test("missing photos preserve 404 and incorrect lookup responses are not cached", async () => {
  process.env.PEXELS_API_KEY = "test-server-key";
  for (const [upstream, status] of [[{ ok: false, status: 404 }, 404], [{ ok: true, json: async () => ({ id: 2 }) }, 502]]) {
    global.fetch = async () => upstream;
    const res = response();
    await handler({ method: "GET", url: "/api/photos?endpoint=photo&id=417074" }, res);
    assert.equal(res.statusCode, status);
    assert.equal(res.headers["Cache-Control"], undefined);
  }
});
