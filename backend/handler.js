// handler.js (Lambda)
const serverless = require('serverless-http');
const app = require('./app');

const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

// Fonction pour normaliser les headers (Lambda peut envoyer en minuscules ou majuscules)
const getHeader = (headers, name) => {
  if (!headers) return null;
  const lowerName = name.toLowerCase();
  // Chercher dans toutes les clés avec comparaison insensible à la casse
  const foundKey = Object.keys(headers).find(key => key.toLowerCase() === lowerName);
  return foundKey ? headers[foundKey] : headers[lowerName] || headers[name] || null;
};

// Fonction pour obtenir les headers CORS
const getCorsHeaders = (event) => {
  const origin = getHeader(event.headers || {}, 'origin');
  const allowedOrigin = (process.env.CORS_ORIGIN || '').trim().replace(/\/$/, '');
  
  // Si pas d'origine, retourner des headers CORS basiques pour permettre l'accès
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
    };
  }
  
  // Vérifier si l'origine est autorisée
  if (allowedOrigin && origin !== allowedOrigin) {
    console.log('CORS handler - Origin non autorisée:', origin, 'Allowed:', allowedOrigin);
    return {};
  }
  
  console.log('CORS handler - Ajout headers CORS pour:', origin);
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Requested-With',
  };
};

module.exports.handler = async (event, context) => {
  // Gérer explicitement les requêtes OPTIONS (preflight) AVANT de passer à Express
  const method = (event.requestContext?.http?.method || event.httpMethod || '').toUpperCase();
  const origin = getHeader(event.headers || {}, 'origin');
  
  console.log('Lambda handler - Method:', method, 'Origin:', origin, 'Path:', event.path || event.requestContext?.http?.path);
  
  if (method === 'OPTIONS') {
    const corsHeaders = getCorsHeaders(event);
    console.log('Lambda handler - Traitement OPTIONS preflight');
    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      },
      body: '',
    };
  }
  
  try {
    const result = await handler(event, context);
    
    // S'assurer que les headers CORS sont toujours présents dans la réponse
    const corsHeaders = getCorsHeaders(event);
    if (result.headers) {
      result.headers = { ...corsHeaders, ...result.headers };
    } else {
      result.headers = corsHeaders;
    }
    
    return result;
  } catch (error) {
    console.error('Lambda handler error:', error);
    const corsHeaders = getCorsHeaders(event);
    
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
