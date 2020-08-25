// @ts-check

const fs = require('fs');
const { findColor, colors } = require('./colors');
const { SSL_OP_DONT_INSERT_EMPTY_FRAGMENTS } = require('constants');

/** @type {import('aws-lambda').APIGatewayProxyHandler} */
module.exports.handler = async function (event, context) {

  let requestContext = event.requestContext;
  if (!requestContext) requestContext = /** @type {*} */({});
  const pageURL = process.env.URL + (/^\//.test(event.path) ? event.path.slice(1) : event.path);

  let isPng = false;
  const colorStr = event.path.split('/').slice(-1)[0].replace(/.png$/i, () => {
    isPng = true;
    return '';
  });

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
    const pngjs = require('pngjs');
    const w = 600;
    const h = 400;
    const largePNG = new pngjs.PNG({
      width: w,
      height: h
    });

    const border = Math.max(w / 20, h / 20) | 0;
    const mainColor = parseInt(matchColors[0].color.slice(1), 16);
    const r = (mainColor & 0xFF0000) >> 16;
    const g = (mainColor & 0x00FF00) >> 8;
    const b = mainColor & 0x0000FF;
    const contrast = (r + g + b) / 3 < 128 ? 0xFF : 0x00;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = ((y * w) + x) * 4;
        largePNG.data[idx + 3] = 255;
        if (Math.min(x, w - x, y, h - y) < border) {
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
        contentType: 'image/png'
      },
      body: pngBuf.toString('base64'),
      isBase64Encoded: true
    };
  }

  const indexHTMLContent = fs.readFileSync(require.resolve('./dist/index.html')).toString('utf8');
  const injected = indexHTMLContent.replace(
    /(\<meta\s+name="twitter:image"\s+content=")([^\"]+)(">)/,
    (match, lead, content, trail) => {
      return lead + pageURL + '.png' + trail;
    }
  );

  return {
    statusCode: 200,
    body: injected,
    headers: {
      contentType: 'text/html'
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