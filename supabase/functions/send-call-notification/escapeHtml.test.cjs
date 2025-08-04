const assert = require('assert');

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

assert.strictEqual(escapeHtml('<script>'), '&lt;script&gt;');
assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
assert.strictEqual(escapeHtml('5 > 3 && 2 < 4'), '5 &gt; 3 &amp;&amp; 2 &lt; 4');
console.log('escapeHtml tests passed');
