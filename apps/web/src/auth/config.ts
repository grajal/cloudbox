import { Amplify } from 'aws-amplify';

const { VITE_COGNITO_USER_POOL_ID, VITE_COGNITO_CLIENT_ID, VITE_COGNITO_DOMAIN } = import.meta.env;

if (!VITE_COGNITO_USER_POOL_ID || !VITE_COGNITO_CLIENT_ID || !VITE_COGNITO_DOMAIN) {
  throw new Error(
    'Missing Cognito settings. Copy apps/web/.env.example to .env.local and fill it in.',
  );
}

// Tells Amplify how to talk to Cognito. After this call Amplify also watches the page URL:
// when it sees ?code=...&state=... (the redirect back from Managed Login) it exchanges the
// code for tokens using the PKCE verifier it stored before the redirect, then saves the
// tokens in localStorage.
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: VITE_COGNITO_CLIENT_ID,
      loginWith: {
        oauth: {
          domain: VITE_COGNITO_DOMAIN,
          scopes: ['openid', 'email', 'profile'],
          // Both URLs must be in the app client's callback_urls / logout_urls (infra/variables.tf).
          redirectSignIn: [`${window.location.origin}/callback`],
          redirectSignOut: [`${window.location.origin}/`],
          responseType: 'code',
        },
      },
    },
  },
});
