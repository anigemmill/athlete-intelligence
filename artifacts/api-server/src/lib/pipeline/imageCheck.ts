/**
 * Real HTTP + header-level checks for a stored profile image URL.
 *
 * Deliberately honest about its limits: dimensions are sniffed from PNG/JPEG
 * headers only (the two formats Wikipedia/federation photo sources actually
 * return) — anything else reports `null`, not a guess. Licensing is not
 * reported at all, because nothing in the current pipeline (photo-lookup.ts)
 * captures licensing metadata from Wikipedia or Perplexity's image search —
 * there is no data to check, and pretending otherwise would be exactly the
 * kind of fabrication this whole feature exists to catch.
 */

export interface ImageCheckResult {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  widthPx: number | null;
  heightPx: number | null;
  error: string | null;
}

const TIMEOUT_MS = 10_000;

function sniffDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: 8-byte signature, then IHDR chunk (length+type = 8 bytes), then
  // width (4 bytes) and height (4 bytes), big-endian.
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: scan markers for the first SOFn frame header, which stores
  // height then width as big-endian uint16 five bytes into the segment.
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let offset = 2;
    // <= (not <): the SOF frame's height/width bytes occupy offset+5..offset+8
    // inclusive, so the last valid start position is buf.length - 9, not
    // buf.length - 10 — an off-by-one here would miss a SOF marker sitting
    // right at the end of a short buffer.
    while (offset <= buf.length - 9) {
      if (buf[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marker = buf[offset + 1];
      const isSofMarker = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSofMarker) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      const segmentLength = buf.readUInt16BE(offset + 2);
      offset += 2 + segmentLength;
    }
  }

  return null;
}

export async function checkImage(url: string): Promise<ImageCheckResult> {
  try {
    const resp = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
    const contentType = resp.headers.get("content-type");
    if (!resp.ok) {
      return { ok: false, status: resp.status, contentType, widthPx: null, heightPx: null, error: null };
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    const dims = sniffDimensions(buf);
    return {
      ok: true,
      status: resp.status,
      contentType,
      widthPx: dims?.width ?? null,
      heightPx: dims?.height ?? null,
      error: null,
    };
  } catch (err: any) {
    return { ok: false, status: null, contentType: null, widthPx: null, heightPx: null, error: err?.message ?? "Request failed" };
  }
}
