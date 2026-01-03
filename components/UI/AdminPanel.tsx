import React, { useState } from 'react';
import { useStore } from '../../store';
import { Shield, X, Activity, Globe, Lock, Search } from 'lucide-react';

export const AdminPanel = () => {
  const { isAdminOpen, toggleAdmin, auditLogs, webhooks, addWebhook } = useStore();
  const [activeTab, setActiveTab] = useState<'audit' | 'webhooks'>('audit');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');

  if (!isAdminOpen) return null;

  return (
    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center">
      <div className="bg-white w-[800px] h-[600px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800">Organization Admin</h2>
              <p className="text-xs text-slate-500">Enterprise Settings</p>
            </div>
          </div>
          <button onClick={toggleAdmin} className="p-2 hover:bg-slate-200 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Activity size={16} /> Audit Log
            </button>
            <button 
              onClick={() => setActiveTab('webhooks')}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'webhooks' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Globe size={16} /> Webhooks
            </button>
            <div className="mt-auto pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
                <Lock size={12} /> SSO Enabled
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            
            {activeTab === 'audit' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-800">Security Audit Log</h3>
                  <button className="text-xs text-blue-600 font-medium hover:underline">Export CSV</button>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-medium">Timestamp</th>
                        <th className="px-4 py-3 font-medium">Actor</th>
                        <th className="px-4 py-3 font-medium">Action</th>
                        <th className="px-4 py-3 font-medium">Resource</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{new Date(log.timestamp).toLocaleTimeString()}</td>
                          <td className="px-4 py-3 font-medium text-slate-700">{log.actor}</td>
                          <td className="px-4 py-3">
                             <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{log.action}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{log.resource}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'webhooks' && (
               <div>
                <div className="mb-8">
                  <h3 className="font-bold text-slate-800 mb-4">Add Webhook Endpoint</h3>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://api.yourcompany.com/webhooks"
                      className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={newWebhookUrl}
                      onChange={e => setNewWebhookUrl(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        if(newWebhookUrl) {
                          addWebhook(newWebhookUrl);
                          setNewWebhookUrl('');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-800 mb-4">Active Subscriptions</h3>
                <div className="space-y-3">
                  {webhooks.length === 0 && <p className="text-slate-400 text-sm">No webhooks configured.</p>}
                  {webhooks.map(wh => (
                    <div key={wh.id} className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="w-2 h-2 rounded-full bg-green-500" />
                           <span className="font-mono text-sm text-slate-700">{wh.url}</span>
                         </div>
                         <div className="flex gap-2">
                           {wh.events.map(ev => (
                             <span key={ev} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">{ev}</span>
                           ))}
                         </div>
                       </div>
                       <button className="text-red-500 text-xs font-medium hover:underline">Revoke</button>
                    </div>
                  ))}
                </div>
               </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};