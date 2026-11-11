const { createHash } = require('node:crypto');
function fingerprint(assets, extra = '') {
  return createHash('sha256')
    .update(JSON.stringify(assets))
    .update(extra)
    .digest('hex')
    .slice(0, 20);
}
function stampHtml(html, version) {
  html = html
    .replace(/<meta name="atelier-build"[^>]*>/g, '')
    .replace('</head>', '<meta name="atelier-build" content="' + version + '"></head>');
  return html.replace(/(src|href)="([^"?]+\.(?:js|css))(?:\?[^" ]*)?"/g, (all, attr, url) =>
    /^(?:https?:|\/\/|data:)/i.test(url) ? all : attr + '="' + url + '?v=' + version + '"',
  );
}
module.exports = { fingerprint, stampHtml };
