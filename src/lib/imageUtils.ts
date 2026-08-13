/**
 * Utility functions for compressing base64 images before storing to Firestore
 */

export async function compressBase64Image(
  dataUrl: string,
  maxWidth = 800,
  quality = 0.75
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 30000) {
    return dataUrl; // Skip small or non-data URL images
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch (err) {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function compressEmbeddedImagesInText(text: string): Promise<string> {
  if (!text || !text.includes('data:image/')) return text;

  // Find all data URL matches
  const imageRegex = /data:image\/[a-zA-Z0-9\+\/]+;base64,[a-zA-Z0-9\+\/=\s]+/g;
  const matches = Array.from(new Set(text.match(imageRegex) || []));

  let newText = text;
  for (const match of matches) {
    if (match.length > 30000) {
      const compressed = await compressBase64Image(match, 800, 0.75);
      newText = newText.split(match).join(compressed);
    }
  }

  return newText;
}
