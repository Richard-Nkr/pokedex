export async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Ce fichier n’est pas une image.");
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("Image trop lourde (15 Mo maximum).");
  }

  const bitmap = await createImageBitmap(file);
  const maxSide = 720;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Impossible de traiter l’image.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let dataUrl = canvas.toDataURL("image/webp", 0.78);
  if (!dataUrl.startsWith("data:image/webp")) {
    dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  }
  if (dataUrl.length > 400_000) {
    dataUrl = canvas.toDataURL("image/jpeg", 0.62);
  }
  return dataUrl;
}
