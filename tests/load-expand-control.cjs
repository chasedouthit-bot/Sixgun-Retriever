const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'grouped-loads-test.js'), 'utf8');

assert.match(source, /class="gl-card-footer"/, 'expand control should live in the card footer');
assert.match(source, /class="gl-expand-toggle"[^>]+data-group-load=/, 'footer control should toggle the load');
assert.match(source, /aria-label="\$\{open\?'Collapse':'Expand'\} details/, 'expand control should have a state-aware accessible label');
assert.match(source, /\.gl-card-footer\{[^}]*grid-template-columns:minmax\(0,1fr\) 48px/, 'footer should reserve a separate 48px column for expansion');
assert.match(source, /\.gl-expand-toggle\{[^}]*width:48px;height:48px/, 'expand control should meet the 48px mobile touch target');
assert.match(source, /\.gl-chevron\{[^}]*font-size:28px/, 'expand arrow should be visibly larger');
assert.match(source, /\.gl-status\{[^}]*right:48px/, 'status control should remain clear of the compare selector');

const rowHead = source.match(/<span class="gl-row-head">([\s\S]*?)<\/span>\n\s*<span class="gl-row-meta">/)?.[1] || '';
assert.doesNotMatch(rowHead, /gl-chevron/, 'expand arrow should no longer sit beside the status control');

console.log(JSON.stringify({ touchTarget: '48x48', arrow: '28px', location: 'lower-right footer', result: 'ok' }));
