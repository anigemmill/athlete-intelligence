import { describe, expect, it, vi, afterEach } from "vitest";
import { checkUrl, checkUrlsConcurrently } from "./deadLinkCheck.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkUrl", () => {
  it("reports ok for a live 200 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
    const result = await checkUrl("https://worldathletics.org/athlete/1");
    expect(result).toEqual({ url: "https://worldathletics.org/athlete/1", ok: true, status: 200, error: null });
  });

  it("reports not-ok for a 404 without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const result = await checkUrl("https://example.com/gone");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it("falls back to GET when HEAD returns 405", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const result = await checkUrl("https://example.com/no-head");
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("HEAD");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("GET");
  });

  it("reports a network failure as not-ok with an error message, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await checkUrl("https://example.com/unreachable");
    expect(result.ok).toBe(false);
    expect(result.status).toBeNull();
    expect(result.error).toBe("network down");
  });
});

describe("checkUrlsConcurrently", () => {
  it("deduplicates identical URLs before checking", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const results = await checkUrlsConcurrently([
      "https://worldathletics.org/a",
      "https://worldathletics.org/a",
      "https://worldathletics.org/b",
    ]);
    expect(results).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
