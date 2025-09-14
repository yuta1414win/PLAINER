export interface ProcessedImage {
  base64: string;
  width: number;
  height: number;
  thumbnail: string;
}

export const MAX_IMAGE_SIZE = 4096;
export const THUMBNAIL_SIZE = 200;
export const JPEG_QUALITY = 0.85;

export async function processImage(file: File): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const img = new Image();

        img.onload = async () => {
          // Calculate new dimensions
          let { width, height } = img;
          const aspectRatio = width / height;

          // Resize if needed
          if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
            if (width > height) {
              width = MAX_IMAGE_SIZE;
              height = Math.round(width / aspectRatio);
            } else {
              height = MAX_IMAGE_SIZE;
              width = Math.round(height * aspectRatio);
            }
          }

          // Create main canvas
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

          // Create thumbnail
          const thumbCanvas = document.createElement('canvas');
          const thumbCtx = thumbCanvas.getContext('2d');
          if (!thumbCtx) {
            reject(new Error('Failed to get thumbnail canvas context'));
            return;
          }

          let thumbWidth = THUMBNAIL_SIZE;
          let thumbHeight = THUMBNAIL_SIZE;

          if (aspectRatio > 1) {
            thumbHeight = Math.round(THUMBNAIL_SIZE / aspectRatio);
          } else {
            thumbWidth = Math.round(THUMBNAIL_SIZE * aspectRatio);
          }

          thumbCanvas.width = thumbWidth;
          thumbCanvas.height = thumbHeight;
          thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);
          const thumbnail = thumbCanvas.toDataURL('image/jpeg', 0.7);

          resolve({
            base64,
            width,
            height,
            thumbnail,
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };

        img.src = e.target?.result as string;
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

export async function createImageBitmap(
  file: File
): Promise<ImageBitmap | null> {
  try {
    if ('createImageBitmap' in window) {
      return await window.createImageBitmap(file);
    }
  } catch (error) {
    console.error('createImageBitmap failed:', error);
  }
  return null;
}

export function rotateImage(
  imageData: string,
  degrees: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const radians = (degrees * Math.PI) / 180;
      const sin = Math.abs(Math.sin(radians));
      const cos = Math.abs(Math.cos(radians));

      const newWidth = img.width * cos + img.height * sin;
      const newHeight = img.width * sin + img.height * cos;

      canvas.width = newWidth;
      canvas.height = newHeight;

      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for rotation'));
    };

    img.src = imageData;
  });
}

export function calculateImageDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
}
