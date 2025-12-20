
import React, { useState, useEffect } from 'react';
import { User, CommissionLog, WithdrawalRequest, SystemSettings, ManualPaymentMethod } from '../types';
import { TRANSLATIONS, Icons } from '../constants';
import { walletApi } from '../services/walletService';

interface Props {
  user: User;
  currentLang?: string;
  onNavigate?: (path: string) => void;
  systemSettings?: SystemSettings;
}

interface UnifiedLog {
    id: string;
    type: string;
    amount: number;
    timestamp: string;
    description: string;
    details?: any; // For Commission specific details
}

const CommissionTable: React.FC<Props> = ({ user, currentLang = 'EN', onNavigate, systemSettings }) => {
  const [logs, setLogs] = useState<UnifiedLog[]>([]);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];

  // Withdrawal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [amountStr, setAmountStr] = useState(''); // Use string for better input control
  const [selectedMethod, setSelectedMethod] = useState<ManualPaymentMethod | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [msg, setMsg] = useState('');
  const [viewProof, setViewProof] = useState<WithdrawalRequest | null>(null);

  // Use passed settings or fallback
  const settings = systemSettings || { pointRate: 1000 }; 

  const refreshData = async () => {
      try {
          const history = await walletApi.getCommissions();
          setLogs(history);
          const wds = await walletApi.getWithdrawals();
          setWithdrawals(wds);
      } catch (e) { console.error(e); }
  };

  useEffect(() => {
      refreshData();
  }, [user]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedMethod) {
          throw new Error('Please select a withdrawal destination');
      }

      const val = Number(amountStr.replace(/[^0-9]/g, ''));
      // Calculate max amount in Rp based on points
      const maxRp = user.walletBalance * settings.pointRate;
      
      if (!val || val <= 0) {
          throw new Error('Please enter a valid amount');
      }

      if (val > maxRp) {
          throw new Error(`Insufficient balance. Max: Rp ${maxRp.toLocaleString()}`);
      }
      
      const details = `${selectedMethod.name} - ${selectedMethod.accountNumber} (${selectedMethod.accountName || user.name})`;
      await walletApi.requestWithdrawal(val, details); 
      setMsg('Withdrawal requested successfully.');
      setAmountStr(''); // Reset
      refreshData();
    } catch (err: any) {
      setMsg('Error: ' + (err.response?.data?.message || err.message));
    }
  };

  const myWithdrawals = withdrawals; // API returns filtered list for member
  const availableBalanceRp = user.walletBalance * settings.pointRate;

  // Safe backdrop click handler
  const handleBackdropClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
          setShowWithdrawModal(false);
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <h2 className="text-2xl font-bold text-gray-800">{t.commissions}</h2>
         <div className="flex items-center gap-2">
            <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg font-bold shadow-sm">
                {t.totalEarned}: {user.totalEarnings.toLocaleString()} Pts
            </div>
            <button 
                onClick={() => setShowWithdrawModal(true)} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-colors"
            >
                <Icons.Wallet /> {t.withdrawBtn}
            </button>
         </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
             {t.noCommissions}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                   <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.date}</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                       <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.amountPts}</th>
                       <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Impact</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                   {logs.map(log => {
                       const isPositive = log.amount >= 0;
                       
                       // Attempt to find linked withdrawal request
                       let linkedWithdrawal: WithdrawalRequest | undefined;
                       if (log.type === 'WITHDRAWAL' || log.type === 'REFUND') {
                           // Try to parse ID from "Withdrawal Request ID: <UUID>"
                           const match = log.description.match(/ID:\s*([a-f0-9-]+)/i);
                           if (match && match[1]) {
                               linkedWithdrawal = withdrawals.find(w => w.id === match[1]);
                           }
                       }

                       return (
                       <tr key={log.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 text-sm text-gray-600">{new Date(log.timestamp).toLocaleDateString()}</td>
                           <td className="px-6 py-4 text-xs font-bold uppercase text-gray-500">
                               {log.type === 'COMMISSION' ? <span className="text-green-600">Commission</span> : log.type.replace(/_/g, ' ')}
                           </td>
                           <td className="px-6 py-4 text-sm text-gray-700">
                               <div className="flex flex-col gap-1">
                                   <span>
                                       {log.type === 'COMMISSION' ? (
                                           <span><span className="font-bold">{(log.details?.sourceUserName) || 'Unknown'}</span> - {log.description}</span>
                                       ) : log.description}
                                   </span>
                                   
                                   {/* Withdrawal Controls in Main Table */}
                                   {linkedWithdrawal && (
                                       <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${linkedWithdrawal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : linkedWithdrawal.status === 'APPROVED' ? 'bg-green-100 text-green-700' : linkedWithdrawal.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                                                {linkedWithdrawal.status}
                                            </span>
                                            
                                            {linkedWithdrawal.status === 'PENDING' && (
                                                <button 
                                                    onClick={async () => {
                                                        if(!confirm('Cancel this request? Funds will be refunded.')) return;
                                                        try {
                                                            await walletApi.cancelWithdrawal(linkedWithdrawal!.id);
                                                            refreshData();
                                                        } catch(err: any) {
                                                            alert('Failed to cancel: ' + (err.response?.data?.message || err.message));
                                                        }
                                                    }}
                                                    className="text-[10px] border border-red-200 text-red-600 px-2 py-0.5 rounded hover:bg-red-50 bg-white font-bold"
                                                >
                                                    Cancel Request
                                                </button>
                                            )}
                                            
                                            {linkedWithdrawal.status === 'APPROVED' && (linkedWithdrawal.adminProofImage || linkedWithdrawal.adminProofLink) && (
                                                 <button 
                                                    onClick={() => setViewProof(linkedWithdrawal!)}
                                                    className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 font-bold flex items-center gap-1 border border-blue-200"
                                                 >
                                                     <Icons.Eye size={12} /> View Proof
                                                 </button>
                                            )}
                                            
                                            {linkedWithdrawal.status === 'REJECTED' && linkedWithdrawal.rejectionReason && (
                                                 <button 
                                                    onClick={() => setViewProof(linkedWithdrawal!)}
                                                    className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded hover:bg-red-100 font-bold flex items-center gap-1 border border-red-200"
                                                 >
                                                     <Icons.Info size={12} /> Reason
                                                 </button>
                                            )}
                                       </div>
                                   )}
                               </div>
                           </td>
                           <td className={`px-6 py-4 text-right font-bold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
                               {isPositive ? '+' : ''}{Number(log.amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                           </td>
                           <td className="px-6 py-4 text-right font-medium text-gray-500 text-xs">
                               {isPositive ? 'Credit' : 'Debit'}
                           </td>
                       </tr>
                   )})}
                </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WALLET & WITHDRAWAL MODAL */}
      {showWithdrawModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={handleBackdropClick}>
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
                      <h3 className="font-bold text-lg flex items-center gap-2"><Icons.Wallet /> {t.walletAndWithdraw}</h3>
                      <button onClick={() => setShowWithdrawModal(false)} className="hover:text-gray-300"><Icons.X /></button>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Side: Balance & Request */}
                      <div className="space-y-6">
                           <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
                               <p className="text-blue-600 font-bold uppercase text-xs tracking-wider mb-2">{t.availableBalance}</p>
                               <h2 className="text-3xl font-extrabold text-blue-900">Rp {availableBalanceRp.toLocaleString()}</h2>
                               <p className="text-xs text-blue-400 mt-1">({user.walletBalance.toLocaleString(undefined, {minimumFractionDigits: 2})} Pts)</p>
                           </div>

                           {msg && (
                               <div className={`p-3 rounded text-sm flex justify-between items-center ${msg.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                   <span>{msg}</span>
                                   {msg.includes('Bank Details') && onNavigate && (
                                       <button onClick={() => onNavigate('profile')} className="text-xs font-bold underline bg-white px-2 py-1 rounded shadow-sm border">
                                           Go to Profile
                                       </button>
                                   )}
                               </div>
                           )}

                           <form onSubmit={handleRequest} className="space-y-4 border p-4 rounded-xl">
                               <h4 className="font-bold text-gray-800">{t.reqWithdraw}</h4>
                               
                               <div>
                                   <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                                   {user.kyc.withdrawalMethods && user.kyc.withdrawalMethods.length > 0 ? (
                                       <div className="space-y-2 max-h-40 overflow-y-auto">
                                            {user.kyc.withdrawalMethods.map((m, i) => (
                                                <div 
                                                   key={i} 
                                                   onClick={() => setSelectedMethod(m)}
                                                   className={`p-2 border rounded-lg cursor-pointer flex items-center gap-2 text-sm ${selectedMethod?.id === m.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 hover:bg-gray-50'}`}
                                                >
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${m.type === 'BANK' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                                        {m.type === 'BANK' ? 'B' : 'E'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-bold text-gray-800">{m.name}</p>
                                                        <p className="text-xs text-gray-500">{m.accountNumber}</p>
                                                    </div>
                                                    {selectedMethod?.id === m.id && <Icons.Check className="text-blue-600 w-4 h-4" />}
                                                </div>
                                            ))}
                                       </div>
                                   ) : (
                                       <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border border-dashed text-center">
                                           No methods found. <button type="button" onClick={() => onNavigate && onNavigate('profile')} className="text-blue-600 underline font-bold">Add in Profile</button>
                                       </div>
                                   )}
                               </div>

                               <div>
                                   <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Rp)</label>
                                   <input 
                                      type="text" 
                                      inputMode="numeric"
                                      value={amountStr}
                                      onChange={e => setAmountStr(e.target.value)}
                                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                      placeholder="0"
                                   />
                                   <p className="text-xs text-gray-400 mt-1">{t.minWithdrawal} Rp 10.000</p>
                               </div>
                               <button 
                                  type="submit" 
                                  disabled={!amountStr || Number(amountStr) <= 0 || Number(amountStr) > availableBalanceRp} 
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
                               >
                                  {t.submitRequest}
                               </button>
                           </form>
                      </div>

                      {/* Right Side: History */}
                      <div className="border-l pl-0 md:pl-8 border-gray-100">
                          <h4 className="font-bold text-gray-800 mb-4">{t.history}</h4>
                          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                              {myWithdrawals.length === 0 ? (
                                  <p className="text-gray-400 text-sm italic">{t.noWithdrawals}</p>
                              ) : (
                                  myWithdrawals.map(w => (
                                      <div key={w.id} className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors bg-white shadow-sm">
                                         <div className="flex justify-between items-center mb-1">
                                             <span className="font-bold text-gray-800">Rp {w.amount.toLocaleString()}</span>
                                             <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : w.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                                                 {w.status}
                                             </span>
                                         </div>
                                         <p className="text-xs text-gray-500 mb-2">{new Date(w.requestDate).toLocaleDateString()}</p>
                                         
                                         {w.status === 'PENDING' && (
                                             <button 
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if(!confirm('Are you sure you want to cancel this request? Funds will be refunded.')) return;
                                                    try {
                                                        await walletApi.cancelWithdrawal(w.id);
                                                        refreshData();
                                                    } catch(err: any) {
                                                        alert('Failed to cancel: ' + (err.response?.data?.message || err.message));
                                                    }
                                                }}
                                                className="w-full text-center text-xs py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 bg-white font-bold transition-colors"
                                             >
                                                Cancel Request
                                             </button>
                                         )}
                                         {w.status === 'APPROVED' && (w.adminProofImage || w.adminProofLink) && (
                                             <div className="mt-2 pt-2 border-t border-gray-100">
                                                 <button 
                                                    onClick={() => setViewProof(w)}
                                                    className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold"
                                                 >
                                                     <Icons.Eye /> View Proof
                                                 </button>
                                             </div>
                                         )}
                                         {w.status === 'REJECTED' && w.rejectionReason && (
                                             <div className="mt-2 pt-2 border-t border-gray-100">
                                                 <button 
                                                    onClick={() => setViewProof(w)}
                                                    className="text-xs text-red-600 hover:underline flex items-center gap-1 font-bold"
                                                 >
                                                     <Icons.Info /> View Reason
                                                 </button>
                                             </div>
                                         )}
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Member Proof Viewer Modal */}
      {viewProof && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewProof(null)}>
                 <div className="bg-white rounded-xl p-6 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
                     <button onClick={() => setViewProof(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><Icons.X /></button>
                     <h3 className="font-bold mb-4 text-gray-800 border-b pb-2">
                         {viewProof.status === 'APPROVED' ? 'Transfer Proof' : 'Rejection Details'}
                     </h3>
                     <div className="space-y-4">
                        {viewProof.status === 'REJECTED' && viewProof.rejectionReason && (
                            <div className="bg-red-50 p-3 rounded border border-red-100">
                                <p className="text-xs font-bold text-red-800 mb-1">Reason for Rejection:</p>
                                <p className="text-sm text-red-700">{viewProof.rejectionReason}</p>
                            </div>
                        )}

                        {viewProof.adminProofImage ? (
                            <div className="border rounded p-1">
                                <p className="text-xs text-gray-500 mb-1 px-1">Attached Image:</p>
                                <img src={viewProof.adminProofImage} className="w-full rounded" alt="Proof" />
                            </div>
                        ) : (
                            viewProof.status === 'APPROVED' && <p className="text-gray-500 text-sm italic">No proof image attached.</p>
                        )}
                        
                        {viewProof.adminProofLink && (
                            <div className="bg-gray-50 p-3 rounded">
                                <p className="text-xs text-gray-500 mb-1">Attached Link:</p>
                                <a href={viewProof.adminProofLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm break-all font-medium">
                                    {viewProof.adminProofLink}
                                </a>
                            </div>
                        )}
                     </div>
                     <div className="mt-6 flex justify-end">
                         <button onClick={() => setViewProof(null)} className="bg-gray-900 text-white px-4 py-2 rounded text-sm font-bold">Close</button>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};

export default CommissionTable;
