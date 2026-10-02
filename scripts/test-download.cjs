const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/download/index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'public/download/redirect.js'), 'utf8');
const ios = 'https://apps.apple.com/app/bluom-calorie-counter-diet/id6759072102';
const android = 'https://play.google.com/store/apps/details?id=com.jwfca.bluom';
for (const [ua, touch, expected] of [
  ['Mozilla/5.0 (iPhone)', 0, ios], ['iPad', 0, ios], ['iPod', 0, ios],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5, ios],
  ['Mozilla/5.0 (Linux; Android 14)', 0, android],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0, null],
  ['Mozilla/5.0 (Windows NT 10.0)', 0, null], ['', 0, null],
]) {
  let target = null;
  const elements = { ios: { href: ios }, android: { href: android }, status: {} };
  vm.runInNewContext(script, {
    navigator: { userAgent: ua, maxTouchPoints: touch },
    document: { getElementById: id => elements[id], body: { classList: { add() {}, remove() {} } } },
    window: { location: { replace: value => { target = value; } }, setTimeout() {} },
  });
  assert.equal(target, expected, ua);
}
assert.match(html, /name="robots" content="noindex, nofollow"/);
assert.ok(html.includes(ios) && html.includes(android));
const landing = fs.readFileSync(path.join(root, 'app/landing.tsx'), 'utf8');
assert.ok(landing.includes(ios));
assert.ok(!landing.includes('bluom-nutrition-fitness-ai'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(config.rewrites.find(r => r.source === '/download').destination, '/download/index.html');
console.log('Passed: 8 device cases, store links, robots metadata and download rewrite.');
