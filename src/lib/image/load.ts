import { sniffType, UnmarkFileError, type LoadResult } from "@/lib/format";

export async function loadImageFile(file: File): Promise<LoadResult> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const type = sniffType(head);
  if (!type) {
    throw new UnmarkFileError(
      "unsupported",
      "That file isn't a JPG, PNG, or WebP image.",
    );
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new UnmarkFileError("decode", "That image couldn't be decoded.");
  }

  if (bitmap.width === 0 || bitmap.height === 0) {
    bitmap.close?.();
    throw new UnmarkFileError("decode", "That image is empty.");
  }

  return {
    bitmap,
    meta: {
      name: file.name || `image.${type.split("/")[1]}`,
      type,
      width: bitmap.width,
      height: bitmap.height,
    },
  };
}
