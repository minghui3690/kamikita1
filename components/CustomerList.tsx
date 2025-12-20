import React, { useState, useEffect } from 'react';
import { getCustomers } from '../services/customerService';
import { TRANSLATIONS, Icons } from '../constants'; 
import api from '../services/api'; 
import { User } from '../types'; 
import { useLocation, useNavigate } from 'react-router-dom';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    referralCode?: string;
    emailStatus: string; 
    lastEmailSentAt?: string; 
    referrer?: { name: string; email: string };
    transactions: {
        id: string;
        totalAmount: number;
        status: string;
        timestamp: string;
        items: any;
    }[];
    createdAt: string;
}

interface Props {
    currentLang: string;
    currentUser: User | null; 
}

const CustomerList: React.FC<Props> = ({ currentLang, currentUser }) => {
    // Enhanced State
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState<string | null>(null);
    
    // Modal State
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);

    // Upgrade Modal State
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradePassword, setUpgradePassword] = useState('');
    const [upgradeUsername, setUpgradeUsername] = useState('');
    const [upgradeRefCode, setUpgradeRefCode] = useState('');
    const [upgradeEmail, setUpgradeEmail] = useState('');
    const [isUpgrading, setIsUpgrading] = useState(false);

    // Pagination & Filter State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL'); 
    const [showHidden, setShowHidden] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    const location = useLocation();
    const navigate = useNavigate();

    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];

    // Check if allowed to send email (Admin/Manager)
    const canSendEmail = currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER';

    useEffect(() => {
        loadCustomers();
    }, [showHidden]); 

    // Auto-open Email Modal via Navigation State
    useEffect(() => {
        if (customers.length > 0 && location.state && (location.state as any).openEmailFor) {
            const targetId = (location.state as any).openEmailFor;
            const targetCustomer = customers.find(c => c.id === targetId);
            if (targetCustomer) {
                handleOpenEmailModal(targetCustomer);
                // Clear state
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [customers, location.state]);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await getCustomers(showHidden);
            setCustomers(data);
            setCurrentPage(1); // Reset to first page on reload
            setSelectedIds([]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredCustomers = customers.filter(c => {
        if (searchTerm.trim()) {
            const lowerTerm = searchTerm.toLowerCase();
            return c.name.toLowerCase().includes(lowerTerm) || 
                   c.email.toLowerCase().includes(lowerTerm) ||
                   (c.referralCode && c.referralCode.toLowerCase().includes(lowerTerm));
        }
        return true;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
    const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Handlers
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(paginatedCustomers.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleArchive = async (archive: boolean) => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Are you sure you want to ${archive ? 'hide' : 'unhide'} ${selectedIds.length} customers?`)) return;

        try {
            await api.post('/customers/archive', { ids: selectedIds, archive }); // Use direct API or service if updated
            // Optimistic Update or Reload
            loadCustomers(); 
        } catch (error) {
            alert('Failed to update customers.');
        }
    };

    const handleOpenUpgradeModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        setUpgradePassword(''); // Reset or generate random?
        setUpgradeUsername('');
        setUpgradeEmail(customer.email); // Pre-fill with current email
        setUpgradeRefCode(customer.referralCode || ''); // Pre-fill with code they used
        setIsUpgradeModalOpen(true);
    };

    const handleUpgrade = async () => {
        if (!selectedCustomer) return;
        if (!upgradePassword) return alert('Password is required');
        
        setIsUpgrading(true);
        try {
            await api.post(`/customers/${selectedCustomer.id}/upgrade`, {
                password: upgradePassword,
                username: upgradeUsername,
                uplineReferralCode: upgradeRefCode,
                email: upgradeEmail // Send the edited Email
            });
            alert('Customer upgraded to Member successfully!');
            setIsUpgradeModalOpen(false);
            loadCustomers(); // Reload list (customer should disappear/archive)
        } catch (error: any) {
            alert(error.response?.data?.message || 'Upgrade failed');
        } finally {
            setIsUpgrading(false);
        }
    };

    const handleOpenEmailModal = (customer: Customer) => {
        setSelectedCustomer(customer);
        setEmailSubject('Start working on your Human Design now!');
        setEmailMessage(`Hi ${customer.name},\n\nThank you for your order. Please find attached the Human Design file you purchased.\n\nBest regards,\nRich Dragon Admin`);
        setSelectedFile(null);
    };

    const handleSendEmail = async () => {
        if (!selectedCustomer) return;
        setIsSending(true);

        const performSend = async (fileUrl: string | null, fileName: string | null) => {
            try {
                await api.post(`/customers/${selectedCustomer.id}/send-email`, {
                    email: selectedCustomer.email,
                    subject: emailSubject,
                    message: emailMessage,
                    fileUrl,   // Pass Base64 data
                    fileName   // Pass filename
                });
                
                // Update local state
                setCustomers(prev => prev.map(c => 
                    c.id === selectedCustomer.id 
                    ? { ...c, emailStatus: 'SENT', lastEmailSentAt: new Date().toISOString() } 
                    : c
                ));
                
                alert(`Email sent to ${selectedCustomer.name}!`);
                setSelectedCustomer(null);
            } catch (error) {
                alert('Failed to send email.');
                console.error(error);
            } finally {
                setIsSending(false);
            }
        };

        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    performSend(ev.target.result as string, selectedFile.name);
                } else {
                    alert('Failed to read file');
                    setIsSending(false);
                }
            };
            reader.readAsDataURL(selectedFile);
        } else {
            performSend(null, null);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Customers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">
                    {showHidden ? 'Hidden Customers' : 'Customer List (Guests)'}
                </h2>
                <div className="flex items-center gap-4">
                     <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                        {filteredCustomers.length} Customers
                    </span>
                </div>
            </div>

            {/* Toolbar */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 w-full md:w-auto">
                     {/* Items Per Page */}
                     <select 
                        value={itemsPerPage} 
                        onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-gray-50 border rounded px-3 py-2 text-sm outline-none cursor-pointer hover:bg-gray-100"
                    >
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                    </select>

                     {/* Search */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search Name/Email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 px-3 py-2 border rounded text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchTerm && (
                             <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                            >
                                <Icons.X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

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

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.length === paginatedCustomers.length && paginatedCustomers.length > 0}
                                        onChange={handleSelectAll}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Customer Info</th>
                                <th className="px-6 py-4">Contact</th>
                                <th className="px-6 py-4">Referrer</th>
                                <th className="px-6 py-4">Total Orders</th>
                                <th className="px-6 py-4">Joined At</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                {canSendEmail && <th className="px-6 py-4 text-center">Action</th>}
                                <th className="px-6 py-4 text-center">Upgrade</th> 
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {paginatedCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-8 text-center text-gray-400 italic">No customers found.</td>
                                </tr>
                            ) : (
                                paginatedCustomers.map(c => (
                                    <tr key={c.id} className={`hover:bg-gray-50 ${selectedIds.includes(c.id) ? 'bg-blue-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedIds.includes(c.id)}
                                                onChange={() => handleSelectOne(c.id)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-800">{c.name}</p>
                                            <p className="text-xs text-gray-500">Ref Code Used: {c.referralCode || 'N/A'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <p>{c.email}</p>
                                            <p>{c.phone}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {c.referrer ? c.referrer.name : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            <p className="font-bold">{c.transactions.length} Order(s)</p>
                                            <p className="text-xs text-emerald-600">
                                                Last: {c.transactions[0] ? `${new Date(c.transactions[0].timestamp).toLocaleDateString()} (${(c as any).nameproduct || (c as any).lastProductName})` : '-'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {c.emailStatus === 'SENT' ? (
                                                <div className="inline-flex flex-col items-center">
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                                                        <Icons.Check className="w-3 h-3" /> Sent
                                                    </span>
                                                    {c.lastEmailSentAt && (
                                                        <span className="text-[10px] text-gray-400 mt-1">
                                                            {new Date(c.lastEmailSentAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        {canSendEmail && (
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleOpenEmailModal(c)}
                                                    disabled={showHidden || c.isArchived}
                                                    className={`p-2 rounded-lg transition-colors ${showHidden || c.isArchived ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                                                    title={showHidden || c.isArchived ? "Customer Archived/Upgraded" : "Send Email with File"}
                                                >
                                                    <Icons.Mail className="w-5 h-5" />
                                                </button>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => handleOpenUpgradeModal(c)}
                                                disabled={showHidden || c.isArchived}
                                                className={`p-2 rounded-lg transition-colors ${showHidden || c.isArchived ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                                                title={showHidden || c.isArchived ? "Customer Upgrade/Archived" : "Upgrade to Member"}
                                            >
                                                <Icons.UserPlus className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded border bg-white disabled:opacity-50 text-sm hover:bg-gray-50"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded border bg-white disabled:opacity-50 text-sm hover:bg-gray-50"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Send Email Modal */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icons.Mail className="w-5 h-5 text-blue-600" /> 
                                Send File to {selectedCustomer.name}
                            </h3>
                            <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                                <Icons.X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                                <input type="text" value={selectedCustomer.email} disabled className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                <input 
                                    type="text" 
                                    value={emailSubject} 
                                    onChange={e => setEmailSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea 
                                    value={emailMessage} 
                                    onChange={e => setEmailMessage(e.target.value)}
                                    rows={5}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (PDF)</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 transition-colors relative">
                                    <input 
                                        type="file" 
                                        onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept=".pdf"
                                    />
                                    <Icons.Upload className="w-8 h-8 text-gray-400 mb-2" />
                                    <p className="text-sm text-gray-600 font-medium">
                                        {selectedFile ? selectedFile.name : 'Click to upload PDF'}
                                    </p>
                                    {!selectedFile && <p className="text-xs text-gray-400 mt-1">Maximum file size 10MB</p>}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setSelectedCustomer(null)}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSendEmail}
                                disabled={isSending}
                                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSending ? 'Sending...' : <><Icons.Send className="w-4 h-4" /> Send Email</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {isUpgradeModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-50 to-white">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Icons.UserPlus className="w-5 h-5 text-purple-600" /> 
                                Upgrade to Member
                            </h3>
                            <button onClick={() => setIsUpgradeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Icons.X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-sm mb-4">
                                Upgrading <strong>{selectedCustomer.name}</strong> will create a new Member account, migrate their transactions, and archive this Guest record.
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                <input 
                                    type="email" 
                                    value={upgradeEmail} 
                                    onChange={e => setUpgradeEmail(e.target.value)}
                                    placeholder="Customer registered email"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password (Required)</label>
                                <input 
                                    type="text" 
                                    value={upgradePassword} 
                                    onChange={e => setUpgradePassword(e.target.value)}
                                    placeholder="Enter initial password"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username (Optional)</label>
                                <input 
                                    type="text" 
                                    value={upgradeUsername} 
                                    onChange={e => setUpgradeUsername(e.target.value)}
                                    placeholder="Leave blank to auto-generate"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sponsor / Upline Code</label>
                                <input 
                                    type="text" 
                                    value={upgradeRefCode} 
                                    onChange={e => setUpgradeRefCode(e.target.value)}
                                    placeholder="Enter Sponsor Code (or leave for default)"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Default: {selectedCustomer.referralCode || 'None (Will assign to Admin)'}
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsUpgradeModalOpen(false)}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpgrade}
                                disabled={isUpgrading}
                                className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isUpgrading ? 'Processing...' : 'Confirm Upgrade'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerList;
