import React, { useState, useEffect, useRef } from 'react';
import { getAdminWalletLogs, getUsers, archiveAdminLogs } from '../services/userService';
import { TRANSLATIONS, Icons } from '../constants';
import { User } from '../types';

interface WalletLog {
    id: string;
    userId: string;
    userName: string;
    type: string;
    amount: number;
    timestamp: string;
    description: string;
    isArchived: boolean;
}

const AdminWallet: React.FC<{ currentLang?: string, currentUser: User | null }> = ({ currentLang = 'EN', currentUser }) => {
    // Data State
    const [logs, setLogs] = useState<WalletLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Feature State
    const [showHidden, setShowHidden] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Search & Filter State
    const [filterType, setFilterType] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];

    // Initial Load
    useEffect(() => {
        fetchLogs();
        fetchUsers();
        
        // Click outside handler for dropdown
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showHidden]); // Re-fetch logs when view mode changes

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await getAdminWalletLogs(showHidden);
            setLogs(data);
            setSelectedIds([]); 
            setCurrentPage(1);
        } catch (e) {
            console.error(e);
            alert('Failed to load wallet logs');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setAllUsers(data);
        } catch (e) {
            console.error('Failed to load users', e);
        }
    };

    // Filter Users for Autocomplete
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredUsers([]);
            return;
        }
        if (selectedUser && (selectedUser.username === searchTerm || selectedUser.name === searchTerm)) {
             return;
        }
        const lowerTerm = searchTerm.toLowerCase();
        const matches = allUsers.filter(u => 
            (u.username && u.username.toLowerCase().includes(lowerTerm)) ||
            u.name.toLowerCase().includes(lowerTerm) ||
            u.email.toLowerCase().includes(lowerTerm)
        ).slice(0, 10);
        setFilteredUsers(matches);
    }, [searchTerm, allUsers]);

    const handleSelectUser = (user: User) => {
        setSelectedUser(user);
        setSearchTerm(user.username || user.name);
        setShowDropdown(false);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setSelectedUser(null);
        setShowDropdown(true);
    };

    // Logic for checkbox selection
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select visible items on current page for UX safety
            setSelectedIds(paginatedLogs.map(l => l.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleArchive = async (archive: boolean) => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to ${archive ? 'hide' : 'unhide'} ${selectedIds.length} items?`)) return;

        const itemsToUpdate = logs.filter(l => selectedIds.includes(l.id)).map(l => ({
            id: l.id,
            type: l.type
        }));

        try {
            await archiveAdminLogs(itemsToUpdate, archive);
            await fetchLogs();
        } catch (e) {
            alert('Failed to update logs');
        }
    };

    // Core Filtering Logic
    const filteredLogs = logs.filter(l => {
        if (selectedUser) {
             const matchesType = filterType === 'ALL' || l.type === filterType;
             return l.userId === selectedUser.id && matchesType;
        }
        if (searchTerm.trim() && !selectedUser) {
            const matchesType = filterType === 'ALL' || l.type === filterType;
            const matchesSearch = l.userName.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesType && matchesSearch;
        }
        const matchesType = filterType === 'ALL' || l.type === filterType;
        return matchesType;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Stats Logic
    const totalCommission = filteredLogs.filter(l => l.type === 'COMMISSION').reduce((sum, l) => sum + l.amount, 0);
    const totalWithdrawal = filteredLogs.filter(l => l.type.includes('WITHDRAWAL')).reduce((sum, l) => sum + Math.abs(l.amount), 0);
    const totalTransfersIn = filteredLogs.filter(l => l.type === 'ADMIN_TRANSFER_IN').reduce((sum, l) => sum + l.amount, 0);
    const totalTransfersOut = filteredLogs.filter(l => l.type === 'ADMIN_TRANSFER_OUT').reduce((sum, l) => sum + Math.abs(l.amount), 0);
    
    // Net Balance Calc
    const netBalance = filteredLogs.reduce((sum, log) => {
        const isMemberTransfer = !searchTerm.trim() && !selectedUser && (log.type === 'ADMIN_TRANSFER_IN' || log.type === 'ADMIN_TRANSFER_OUT') && log.userId !== currentUser?.id;
        const displayAmount = isMemberTransfer ? -log.amount : log.amount;
        return sum + displayAmount;
    }, 0);

    const getBadgeClass = (type: string) => {
        if (type === 'COMMISSION') return 'bg-green-100 text-green-800';
        if (type.includes('WITHDRAWAL')) return 'bg-red-100 text-red-800';
        if (type === 'ADMIN_TRANSFER_IN') return 'bg-blue-100 text-blue-800';
        if (type === 'ADMIN_TRANSFER_OUT') return 'bg-orange-100 text-orange-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-gray-800">Admin Wallet & Transactions</h2>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-100 relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-1 bg-purple-500"></div>
                    <p className="text-sm text-gray-500">Net {searchTerm.trim() ? 'User' : 'Admin'} Balance</p>
                    <p className="text-2xl font-bold text-purple-700">{netBalance.toLocaleString()} Pts</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100">
                    <p className="text-sm text-gray-500">Total Commissions</p>
                    <p className="text-2xl font-bold text-green-600">{totalCommission.toLocaleString()} Pts</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100">
                    <p className="text-sm text-gray-500">Total Withdrawals</p>
                    <p className="text-2xl font-bold text-red-600">{totalWithdrawal.toLocaleString()} Pts</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100">
                    <p className="text-sm text-gray-500">Manual Topup</p>
                    <p className="text-2xl font-bold text-blue-600">{totalTransfersIn.toLocaleString()} Pts</p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100">
                    <p className="text-sm text-gray-500">Manual Deduct</p>
                    <p className="text-2xl font-bold text-orange-600 text-right">{totalTransfersOut.toLocaleString()} Pts</p>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ minHeight: '600px' }}>
                <div className="p-4 border-b space-y-4 bg-gray-50">
                    {/* Toolbar Row 1: Title & Bulk Actions */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            {showHidden ? 'Hidden Transactions' : 'All Transactions'} 
                            <span className="text-gray-400 text-sm font-normal">({filteredLogs.length})</span>
                        </h3>
                        
                        <div className="flex items-center gap-2">
                            {selectedIds.length > 0 && (
                                <div className="flex items-center gap-2 mr-4 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 animate-fade-in">
                                    <span className="text-sm font-bold text-blue-700">{selectedIds.length} Selected</span>
                                    <button 
                                        onClick={() => handleArchive(!showHidden)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded shadow-sm text-white ${showHidden ? 'bg-green-500 hover:bg-green-600' : 'bg-slate-700 hover:bg-slate-800'}`}
                                    >
                                        {showHidden ? 'Unhide' : 'Hide / Archive'}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setShowHidden(!showHidden)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors border ${showHidden ? 'bg-slate-800 text-white border-slate-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {showHidden ? <Icons.Eye /> : <Icons.EyeOff />}
                                {showHidden ? 'View Active' : 'View Hidden'}
                            </button>
                        </div>
                    </div>

                    {/* Toolbar Row 2: Search, Filter, Pagination */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2 w-full md:w-auto relative flex-wrap" ref={wrapperRef}>
                             {/* Search Input */}
                             <div className="relative flex-1 min-w-[200px]">
                                <input
                                    type="text"
                                    placeholder="Search by Username..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onFocus={() => setShowDropdown(true)}
                                    className="w-full px-3 py-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => { setSearchTerm(''); setSelectedUser(null); }}
                                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                    >
                                        <Icons.X className="w-4 h-4" />
                                    </button>
                                )}
                                
                                {/* Autocomplete Dropdown */}
                                {showDropdown && filteredUsers.length > 0 && (
                                    <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-200 mt-1 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                        {filteredUsers.map(u => (
                                            <div 
                                                key={u.id}
                                                onClick={() => handleSelectUser(u)}
                                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                                            >
                                                <p className="text-sm font-bold text-gray-800">{u.username || u.name}</p>
                                                <p className="text-xs text-gray-500">{u.email}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                             </div>

                             {/* Filter Type */}
                            <select 
                                value={filterType} 
                                onChange={e => setFilterType(e.target.value)}
                                className="bg-white border rounded px-3 py-2 text-sm outline-none cursor-pointer hover:bg-gray-50"
                            >
                                <option value="ALL">All Types</option>
                                <option value="COMMISSION">Commissions</option>
                                <option value="WITHDRAWAL">Withdrawals</option>
                                <option value="ADMIN_TRANSFER_IN">Topups</option>
                                <option value="ADMIN_TRANSFER_OUT">Deductions</option>
                            </select>
                            
                            {/* Items Per Page */}
                            <select
                                value={itemsPerPage}
                                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                                className="bg-white border rounded px-3 py-2 text-sm outline-none font-bold text-gray-700 cursor-pointer hover:bg-gray-50"
                            >
                                <option value={10}>10 / page</option>
                                <option value={20}>20 / page</option>
                                <option value={50}>50 / page</option>
                                <option value={100}>100 / page</option>
                            </select>
                        </div>
                        
                        {/* Pagination Controls */}
                        <div className="flex items-center gap-2">
                             <button 
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="p-2 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:bg-gray-50 text-gray-600"
                             >
                                 {'<'}
                             </button>
                             <span className="text-sm font-bold text-gray-600 min-w-[80px] text-center">
                                 Page {currentPage} / {totalPages || 1}
                             </span>
                             <button
                                disabled={currentPage >= totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="p-2 rounded border hover:bg-gray-100 disabled:opacity-50 disabled:bg-gray-50 text-gray-600"
                             >
                                 {'>'}
                             </button>
                        </div>
                    </div>
                </div>
                
                {isLoading ? (
                    <div className="p-12 text-center text-gray-500">Loading wallet history...</div>
                ) : (
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b hover:bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input 
                                            type="checkbox" 
                                            checked={paginatedLogs.length > 0 && selectedIds.length >= paginatedLogs.length && paginatedLogs.every(l => selectedIds.includes(l.id))}
                                            onChange={handleSelectAll}
                                            className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">User</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Description</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedLogs.length > 0 ? paginatedLogs.map(log => {
                                    const isMemberTransfer = !searchTerm.trim() && !selectedUser && (log.type === 'ADMIN_TRANSFER_IN' || log.type === 'ADMIN_TRANSFER_OUT') && log.userId !== currentUser?.id;
                                    const displayAmount = isMemberTransfer ? -log.amount : log.amount;
                                    
                                    let badgeClass = getBadgeClass(log.type);
                                    if (isMemberTransfer) {
                                        if (log.type === 'ADMIN_TRANSFER_IN') badgeClass = 'bg-red-100 text-red-800';
                                        if (log.type === 'ADMIN_TRANSFER_OUT') badgeClass = 'bg-green-100 text-green-800';
                                    }

                                    return (
                                    <tr key={log.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.includes(log.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input 
                                                type="checkbox"
                                                checked={selectedIds.includes(log.id)}
                                                onChange={() => handleSelectOne(log.id)}
                                                className="rounded border-gray-300 w-4 h-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-gray-500 font-mono text-xs whitespace-nowrap">
                                            {new Date(log.timestamp).toLocaleDateString()} <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </td>
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {log.userName}
                                            {isMemberTransfer && <span className="text-xs text-gray-400 block">(Member)</span>}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${badgeClass}`}>
                                                {log.type.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600 max-w-xs truncate" title={log.description}>
                                            {log.description}
                                        </td>
                                        <td className={`px-6 py-3 text-right font-mono font-bold ${displayAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {displayAmount > 0 ? '+' : ''}{displayAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-gray-400 bg-gray-50/50">
                                            <p>No transactions found.</p>
                                            <p className="text-xs text-gray-300 mt-1">Try adjusting filters or checking the hidden archive.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminWallet;
