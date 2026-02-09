// handler.js (Lambda)
const serverless = require('serverless-http');
const app = require('./app');

const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

module.exports.handler = async (event, context) => {
  try {
    const result = await handler(event, context);
    return result;
  } catch (error) {
    console.error('Lambda handler error:', error);
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowedOrigin = (process.env.CORS_ORIGIN || '').trim().replace(/\/$/, '');
    const corsHeaders = {};
    
    // Ajouter les headers CORS seulement si l'origine est autorisée
    if (origin && (origin === allowedOrigin || !allowedOrigin)) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
      corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH';
      corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With';
    }
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
