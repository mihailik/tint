// @ts-check
// https://mihailik-tint.netlify.app/salmon
const fs = require('fs');
const crypto = require("crypto");

createEtag('../api/site/dist/index.html');
createEtag('../api/site/index.js');
console.log('Done.');

/**
 * @param {string} relativePath
 */
function createEtag(relativePath) {
  const sha256 = crypto.createHash("sha256");

  const contentPath = require.resolve(relativePath);
  console.log('reading ' + contentPath + ' ...');
  const indexHTMLContent = fs.readFileSync(contentPath);
  console.log('hashing [' + indexHTMLContent.length + ']...');
  const etagContent = 'hashed [' + relativePath + '] ' + sha256.update(indexHTMLContent).digest('hex');
  const etagPath = contentPath + '.etag';
  const currentEtagContent =
    fs.existsSync(etagPath) ? fs.readFileSync(etagPath, 'utf8') : 'NEW FILE';
  if (currentEtagContent === etagContent) {
    console.log('no change ' + etagPath + '\n   ' + etagContent);
  }
  else {
    console.log('writing ' + etagPath + '\n   ' + etagContent + '\n   ' + currentEtagContent + ' ...');
    fs.writeFileSync(etagPath, etagContent);
  }
}