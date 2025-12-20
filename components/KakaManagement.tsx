
import React, { useState, useEffect } from 'react';
import * as userService from '../services/userService';
import { KakaItem } from '../types';
import { Icons, TRANSLATIONS } from '../constants';

interface Props {
  currentLang?: string;
}

const KakaManagement: React.FC<Props> = ({ currentLang = 'EN' }) => {
  const [items, setItems] = useState<KakaItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editItem, setEditItem] = useState<Partial<KakaItem>>({});
  const [isLoading, setIsLoading] = useState(false);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];

  useEffect(() => {
      fetchItems();
  }, []);

  const fetchItems = async () => {
      try {
          const data = await userService.getKakaItems();
          setItems(data);
      } catch (error) {
          console.error('Failed to fetch Kaka items', error);
      }
  };

  const handleSave = async () => {
      setIsLoading(true);
      try {
          if (editItem.id) {
              await userService.updateKakaItem(editItem.id, editItem);
          } else {
              await userService.createKakaItem({
                  ...editItem,
                  date: editItem.date || new Date().toISOString().split('T')[0]
              });
          }
          await fetchItems();
          setIsEditing(false);
          setEditItem({});
      } catch (error) {
          alert('Failed to save item');
      } finally {
          setIsLoading(false);
      }
  };

  const handleDelete = async (id: string) => {
      if (confirm('Delete this KAKA item?')) {
          try {
              await userService.deleteKakaItem(id);
              fetchItems();
          } catch (e) {
              alert('Failed to delete item');
          }
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (x) => {
              if (x.target?.result) {
                  setEditItem({ 
                      ...editItem, 
                      mediaUrl: x.target.result as string,
                      mediaName: file.name
                  });
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  };

  const getMediaIcon = (type: string) => {
      switch(type) {
          case 'PHOTO': return <Icons.Camera />;
          case 'LINK': return <Icons.Link />;
          case 'FILE': return <Icons.Document />;
          default: return <span>-</span>;
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
           <div>
               <h2 className="text-2xl font-bold text-gray-800">KAKA Management</h2>
               <p className="text-gray-500 text-sm">{t.kakaDesc}</p>
           </div>
           <button onClick={() => { setEditItem({ mediaType: 'NONE' }); setIsEditing(true); }} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg hover:bg-blue-700 transition-colors">
             + New Info
           </button>
       </div>

       {isEditing && (
           <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-lg mb-6">
               <h3 className="font-bold mb-4 text-lg border-b pb-2">{editItem.id ? 'Edit Info' : 'New Info KAKA'}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                       <label className="text-xs font-bold text-gray-700 mb-1 block">{t.date}</label>
                       <input type="date" className="border p-2 rounded w-full" value={editItem.date ? new Date(editItem.date).toISOString().split('T')[0] : ''} onChange={e => setEditItem({...editItem, date: e.target.value})} />
                   </div>
                   <div>
                       <label className="text-xs font-bold text-gray-700 mb-1 block">{t.media} Type</label>
                       <select className="border p-2 rounded w-full" value={editItem.mediaType || 'NONE'} onChange={e => setEditItem({...editItem, mediaType: e.target.value as any, mediaUrl: ''})}>
                           <option value="NONE">None</option>
                           <option value="PHOTO">{t.photo}</option>
                           <option value="LINK">{t.link} (URL)</option>
                           <option value="FILE">{t.file} (PDF/Doc)</option>
                       </select>
                   </div>
                   <div className="md:col-span-2">
                       <label className="text-xs font-bold text-gray-700 mb-1 block">{t.description}</label>
                       <input className="border p-2 rounded w-full" value={editItem.description || ''} onChange={e => setEditItem({...editItem, description: e.target.value})} placeholder="Info Description..." />
                   </div>
                   
                   {editItem.mediaType !== 'NONE' && (
                       <div className="md:col-span-2 bg-gray-50 p-3 rounded border">
                           {editItem.mediaType === 'LINK' ? (
                               <div>
                                   <label className="text-xs font-bold text-gray-700 mb-1 block">Link URL</label>
                                   <input className="border p-2 rounded w-full" value={editItem.mediaUrl || ''} onChange={e => setEditItem({...editItem, mediaUrl: e.target.value})} placeholder="https://..." />
                               </div>
                           ) : (
                               <div>
                                   <label className="text-xs font-bold text-gray-700 mb-1 block">Upload {editItem.mediaType === 'PHOTO' ? 'Image' : 'File'}</label>
                                   <input type="file" onChange={handleFileUpload} accept={editItem.mediaType === 'PHOTO' ? "image/*" : ".pdf,.doc,.docx"} className="text-sm" />
                                   {editItem.mediaUrl && (
                                       <div className="mt-2 text-xs text-green-600 font-bold flex items-center gap-1">
                                           <Icons.Check /> File Selected: {editItem.mediaName || 'Uploaded'}
                                       </div>
                                   )}
                               </div>
                           )}
                       </div>
                   )}
               </div>
               <div className="mt-6 flex gap-2 justify-end border-t pt-4">
                   <button onClick={() => setIsEditing(false)} className="text-gray-500 px-4 py-2 font-medium text-sm" disabled={isLoading}>Cancel</button>
                   <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2 rounded font-bold shadow-md hover:bg-emerald-700 disabled:opacity-50" disabled={isLoading}>
                       {isLoading ? 'Saving...' : 'Save Info'}
                   </button>
               </div>
           </div>
       )}

       <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
           <table className="w-full text-left">
               <thead>
                   <tr className="bg-white border-b border-gray-200 text-gray-800 text-xs uppercase tracking-wider">
                       <th className="px-6 py-4 font-bold">{t.no}</th>
                       <th className="px-6 py-4 font-bold">{t.date}</th>
                       <th className="px-6 py-4 font-bold">{t.description}</th>
                       <th className="px-6 py-4 font-bold">{t.media}</th>
                       <th className="px-6 py-4 font-bold text-right">{t.actions}</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                   {items.map((item, idx) => (
                       <tr key={item.id} className="hover:bg-gray-50">
                           <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                           <td className="px-6 py-4 text-sm font-medium">{formatDate(item.date)}</td>
                           <td className="px-6 py-4 text-sm text-gray-700">{item.description}</td>
                           <td className="px-6 py-4 text-sm">
                               <div className="flex items-center gap-2">
                                   {getMediaIcon(item.mediaType)}
                                   <span className="capitalize">{item.mediaType === 'NONE' ? '-' : item.mediaType === 'PHOTO' ? t.photo : item.mediaType === 'LINK' ? t.link : t.file}</span>
                               </div>
                           </td>
                           <td className="px-6 py-4 flex gap-3 justify-end">
                               <button onClick={() => { setEditItem(item); setIsEditing(true); }} className="text-yellow-600 hover:text-yellow-700 flex items-center gap-1 font-bold text-xs"><Icons.Ticket /> Edit</button>
                               <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700 flex items-center gap-1 font-bold text-xs"><Icons.X /> {t.delete}</button>
                           </td>
                       </tr>
                   ))}
                   {items.length === 0 && (
                       <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No Information available.</td></tr>
                   )}
               </tbody>
           </table>
       </div>
    </div>
  );
};

export default KakaManagement;
