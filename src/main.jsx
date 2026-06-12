import React from 'react'
import ReactDOM from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persister, CACHE_BUSTER } from './lib/queryClient.js'
import { AuthProvider } from './context/AuthContext.jsx'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, buster: CACHE_BUSTER }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </PersistQueryClientProvider>
  </React.StrictMode>
)
