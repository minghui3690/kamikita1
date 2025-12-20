
import React, { useState, useEffect, useCallback } from 'react';
// import { getCombinedActions, archiveActions, unhideActions } from '../services/mockDatabase';
import { User } from '../types';
import { Icons, TRANSLATIONS } from '../constants';

interface Props {
  user: User;
  currentLang?: string;
}

const RecentActions: React.FC<Props> = ({ user, currentLang = 'EN' }) => {
  const [actions, setActions] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [limit, setLimit] = useState(10);
  const [showHidden, setShowHidden] = useState(false);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];

  const refreshData = useCallback(async () => {
    try {
        const data = await import('../services/userService').then(m => m.userApi.getRecentActions(showHidden));
        setActions(data);
        setSelectedIds([]);
    } catch(e) { console.error(e); }
  }, [user, showHidden]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          const visibleIds = actions.slice(0, limit).map(a => a.id);
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

  const handleHide = async () => {
      if (selectedIds.length === 0) return;
      if (confirm(`${t.archive} ${selectedIds.length} items?`)) {
          try {
              const itemsToArchive = actions.filter(a => selectedIds.includes(a.id)).map(a => ({ id: a.id, type: a.type }));
              await import('../services/userService').then(m => m.userApi.archiveActions(itemsToArchive, true));
              refreshData();
          } catch (e) { console.error(e); alert('Failed to archive'); }
      }
  };

  const handleUnhide = async () => {
      if (selectedIds.length === 0) return;
      if (confirm(`${t.unhide} ${selectedIds.length} items?`)) {
          try {
              const itemsToUnhide = actions.filter(a => selectedIds.includes(a.id)).map(a => ({ id: a.id, type: a.type }));
              await import('../services/userService').then(m => m.userApi.archiveActions(itemsToUnhide, false));
              refreshData();
          } catch (e) { console.error(e); alert('Failed to unhide'); }
      }
  };

  const toggleView = () => {
      setShowHidden(!showHidden);
      // Data refresh happens via useEffect when showHidden changes
  };

  const visibleActions = actions.slice(0, limit);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
           <h3 className="font-bold text-gray-800 flex items-center gap-2">
               <Icons.Chart /> {t.recentActions} 
               {showHidden && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-2">(Hidden Items)</span>}
           </h3>
           <div className="flex gap-2 items-center">
               <button 
                 onClick={toggleView} 
                 className="text-xs font-bold text-blue-600 hover:text-blue-800 underline mr-2"
               >
                   {showHidden ? t.showActive : t.showHidden}
               </button>

               {selectedIds.length > 0 && (
                   <>
                       {showHidden ? (
                           <button onClick={handleUnhide} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-200 transition-colors">
                               <Icons.Check /> {t.unhide}
                           </button>
                       ) : (
                           <button onClick={handleHide} className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-yellow-200 transition-colors">
                               <Icons.Ban /> {t.archive}
                           </button>
                       )}
                   </>
               )}
               <select 
                 value={limit} 
                 onChange={e => setLimit(Number(e.target.value))}
                 className="border border-gray-300 rounded-lg text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
               >
                 <option value={5}>5</option>
                 <option value={10}>10</option>
                 <option value={20}>20</option>
                 <option value={50}>50</option>
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
                        checked={visibleActions.length > 0 && selectedIds.length === visibleActions.length} 
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                </th>
                <th className="px-6 py-4">{t.date}</th>
                <th className="px-6 py-4">{t.user}</th>
                <th className="px-6 py-4">{t.type}</th>
                <th className="px-6 py-4">{t.description}</th>
                <th className="px-6 py-4 text-right">{t.amount}</th>
                <th className="px-6 py-4 text-center">{t.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleActions.map(action => (
                <tr key={action.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(action.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(action.id)} 
                        onChange={() => handleSelect(action.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(action.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{action.userName}</td>
                  <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${action.type === 'PURCHASE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {action.type === 'PURCHASE' ? t.purchase : t.withdrawal}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-xs">{action.description}</td>
                  <td className="px-6 py-4 text-right font-bold text-gray-800">Rp {action.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase`}>{action.status}</span>
                  </td>
                </tr>
              ))}
              {visibleActions.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-gray-400">No {showHidden ? 'hidden' : 'recent'} actions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
    </div>
  );
};

export default RecentActions;
