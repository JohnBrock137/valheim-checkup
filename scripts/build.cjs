const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'src');
let html = fs.readFileSync(path.join(src, 'template.html'), 'utf8');
for (const [tag, file] of [['STYLE', 'style.css'], ['CATALOG', 'catalog.json'], ['CORE', 'core.js'], ['APP', 'app.js']]) {
  let body = fs.readFileSync(path.join(src, file), 'utf8');
  if (tag !== 'STYLE') body = body.replace(/<\/script/gi, '<\\/script');
  html = html.replace('/*' + tag + '*/', () => body);
}
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('Built index.html');
