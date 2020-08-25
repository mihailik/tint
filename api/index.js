// @ts-check

const url = require('url');
const { request } = require('http');

/** @type {import('aws-lambda').APIGatewayProxyHandler} */
module.exports.handler = async function (event, context) {

  let requestContext = event.requestContext;
  if (!requestContext) requestContext = /** @type {*} */({});

  return {
    statusCode: 200,
    body: JSON.stringify({
      event: safeObj(event, ['multiValueHeaders', 'multiValueQueryStringParameters']),
      context: safeObj(context),
      env: safeObj(process.env)
    }, null, 2)
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