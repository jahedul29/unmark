import { extForType } from "@/lib/format";

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed."))),
      type,
      quality,
    );
  });
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, "") || "image";
}

export async function downloadImage(
  canvas: HTMLCanvasElement,
  sourceType: string,
  sourceName: string,
): Promise<void> {
  const quality = sourceType === "image/jpeg" || sourceType === "image/webp" ? 0.95 : undefined;
  const blob = await canvasToBlob(canvas, sourceType, quality);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName(sourceName)}-unmarked.${extForType(sourceType)}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function clipboardSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    !!navigator.clipboard?.write
  );
}

export async function copyImageToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  if (!clipboardSupported()) throw new Error("Clipboard isn't available here.");
  const item = new ClipboardItem({ "image/png": canvasToBlob(canvas, "image/png") });
  await navigator.clipboard.write([item]);
}
