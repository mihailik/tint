// @ts-check

const url = require('url');

/** @type {import('aws-lambda').APIGatewayProxyHandler} */
module.exports.handler = async function (event, context) {

  return {
    statusCode: 200,
    body: JSON.stringify({
      ...event,
      multiValueHeaders: void 0,
      multiValueQueryStringParameters: void 0,
      requestContext: {
        ...event.requestContext,
        domainName: event.requestContext.domainName,
        domainPrefix: event.requestContext.domainPrefix,
        httpMethod: event.requestContext.httpMethod,
        resourcePath: event.requestContext.resourcePath
      }
    }, null, 2)
  };
};