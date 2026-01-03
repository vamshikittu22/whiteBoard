import React, { useState } from 'react';
import { useStore } from '../../store';
import { X, Link as LinkIcon, Check, Copy } from 'lucide-react';

export const ShareModal = () => {
  const { isShareOpen, setShareOpen, boardId } = useStore();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');

  if (!isShareOpen) return null;

  // Mock Link
  const shareLink = `https://collabcanvas.app/board/${boardId || 'demo'}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white w-[500px] rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-800">Share Board</h2>
          <button 
            onClick={() => setShareOpen(false)} 
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Anyone with the link can edit</label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <LinkIcon size={16} className="text-slate-400 mr-2" />
              <input 
                readOnly 
                value={shareLink} 
                className="bg-transparent w-full text-sm text-slate-600 outline-none" 
              />
            </div>
            <button 
              onClick={handleCopy}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Invite by email</label>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200">
              Invite
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};