import { Api } from './api';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Only JPEG, PNG, and WebP images are supported');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('Image must be 10MB or smaller');
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('The selected image could not be decoded'));
      image.src = objectUrl;
    });

    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image processing is unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image compression failed')), 'image/jpeg', 0.85);
    });
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'image'}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadPlayerImage(playerId: string, file: File, kind: string): Promise<string> {
  const compressed = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append('file', compressed);
  formData.append('kind', kind.replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'profile');
  const response = await Api.postFormData<{ success: boolean; data: { url: string } }>(`/uploads/player/${playerId}`, formData);
  if (!response.success || !response.data?.url) throw new Error('Image upload failed');
  return response.data.url;
}
