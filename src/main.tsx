import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './shared/api/queryClient';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter> {/* BrowserRouter 대신 HashRouter 사용 */}
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);

window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message);
});