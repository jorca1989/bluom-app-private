const fs = require('node:fs');
const path = require('node:path');
const QRCode = require('qrcode');
// Pass a sharp installation path when using the bundled artifact runtime.
const sharp = require(process.env.SHARP_MODULE || 'sharp');

async function main() {
  const out = path.join(__dirname, '../artifacts/bluom-print');
  fs.mkdirSync(out, { recursive: true });
  const url = 'https://bluom.app/download';
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const n = qr.modules.size;
  const size = n + 8; // Four-module quiet zone on every side.
  let modules = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (qr.modules.get(y, x)) modules += `M${x + 4} ${y + 4}h1v1h-1z`;
  }
  const qrBody = `<rect width="${size}" height="${size}" fill="white"/><path d="${modules}" fill="#000000"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="2400" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${qrBody}</svg>`;
  fs.writeFileSync(path.join(out, 'bluom-download-qr.svg'), svg);
  await QRCode.toFile(path.join(out, 'bluom-download-qr.png'), url, { errorCorrectionLevel: 'H', margin: 4, width: 2400, color: { dark: '#000000', light: '#ffffff' } });

  const logo = fs.readFileSync(path.join(__dirname, '../public/logo.png'));
  const meta = await sharp(logo).metadata();
  const logoHeight = 1020 * meta.height / meta.width;
  const chest = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200"><image href="data:image/png;base64,${logo.toString('base64')}" x="90" y="${(1200-logoHeight)/2}" width="1020" height="${logoHeight}"/></svg>`;
  const back = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600"><rect width="1200" height="1600" fill="white"/><g text-anchor="middle" fill="black" font-family="Arial, Helvetica, sans-serif"><text x="600" y="200" font-size="46" font-weight="700">SCAN TO DOWNLOAD BLÜOM</text><text x="600" y="1390" font-size="36">Available on App Store &amp; Google Play</text></g><svg x="90" y="290" width="1020" height="1020" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${qrBody}</svg></svg>`;
  for (const [name, content] of [['front-chest', chest], ['back-neck-qr', back]]) {
    fs.writeFileSync(path.join(out, `${name}.svg`), content);
    await sharp(Buffer.from(content)).png().withMetadata({ density: 300 }).toFile(path.join(out, `${name}.png`));
  }
  console.log(JSON.stringify({ url, errorCorrection: 'H', qrModules: n, logoSource: `${meta.width}x${meta.height}`, output: out }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
