# Bluom download print files

Target encoded in the QR: https://bluom.app/download

- `bluom-download-qr.svg`: scalable black/white vector QR, error correction H, four-module quiet zone.
- `bluom-download-qr.png`: 2400 × 2400 pixels.
- `front-chest.png`: 1200 × 1200, transparent background. Print the visible logo approximately 8–9 cm wide. The source logo is only 437 × 130 pixels; this enlargement does not add detail. Replace with the original vector/high-resolution brand asset for best print quality.
- `back-neck-qr.png`: 1200 × 1600, white background, requested wording. Print the full layout at 10 × 13.33 cm to preserve its aspect ratio; the black QR modules are approximately 6.84 cm wide, with the surrounding QR/quiet-zone square 8.5 cm wide. Do not stretch to 10 × 14 cm.
- Matching SVG layout files are included. The chest SVG embeds the raster logo; it is not a vector recreation of the logo.

Keep the white QR background and quiet zone, especially on coloured fabric. The standalone QR can be sized independently to 7–8 cm including its quiet zone. Test an actual-size proof on a phone before the production run.

The redirect and corrected landing links are implemented locally. Deploy the website and confirm the live /download URL before printing or distributing the QR. Files have not been sent to a supplier.

Rebuild artwork with `node scripts/build-download-print.cjs` (requires qrcode and sharp; SHARP_MODULE can point to a bundled sharp installation). Run redirect checks with `node scripts/test-download.cjs`.
