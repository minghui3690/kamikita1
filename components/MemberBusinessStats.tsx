import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionApi } from '../services/transactionService';
import { Transaction, CartItem } from '../types';
import { Icons } from '../constants';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext exists or we pass user from App. It's better to rely on what App uses.

// If AuthContext is not available, we might need to get user from localStorage or props. 
// Based on App.tsx, currentUser is passed or managed. 
// Let's assume we can get currentUser from local storage or better yet, verify if we can use a hook.
// Since I assume this is a new file, I'll rely on the standard pattern found in other components.
// Actually, I'll just use the localStorage token decoder or assume the API handles "my transactions" via token if I don't pass userId?
// Wait, getMyTransactions takes userId. I need the current user ID. 
// I will assume `currentUser` is available via simple prop or `localStorage`.
// Let's check App.tsx to see how user is managed. It uses `currentUser` state.
// I will make this component accept currentUser as prop to be safe.

interface MemberStatsProps {
    currentUser: any;
}

const MemberBusinessStats: React.FC<MemberStatsProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [scope, setScope] = useState<'personal' | 'group'>('personal'); 
  const [limit, setLimit] = useState(10);
  const [showHidden, setShowHidden] = useState(false); // [NEW]
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const parseItems = (items: any): CartItem[] => {
      if (typeof items === 'string') {
          try {
              return JSON.parse(items);
          } catch (e) {
              return [];
          }
      }
      return items || [];
  };

  const processSalesStats = (txs: Transaction[], p: 'weekly' | 'monthly' | 'yearly') => {
      const paidTxs = txs.filter(t => t.status === 'PAID');
      const data: { label: string, amount: number }[] = [];
      const now = new Date();

      if (p === 'weekly') {
        for(let i=6; i>=0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
            const amount = paidTxs.filter(t => new Date(t.timestamp).toDateString() === d.toDateString()).reduce((sum, t) => sum + t.totalAmount, 0);
            data.push({ label, amount });
        }
      } else if (p === 'monthly') {
         for(let i=5; i>=0; i--) {
             const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
             const label = d.toLocaleDateString('en-US', { month: 'short' });
             const amount = paidTxs.filter(t => {
                 const td = new Date(t.timestamp);
                 return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
             }).reduce((sum, t) => sum + t.totalAmount, 0);
             data.push({ label, amount });
         }
      } else {
        for(let i=4; i>=0; i--) {
            const year = now.getFullYear() - i;
            const amount = paidTxs.filter(t => new Date(t.timestamp).getFullYear() === year).reduce((sum, t) => sum + t.totalAmount, 0);
            data.push({ label: year.toString(), amount });
        }
      }
      return data;
  };

  const [stats, setStats] = useState<{label:string, amount:number}[]>([]); 
  
  // Prevent Division by Zero
  const maxVal = Math.max(...stats.map(s => s.amount), 10000); 

  const refreshData = useCallback(async () => {
      if (!currentUser) return;
      try {
          const allTx = await transactionApi.getMyTransactions(currentUser.id, scope);
          // [NEW] Filter based on showHidden
          const filtered = allTx.filter(t => showHidden ? t.isArchived : !t.isArchived); 
          setTransactions(filtered);
          setStats(processSalesStats(filtered, period)); // Stats might need full data? Usually stats show active sales. Let's filter stats too or use all? Admin uses 'filtered' for stats.
      } catch (e) {
          console.error("Failed to load business stats", e);
      }
  }, [currentUser, scope, period, showHidden]);

  useEffect(() => {
      refreshData();
  }, [refreshData]);

  // [NEW] Selection Logic
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const visibleTransactions = transactions.slice(0, limit);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const ids = visibleTransactions.map(t => scope === 'group' ? (t as any).commissionId : t.id);
          setSelectedIds(ids);
      } else {
          setSelectedIds([]);
      }
  };

  const handleSelect = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(selectedIds.filter(sid => sid !== id));
      } else {
          setSelectedIds([...selectedIds, id]);
      }
  };

  const handleArchive = async (archive: boolean) => {
      if (selectedIds.length === 0) return;
      if (!window.confirm(`Are you sure you want to ${archive ? 'hide' : 'unhide'} ${selectedIds.length} items?`)) return;

      try {
          const target = scope === 'group' ? 'COMMISSION' : 'TRANSACTION';
          await transactionApi.toggleArchive(selectedIds, archive, target);
          await refreshData();
          setSelectedIds([]);
      } catch (e) {
          alert('Failed to update status');
      }
  };

  return (
    <div className="space-y-6">
      {/* ... Charts ... */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 mb-6 uppercase tracking-wider">
            {scope === 'personal' ? 'My Purchase Volume' : 'Group Volume (Commissions Base)'}
        </h3>
        
        <div className="relative h-72 w-full">
           {/* Y-Axis Guidelines */}
           <div className="absolute inset-0 flex flex-col justify-between text-xs text-gray-400 pointer-events-none">
              <div className="border-b border-gray-100 w-full pb-1">Rp {maxVal.toLocaleString(undefined, {compactDisplay: "short", notation: "compact"})}</div>
              <div className="border-b border-gray-100 w-full pb-1">Rp {(maxVal * 0.75).toLocaleString(undefined, {compactDisplay: "short", notation: "compact"})}</div>
              <div className="border-b border-gray-100 w-full pb-1">Rp {(maxVal * 0.5).toLocaleString(undefined, {compactDisplay: "short", notation: "compact"})}</div>
              <div className="border-b border-gray-100 w-full pb-1">Rp {(maxVal * 0.25).toLocaleString(undefined, {compactDisplay: "short", notation: "compact"})}</div>
              <div className="border-b border-gray-100 w-full pb-1">0</div>
           </div>

           {/* Bars */}
           <div className="absolute inset-x-0 bottom-0 top-6 flex items-end justify-between gap-4 px-4 z-10">
              {stats.map((item, idx) => {
                const heightPercent = (item.amount / maxVal) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    <div className="w-full bg-gray-50 rounded-t-sm relative h-full flex items-end overflow-visible">
                      <div 
                        className={`w-full transition-all duration-700 ease-out rounded-t-sm shadow-lg ${scope === 'personal' ? 'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20' : 'bg-purple-500 hover:bg-purple-400 shadow-purple-500/20'}`}
                        style={{ height: `${heightPercent || 1}%`, minHeight: '4px' }}
                      ></div>
                      
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 bg-gray-900 text-white text-xs px-2 py-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-xl">
                        Rp {item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-3 font-medium">{item.label}</span>
                  </div>
                );
              })}
           </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
           <div className="flex items-center gap-4">
               <h3 className="font-bold text-gray-800 flex items-center gap-2">
                   {scope === 'personal' ? 'My Transaction History' : 'Network Transaction History'}
                   {showHidden && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-2">(Hidden Items)</span>}
               </h3>
               {/* [NEW] View Hidden Toggle */}
               <button 
                 onClick={() => { setShowHidden(!showHidden); }} 
                 className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
               >
                   {showHidden ? 'View Active' : 'View Hidden'}
               </button>
           </div>
           
           <div className="flex gap-2 items-center">
               {/* [NEW] Archive Actions */}
               {selectedIds.length > 0 && (
                   <>
                       {showHidden ? (
                           <button onClick={() => handleArchive(false)} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors">
                               <Icons.Check /> Unhide
                           </button>
                       ) : (
                           <button onClick={() => handleArchive(true)} className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-yellow-200 transition-colors">
                               <Icons.Ban /> Hide
                           </button>
                       )}
                   </>
               )}
               <select 
                 value={limit} 
                 onChange={e => setLimit(Number(e.target.value))}
                 className="border border-gray-300 rounded-md text-sm px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
               >
                 <option value={10}>Show 10</option>
                 <option value={20}>Show 20</option>
                 <option value={50}>Show 50</option>
               </select>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 w-4">
                    <input type="checkbox" onChange={handleSelectAll} checked={visibleTransactions.length > 0 && selectedIds.length === visibleTransactions.length} />
                </th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-right">Amount</th>
                {scope === 'group' && <th className="px-6 py-4 text-right">My Commission</th>}
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTransactions.map(t => {
                const items = parseItems(t.items);
                const commission = (t as any)._commissionAmount;
                const level = (t as any)._commissionLevel;
                const targetId = scope === 'group' ? (t as any).commissionId : t.id;

                return (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(targetId)} 
                        onChange={() => handleSelect(targetId)} 
                        disabled={scope === 'group' && !targetId} // Disable if no commission ID (shouldn't happen)
                      />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {t.userName}
                      {level && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Lvl {level}</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {items && items.length > 0 
                      ? (items.length > 1 ? `${items[0].product.name} +${items.length-1} more` : items[0].product.name)
                      : 'Unknown Product'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">Rp {t.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  
                  {scope === 'group' && (
                      <td className="px-6 py-4 text-right font-bold text-green-600">
                          {commission ? `+ Rp ${commission.toLocaleString()}` : '-'}
                      </td>
                  )}

                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                  </td>
                  <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                    {/* Hide Button per Row? No, use bulk at top to keep clean */}
                    <button 
                        onClick={() => {
                            // Simple view detail or no action. 
                        }}
                        className="text-gray-400 hover:text-blue-600"
                        title="View Details"
                    >
                        <Icons.Document />
                    </button>
                  </td>
                </tr>
              )})}
              {visibleTransactions.length === 0 && (
                  <tr><td colSpan={scope === 'group' ? 7 : 6} className="p-8 text-center text-gray-400">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MemberBusinessStats;
