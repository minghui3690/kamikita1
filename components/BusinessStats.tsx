import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionApi } from '../services/transactionService';
import { Transaction, CartItem } from '../types';
import { Icons } from '../constants';

const BusinessStats: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [limit, setLimit] = useState(10);
  const [showHidden, setShowHidden] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
      try {
          // Fetch from API
          const allTx = await transactionApi.getAllTransactions();
          const filtered = allTx.filter(t => showHidden ? t.isArchived : !t.isArchived); 
          
          setTransactions(filtered);
          setStats(processSalesStats(filtered, period));
          setSelectedIds([]);
      } catch (e) {
          console.error("Failed to load business stats", e);
      }
  }, [showHidden, period]);

  useEffect(() => {
      refreshData();
  }, [refreshData]);

  const visibleTransactions = transactions.slice(0, limit);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const visibleIds = visibleTransactions.map(t => t.id);
          setSelectedIds(visibleIds);
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

  const handleHide = () => {
     alert('Archive feature disabled during migration to server.');
  };

  const handleUnhide = () => {
      alert('Unhide feature disabled during migration to server.');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Business Statistics</h2>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex">
          {(['weekly', 'monthly', 'yearly'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${period === p ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-500 mb-6 uppercase tracking-wider">Sales Revenue Trend</h3>
        
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
                        className="w-full bg-blue-500 hover:bg-blue-400 transition-all duration-700 ease-out rounded-t-sm shadow-lg shadow-blue-500/20"
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
                   Recent Transactions
                   {showHidden && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-2">(Hidden Items)</span>}
               </h3>
               <button 
                 onClick={() => { setShowHidden(!showHidden); }} 
                 className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
               >
                   {showHidden ? 'View Active' : 'View Hidden'}
               </button>
           </div>
           
           <div className="flex gap-2 items-center">
               {selectedIds.length > 0 && (
                   <>
                       {showHidden ? (
                           <button onClick={handleUnhide} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors">
                               <Icons.Check /> Unhide
                           </button>
                       ) : (
                           <button onClick={handleHide} className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-yellow-200 transition-colors">
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
                <th className="px-6 py-4 w-10">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll} 
                        checked={visibleTransactions.length > 0 && selectedIds.length === visibleTransactions.length} 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                </th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleTransactions.map(t => {
                const items = parseItems(t.items);
                return (
                <tr key={t.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(t.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(t.id)} 
                        onChange={() => handleSelect(t.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.timestamp).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.userName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {items && items.length > 0 
                      ? (items.length > 1 ? `${items[0].product.name} +${items.length-1} more` : items[0].product.name)
                      : 'Unknown Product'}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">Rp {t.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">PAID</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                        onClick={() => {
                            const hasConsultation = items?.some((i: any) => i.product.isConsultation || i.product.name.toLowerCase().includes('consult') || i.product.nameproduct?.toLowerCase().includes('consult'));
                            if (hasConsultation) {
                                navigate('/consultations', { state: { view: 'clients' } });
                            } else {
                                navigate('/members', { state: { openPurchasesFor: t.userId } });
                            }
                        }}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        title="Manage Purchased Files"
                    >
                        <Icons.Document />
                    </button>
                  </td>
                </tr>
              )})}
              {visibleTransactions.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BusinessStats;
