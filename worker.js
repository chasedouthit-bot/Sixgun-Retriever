export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    return new HTMLRewriter()
      .on('body', {
        element(element) {
          element.append('<script src="/performance-intelligence.js?v=2.13.4"></script><script src="/status-hotfix.js?v=2.13.4"></script><script src="/filter-controls.js?v=2.13.4"></script><script src="/library-reader-hotfix.js?v=2.13.4"></script>', { html: true });
        }
      })
      .transform(response);
  }
};
