import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Landing from './components/Landing';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('access_token');
  });

  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthenticated ? (
        <Dashboard onLogout={() => setIsAuthenticated(false)} />
      ) : (
        <>
          <Landing 
            onStartFree={() => setShowAuthModal(true)} 
            onLoginClick={() => setShowAuthModal(true)} 
          />
          {showAuthModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Blur backdrop overlay */}
              <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowAuthModal(false)}
              />
              
              {/* Auth Card container */}
              <div className="relative z-10 w-full max-w-md bg-[#131b26] border border-[#222f44] rounded-3xl overflow-hidden shadow-2xl">
                {/* Close Button */}
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="absolute top-4 right-4 text-dark-400 hover:text-white text-lg font-bold p-1 hover:bg-[#1a2332] rounded-lg transition-all z-20"
                >
                  &times;
                </button>
                <Auth 
                  isModal={true}
                  onLoginSuccess={() => {
                    setIsAuthenticated(true);
                    setShowAuthModal(false);
                  }} 
                />
              </div>
            </div>
          )}
        </>
      )}
    </QueryClientProvider>
  );
}
