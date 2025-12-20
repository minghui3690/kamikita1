
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUsers as getMockUsers, toggleUserStatus as mockToggle, deleteUser as mockDelete } from '../services/mockDatabase';
import * as userService from '../services/userService';
import { User, Product, HumanDesignProfile, HDPlanetaryData, HDCenters } from '../types';
import { Icons, TRANSLATIONS } from '../constants';

import CityAutocomplete from './CityAutocomplete';


// --- HUMAN DESIGN CONSTANTS ---
const HD_TYPES = [
    'GENERATOR', 'MANIFESTING GENERATOR', 'PROJECTOR', 'MANIFESTOR', 'REFLECTOR'
];

const HD_AUTOFILL: Record<string, { strategy: string; signature: string; notSelfTheme: string }> = {
    'GENERATOR': {
        strategy: 'Menunggu untuk Merespons',
        signature: 'Kepuasan',
        notSelfTheme: 'Frustrasi'
    },
    'MANIFESTING GENERATOR': {
        strategy: 'Menunggu untuk Merespons dan Memberitahu',
        signature: 'Kepuasan',
        notSelfTheme: 'Frustrasi dan Kemarahan'
    },
    'PROJECTOR': {
        strategy: 'Menunggu untuk Diundang / Undangan',
        signature: 'Kesuksesan',
        notSelfTheme: 'Kepahitan'
    },
    'MANIFESTOR': {
        strategy: 'Memberitahu / Menginformasikan',
        signature: 'Kedamaian',
        notSelfTheme: 'Kemarahan'
    },
    'REFLECTOR': {
        strategy: 'Menunggu 1 Siklus Bulan (28 Hari)',
        signature: 'Kejutan',
        notSelfTheme: 'Kekecewaan'
    }
};

const HD_AUTHORITIES = [
    'Emotional - Solar Plexus', 'Sacral', 'Splenic', 'Ego Manifested',
    'Self Projected', 'Ego Projected', 'Mental', 'Lunar'
];

const HD_DEFINITIONS = [
    'Single Definition', 'Split Definition', 'Triple Split Definition',
    'Quadruple Split Definition', 'Lunar / No Definition'
];

const HD_PROFILES = [
    '1/3 Investigator Martyr', '1/4 Investigator Opportunist', '2/4 Hermit Opportunist',
    '2/5 Hermit Heretic', '3/5 Martyr Heretic', '3/6 Martyr Role Model',
    '4/1 Opportunist Investigator', '4/6 Opportunist Role Model', '5/1 Heretic Investigator',
    '5/2 Heretic Hermit', '6/2 Role Model Hermit', '6/3 Role Model Martyr'
];

const HD_DIGESTIONS = [
    'High (Bising)', 'Low (Senyap)', 'Open (Terbuka)', 'Closed (Tertutup)',
    'Direct (Langsung)', 'InDirect (Tidak Langsung)', 'Hot (Panas)',
    'Cold (Dingin)', 'Calm (Tenang)', 'Nervous (Ramai-Ramai)',
    'Alternating (Bergantian)', 'Consecutive (Berurutan)'
];

const HD_SENSES = [
    'Security (Rasa Aman)', 'Uncertainty (Ketidakpastian)', 'Action (Tindakan)',
    'Meditation (Ketenangan)', 'Judgment (Penilaian)', 'Acceptance (Penerimaan)'
];

const HD_DESIGN_SENSES = [
    'Smell (Penciuman)', 'Taste (Pengecapan)', 'Outer Vision (Penglihatan Luar)',
    'Inner Vision (Penglihatan Batin)', 'Feeling (Perasaan)', 'Touch (Sentuhan)'
];

const HD_MOTIVATIONS = [
    'Fear (Rasa Takut)', 'Hope (Harapan)', 'Desire (Keinginan)',
    'Need (Kebutuhan)', 'Guilt (Rasa Bersalah)', 'Innocence (Kepolosan)'
];

const HD_PERSPECTIVES = [
    'Survival (Kelangsungan Hidup)', 'Possibility (Kemungkinan)', 'Power (Kekuasaan)',
    'Wanting (Keinginan Orang Lain)', 'Probability (Peluang)', 'Personal (Diri Sendiri)'
];

const HD_ENVIRONMENTS = [
    'Kitchens (Dapur)', 'Markets (Pasar)', 'Caves (Gua)',
    'Mountains (Dataran Tinggi)', 'Valleys (Dataran Rendah)', 'Shores (Pantai)'
];

const HD_CHANNELS = [
    '1 - 8 Inspirational', '10 - 20 Awakening', '11 - 56 Curiousty', '12 - 22 Openness',
    '13 - 33 The Prodigal', '15 - 5 Rhytm', '16 - 48 Talent', '17 - 62 Acceptance',
    '18 - 58 Judgement', '19 - 49 Synthesis', '2 - 14 The Beat', '20 - 34 Charisma',
    '21 - 45 Money Line', '25 - 51 Initiation', '26 - 44 Intermediary', '27 - 50 Preservation',
    '28 - 38 Struggle', '3 - 60 Mutation', '32 - 54 Transformation', '34 - 10 Exploration',
    '35 - 36 Transitoriness', '37 - 40 Community Builder', '39 - 55 Emoting', '41 - 30 Fantasy & Desire',
    '42 - 53 Maturation', '43 - 23 Structuring', '46 - 29 Discovery', '57 - 10 Perfected Form',
    '57 - 20 Brainwave', '57 - 34 Power', '59 - 6 Reproduction', '61 - 24 Awareness',
    '63 - 4 Logic', '64 - 47 Abstraction', '7 - 31 The Alpha', '9 - 52 Focus'
];

interface Props {
    currentLang?: string;
    currentUser?: User | null;
}

