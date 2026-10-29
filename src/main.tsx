import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register Service Worker for PWA offline support & installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Vulcan PWA ServiceWorker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.warn('Vulcan PWA ServiceWorker registration failed:', error);
      });
  });
}

