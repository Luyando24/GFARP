import { describe, expect, it } from 'vitest';
import { compressImageForUpload } from './image-upload';

describe('player image validation', () => {
  it('rejects unsupported files before decoding', async () => {
    const file = new File(['not an image'], 'profile.svg', { type: 'image/svg+xml' });
    await expect(compressImageForUpload(file)).rejects.toThrow('Only JPEG, PNG, and WebP');
  });

  it('rejects source images larger than 10MB before decoding', async () => {
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' });
    await expect(compressImageForUpload(file)).rejects.toThrow('10MB or smaller');
  });
});
