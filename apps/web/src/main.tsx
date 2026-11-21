import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './auth/config'; // must run before anything uses Amplify
import App from './App';
import { AuthProvider } from './auth/AuthProvider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
