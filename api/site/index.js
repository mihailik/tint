// @ts-check

const fs = require('fs');
const { findColor, colors } = require('./colors');
const { SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS } = require('constants');

/** @type {string | undefined} */
let etagHTML;

/** @type {string | undefined} */
let etagPNG;

/** @type {import('aws-lambda').APIGatewayProxyHandler} */
module.exports.handler = async function (event, context) {

  let requestContext = event.requestContext;
  if (!requestContext) requestContext = /** @type {*} */({});
  const pageURL = (process.env.URL + '/' + event.path).replace(/\/\/+/g, '/');

  let isPng = false;
  let pngWidth = 800;
  let pngHeight = 600;
  const colorStr = decodeURIComponent(event.path.split('/').slice(-1)[0]
    .replace(/.png$/i, () => {
      isPng = true;
      return '';
    })
    .replace(/(\d+)x(\d+)/, (match, width, height) => {
      pngWidth = parseInt(width, 10);
      pngHeight = parseInt(height, 10);
      return '';
    }));

  const matchColors = findColor(colorStr);
  if (!matchColors || !matchColors.length) {
    const colorList = Object.keys(colors);
    const randomColor = colorList[Math.floor(Math.random() * colorList.length)];
    return {
      statusCode: 302,
      headers: {
        location: pageURL.slice(0, pageURL.length - colorStr.length) + '/' + randomColor
      },
      body: ''
    };
  }

  if (isPng) {
    if (!etagPNG)
      etagPNG = fs.readFileSync(__filename + '.etag', 'utf8');

    if (event.headers['if-none-match'] === etagPNG) {
      return {
        statusCode: 304,
        headers: {
          ETag: etagPNG
        },
        body: void 0
      };
    }

    const pngjs = require('pngjs');
    const largePNG = new pngjs.PNG({
      width: pngWidth,
      height: pngHeight
    });

    const border = Math.max(pngWidth / 20, pngHeight / 20, 1) | 0;
    const mainColor = parseInt(matchColors[0].color.slice(1), 16);
    const r = (mainColor & 0xFF0000) >> 16;
    const g = (mainColor & 0x00FF00) >> 8;
    const b = mainColor & 0x0000FF;
    const contrast = (r + g + b) / 3 < 128 ? 0xFF : 0x00;
    for (let y = 0; y < pngHeight; y++) {
      for (let x = 0; x < pngWidth; x++) {
        const idx = ((y * pngWidth) + x) * 4;
        largePNG.data[idx + 3] = 255;
        if (Math.min(x, pngWidth - 1 - x, y, pngHeight - 1 - y) < border) {
          largePNG.data[idx] = largePNG.data[idx + 1] = largePNG.data[idx + 2] = contrast;
        }
        else {
          largePNG.data[idx] = r;
          largePNG.data[idx + 1] = g;
          largePNG.data[idx + 2] = b;
        }
      }
    }

    const pngBuf = pngjs.PNG.sync.write(largePNG);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/png',
        ETag: etagPNG
      },
      body: pngBuf.toString('base64'),
      isBase64Encoded: true
    };
  }

  const indexHTMLPath = require.resolve('./dist/index.html');
  if (!etagHTML)
    etagHTML = fs.readFileSync(indexHTMLPath + '.etag', 'utf8');

    if (event.headers['if-none-match'] === etagHTML) {
      return {
        statusCode: 304,
        headers: {
          ETag: etagHTML
        },
        body: void 0
      };
    }

  const indexHTMLContent = fs.readFileSync(indexHTMLPath).toString('utf8');
  const injected = indexHTMLContent
    .replace(
      /(\<meta\s+property="(twitter\:image|twitter\:meta-image-default|og:image)"\s+content=")([^\"]+)(">)/g,
      (match, lead, tag, content, trail) => {
        return lead + pageURL + '.png' + trail;
      }
    )    
    .replace(
      /(\<link\s+rel="icon"\s+)([^>]+)(\s*\>)/,
      (match, lead, content, trail) => {
        return lead + `type="image/png" href="${pageURL}64x64.png"` + trail;
      }
    );

  return {
    statusCode: 200,
    body: injected,
    headers: {
      'Content-Type': 'text/html',
      ETag: etagHTML
    }
  };
};

function safeObj(obj, except, levels, risk) {
  if (risk && typeof obj === 'string' && obj.length >= 10)
    return obj.slice(0, 3) + '...  <' + obj.length + ' characters> ...' + obj.slice(obj.length - 3);

  if (!obj || typeof obj !== 'object')
    return obj;

  if (!levels) levels = [];
  if (levels.indexOf(obj) >= 0) return Array.isArray(obj) ? ['...circular...'] : { circular: '...' };

  if (Array.isArray(obj)) {
    if (!obj.length) return obj;
    if (levels.length > 5) return ['...' + obj.length + '...'];
    levels.push(obj);
    const safed = obj.map(entry => safeObj(entry, except, levels, risk));
    levels.pop();
    return safed;
  }
  else {
    const keys = Object.keys(obj);
    if (!keys.length) return obj;
    if (levels.length > 5) return shortcutObj(obj);
    levels.push(obj);
    const safed = keys.reduce((dummy, key) => {
      if (except && except.indexOf(key) >= 0)
        dummy[key] = shortcutObj(obj);
      else if (!/^_/.test(key))
        dummy[key] = safeObj(obj[key], except, levels, risk || /secret|pass|token|access[^a-z]*key/i.test(key));
      return dummy;
    }, {});
    levels.pop();
    return safed;
  }

  function shortcutObj(obj) {
    if (!obj) return obj;
    if (Array.isArray(obj)) return [obj.length];
    if (typeof obj === 'object')
      return { [obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name || 'object']: '...' + Object.keys(obj).length };
    else
      return typeof obj;
  }
}