
import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, UserPlus, ShieldCheck } from 'lucide-react';
import { api } from './api';

interface AuthProps {
  onLogin: (user: User, token: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        if (!email || !password) {
          throw new Error("Email and password are required");
        }
        const { user, token } = await api.login(email, password);
        onLogin(user, token);
      } else {
        // Registration validations
        if (!name || !email || !password) {
          throw new Error("All fields are required");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }

        await api.register(email, password, name);
        // Registration success: Switch to login
        setIsLogin(true);
        setSuccessMsg("Registration successful! Please log in.");
        // Clear sensitive fields
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] p-4">
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-8 text-center bg-[#1e293b]/20 border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/10 rounded-2xl mb-4 border border-blue-500/20">
            <ShieldCheck className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">MeasureVision Pro</h1>
          <p className="text-slate-400 mt-1 text-sm">Powered by Algobrick Engine</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {successMsg && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-3 rounded-xl text-sm text-center">
              {successMsg}
            </div>
          )}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm text-center">
              {error}
            </div>
          )}
          {!isLogin && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Password</label>
            <input
              type="password"
              required
              className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-700"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                {isLogin ? 'Sign In to Workspace' : 'Create Pro Account'}
              </>
            )}
          </button>
        </form>

        <div className="px-8 pb-8 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-sm font-semibold text-slate-400 hover:text-blue-400 transition-colors"
          >
            {isLogin ? "New to the platform? Register" : "Have an account? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
};
