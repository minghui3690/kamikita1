
import React, { useState, useEffect } from 'react';
import { Icons } from '../constants';
import * as hdService from '../services/hdService'; // Will create this next

interface HDKnowledgeItem {
    id: string;
    key: string;
    category: string;
    title: string;
    contentLevel1: string;
    contentLevel2: string;
    contentLevel3: string;
    contentLevel4: string;
}

const CATEGORIES = [
    'Type', 'Profile', 'Center', 'Channel', 'Gate', 'Strategy', 'Authority', 'Variable',
    'Definition', 'Signature', 'Not Self Theme', 'Incarnation Cross',
    'Digestion', 'Sense', 'Design Sense', 'Motivation', 'Perspective', 'Environment'
];

const HDKnowledgeManager: React.FC = () => {
    const [items, setItems] = useState<HDKnowledgeItem[]>([]);
    const [filterCategory, setFilterCategory] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Editor State
    const [isEditing, setIsEditing] = useState(false);
    const [editItem, setEditItem] = useState<Partial<HDKnowledgeItem>>({});
    const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
    
    // Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [importSummary, setImportSummary] = useState({ total: 0, new: 0, existing: 0 });

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        try {
            const data = await hdService.getAllKnowledge();
            setItems(data);
        } catch (e) {
            console.error('Failed to load knowledge', e);
        }
    };

    const handleCreateNew = () => {
        setEditItem({
            key: '',
            category: 'Type',
            title: '',
            contentLevel1: '',
            contentLevel2: '',
            contentLevel3: '',
            contentLevel4: ''
        });
        setIsEditing(true);
        setActiveTab(1);
    };

    const handleEdit = (item: HDKnowledgeItem) => {
        setEditItem({ ...item });
        setIsEditing(true);
        setActiveTab(1);
    };

    const handleDelete = async (key: string) => {
        if (confirm('Are you sure you want to delete this item?')) {
            await hdService.deleteKnowledge(key);
            loadItems();
        }
    };

    const handleSave = async () => {
        if (!editItem.key || !editItem.title) {
            alert('Key and Title are required');
            return;
        }
        try {
            await hdService.saveKnowledge(editItem);
            setIsEditing(false);
            loadItems();
            alert('Saved successfully!');
        } catch (e: any) {
            console.error(e);
            alert('Failed to save: ' + (e.response?.data?.message || e.message));
        }
    };

    // --- CSV IMPORT LOGIC ---

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Dynamically import Papa to avoid SSR issues if any, though likely client-side only here
        import('papaparse').then((Papa) => {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsed = results.data;
                    if (parsed.length === 0) {
                        alert('CSV is empty or invalid.');
                        return;
                    }
                    
                    // Simple validation/mapping
                    // Expected headers: Key, Category, Title, Level 1, Level 2, Level 3, Level 4
                    const mappedData = parsed.map((row: any) => ({
                        key: row['Key']?.trim() || row['key']?.trim(),
                        category: row['Category']?.trim() || row['category']?.trim() || 'Type',
                        title: row['Title']?.trim() || row['title']?.trim(),
                        contentLevel1: row['Level 1'] || row['contentLevel1'] || '',
                        contentLevel2: row['Level 2'] || row['contentLevel2'] || '',
                        contentLevel3: row['Level 3'] || row['contentLevel3'] || '',
                        contentLevel4: row['Level 4'] || row['contentLevel4'] || ''
                    })).filter((item: any) => item.key); // Must have ID

                    setImportData(mappedData);
                    setImportSummary({
                        total: mappedData.length,
                        new: 0, // Backend determines this really, but we can verify against current list
                        existing: 0
                    });
                    setShowImportModal(true);
                    
                    // Reset input
                    e.target.value = '';
                },
                error: (error: any) => {
                    console.error('CSV Error:', error);
                    alert('Failed to parse CSV');
                }
            });
        });
    };

    const confirmImport = async () => {
        try {
            if (confirm(`Importing ${importData.length} items. Continue?`)) {
                await hdService.importBulkKnowledge(importData);
                alert('Import successful!');
                setShowImportModal(false);
                setImportData([]);
                loadItems();
            }
        } catch (e: any) {
            console.error(e);
            alert('Import failed: ' + (e.response?.data?.message || e.message));
        }
    };


    // Filter Logic
    const filteredItems = items.filter(item => {
        const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              item.key.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">HD Knowledge Base</h2>
                    <p className="text-sm text-gray-500">Manage descriptions for Human Design components.</p>
                </div>
                <div className="flex gap-2">
                    <label className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 cursor-pointer">
                        <Icons.Upload /> Import CSV
                        <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            onChange={handleFileUpload}
                        />
                    </label>
                    <button onClick={handleCreateNew} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-700">
                        <Icons.Plus /> Add New Item
                    </button>
                </div>
            </div>

            {/* IMPORT PREVIEW MODAL */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <h3 className="text-xl font-bold mb-4">Confirm Import</h3>
                        <div className="bg-blue-50 p-4 rounded-lg mb-4 text-sm text-blue-800">
                             Ready to import <strong>{importData.length}</strong> items. <br/>
                             Existing items with the same <strong>Key</strong> will be updated. New ones will be created.
                        </div>
                        
                        <div className="flex-1 overflow-y-auto border rounded mb-4">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="p-2">Key</th>
                                        <th className="p-2">Title</th>
                                        <th className="p-2">Lvl 1 (Preview)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {importData.map((item, idx) => (
                                        <tr key={idx} className="border-b hover:bg-gray-50">
                                            <td className="p-2 font-mono font-bold">{item.key}</td>
                                            <td className="p-2">{item.title}</td>
                                            <td className="p-2 text-gray-500 truncate max-w-[200px]">{item.contentLevel1?.substring(0, 50)}...</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={confirmImport} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Confirm Import</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditing ? (
                <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <h3 className="font-bold text-lg">
                             {editItem.id ? 'Edit Knowledge Item' : 'New Knowledge Item'}
                        </h3>
                        <div className="space-x-2">
                             <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded">Cancel</button>
                             <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700">Save Item</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Key (Unique ID)</label>
                            <input 
                                type="text" 
                                value={editItem.key} 
                                onChange={e => {
                                    // STRICT SANITIZATION: No spaces, uppercase only, allow hyphens
                                    const val = e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_-]/g, '');
                                    setEditItem({...editItem, key: val});
                                }}
                                // disabled={!!editItem.id}  <-- REMOVED to allow editing
                                className="w-full border p-2 rounded bg-gray-50 font-mono text-sm"
                                placeholder="e.g. TYPE_GENERATOR"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                            <input
                                list="category-options"
                                type="text"
                                value={editItem.category}
                                onChange={e => setEditItem({...editItem, category: e.target.value})}
                                className="w-full border p-2 rounded"
                                placeholder="Select or type..."
                            />
                            <datalist id="category-options">
                                {CATEGORIES.map(c => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title (Display Name)</label>
                            <input 
                                type="text" 
                                value={editItem.title} 
                                // DECOUPLED: Title changes no longer affect Key
                                onChange={e => setEditItem({ ...editItem, title: e.target.value })}
                                className="w-full border p-2 rounded"
                                placeholder="e.g. Generator"
                            />
                        </div>
                    </div>

                    {/* TABS for Levels */}
                    <div className="mb-4">
                         <div className="flex border-b border-gray-200">
                             {[1, 2, 3, 4].map(level => (
                                 <button
                                     key={level}
                                     onClick={() => setActiveTab(level as any)}
                                     className={`px-6 py-3 font-bold text-sm border-b-2 transition-colors ${
                                         activeTab === level 
                                         ? 'border-purple-600 text-purple-700 bg-purple-50' 
                                         : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                     }`}
                                 >
                                     Level {level}
                                 </button>
                             ))}
                         </div>
                         
                         <div className="p-4 bg-gray-50 rounded-b-lg border-x border-b border-gray-200">
                             <div className="flex justify-between items-center mb-2">
                                 <span className="text-xs font-bold text-gray-500 uppercase">
                                     Content for Level {activeTab} 
                                     {activeTab === 1 && ' (Basic / Summary)'}
                                     {activeTab === 2 && ' (Deep Dive)'}
                                     {activeTab === 3 && ' (Advanced)'}
                                     {activeTab === 4 && ' (Expert)'}
                                 </span>
                             </div>

                             <div className="bg-white">
                                 <textarea
                                     value={editItem[`contentLevel${activeTab}` as keyof HDKnowledgeItem] || ''}
                                     onChange={(e) => setEditItem({ ...editItem, [`contentLevel${activeTab}`]: e.target.value })}
                                     className="w-full h-64 p-4 border rounded focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
                                     placeholder="Enter content here (HTML supported)..." 
                                 />
                             </div>
                         </div>
                    </div>

                </div>
            ) : (
                <>
                    {/* FILTERS */}
                    <div className="flex gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <select 
                             value={filterCategory} 
                             onChange={e => setFilterCategory(e.target.value)}
                             className="border p-2 rounded min-w-[150px]"
                        >
                             <option value="All">All Categories</option>
                             {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input 
                             type="text" 
                             placeholder="Search Key or Title..." 
                             value={searchTerm}
                             onChange={e => setSearchTerm(e.target.value)}
                             className="border p-2 rounded w-full"
                        />
                    </div>

                    {/* TABLE */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b">
                                <tr>
                                    <th className="p-4">Key</th>
                                    <th className="p-4">Category</th>
                                    <th className="p-4">Title</th>
                                    <th className="p-4 text-center">Levels</th>
                                    <th className="p-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredItems.map(item => (
                                    <tr key={item.key} className="hover:bg-purple-50 transition-colors">
                                        <td className="p-4 font-mono text-xs font-bold text-purple-700">{item.key}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{item.category}</span>
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">{item.title}</td>
                                        <td className="p-4 text-center">
                                            <div className="flex justify-center gap-1">
                                                {[1,2,3,4].map(l => (
                                                    <span key={l} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                        item[`contentLevel${l}` as keyof HDKnowledgeItem] 
                                                        ? 'bg-emerald-100 text-emerald-700' 
                                                        : 'bg-gray-100 text-gray-300'
                                                    }`}>
                                                        {l}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(item)} className="text-blue-600 hover:underline font-medium">Edit</button>
                                            <button onClick={() => handleDelete(item.key)} className="text-red-500 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredItems.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-gray-400 italic">No items found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default HDKnowledgeManager;
