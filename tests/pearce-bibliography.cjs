const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('const LIB_ARTICLES=[');
const end = html.indexOf('\n\n\nlet libView=', start);
assert.ok(start >= 0 && end > start, 'Library article data is present');

const context = vm.createContext({});
vm.runInContext(html.slice(start, end), context);
vm.runInContext(fs.readFileSync('pearce-bibliography.js', 'utf8'), context);

const report = vm.runInContext(`(() => {
  const ids = LIB_ARTICLES.map(article => article.id);
  const pearce = LIB_ARTICLES.filter(article => article.author === 'Brian Pearce');
  const added = pearce.filter(article => article.id.startsWith('pearce-bibliography-'));
  return {
    total: pearce.length,
    added: added.length,
    duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
    missingLinks: added.filter(article => !article.externalUrl).map(article => article.id)
  };
})()`, context);

assert.equal(report.total, 117);
assert.equal(report.added, 103);
assert.equal(report.duplicateIds.length, 0);
assert.equal(report.missingLinks.length, 0);
console.log(JSON.stringify({...report, result: 'ok'}));
