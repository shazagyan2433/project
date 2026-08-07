export function resizeImageToBase64(
  file: File,
  maxDimension = 512,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        let newW = width;
        let newH = height;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            newW = maxDimension;
            newH = Math.round((height / width) * maxDimension);
          } else {
            newH = maxDimension;
            newW = Math.round((width / height) * maxDimension);
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas context unavailable"));
        ctx.drawImage(img, 0, 0, newW, newH);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