const MemberManagement: React.FC<Props> = ({ currentLang = 'EN', currentUser }) => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>([]);
    const [limit, setLimit] = useState(10);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];

    // Fetch users from API
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await userService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users', error);
            // Fallback to empty or mock if needed
            // setUsers(getMockUsers()); 
        }
    };

    // Auto-open Purchases Modal via Navigation State
    const location = useLocation();
    useEffect(() => {
        if (users.length > 0 && location.state && (location.state as any).openPurchasesFor) {
            const targetId = (location.state as any).openPurchasesFor;
            const targetUser = users.find(u => u.id === targetId);
            if (targetUser) {
                handleShowPdf(targetUser);
                // Clear state to prevent reopening if component re-renders (optional, but good practice usually involves replacing history)
                navigate(location.pathname, { replace: true, state: {} });
            }
        }
    }, [users, location.state]);

    // Editing User State
    const [isEditingUser, setIsEditingUser] = useState(false);
    const [editUserData, setEditUserData] = useState<any>({});

    // PDF Modal, GrantAccess, OCR, HD State... (Kept as is for now)
    const [showPdfModal, setShowPdfModal] = useState(false);
    const [modalUser, setModalUser] = useState<User | null>(null);
    const [userProducts, setUserProducts] = useState<Product[]>([]);

    const [newFileName, setNewFileName] = useState('');
    const [newFileUrl, setNewFileUrl] = useState('');
    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferUser, setTransferUser] = useState<User | null>(null);
    const [transferAmount, setTransferAmount] = useState('');
    const [transferDirection, setTransferDirection] = useState<'IN' | 'OUT'>('IN');
    const [transferReason, setTransferReason] = useState('');

    const [showHumanDesignTable, setShowHumanDesignTable] = useState(false);
    const [currentUserHumanDesign, setCurrentUserHumanDesign] = useState<HumanDesignProfile | null>(null);
    const [isEditingHD, setIsEditingHD] = useState(false);
    const [editHDData, setEditHDData] = useState<Partial<HumanDesignProfile>>({});

    // Filter Users
    const filteredUsers = users.filter(u => u.role !== 'ADMIN' && (
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.referralCode && u.referralCode.toLowerCase().includes(searchQuery.toLowerCase()))
    ));

    // Email Modal State
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [selectedProductForEmail, setSelectedProductForEmail] = useState<Product | null>(null);
    const [emailRecipient, setEmailRecipient] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    const memberList = filteredUsers.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
    const getSponsorName = (id: string | null) => users.find(u => u.id === id)?.name || 'System';

    const handleToggleStatus = async (id: string) => {
        try {
            await userService.toggleUserStatus(id);
            fetchUsers();
        } catch (e) {
            alert('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Delete this user?')) {
            try {
                await userService.deleteUser(id);
                fetchUsers();
            } catch (e: any) {
                const msg = e.response?.data?.message || 'Failed to delete user';
                alert(msg);
            }
        }
    };

    // New handler for KAKA toggle
    const handleToggleKaka = async (id: string) => {
        try {
            await userService.toggleKakaAccess(id);
            fetchUsers();
        } catch (e: any) {
            alert('Failed to toggle Kaka Access: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleViewUser = async (user: User) => {
        setSelectedUser(user);
        setIsEditingUser(false);
        setIsEditingHD(false);
        setEditUserData({
            name: user.name,
            email: user.email,
            phone: user.kyc.phone,
            bankName: user.kyc.bankName,
            accountNumber: user.kyc.accountNumber,
            accountHolder: user.kyc.accountHolder,
            gender: user.kyc.gender,
            birthDate: user.kyc.birthDate,
            birthCity: user.kyc.birthCity,
            birthTime: user.kyc.birthTime,
            address: user.kyc.address,
            withdrawalMethods: user.kyc.withdrawalMethods || []
        });
        // Check for Human Design
        try {
            const hd = await userService.getHumanDesign(user.id);
            setCurrentUserHumanDesign(hd);
            setEditHDData(hd || {});
        } catch (e) {
            console.error('Failed to load HD', e);
            setCurrentUserHumanDesign(null);
            setEditHDData({});
        }
        setShowHumanDesignTable(false);
    };

    const handleOpenEmailModal = (product: Product, user: User) => {
        setSelectedProductForEmail(product);
        setEmailRecipient(user.email);
        setEmailSubject(`Access to your Purchased File: ${product.name}`);
        setEmailMessage(`Halo ${user.name},\n\nTerima kasih telah melakukan pembelian "${product.name}".\n\nSilakan akses file Anda melalui dashboard member area bagian "My Purchases".\n\nJika ada pertanyaan, silakan hubungi admin.\n\nSalam,\nAdmin RDA Bisnis`);
        setEmailModalOpen(true);
    };

    const handleSendEmail = async () => {
        if (!modalUser || !selectedProductForEmail) return;
        setIsSendingEmail(true);
        try {
            await userService.sendProductFile(
                modalUser.id, 
                selectedProductForEmail.id, 
                emailRecipient, 
                emailSubject, 
                emailMessage
            );
            alert('Email sent successfully!');
            setEmailModalOpen(false);
        } catch (e) {
            alert('Failed to send email.');
            console.error(e);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;
        try {
            await userService.updateUserAdmin(selectedUser.id, {
                name: editUserData.name,
                email: editUserData.email,
                kyc: {
                    ...selectedUser.kyc,
                    phone: editUserData.phone,
                    bankName: editUserData.bankName,
                    accountNumber: editUserData.accountNumber,
                    accountHolder: editUserData.accountHolder,
                    gender: editUserData.gender,
                    birthDate: editUserData.birthDate,
                    birthCity: editUserData.birthCity,
                    birthDate: editUserData.birthDate,
                    birthCity: editUserData.birthCity,
                    birthTime: editUserData.birthTime,
                    address: editUserData.address,
                    withdrawalMethods: editUserData.withdrawalMethods
                }
            });
            // Refresh list
            fetchUsers();
            setIsEditingUser(false);
            alert('User data updated!');
        } catch (e) {
            alert('Failed to update user');
        }
    };

    const handleSaveHD = async () => {
        if (!selectedUser || !editHDData) return;
        
        try {
            const savedProfile = await userService.saveHumanDesign(selectedUser.id, editHDData);
            setCurrentUserHumanDesign(savedProfile);
            setIsEditingHD(false);
            alert('Human Design Profile Updated!');
        } catch (e) {
            alert('Failed to save HD Profile');
        }
    };

    const handleHDImageUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    setEditHDData({ ...editHDData, chartImage: ev.target.result as string });
                }
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    // TRANSFER HANDLERS
    const handleOpenTransfer = (user: User) => {
        setTransferUser(user);
        setTransferAmount('');
        setTransferDirection('IN');
        setTransferReason('');
        setShowTransferModal(true);
    };

    const handleTransfer = async () => {
        if (!transferUser || !transferAmount) return;
        try {
            await userService.transferPoints(transferUser.id, Number(transferAmount), transferDirection, transferReason);
            alert('Transfer Successful!');
            setShowTransferModal(false);
            fetchUsers();
        } catch (e: any) {
            alert('Transfer Failed: ' + (e.response?.data?.message || e.message));
        }
    };

    const handleToggleHDAccess = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedUser) return;
        try {
            const updated = await userService.toggleHumanDesignAccess(selectedUser.id);
            setSelectedUser({ ...selectedUser, isHumanDesignUnlocked: updated.isHumanDesignUnlocked });
            setUsers(users.map(u => u.id === updated.id ? { ...u, isHumanDesignUnlocked: updated.isHumanDesignUnlocked } : u));
        } catch (err) {
            alert('Failed to toggle Human Design access');
        }
    };

    const handleToggleAiAccess = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedUser) return;
        try {
            const updated = await userService.toggleAiAssistantAccess(selectedUser.id);
            setSelectedUser({ ...selectedUser, isAiAssistantUnlocked: updated.isAiAssistantUnlocked });
            setUsers(users.map(u => u.id === updated.id ? { ...u, isAiAssistantUnlocked: updated.isAiAssistantUnlocked } : u));
        } catch (err) {
            alert('Failed to toggle AI Assistant access');
        }
    };

    // ... (Existing Upload handlers)
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsLoading(true);
            const file = e.target.files[0];
            setNewFileName(file.name);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTimeout(() => {
                    if (ev.target?.result) setNewFileUrl(ev.target.result as string);
                    setIsLoading(false);
                }, 1500);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleShowPdf = async (user: User) => {
        setModalUser(user);
        setIsLoading(true);
        try {
            const tx = await userService.getAdminUserTransactions(user.id);
            const products: Product[] = [];
            
            tx.forEach((t: any) => {
                 const items = typeof t.items === 'string' ? JSON.parse(t.items) : t.items;
                 products.push(...items.map((i: any) => ({ ...i.product, _status: t.status, _transactionId: t.id })));
            });

            // Remove duplicates
            const uniqueProducts = Array.from(new Set(products.map(p => p.id)))
                .map(id => products.find(p => p.id === id)!);
            
            setUserProducts(uniqueProducts);
            setShowPdfModal(true);
            setNewFileName('');
            setNewFileUrl('');
            setEditingProductId(null);
        } catch (e) {
            console.error(e);
            alert('Failed to load user purchases');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGrantAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalUser || !newFileName || !newFileUrl) return;

        setIsLoading(true);
        try {
            if (editingProductId) {
                await userService.updateUserAccess(modalUser.id, editingProductId, newFileUrl, newFileName);
                alert('File updated successfully.');
            } else {
                await userService.grantManualAccess(modalUser.id, newFileName, newFileUrl);
                alert('Access Granted Successfully.');
            }
            await handleShowPdf(modalUser); // Refresh list
        } catch (e: any) {
             alert('Operation Failed: ' + (e.response?.data?.message || e.message));
        } finally {
             setIsLoading(false);
        }

        setNewFileName('');
        setNewFileUrl('');
        setEditingProductId(null);
    };

    const handleDeleteAccess = (productId: string) => {
        if (!modalUser || !confirm('Revoke access to this file/product?')) return;
        alert('Revoke feature not implemented on backend yet.');
        // deleteUserAccess(modalUser.id, productId);
        // handleShowPdf(modalUser);
    };

    const handleEditFileUpload = (e: React.ChangeEvent<HTMLInputElement>, p: Product) => {
        if (e.target.files && e.target.files[0] && modalUser) {
            const file = e.target.files[0];
            setIsLoading(true);
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTimeout(async () => {
                    if (ev.target?.result) {
                        try {
                            await userService.updateUserAccess(modalUser.id, p.id, ev.target.result as string, file.name, p.name);
                            handleShowPdf(modalUser);
                        } catch (e: any) { 
                            console.error("Upload Loop Error:", e);
                            alert('Failed to update file: ' + (e.response?.data?.message || e.message)); 
                        }
                    }
                    setIsLoading(false);
                }, 1500);
            };
            reader.readAsDataURL(file);
        }
    };

                                                                    const PlanetRow = ({ label, planetKey, designData, personalityData, isEditing, onChange }: any) => {
                                                                        const symbolOptions = ['-', '▲', '▼', '★'];
                                                                        
                                                                        const renderPlanetInput = (type: 'design' | 'personality') => {
                                                                            const rawValue = (type === 'design' ? designData : personalityData)?.[planetKey] || '';
                                                                            // Value format expected: "Gate.Line Symbol" or just "Gate.Line"
                                                                            // We'll split by space to try and separate value and symbol if they exist
                                                                            const parts = rawValue.split(' ');
                                                                            const gateVal = parts[0] || '';
                                                                            const symbolVal = parts[1] && symbolOptions.includes(parts[1]) ? parts[1] : '-';

                                                                            return (
                                                                                <div className="flex items-center gap-1 justify-center px-1">
                                                                                    <input
                                                                                        value={gateVal}
                                                                                        onChange={e => {
                                                                                            const newVal = `${e.target.value} ${symbolVal === '-' ? '' : symbolVal}`.trim();
                                                                                            onChange(type, planetKey, newVal);
                                                                                        }}
                                                                                        className="w-12 text-center bg-white text-black border rounded px-0.5 text-xs py-0.5"
                                                                                        placeholder="45.3"
                                                                                    />
                                                                                    <select 
                                                                                        value={symbolVal}
                                                                                        onChange={e => {
                                                                                            const newSym = e.target.value;
                                                                                            const newVal = `${gateVal} ${newSym === '-' ? '' : newSym}`.trim();
                                                                                            onChange(type, planetKey, newVal);
                                                                                        }}
                                                                                        className="w-8 bg-gray-50 border rounded text-xs px-0 py-0.5 text-center appearance-none"
                                                                                    >
                                                                                        {symbolOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                                    </select>
                                                                                </div>
                                                                            );
                                                                        };

                                                                        return (
                                                                            <div className="grid grid-cols-10 text-sm border-b last:border-b-0">
                                                                                <div className="col-span-4 p-1 bg-red-600 text-white text-center font-mono border-r border-white relative font-bold text-xs flex items-center justify-center">
                                                                                    {isEditing ? renderPlanetInput('design') : (designData?.[planetKey] || '-')}
                                                                                </div>
                                                                                <div className="col-span-2 p-1.5 bg-gray-100 flex items-center justify-center text-gray-800 text-lg">
                                                                                    {label}
                                                                                </div>
                                                                                <div className="col-span-4 p-1 bg-black text-white text-center font-mono border-l border-white relative font-bold text-xs flex items-center justify-center">
                                                                                    {isEditing ? renderPlanetInput('personality') : (personalityData?.[planetKey] || '-')}
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center bg-gray-50 gap-4">
                    <h3 className="font-bold text-gray-800">{t.memberDir}</h3>
                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <span className="absolute left-3 top-2.5 text-gray-400"><Icons.Search /></span>
                            <input
                                type="text"
                                placeholder={t.searchMember}
                                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <span className="text-sm text-gray-500 self-center hidden md:inline">{t.rows}:</span>
                            <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="border border-gray-300 rounded-md text-sm px-2 py-1 outline-none">
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 w-10">#</th>
                                <th className="px-6 py-4">{t.memberInfo}</th>
                                <th className="px-6 py-4">{t.referralCode}</th>
                                <th className="px-6 py-4">{t.sponsor}</th>
                                <th className="px-6 py-4">{t.status}</th>
                                <th className="px-6 py-4 text-center">{t.purchased}</th>
                                <th className="px-6 py-4 text-center">{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {memberList.slice(0, limit).map((m, idx) => (
                                <tr key={m.id} className="hover:bg-blue-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            {m.avatar ? <img src={m.avatar} className="h-8 w-8 rounded-full object-cover mr-3 bg-gray-200" /> : <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mr-3">{m.name.charAt(0).toUpperCase()}</div>}
                                            <div><div className="text-sm font-medium text-gray-900">{m.name}</div><div className="text-xs text-gray-500">{m.email}</div></div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono text-blue-600">{m.referralCode}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{getSponsorName(m.uplineId)}</td>
                                    <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded font-bold ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.isActive ? t.active : t.inactive}</span></td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleShowPdf(m)} className="text-gray-500 hover:text-blue-600 p-2"><Icons.Document /></button>
                                    </td>
                                    <td className="px-6 py-4 text-center flex gap-2 justify-center">
                                        <button onClick={() => handleOpenTransfer(m)} className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded" title="Transfer Points"><Icons.Ticket /></button>
                                        <button onClick={() => handleViewUser(m)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title={t.view}><Icons.Eye /></button>
                                        <button onClick={() => handleToggleStatus(m.id)} className={`${m.isActive ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'} p-1.5 rounded`} title={m.isActive ? t.suspend : t.activate}>{m.isActive ? <Icons.Ban /> : <Icons.Check />}</button>
                                        <button onClick={() => handleDelete(m.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded" title={t.delete}><Icons.Trash /></button>
                                        <button onClick={() => handleToggleKaka(m.id)} className={`${m.isKakaUnlocked ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-50'} p-1.5 rounded border border-transparent hover:border-gray-200`} title={m.isKakaUnlocked ? 'Lock Info KAKA' : 'Unlock Info KAKA'}>
                                            {m.isKakaUnlocked ? <Icons.Unlock /> : <Icons.Lock />}
                                        </button>
                                        <button onClick={() => navigate(`/network?viewUser=${m.id}`)} className="text-pink-500 hover:bg-pink-50 p-1.5 rounded" title="View Network">
                                            <Icons.List />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {memberList.length === 0 && (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No members found matching "{searchQuery}"</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>



            {/* Selected User Modal with Edit Support */}
            {selectedUser && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="font-bold text-lg">{isEditingUser ? 'Edit Member' : 'Member Details'}</h3>
                            <button onClick={() => setSelectedUser(null)}><Icons.X /></button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div className="text-center pb-4 border-b">
                                {selectedUser.avatar ? <img src={selectedUser.avatar} className="h-20 w-20 rounded-full mx-auto mb-2 object-cover border-4 border-white shadow" /> : <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2">{selectedUser.name.charAt(0)}</div>}

                                {isEditingUser ? (
                                    <div className="space-y-2 mt-2">
                                        <input value={editUserData.name} onChange={e => setEditUserData({ ...editUserData, name: e.target.value })} className="border p-1 rounded w-full text-center font-bold" placeholder="Name" />
                                        <input value={editUserData.email} onChange={e => setEditUserData({ ...editUserData, email: e.target.value })} className="border p-1 rounded w-full text-center text-sm" placeholder="Email" />
                                    </div>
                                ) : (
                                    <>
                                        <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                                        <p className="text-gray-500">{selectedUser.email}</p>
                                    </>
                                )}
                                <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${selectedUser.kyc.isVerified ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{selectedUser.kyc.isVerified ? 'KYC Verified' : 'Unverified'}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="col-span-2"><h4 className="font-bold text-gray-800 border-b pb-1 mb-2 mt-2">Personal Details</h4></div>

                                {/* KYC Fields (Gender, Birth, Contact, etc - collapsed for brevity as they are same as before) */}
                                <div>
                                    <p className="text-gray-500 mb-1">Gender</p>
                                    {isEditingUser ? (
                                        <select value={editUserData.gender} onChange={e => setEditUserData({ ...editUserData, gender: e.target.value })} className="border p-1 rounded w-full">
                                            <option value="Man">Man</option>
                                            <option value="Woman">Woman</option>
                                        </select>
                                    ) : <p className="font-medium">{selectedUser.kyc.gender || '-'}</p>}
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Birth Date</p>
                                    {isEditingUser ? <input type="date" value={editUserData.birthDate} onChange={e => setEditUserData({ ...editUserData, birthDate: e.target.value })} className="border p-1 rounded w-full" /> : <p className="font-medium">{selectedUser.kyc.birthDate || '-'}</p>}
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Birth Time</p>
                                    {isEditingUser ? <input type="time" value={editUserData.birthTime} onChange={e => setEditUserData({ ...editUserData, birthTime: e.target.value })} className="border p-1 rounded w-full" /> : <p className="font-medium">{selectedUser.kyc.birthTime || '-'}</p>}
                                </div>
                                <div className="relative z-10">
                                    <p className="text-gray-500 mb-1">Birth City</p>
                                    {isEditingUser ? <CityAutocomplete value={editUserData.birthCity} onChange={(val) => setEditUserData({ ...editUserData, birthCity: val })} /> : <p className="font-medium">{selectedUser.kyc.birthCity || '-'}</p>}
                                </div>

                                <div className="col-span-2"><h4 className="font-bold text-gray-800 border-b pb-1 mb-2 mt-4">Contact & Bank</h4></div>
                                <div>
                                    <p className="text-gray-500 mb-1">Phone</p>
                                    {isEditingUser ? <input value={editUserData.phone} onChange={e => setEditUserData({ ...editUserData, phone: e.target.value })} className="border p-1 rounded w-full" /> : <p className="font-medium">{selectedUser.kyc.phone || '-'}</p>}
                                </div>
                                <div className="col-span-2 space-y-3">
                                    <h5 className="font-bold text-gray-700 text-xs uppercase border-b pb-1">Withdrawal Destinations</h5>
                                    {/* List */}
                                    <div className="space-y-2">
                                        {(editUserData.withdrawalMethods || []).map((m: any, idx: number) => (
                                            <div key={idx} className="flex justify-between items-center bg-gray-50 border p-2 rounded text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold bg-white border px-1 rounded">{m.type === 'BANK' ? 'BANK' : 'E-W'}</span>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{m.name}</div>
                                                        <div className="text-gray-500">{m.accountNumber} ({m.accountHolder})</div>
                                                    </div>
                                                </div>
                                                {isEditingUser && (
                                                    <button onClick={() => {
                                                        const newMethods = [...editUserData.withdrawalMethods];
                                                        newMethods.splice(idx, 1);
                                                        setEditUserData({ ...editUserData, withdrawalMethods: newMethods });
                                                    }} className="text-red-500 hover:bg-red-50 p-1 rounded"><Icons.Trash size={14} /></button>
                                                )}
                                            </div>
                                        ))}
                                        {(!editUserData.withdrawalMethods || editUserData.withdrawalMethods.length === 0) && (
                                            <p className="text-gray-400 italic text-xs">No withdrawal destinations.</p>
                                        )}
                                    </div>

                                    {/* Add New - Simple Inline Form for Admin */}
                                    {isEditingUser && (
                                        <div className="bg-blue-50 p-2 rounded border border-blue-100 mt-2">
                                            <p className="text-xs font-bold text-blue-700 mb-2">+ Add Destination</p>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <select id="new-wm-type" className="border p-1 rounded">
                                                    <option value="BANK">Bank</option>
                                                    <option value="EWALLET">E-Wallet</option>
                                                </select>
                                                <input id="new-wm-name" placeholder="Bank/Provider Name" className="border p-1 rounded" />
                                                <input id="new-wm-num" placeholder="Account Number" className="border p-1 rounded" />
                                                <input id="new-wm-holder" placeholder="Account Holder" className="border p-1 rounded" />
                                                <button onClick={() => {
                                                    const type = (document.getElementById('new-wm-type') as HTMLSelectElement).value;
                                                    const name = (document.getElementById('new-wm-name') as HTMLInputElement).value;
                                                    const num = (document.getElementById('new-wm-num') as HTMLInputElement).value;
                                                    const holder = (document.getElementById('new-wm-holder') as HTMLInputElement).value;

                                                    if(name && num) {
                                                        const newMethod = { type, name, accountNumber: num, accountHolder: holder, isActive: true, id: Date.now().toString() };
                                                        setEditUserData({ ...editUserData, withdrawalMethods: [...(editUserData.withdrawalMethods || []), newMethod] });
                                                        // Clear inputs
                                                        (document.getElementById('new-wm-name') as HTMLInputElement).value = '';
                                                        (document.getElementById('new-wm-num') as HTMLInputElement).value = '';
                                                        (document.getElementById('new-wm-holder') as HTMLInputElement).value = '';
                                                    }
                                                }} className="col-span-2 bg-blue-600 text-white font-bold py-1 rounded hover:bg-blue-700">Add</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-gray-500 mb-1">Address</p>
                                    {isEditingUser ? <input value={editUserData.address} onChange={e => setEditUserData({ ...editUserData, address: e.target.value })} className="border p-1 rounded w-full" /> : <p className="font-medium">{selectedUser.kyc.address || '-'}</p>}
                                </div>

                                {/* Human Design Section */}
                                {!isEditingUser && (
                                    <div className="col-span-2 mt-4">
                                    <div className="col-span-2 mt-4 flex items-center gap-2">
                                        {/* Main Lock */}
                                        <div className="flex items-stretch rounded-lg overflow-hidden border border-purple-200">
                                            <button
                                                 onClick={handleToggleHDAccess}
                                                 className={`px-4 py-2 flex items-center justify-center transition-colors border-r border-purple-200 ${selectedUser.isHumanDesignUnlocked ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                                 title={selectedUser.isHumanDesignUnlocked ? "Unlocked for Member" : "Locked for Member"}
                                            >
                                                 {selectedUser.isHumanDesignUnlocked ? <Icons.Unlock /> : <Icons.Lock />}
                                            </button>
                                            <button
                                                onClick={() => setShowHumanDesignTable(!showHumanDesignTable)}
                                                className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold py-2 px-4 flex justify-between items-center gap-2"
                                            >
                                                <span>{t.humanDesign}</span>
                                                <span className="text-xs transform transition-transform duration-200" style={{ transform: showHumanDesignTable ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                                            </button>
                                        </div>

                                        {/* Content Access Levels */}
                                        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                                            {[1, 2, 3, 4].map(level => {
                                                const key = `hdAccessLevel${level}`;
                                                // @ts-ignore
                                                const isActive = selectedUser[key];
                                                return (
                                                    <button
                                                        key={level}
                                                        onClick={async () => {
                                                            const newLevels = {
                                                                // @ts-ignore
                                                                level1: selectedUser.hdAccessLevel1,
                                                                // @ts-ignore
                                                                level2: selectedUser.hdAccessLevel2,
                                                                // @ts-ignore
                                                                level3: selectedUser.hdAccessLevel3,
                                                                // @ts-ignore
                                                                level4: selectedUser.hdAccessLevel4,
                                                                [`level${level}`]: !isActive
                                                            };
                                                            try {
                                                                await userService.updateHDAccessLevels(selectedUser.id, newLevels);
                                                                // Optimistic update or refresh
                                                                setSelectedUser({ ...selectedUser, [key]: !isActive });
                                                                // Also update list
                                                                setUsers(users.map(u => u.id === selectedUser.id ? { ...u, [key]: !isActive } : u));
                                                            } catch (e) {
                                                                alert('Failed to update level');
                                                            }
                                                        }}
                                                        className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs transition-colors ${
                                                            isActive 
                                                            ? 'bg-purple-600 text-white shadow-sm' 
                                                            : 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                        title={`Toggle Description Level ${level}`}
                                                    >
                                                        {level}
                                                    </button>
                                                );
                                            })}

                                            {/* AI Toggle */}
                                            <button
                                                onClick={handleToggleAiAccess}
                                                className={`px-3 py-1 ml-2 rounded text-xs font-bold transition-colors flex items-center gap-1 border ${
                                                    selectedUser.isAiAssistantUnlocked
                                                    ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                                                    : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                                                }`}
                                                title={selectedUser.isAiAssistantUnlocked ? "Disable AI Chat" : "Enable AI Chat"}
                                            >
                                                <Icons.MessageSquare size={14} /> AI
                                            </button>
                                        </div>
                                    </div>

                                        {showHumanDesignTable && (
                                            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden animate-fade-in-up">
                                                {currentUserHumanDesign || isEditingHD ? (
                                                    <div className="bg-white">
                                                        <div className="p-3 bg-purple-100 text-purple-800 font-bold flex justify-between items-center text-sm">
                                                            <span>Blueprint Data</span>
                                                            {isEditingHD ? (
                                                                <div className="flex gap-2">
                                                                    <button onClick={handleSaveHD} className="bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600">Save</button>
                                                                    <button onClick={() => setIsEditingHD(false)} className="bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400">Cancel</button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => { setIsEditingHD(true); setEditHDData(currentUserHumanDesign); }} className="bg-white text-purple-700 px-3 py-1 rounded border border-purple-200 hover:bg-purple-50">Edit Profile</button>
                                                            )}
                                                        </div>

                                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                            {/* LEFT COLUMN: Chart Image & Red (Design) Planets */}
                                                            <div className="space-y-4">
                                                                {/* Chart */}
                                                                <div className="relative group w-full text-center">
                                                                    {isEditingHD ? (
                                                                        <div className="border-2 border-dashed border-purple-300 rounded-lg p-4 bg-purple-50 cursor-pointer hover:bg-purple-100">
                                                                            <p className="text-xs text-purple-600 font-bold mb-2">Change Chart Image</p>
                                                                            <input type="file" accept="image/*" onChange={handleHDImageUpdate} className="text-xs w-full" />
                                                                            {editHDData.chartImage && <img src={editHDData.chartImage} className="max-h-64 mt-2 mx-auto object-contain" alt="Preview" />}
                                                                        </div>
                                                                    ) : (
                                                                        currentUserHumanDesign.chartImage ? (
                                                                            <img src={currentUserHumanDesign.chartImage} alt="Chart" className="max-h-96 w-full object-contain rounded" />
                                                                        ) : (
                                                                            <div className="h-64 w-full bg-gray-100 flex items-center justify-center text-gray-400 italic">No Chart Image</div>
                                                                        )
                                                                    )}
                                                                </div>

                                                                    {/* Planetary Grid */}
                                                                    <div>
                                                                        <div className="grid grid-cols-10 text-xs font-bold uppercase bg-gray-100 border-b">
                                                                            <div className="col-span-4 text-center p-1.5 text-red-600 bg-white">Design</div>
                                                                            <div className="col-span-2 text-center p-1.5">Planet</div>
                                                                            <div className="col-span-4 text-center p-1.5 text-black bg-white">Personality</div>
                                                                        </div>
                                                                        <div className="border-l border-r border-b">
                                                                            {[
                                                                                { k: 'sun', l: '☉' }, { k: 'earth', l: '⊕' }, { k: 'northNode', l: '☊' },
                                                                                { k: 'southNode', l: '☋' }, { k: 'moon', l: '☽' }, { k: 'mercury', l: '☿' },
                                                                                { k: 'venus', l: '♀' }, { k: 'mars', l: '♂' }, { k: 'jupiter', l: '♃' },
                                                                                { k: 'saturn', l: '♄' }, { k: 'uranus', l: '♅' }, { k: 'neptune', l: '♆' },
                                                                                { k: 'pluto', l: '♇' }, { k: 'chiron', l: '⚷' }, { k: 'lilith', l: '⚸' }
                                                                            ].map(p => (
                                                                                <PlanetRow
                                                                                    key={p.k}
                                                                                    label={p.l}
                                                                                    planetKey={p.k}
                                                                                    designData={isEditingHD ? editHDData.design : currentUserHumanDesign.design}
                                                                                    personalityData={isEditingHD ? editHDData.personality : currentUserHumanDesign.personality}
                                                                                    isEditing={isEditingHD}
                                                                                    onChange={(type: 'design' | 'personality', key: string, val: string) => {
                                                                                        setEditHDData({
                                                                                            ...editHDData,
                                                                                            [type]: {
                                                                                                ...editHDData[type],
                                                                                                [key]: val
                                                                                            }
                                                                                        });
                                                                                    }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                            {/* RIGHT COLUMN: Bio Data & Details */}
                                                            <div className="space-y-1 text-sm">
                                                                <div className="bg-gray-50 p-2 rounded border border-gray-100 mb-3">
                                                                    <h5 className="font-bold text-gray-800 text-xs uppercase border-b mb-2 pb-1">Biodata Chart</h5>
                                                                    {[
                                                                        { l: 'Nama', k: 'chartName' },
                                                                        { l: 'Tanggal Lahir', k: 'chartBirthDate', type: 'date' },
                                                                        { l: 'Tempat Lahir', k: 'chartBirthCity' },
                                                                        { l: 'Jam Lahir', k: 'chartBirthTime', type: 'time' },
                                                                        { l: 'Tanggal Desain', k: 'chartDesignDate' }, // [NEW] Text input by default
                                                                    ].map(f => (

                                                                        <div key={f.k} className="flex justify-between py-1 border-b border-gray-200 last:border-0 text-xs">
                                                                            <span className="text-gray-500 font-bold">{f.l}:</span>
                                                                            {isEditingHD ? (
                                                                                <input type={f.type || 'text'} value={(editHDData as any)[f.k] || ''} onChange={e => setEditHDData({ ...editHDData, [f.k]: e.target.value })} className="text-right border-b w-2/3 bg-white" />
                                                                            ) : (
                                                                                <span>{(currentUserHumanDesign as any)[f.k] || '-'}</span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                <h5 className="font-bold text-gray-800 text-xs uppercase border-b mb-2 pb-1 mt-4">Profile Details</h5>
                                                                {/* Type - Auto-fill Logic */}
                                                                <div className="flex justify-between py-1 border-b border-dashed border-gray-200 text-xs items-start">
                                                                    <span className="text-gray-600 font-bold whitespace-nowrap mr-2">Tipe:</span>
                                                                    {isEditingHD ? (
                                                                        <select
                                                                            value={editHDData.type || ''}
                                                                            onChange={e => {
                                                                                const newType = e.target.value;
                                                                                const autofill = HD_AUTOFILL[newType] || {};
                                                                                setEditHDData({ 
                                                                                    ...editHDData, 
                                                                                    type: newType,
                                                                                    ...autofill 
                                                                                });
                                                                            }}
                                                                            className="text-right border-b border-gray-300 focus:border-purple-500 outline-none w-full bg-transparent"
                                                                        >
                                                                            <option value="">Select Type</option>
                                                                            {HD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                                        </select>
                                                                    ) : (
                                                                        <span className="text-gray-900 font-medium text-right break-words max-w-[60%]">{currentUserHumanDesign.type || '-'}</span>
                                                                    )}
                                                                </div>

                                                                {/* Generic Dropdown Fields */}
                                                                {[
                                                                    { l: 'Strategi', k: 'strategy', disabled: true }, // Auto-filled
                                                                    { l: 'Otoritas Batin', k: 'authority', options: HD_AUTHORITIES },
                                                                    { l: 'Tujuan Utama', k: 'signature', disabled: true }, // Auto-filled
                                                                    { l: 'Tema Emosional', k: 'notSelfTheme', disabled: true }, // Auto-filled
                                                                    { l: 'Definisi', k: 'definition', options: HD_DEFINITIONS },
                                                                    { l: 'Profil', k: 'profile', options: HD_PROFILES },
                                                                    { l: 'Sistem Pencernaan', k: 'digestion', options: HD_DIGESTIONS },
                                                                    { l: 'Kepekaan Sadar (Sense)', k: 'sense', options: HD_SENSES },
                                                                    { l: 'Kepekaan Tak Sadar (Design Sense)', k: 'designSense', options: HD_DESIGN_SENSES },
                                                                    { l: 'Motivasi', k: 'motivation', options: HD_MOTIVATIONS },
                                                                    { l: 'Perspektif', k: 'perspective', options: HD_PERSPECTIVES },
                                                                    { l: 'Lingkungan', k: 'environment', options: HD_ENVIRONMENTS },
                                                                    { l: 'Misi Jiwa', k: 'incarnationCross' }, // Still Text Input
                                                                ].map(field => (
                                                                    <div key={field.k} className="flex justify-between py-1 border-b border-dashed border-gray-200 text-xs items-start">
                                                                        <span className="text-gray-600 font-bold whitespace-nowrap mr-2">{field.l}:</span>
                                                                        {isEditingHD ? (
                                                                            field.options ? (
                                                                                <select
                                                                                    value={(editHDData as any)[field.k] || ''}
                                                                                    onChange={e => setEditHDData({ ...editHDData, [field.k]: e.target.value })}
                                                                                    className="text-right border-b border-gray-300 focus:border-purple-500 outline-none w-full bg-transparent"
                                                                                >
                                                                                    <option value="">-</option>
                                                                                    {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                                </select>
                                                                            ) : (
                                                                                <input
                                                                                    value={(editHDData as any)[field.k] || ''}
                                                                                    onChange={e => setEditHDData({ ...editHDData, [field.k]: e.target.value })}
                                                                                    disabled={field.disabled}
                                                                                    className={`text-right border-b border-gray-300 focus:border-purple-500 outline-none w-full ${field.disabled ? 'bg-gray-100 text-gray-500' : ''}`}
                                                                                />
                                                                            )
                                                                        ) : (
                                                                            <span className="text-gray-900 font-medium text-right break-words max-w-[60%]">{(currentUserHumanDesign as any)[field.k] || '-'}</span>
                                                                        )}
                                                                    </div>
                                                                ))}

                                                                {/* Centers */}
                                                                <div className="mt-4">
                                                                    <h5 className="font-bold text-gray-800 border-b pb-1 text-xs uppercase mb-2">9 Pusat Energi</h5>
                                                                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                                                                        {[
                                                                            { k: 'head', l: 'Head / Kepala' },
                                                                            { k: 'ajna', l: 'Ajna' },
                                                                            { k: 'throat', l: 'Throat / Tenggorokan' },
                                                                            { k: 'gCenter', l: 'G-Center / Jati Diri' },
                                                                            { k: 'heart', l: 'Heart / Jantung' },
                                                                            { k: 'sacral', l: 'Sacral / Perut' },
                                                                            { k: 'root', l: 'Root / Dasar' },
                                                                            { k: 'spleen', l: 'Spleen / Limpa' },
                                                                            { k: 'solarPlexus', l: 'Solar Plexus / Emosional' }
                                                                        ].map(center => (
                                                                            <div key={center.k} className="flex justify-between items-center bg-gray-50 p-1 px-2 rounded">
                                                                                <span className="capitalize text-gray-600">{center.l}</span>
                                                                                {isEditingHD ? (
                                                                                    <select
                                                                                        value={editHDData.centers?.[center.k as keyof HDCenters] || 'Defined'}
                                                                                        onChange={e => setEditHDData({
                                                                                            ...editHDData,
                                                                                            centers: { ...editHDData.centers!, [center.k]: e.target.value }
                                                                                        })}
                                                                                        className="border rounded text-[10px] p-0"
                                                                                    >
                                                                                        <option value="Defined">Defined</option>
                                                                                        <option value="Undefined">Undefined</option>
                                                                                        <option value="Open">Open</option>
                                                                                    </select>
                                                                                ) : (
                                                                                    <span className={`font-bold ${currentUserHumanDesign.centers?.[center.k as keyof HDCenters] === 'Defined' ? 'text-green-600' : 'text-gray-400'}`}>
                                                                                        {currentUserHumanDesign.centers?.[center.k as keyof HDCenters] || 'Defined'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Channels */}
                                                                <div className="mt-4">
                                                                    <h5 className="font-bold text-gray-800 border-b pb-1 text-xs uppercase mb-2">Jalur Potensi / Channels</h5>
                                                                    {isEditingHD ? (
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            {Array.from({ length: 10 }).map((_, idx) => (
                                                                                <select
                                                                                    key={idx}
                                                                                    value={editHDData.channels?.[idx] || ''}
                                                                                    onChange={e => {
                                                                                        const newChannels = [...(editHDData.channels || [])];
                                                                                        // Ensure array size
                                                                                        while(newChannels.length <= idx) newChannels.push('');
                                                                                        newChannels[idx] = e.target.value;
                                                                                        setEditHDData({ ...editHDData, channels: newChannels.filter(Boolean) }); // Filter empty? Or keep slots? User asked for 10 slots.
                                                                                        // Better to keep the array length but maybe just update index.
                                                                                        // Actually, let's just maintain the array state fully.
                                                                                        
                                                                                        // To strict mapping:
                                                                                        const updated = [...(editHDData.channels || [])];
                                                                                        updated[idx] = e.target.value;
                                                                                        setEditHDData({ ...editHDData, channels: updated });
                                                                                    }}
                                                                                    className="border rounded text-[10px] p-1 w-full"
                                                                                >
                                                                                    <option value="">- Select Channel -</option>
                                                                                    {HD_CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                                                                                </select>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex flex-col gap-1">
                                                                            {currentUserHumanDesign.channels && currentUserHumanDesign.channels.length > 0 ? (
                                                                                currentUserHumanDesign.channels.map((ch, i) => (
                                                                                    <span key={i} className="bg-purple-50 text-purple-900 px-2 py-1 rounded text-[10px] font-medium border border-purple-100">{ch}</span>
                                                                                ))
                                                                            ) : <span className="text-gray-400 text-xs italic">No channels recorded</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (

                                                    <div className="p-6 text-center">
                                                        <p className="text-gray-500 italic mb-4">No Human Design Profile data found.</p>
                                                        <button 
                                                            onClick={() => { 
                                                                setIsEditingHD(true); 
                                                                setEditHDData({
                                                                    design: {} as any,
                                                                    personality: {} as any,
                                                                    centers: {} as any,
                                                                    channels: []
                                                                }); 
                                                            }} 
                                                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-bold"
                                                        >
                                                            Create Profile
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 shrink-0 flex justify-between">
                            {isEditingUser ? (
                                <button onClick={() => setIsEditingUser(false)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700">Cancel</button>
                            ) : (
                                currentUser?.role === 'ADMIN' && (
                                    <button onClick={() => setIsEditingUser(true)} className="px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-bold text-blue-700 flex items-center gap-1"><Icons.Ticket /> Edit Member</button>
                                )
                            )}

                            {isEditingUser ? (
                                <button onClick={handleSaveUser} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-bold text-white">Save Changes</button>
                            ) : (
                                <button onClick={() => setSelectedUser(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700">Close</button>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* TRANSFER MODAL */}
            {showTransferModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTransferModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-emerald-700 px-6 py-4 flex justify-between items-center text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Icons.Ticket /> Transfer Points</h3>
                            <button onClick={() => setShowTransferModal(false)}><Icons.X /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                                Transferring to: <span className="font-bold text-gray-900">{transferUser?.name}</span>
                                <div className="text-xs">Current Balance: {transferUser?.walletBalance || 0} Points</div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        type="button"
                                        onClick={() => setTransferDirection('IN')}
                                        className={`py-2 text-sm font-bold rounded ${transferDirection === 'IN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        Add Points (Topup)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setTransferDirection('OUT')}
                                        className={`py-2 text-sm font-bold rounded ${transferDirection === 'OUT' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                    >
                                        Deduct Points
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Points)</label>
                                <input 
                                    type="number" 
                                    value={transferAmount} 
                                    onChange={e => setTransferAmount(e.target.value)} 
                                    className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" 
                                    placeholder="0"
                                />
                                <div className="mt-1 text-right text-xs text-gray-500 font-mono">
                                    ~ Rp {(Number(transferAmount) * 1000).toLocaleString('id-ID')}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Description</label>
                                <input 
                                    type="text" 
                                    value={transferReason} 
                                    onChange={e => setTransferReason(e.target.value)} 
                                    className="w-full border border-gray-300 rounded px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500" 
                                    placeholder="e.g. Weekly Bonus"
                                />
                            </div>

                            <button onClick={handleTransfer} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-lg mt-2">
                                Confirm Transfer
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showPdfModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 relative" onClick={e => e.stopPropagation()}>
                        {/* ... (Keep existing PDF Modal Content) ... */}
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Purchased Files</h3>
                            <button onClick={() => setShowPdfModal(false)}><Icons.X /></button>
                        </div>

                        {/* MEMBERSHIP STATUS HEADER - [NEW] */}
                        {modalUser?.membershipExpiryDate && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3 rounded-lg mb-4 flex justify-between items-center">
                                <div>
                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Membership Status</p>
                                    <p className="text-sm text-gray-800 font-medium flex items-center gap-1 mt-1">
                                        <Icons.Clock size={14} className="text-blue-500" />
                                        Expires on: {new Date(modalUser.membershipExpiryDate).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className={`text-xs px-2 py-1 rounded font-bold ${new Date(modalUser.membershipExpiryDate) > new Date() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {new Date(modalUser.membershipExpiryDate) > new Date() ? 'ACTIVE' : 'EXPIRED'}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleGrantAccess} className="bg-blue-50 p-4 rounded mb-6 border border-blue-100">
                            <h4 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center gap-2">
                                <Icons.Ticket /> {editingProductId ? 'Update File' : 'Upload File for Member'}
                            </h4>
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={handleFileUpload}
                                className="w-full text-sm border p-2 rounded mb-3 bg-white"
                                required={!editingProductId}
                            />
                            {isLoading && (
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-3">
                                    <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-3/4"></div>
                                </div>
                            )}
                            <input
                                placeholder="File Name (e.g. Bonus PDF)"
                                className="w-full text-sm border p-2 rounded mb-3"
                                value={newFileName}
                                onChange={e => setNewFileName(e.target.value)}
                                required
                            />
                            <div className="flex gap-2">
                                {editingProductId && <button type="button" onClick={() => { setEditingProductId(null); setNewFileName(''); setNewFileUrl(''); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-xs font-bold">Cancel</button>}
                                <button type="submit" disabled={isLoading} className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded disabled:opacity-50">{editingProductId ? 'Save Changes' : 'Upload & Grant Access'}</button>
                            </div>
                        </form>

                        {userProducts.length === 0 ? (
                            <p className="text-gray-500 text-center text-sm py-4">No products purchased yet.</p>
                        ) : (
                            <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                                {userProducts.map(p => (
                                    <div key={p.id} className="border p-3 rounded flex justify-between items-center bg-gray-50">
                                        <div className="flex-1 min-w-0 mr-3">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sm truncate">{p.name}</p>
                                                {(p as any)._status === 'PENDING' && (
                                                    <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold border border-orange-200">
                                                        PENDING
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                {p.pdfUrl ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><Icons.FileText className="w-3 h-3" /> PDF Available</span> : <span className="text-xs text-gray-400">No PDF document</span>}
                                                {p.activeDays && p.activeDays > 0 && (
                                                    <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                                                        <Icons.Clock className="w-3 h-3" />
                                                        Membership: {p.activeDays} Days
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 shrink-0">
                                            {p.pdfUrl && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            if (p.pdfUrl && p.pdfUrl.startsWith('data:')) {
                                                                const win = window.open();
                                                                if (win) {
                                                                    win.document.write('<iframe src="' + p.pdfUrl + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                                                    win.document.title = p.name;
                                                                }
                                                            } else if (p.pdfUrl) {
                                                                window.open(p.pdfUrl, '_blank');
                                                            }
                                                        }}
                                                        className="text-blue-600 p-2 hover:bg-blue-100 rounded flex flex-col items-center"
                                                        title="View File"
                                                    >
                                                        <Icons.Document />
                                                        <span className="text-[10px] font-bold">View</span>
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (modalUser) handleOpenEmailModal(p, modalUser);
                                                        }}
                                                        className="text-purple-600 p-2 hover:bg-purple-100 rounded flex flex-col items-center"
                                                        title="Send to Email"
                                                    >
                                                        <Icons.Envelope />
                                                        <span className="text-[10px] font-bold">Email</span>
                                                    </button>
                                                </>
                                            )}
                                            <label className="cursor-pointer text-orange-500 p-2 hover:bg-orange-100 rounded" title="Change File">
                                                <input type="file" className="hidden" accept="application/pdf" onChange={(e) => handleEditFileUpload(e, p)} />
                                                <Icons.Ticket />
                                            </label>
                                            <button onClick={() => handleDeleteAccess(p.id)} className="text-red-500 p-2 hover:bg-red-100 rounded" title="Delete Access">
                                                <Icons.Trash />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-center border-t pt-4">
                            <button
                                onClick={() => setShowPdfModal(false)}
                                className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-gray-800"
                            >
                                Save & Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {emailModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-bold text-lg">Send File via Email</h3>
                            <button onClick={() => setEmailModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <Icons.X />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Recipient</label>
                                <input
                                    type="text"
                                    value={emailRecipient}
                                    readOnly
                                    className="w-full bg-gray-100 border rounded px-3 py-2 text-sm text-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Subject</label>
                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(e) => setEmailSubject(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Email Subject"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Message</label>
                                <textarea
                                    value={emailMessage}
                                    onChange={(e) => setEmailMessage(e.target.value)}
                                    className="w-full border rounded px-3 py-2 text-sm h-32 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="Write your message here..."
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t">
                            <button
                                onClick={() => setEmailModalOpen(false)}
                                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSendEmail}
                                disabled={isSendingEmail}
                                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSendingEmail ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Icons.Envelope />
                                        Send Email
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MemberManagement;
