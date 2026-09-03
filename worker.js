export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    const transformed = new HTMLRewriter()
      .on('body', {
        element(element) {
          element.append('<script src="/performance-intelligence.js?v=2.35.7"></script><script src="/status-hotfix.js?v=2.35.7"></script><script src="/filter-controls.js?v=2.35.7"></script><script src="/pearce-bibliography.js?v=2.35.7"></script><script src="/library-reader-hotfix.js?v=2.35.7"></script><script src="/grouped-loads-test.js?v=2.35.7"></script>', { html: true });
        }
      })
      .transform(response);

    transformed.headers.set('Cache-Control', 'no-store, max-age=0');
    return transformed;
  }
};
