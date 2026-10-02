(function () {
  'use strict';
  var ua = navigator.userAgent || '';
  // iPadOS may request desktop websites and identify itself as a Mac.
  var isIOS = /iPad|iPhone|iPod/i.test(ua) ||
    (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  var store = isIOS ? 'ios' : /android/i.test(ua) ? 'android' : null;
  if (!store) return;

  var status = document.getElementById('status');
  document.body.classList.add('redirecting');
  status.textContent = 'Redirecting to your app store…';
  function showFallback() {
    document.body.classList.remove('redirecting');
    status.textContent = 'If your store did not open, choose a download button below.';
  }
  window.setTimeout(showFallback, 2500);
  try {
    window.location.replace(document.getElementById(store).href);
  } catch (_) {
    showFallback();
  }
}());
