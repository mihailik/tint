import url from 'url';

module.exports.handler = async function (event, context) {

  return {
    statusCode: 200,
    body: JSON.stringify(event, null, 2)
  };
} as import('aws-lambda').APIGatewayProxyHandler;