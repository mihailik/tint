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
      ...event,
      multiValueHeaders: void 0,
      multiValueQueryStringParameters: void 0,
      requestContext: {
        ...requestContext,
        domainName: requestContext.domainName,
        domainPrefix: requestContext.domainPrefix,
        httpMethod: requestContext.httpMethod,
        resourcePath: requestContext.resourcePath
      },
      'context.clientContext': {
        ...(context && context.clientContext)
      }
    }, null, 2)
  };
};