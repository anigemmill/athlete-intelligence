import { describe, expect, it, vi, afterEach } from "vitest";
import { checkImage } from "./imageCheck.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function makePngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function makeJpegBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(11);
  buf[0] = 0xff; buf[1] = 0xd8;
  buf[2] = 0xff; buf[3] = 0xc0;
  buf.writeUInt16BE(7, 4);
  buf[6] = 8;
  buf.writeUInt16BE(height, 7);
  buf.writeUInt16BE(width, 9);
  return buf;
}

function mockFetchResolvedWith(buf: Buffer, contentType: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? contentType : null) },
      arrayBuffer: async () => buf,
    }),
  );
}

describe("checkImage", () => {
  it("sniffs PNG dimensions from real header bytes", async () => {
    mockFetchResolvedWith(makePngBuffer(600, 800), "image/png");
    const result = await checkImage("https://upload.wikimedia.org/photo.png");
    expect(result.ok).toBe(true);
    expect(result.widthPx).toBe(600);
    expect(result.heightPx).toBe(800);
  });

  it("sniffs JPEG dimensions from real header bytes", async () => {
    mockFetchResolvedWith(makeJpegBuffer(1024, 768), "image/jpeg");
    const result = await checkImage("https://example.com/photo.jpg");
    expect(result.widthPx).toBe(1024);
    expect(result.heightPx).toBe(768);
  });

  it("reports null dimensions rather than guessing for an unsupported format", async () => {
    mockFetchResolvedWith(Buffer.from("not an image"), "image/webp");
    const result = await checkImage("https://example.com/photo.webp");
    expect(result.ok).toBe(true); // the HTTP request succeeded
    expect(result.widthPx).toBeNull();
    expect(result.heightPx).toBeNull();
  });

  it("reports a failed HTTP response without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404, headers: { get: () => null } }));
    const result = await checkImage("https://example.com/gone.png");
    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
  });

  it("reports a network failure as not-ok, never throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    const result = await checkImage("https://example.com/unreachable.png");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("timeout");
  });
});
