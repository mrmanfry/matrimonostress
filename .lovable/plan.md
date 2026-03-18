

## Diagnosis

The shutter button on iPhone likely fails silently because **Safari on iOS does not support `canvas.toBlob("image/webp")`**. When an unsupported format is passed, Safari returns `null` from `toBlob`, which triggers the `reject("Failed to export canvas to blob")` error — but this is caught silently in `captureFromVideo`'s catch block with just a `console.error`.

The relevant code is in `src/lib/cameraFilters.ts` line 50-58:
```js
canvas.toBlob((blob) => {
  if (blob) resolve(blob);
  else reject(new Error("Failed to export canvas to blob"));
}, "image/webp", WEBP_QUALITY);
```

Desktop Chrome supports WebP encoding, which is why it works there.

## Plan

### 1. Add WebP support detection and JPEG fallback (`src/lib/cameraFilters.ts`)

- Add a helper that checks if the browser can encode WebP via `canvas.toBlob`
- Cache the result so it's only tested once
- In `processPhoto`, use `"image/webp"` if supported, otherwise fall back to `"image/jpeg"` (quality 0.80)
- Update the file extension logic so the upload edge function receives the correct content type

### 2. Update filename in upload (`src/pages/CameraPublic.tsx`)

- Change the hardcoded `"photo.webp"` filename in the FormData append to dynamically use `"photo.webp"` or `"photo.jpg"` based on the detected format
- Export the format detection from cameraFilters so CameraPublic can use it

### 3. Ensure edge function handles both formats (`supabase/functions/upload-camera-photo/index.ts`)

- Verify the upload function doesn't hardcode `.webp` in the storage path — it likely derives it from the uploaded filename, but needs confirmation

This is a one-line root cause with a surgical fix. No UI changes needed.

