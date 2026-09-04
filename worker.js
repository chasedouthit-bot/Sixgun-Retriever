const RELEASE_VERSION = '2.35.9';
const APP_SCRIPTS = [
  'performance-intelligence.js',
  'status-hotfix.js',
  'filter-controls.js',
  'pearce-bibliography.js',
  'library-reader-hotfix.js',
  'grouped-loads-test.js'
];

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    const transformed = new HTMLRewriter()
      .on('body', {
        element(element) {
          element.append(APP_SCRIPTS.map(file=>`<script src="/${file}?v=${RELEASE_VERSION}"></script>`).join(''), { html: true });
        }
      })
      .transform(response);

    transformed.headers.set('Cache-Control', 'no-store, max-age=0');
    return transformed;
  }
};
