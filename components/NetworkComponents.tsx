import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, SystemSettings } from '../types';
// import { getMemberTree, getDownlineDetails, getNetworkStats, getUsers } from '../services/mockDatabase'; // Removed
import TreeNode from './NetworkTree';
import { Icons } from '../constants';

interface NetworkViewProps {
  currentUser: User;
  systemSettings: SystemSettings;
  t: any;
}

const NetworkComponents: React.FC<NetworkViewProps> = ({ currentUser, systemSettings, t }) => {
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get('viewUser');
  // Only Admin or the user themselves can view specific networks (in a real app). 
  // For now, if viewUser is present, we use it.
  const targetUserId = viewUserId || currentUser.id;
  const isViewingOther = targetUserId !== currentUser.id;
  const [targetUserName, setTargetUserName] = useState('');

  const [networkView, setNetworkView] = useState<'TREE' | 'TABLE'>('TREE');
  const [networkTree, setNetworkTree] = useState<any>(null);
  const [networkDetails, setNetworkDetails] = useState<any[]>([]);
  const [networkSearch, setNetworkSearch] = useState('');
  const [stats, setStats] = useState({ frontline: 0, groupCount: 0 });

  useEffect(() => {
    // If viewing other, fetch their name
    // This is handled by getNetwork now implicitly returning user data in tree root or we can rely on tree root node.
    
    const loadData = async () => {
        try {
            const data = await import('../services/userService').then(m => m.userApi.getNetwork(viewUserId || undefined));
            setNetworkTree(data.tree);
            setNetworkDetails(data.list);
            setStats(data.stats);
            if (data.tree && isViewingOther) {
                setTargetUserName(data.tree.name);
            }
        } catch (e) {
            console.error(e);
        }
    };
    
    loadData();
  }, [targetUserId, isViewingOther]);

  const filteredNetworkDetails = networkDetails.filter(d => 
    d.name.toLowerCase().includes(networkSearch.toLowerCase()) || 
    d.email.toLowerCase().includes(networkSearch.toLowerCase())
  );

  // [NEW] Pagination Logic
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNetworkDetails.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNetworkDetails.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">My Network</h2>
           <p className="text-gray-500">Manage and view your team structure</p>
           {isViewingOther && (
               <div className="mt-2 text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded-lg inline-flex items-center gap-2">
                   <Icons.Eye /> Viewing Network of: <strong>{targetUserName}</strong>
                   <a href="/network" className="underline ml-2 text-xs">Reset to Me</a>
               </div>
           )}
        </div>
        <div className="flex gap-4 text-sm">
             <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                 <p className="text-blue-600 font-bold uppercase text-[10px]">Frontline</p>
                 <p className="text-xl font-bold text-gray-800">{stats.frontline}</p>
             </div>
             <div className="bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
                 <p className="text-purple-600 font-bold uppercase text-[10px]">Total Group</p>
                 <p className="text-xl font-bold text-gray-800">{stats.groupCount}</p>
             </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
         <div className="flex gap-2">
            <button 
                onClick={() => setNetworkView('TREE')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${networkView === 'TREE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
                <Icons.List /> Tree View
            </button>
            <button 
                onClick={() => setNetworkView('TABLE')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${networkView === 'TABLE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
            >
                <Icons.Users /> Table List
            </button>
         </div>
         
         {networkView === 'TABLE' && (
             <div className="w-64">
                 <input 
                    placeholder="Search member..." 
                    className="w-full border px-4 py-2 rounded-lg text-sm"
                    value={networkSearch}
                    onChange={e => setNetworkSearch(e.target.value)}
                 />
             </div>
         )}
      </div>

      {/* Views */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[500px]">
         {networkView === 'TREE' ? (
             networkTree ? (
                <div className="overflow-x-auto">
                    <TreeNode node={networkTree} level={0} maxDepth={systemSettings.commissionLevels + 2} />
                </div>
             ) : (
                <div className="text-center py-20 text-gray-400 italic">No network data found</div>
             )
         ) : (
             <>
                 {/* Table Controls */}
                 <div className="flex justify-between items-center mb-4">
                     <div className="flex items-center gap-2 text-sm text-gray-500">
                         <span>Show</span>
                         <select 
                            value={itemsPerPage} 
                            onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            className="border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                         >
                             <option value={10}>10</option>
                             <option value={20}>20</option>
                             <option value={50}>50</option>
                             <option value={100}>100</option>
                         </select>
                         <span>entries</span>
                     </div>
                     <div className="text-sm text-gray-500">
                         Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredNetworkDetails.length)} of {filteredNetworkDetails.length} entries
                     </div>
                 </div>

                 <div className="overflow-x-auto">
                     <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4">Level</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Joined At</th>
                                <th className="px-6 py-4 text-right">Total Sales</th>
                                <th className="px-6 py-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {currentItems.length === 0 ? (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No members found</td></tr>
                            ) : (
                                currentItems.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${d.level === 1 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                                                Lvl {d.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-gray-800">{d.name}</div>
                                            <div className="text-xs text-gray-400">{d.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(d.joinedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-emerald-600">
                                            Rp {d.totalSales.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${d.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                {d.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                     </table>
                 </div>

                 {/* Pagination Buttons */}
                 {totalPages > 1 && (
                     <div className="flex justify-end gap-2 mt-4">
                         <button 
                             onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                             disabled={currentPage === 1}
                             className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                         >
                             Previous
                         </button>
                         {(Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                             // Simple logic to show window of pages around current would be better but simple list is fine for now
                             // Let's just show standard next/prev with current page indicator
                             return null;
                         }))}
                         <span className="px-3 py-1 text-sm text-gray-600 flex items-center">
                             Page {currentPage} of {totalPages}
                         </span>
                         <button 
                             onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                             disabled={currentPage === totalPages}
                             className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 text-sm"
                         >
                             Next
                         </button>
                     </div>
                 )}
             </>
         )}
      </div>
    </div>
  );
};

export default NetworkComponents;
