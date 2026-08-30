export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;

    return new HTMLRewriter()
      .on('body', {
        element(element) {
          element.append('<script src="/performance-intelligence.js?v=2.10.2"></script><script src="/status-hotfix.js?v=2.7.1"></script><script src="/filter-controls.js?v=2.10.2"></script>', { html: true });
        }
      })
      .transform(response);
  }
};
