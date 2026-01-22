import React, { useState } from 'react';
import { useStore } from '../store';

export const Login = () => {
  const [name, setName] = useState('');
  const login = useStore(s => s.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) login(name);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="flex items-center justify-center w-12 h-12 bg-indigo-600 rounded-xl mb-6 mx-auto">
          <span className="text-white font-bold text-xl">C</span>
        </div>
        
        <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Welcome to CollabCanvas</h1>
        <p className="text-slate-500 text-center mb-8">Enter your name to start collaborating.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              placeholder="e.g. Alice Designer"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};
