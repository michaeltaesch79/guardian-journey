const fs = require('fs');
const code = fs.readFileSync('index.html', 'utf8');
const start = code.indexOf('<script type="module">');
const end   = code.lastIndexOf('</script>');
const js    = code.slice(start + 22, end);
try { new Function(js); console.log('SYNTAX OK'); }
catch(e) { console.log('SYNTAX ERROR:', e.message); }
