import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../api';
import logo from '../assets/logo.png';

export default function Auth({ onLoginSuccess, isModal = false }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (response) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/v1/auth/google', {
        credential: response.credential,
      });
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      if (data.avatar_url) {
        localStorage.setItem('user_avatar', data.avatar_url);
      } else {
        localStorage.removeItem('user_avatar');
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId;
    const initializeGoogle = () => {
      if (window.google && document.getElementById('google-signin-btn')) {
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '785953439710-3hbmc1l7ve1l3t63k23c3bdpbftnnf2m.apps.googleusercontent.com',
            callback: handleGoogleSuccess,
          });
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-btn'),
            { theme: 'outline', size: 'large', width: '100%', shape: 'rectangular' }
          );
          if (intervalId) {
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error('Google Sign-In initialization failed:', err);
        }
      }
    };

    initializeGoogle();
    intervalId = setInterval(initializeGoogle, 200);

    return () => clearInterval(intervalId);
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { data } = await api.post('/api/v1/auth/login', { email, password });
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        onLoginSuccess();
      } else {
        await api.post('/api/v1/auth/register', { email, username, password });
        // Automatically switch to login on success and pre-fill
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  const formVariants = {
    initial: { opacity: 0, x: isLogin ? -30 : 30 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: isLogin ? 30 : -30, transition: { duration: 0.3 } }
  };

  const cardContent = (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full max-w-md glass rounded-3xl p-8 relative z-10 border border-[#222f44]"
    >
      <div className="text-center mb-8">
        <div className="inline-flex mb-4">
          <img src={logo} alt="ID Logo" className="w-16 h-16 object-contain select-none" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-white">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-sm text-dark-400 mt-2">
          {isLogin ? 'Login to continue your PDF chat session' : 'Sign up to upload and chat with your PDFs'}
        </p>
      </div>

      {/* Error/Notice Notification */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl flex items-start gap-3 mb-6 border ${
              error.includes('successful')
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={isLogin ? 'login' : 'register'}
            variants={formVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-5"
          >
            <div>
              <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-dark-900/50 border border-dark-700/50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 pl-12 pr-4 text-white placeholder-dark-500 outline-none transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-dark-900/50 border border-dark-700/50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 pl-12 pr-4 text-white placeholder-dark-500 outline-none transition-all"
                    placeholder="johndoe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-dark-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-dark-900/50 border border-dark-700/50 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 pl-12 pr-4 text-white placeholder-dark-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#8b5cf6] hover:bg-brand-600 text-white rounded-xl py-3.5 font-semibold transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      {isLogin && (
        <>
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700/50"></div>
            </div>
            <span className="relative bg-dark-950 px-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          <div className="w-full flex justify-center">
            <div id="google-signin-btn" className="w-full min-h-[44px] flex justify-center" />
          </div>
        </>
      )}

      <div className="mt-8 text-center border-t border-dark-700/50 pt-6">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-sm text-brand-400 hover:text-brand-300 font-medium transition-colors"
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </motion.div>
  );

  if (isModal) {
    return cardContent;
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#080d16] px-4 overflow-hidden">
      {cardContent}
    </div>
  );
}
