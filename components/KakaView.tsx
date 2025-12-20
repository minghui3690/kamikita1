
import React, { useState, useEffect } from 'react';
import { getKakaItems as fetchKakaItems } from '../services/userService';
import { User } from '../types';
import { Icons, TRANSLATIONS } from '../constants';

interface Props {
  currentLang?: string;
  currentUser?: User; // [NEW]
}

const KakaView: React.FC<Props> = ({ currentLang = 'EN', currentUser }) => {
  const [items, setItems] = useState<any[]>([]);
  const [locked, setLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerImage, setViewerImage] = useState('');

  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];

  useEffect(() => {
    const loadData = async () => {
        // [NEW] Check Expiry
        if (currentUser?.membershipExpiryDate) {
            const now = new Date();
            const expiry = new Date(currentUser.membershipExpiryDate);
            if (now > expiry) {
                setLocked(true);
                setLoading(false);
                return;
            }
        }
        
        try {
            const data = await fetchKakaItems();
            setItems(data);
        } catch (e: any) {
            if (e.response?.status === 403) {
                setLocked(true);
            }
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, [currentUser]); // Added dependency

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  if (locked) {
      return (
          <div className="bg-red-50 p-8 rounded-xl border border-red-100 text-center space-y-4">
              <div className="text-red-500 text-6xl flex justify-center"><Icons.Lock /></div>
              <h2 className="text-2xl font-bold text-red-800">Access Locked</h2>
              <p className="text-red-600">
                  {currentUser?.membershipExpiryDate && new Date() > new Date(currentUser.membershipExpiryDate) 
                    ? "Your membership has expired." 
                    : "You do not have permission to view the KAKA Information content."}
              </p>
              <p className="text-sm text-gray-500">Please renew your membership or contact Admin.</p>
          </div>
      );
  }

  const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  };

  const getMediaLabel = (type: string) => {
    switch(type) {
        case 'PHOTO': return { icon: <Icons.Camera />, label: t.photo };
        case 'LINK': return { icon: <Icons.Link />, label: t.link };
        case 'FILE': return { icon: <Icons.Document />, label: t.file };
        default: return { icon: <span>-</span>, label: '-' };
    }
  };

    // Helper to convert Data URI to Blob
    const dataURItoBlob = (dataURI: string) => {
        try {
            // Basic validation
            if (!dataURI || !dataURI.startsWith('data:')) {
                console.error('Invalid data URI format');
                return null;
            }

            // Split into metadata and data
            const splitData = dataURI.split(',');
            if (splitData.length < 2) {
                console.error('Data URI missing data part');
                return null;
            }

            const byteString = atob(splitData[1]);
            const mimeString = splitData[0].split(':')[1].split(';')[0];
            
            console.log('Detected MIME:', mimeString);
            console.log('Data Length:', byteString.length);

            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            return new Blob([ab], { type: mimeString });
        } catch (e) {
            console.error('Blob conversion failed', e);
            return null;
        }
    };

    const handleView = (item: any) => {
        console.log('Viewing Item:', item);
        
        if (!item.mediaUrl || item.mediaUrl.length < 5) {
            alert('No valid content available.');
            return;
        }

        const url = item.mediaUrl;

        // 1. PHOTO -> Modal
        if (item.mediaType === 'PHOTO') {
            setViewerImage(url);
            setIsViewerOpen(true);
            return;
        }

        // 2. FILE/PDF
        if (item.mediaType === 'FILE') {
             // If Remote URL
            if (url.startsWith('http')) {
                window.open(url, '_blank');
                return;
            }
            
            // If Data URI (Base64)
            if (url.startsWith('data:')) {
                const blob = dataURItoBlob(url);
                if (blob) {
                   const blobUrl = URL.createObjectURL(blob);
                   // Open in new tab
                   window.open(blobUrl, '_blank');
                } else {
                   alert('Failed to process file data. Please try downloading instead.');
                }
                return;
            }
        }

        // 3. LINK / Fallback
        let finalUrl = url;
        if (!finalUrl.startsWith('http') && !finalUrl.startsWith('data:')) {
            finalUrl = 'https://' + finalUrl;
        }
        window.open(finalUrl, '_blank');
    };

  return (
    <div className="space-y-6">
       <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mb-6">
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
               <span className="text-blue-600"><Icons.Info /></span> {t.infoKaka}
           </h2>
           <p className="text-gray-500 mt-1">{t.kakaDesc}</p>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
           <table className="w-full text-left">
               <thead>
                   <tr className="bg-white border-b border-gray-200 text-gray-800 text-xs uppercase tracking-wider">
                       <th className="px-6 py-4 font-bold">{t.no}</th>
                       <th className="px-6 py-4 font-bold">{t.date}</th>
                       <th className="px-6 py-4 font-bold">{t.description}</th>
                       <th className="px-6 py-4 font-bold">{t.media}</th>
                       <th className="px-6 py-4 font-bold text-center">{t.view}</th>
                       <th className="px-6 py-4 font-bold text-center">{t.download}</th>
                   </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                   {items.map((item, idx) => {
                       const media = getMediaLabel(item.mediaType);
                       return (
                           <tr key={item.id} className="hover:bg-gray-50">
                               <td className="px-6 py-4 text-sm text-gray-500">{idx + 1}</td>
                               <td className="px-6 py-4 text-sm font-medium">{formatDate(item.date)}</td>
                               <td className="px-6 py-4 text-sm text-gray-700">{item.description}</td>
                               <td className="px-6 py-4 text-sm">
                                   <div className="flex items-center gap-2 text-gray-600">
                                       {media.icon}
                                       <span className="font-medium">{media.label}</span>
                                   </div>
                               </td>
                               <td className="px-6 py-4 text-center">
                                   {item.mediaUrl ? (
                                       <button onClick={() => handleView(item)} className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors" title="View Content">
                                           <Icons.Eye />
                                       </button>
                                   ) : (
                                       <span className="text-gray-300">-</span>
                                   )}
                               </td>
                               <td className="px-6 py-4 text-center">
                                   {(item.mediaType === 'FILE' || item.mediaType === 'PHOTO') && item.mediaUrl ? (
                                       <a 
                                         href={item.mediaUrl} 
                                         download={item.mediaName || "download"} 
                                         className="inline-flex items-center justify-center w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors"
                                         title="Download"
                                       >
                                           <Icons.Download />
                                       </a>
                                   ) : (
                                       <span className="text-gray-300">-</span>
                                   )}
                               </td>
                           </tr>
                       );
                   })}
                   {items.length === 0 && (
                       <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No Info available at the moment.</td></tr>
                   )}
               </tbody>
           </table>
       </div>
       
       {/* Image Viewer Modal */}
       {isViewerOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4" onClick={() => setIsViewerOpen(false)}>
               <div className="relative max-w-4xl max-h-screen">
                   <img src={viewerImage} alt="Preview" className="max-w-full max-h-[90vh] rounded shadow-lg" />
                   <button 
                       onClick={() => setIsViewerOpen(false)}
                       className="absolute -top-4 -right-4 bg-white text-gray-800 rounded-full p-2 hover:bg-gray-200 shadow-lg"
                   >
                       <Icons.X />
                   </button>
               </div>
           </div>
       )}
    </div>
  );
};

export default KakaView;
