
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { SystemSettings, Testimonial, SocialLink } from '../types';
import { settingsApi } from '../services/settingsService';
import { getUsers } from '../services/userService';
import { Icons } from '../constants';

interface SettingsProps {
    onUpdate?: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onUpdate }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null); // Start null to check loading
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'MAIN' | 'LANDING' | 'COMMISSION' | 'MEMBER'>('MAIN');
  
  const [editingTestimonial, setEditingTestimonial] = useState<Partial<Testimonial> | null>(null);

  // Dynamic Social Links State
  const [newSocialName, setNewSocialName] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  // Member Search for Testimonials
  const [users, setUsers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  useEffect(() => {
    loadSettings();
    getUsers().then(setUsers).catch(console.error);
  }, []);

  const loadSettings = async () => {
    try {
        const data = await settingsApi.getSettings();
        setSettings(data);
    } catch (e) {
        console.error("Failed to load settings", e);
        setErrorMsg('Failed to load settings. Please try refreshing.');
    }
  };

  const handleLevelCountChange = (count: number) => {
    if (!settings) return;
    const newPercents = [...(settings.levelPercentages || [])];
    if (count > newPercents.length) {
      for (let i = newPercents.length; i < count; i++) newPercents.push(1);
    } else {
      newPercents.length = count;
    }
    setSettings({ ...settings, commissionLevels: count, levelPercentages: newPercents });
  };

  const handlePercentChange = (index: number, val: number) => {
    if (!settings) return;
    const newPercents = [...settings.levelPercentages];
    newPercents[index] = val;
    setSettings({ ...settings, levelPercentages: newPercents });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'bg' | 'logo' | 'testimonial') => {
    if (!settings) return;
    if (e.target.files && e.target.files[0]) {
       const file = e.target.files[0];
       if (file.size > 10 * 1024 * 1024) { // 10MB Limit
           alert('Image is too large (Max 10MB). Please resize or compress your image.');
           e.target.value = ''; // Reset input
           return;
       }

       const reader = new FileReader();
       reader.onload = (x) => {
          if (x.target?.result) {
              if (target === 'bg') {
                  setSettings({ ...settings, landingPage: { ...settings.landingPage, backgroundImage: x.target.result as string } });
              } else if (target === 'logo') {
                  setSettings({ ...settings, branding: { ...settings.branding, logo: x.target.result as string } });
              } else if (target === 'testimonial' && editingTestimonial) {
                  setEditingTestimonial({ ...editingTestimonial, image: x.target.result as string });
              }
          }
       };
       reader.readAsDataURL(file);
    }
  };

  const saveTestimonial = () => {
      if (!editingTestimonial || !settings) return;
      const currentList = settings.landingPage.testimonials || [];
      let newList;
      if (editingTestimonial.id) {
          newList = currentList.map(t => t.id === editingTestimonial.id ? { ...t, ...editingTestimonial } as Testimonial : t);
      } else {
          newList = [...currentList, { ...editingTestimonial, id: 't' + Date.now() } as Testimonial];
      }
      setSettings({ ...settings, landingPage: { ...settings.landingPage, testimonials: newList } });
      setEditingTestimonial(null);
  };

  const deleteTestimonial = (id: string) => {
      if (!settings) return;
      const newList = settings.landingPage.testimonials.filter(t => t.id !== id);
      setSettings({ ...settings, landingPage: { ...settings.landingPage, testimonials: newList } });
  };

  const handleFeatureBoxChange = (idx: number, field: 'title' | 'description', value: string) => {
      if (!settings) return;
      const newBoxes = [...settings.landingPage.featureBoxes];
      newBoxes[idx] = { ...newBoxes[idx], [field]: value };
      setSettings({ ...settings, landingPage: { ...settings.landingPage, featureBoxes: newBoxes } });
  };

  const addCustomSocial = () => {
    if (!settings) return;
    if (!newSocialName || !newSocialUrl) return;
    const currentOthers = settings.landingPage.footer.socialMedia.others || [];
    const newOthers = [...currentOthers, { name: newSocialName, url: newSocialUrl }];
    setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, others: newOthers}}}});
    setNewSocialName('');
    setNewSocialUrl('');
  };

  const removeCustomSocial = (idx: number) => {
      if (!settings) return;
      const currentOthers = settings.landingPage.footer.socialMedia.others || [];
      const newOthers = currentOthers.filter((_, i) => i !== idx);
      setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, others: newOthers}}}});
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
        await settingsApi.updateSettings(settings);
        setSuccessMsg('Settings updated successfully!');
        if(onUpdate) onUpdate(); // Trigger global refresh
        setTimeout(() => {
            setSuccessMsg('');
        }, 1500);
    } catch (e: any) {
        if (e.response && e.response.status === 413) {
            setErrorMsg('File too large. Please resize your image or upload a smaller file.');
        } else {
            setErrorMsg('Failed to save settings. ' + (e.response?.data?.message || e.message));
        }
    }
  };

  if (!settings) return <div className="p-8 text-center text-gray-500">Loading settings...</div>;

  if (activeTab === 'MAIN') {
      return (
          <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button 
                    onClick={() => setActiveTab('LANDING')}
                    className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-all group"
                  >
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Icons.Globe />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Edit Landing Page</h3>
                      <p className="text-gray-500 text-center mt-2 text-sm">Customize Hero, Features, Testimonials, Footer & Branding</p>
                  </button>

                  <button 
                    onClick={() => setActiveTab('COMMISSION')}
                    className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-emerald-50 hover:border-emerald-200 transition-all group"
                  >
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Icons.Money />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Commission & Tax</h3>
                      <p className="text-gray-500 text-center mt-2 text-sm">Manage Levels, Percentages, Point Rate & PPn</p>
                  </button>

                  <button 
                    onClick={() => setActiveTab('MEMBER')}
                    className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center hover:bg-purple-50 hover:border-purple-200 transition-all group"
                  >
                      <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Icons.Users />
                      </div>
                      <h3 className="text-xl font-bold text-gray-800">Member Config</h3>
                      <p className="text-gray-500 text-center mt-2 text-sm">Profile Visibility & Permissions</p>
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setActiveTab('MAIN')} className="text-gray-500 hover:text-gray-700 flex items-center gap-1 font-medium">
              <span className="text-lg">←</span> Back
          </button>
          <h2 className="text-2xl font-bold text-gray-800">
              {activeTab === 'LANDING' ? 'Edit Landing Page' : activeTab === 'COMMISSION' ? 'Commission & Tax Configuration' : 'Member Configuration'}
          </h2>
      </div>

      {activeTab === 'LANDING' && (
        <div className="space-y-8">
            {/* Branding Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Global Branding</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">App Logo</label>
                        <div className="flex items-center gap-4">
                            {settings.branding.logo ? (
                                <img src={settings.branding.logo} className="h-16 w-auto border rounded p-1" />
                            ) : (
                                <div className="h-16 w-16 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">No Logo</div>
                            )}
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} className="text-sm" />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">App Title</label>
                                <input value={settings.branding.appTitle} onChange={e => setSettings({...settings, branding: {...settings.branding, appTitle: e.target.value}})} className="w-full px-4 py-2 border rounded-lg" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">App Subtitle</label>
                                <input value={settings.branding.appSubtitle} onChange={e => setSettings({...settings, branding: {...settings.branding, appSubtitle: e.target.value}})} className="w-full px-4 py-2 border rounded-lg" />
                            </div>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="text-sm font-bold text-gray-700 mb-2 mt-2">Dashboard Theme</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Card Background</label>
                                <div className="flex gap-2">
                                    <input type="color" value={settings.branding.theme.cardBackground} onChange={e => setSettings({...settings, branding: {...settings.branding, theme: {...settings.branding.theme, cardBackground: e.target.value}}})} className="h-10 w-16 p-0 border-0 rounded cursor-pointer" />
                                    <input value={settings.branding.theme.cardBackground} onChange={e => setSettings({...settings, branding: {...settings.branding, theme: {...settings.branding.theme, cardBackground: e.target.value}}})} className="flex-1 text-sm border rounded px-2" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Card Text Color</label>
                                <div className="flex gap-2">
                                    <input type="color" value={settings.branding.theme.cardText} onChange={e => setSettings({...settings, branding: {...settings.branding, theme: {...settings.branding.theme, cardText: e.target.value}}})} className="h-10 w-16 p-0 border-0 rounded cursor-pointer" />
                                    <input value={settings.branding.theme.cardText} onChange={e => setSettings({...settings, branding: {...settings.branding, theme: {...settings.branding.theme, cardText: e.target.value}}})} className="flex-1 text-sm border rounded px-2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Hero Section</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hero Title</label>
                        <input value={settings.landingPage.title} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, title: e.target.value}})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hero Description</label>
                        <textarea value={settings.landingPage.description} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, description: e.target.value}})} className="w-full px-4 py-2 border rounded-lg" rows={2} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bg')} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Text Color (Hero)</label>
                        <input type="color" value={settings.landingPage.textColor || '#ffffff'} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, textColor: e.target.value}})} className="h-10 w-20 p-1 border rounded" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hero Text Alignment</label>
                        <select 
                            value={settings.landingPage.heroAlignment || 'left'} 
                            onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, heroAlignment: e.target.value as any}})}
                            className="w-full px-4 py-2 border rounded-lg"
                        >
                            <option value="left">Left Aligned</option>
                            <option value="center">Center Aligned</option>
                            <option value="right">Right Aligned</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Features Text */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">"Why Choose Us" Section</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section Title</label>
                        <input value={settings.landingPage.features.title} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, features: {...settings.landingPage.features, title: e.target.value}}})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Section Description</label>
                        <textarea value={settings.landingPage.features.description} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, features: {...settings.landingPage.features, description: e.target.value}}})} className="w-full px-4 py-2 border rounded-lg" rows={2} />
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {settings.landingPage.featureBoxes?.map((box, idx) => (
                            <div key={box.id} className="bg-gray-50 p-3 rounded border border-gray-200">
                                <h5 className="font-bold text-xs text-gray-500 uppercase mb-2">Feature Box {idx + 1}</h5>
                                <input className="w-full border p-1 rounded text-sm mb-2" value={box.title} onChange={e => handleFeatureBoxChange(idx, 'title', e.target.value)} placeholder="Box Title" />
                                <textarea className="w-full border p-1 rounded text-sm" value={box.description} onChange={e => handleFeatureBoxChange(idx, 'description', e.target.value)} placeholder="Box Description" rows={2} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Testimonials */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Testimonials</h3>
                    <button onClick={() => setEditingTestimonial({})} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-100 font-bold">+ Add New</button>
                </div>
                {editingTestimonial && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-blue-200">
                        <h5 className="font-bold mb-3">{editingTestimonial.id ? 'Edit Testimonial' : 'New Testimonial'}</h5>
                        
                        {/* Member Picker */}
                        <div className="mb-4 relative z-20">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Quick Fill from Member</label>
                            <input 
                                placeholder="Search by name or username..." 
                                className="border p-2 rounded w-full text-sm bg-white"
                                value={memberSearch}
                                onChange={e => {
                                    setMemberSearch(e.target.value);
                                    setShowMemberDropdown(true);
                                }}
                                onFocus={() => setShowMemberDropdown(true)}
                            />
                            {showMemberDropdown && memberSearch && (
                                <div className="absolute top-full left-0 right-0 bg-white border shadow-xl max-h-48 overflow-y-auto rounded-b-lg mt-1">
                                    {users.filter(u => 
                                        u.name?.toLowerCase().includes(memberSearch.toLowerCase()) || 
                                        u.username?.toLowerCase().includes(memberSearch.toLowerCase())
                                    ).slice(0, 5).map(u => (
                                        <div 
                                            key={u.id} 
                                            className="p-2 hover:bg-blue-50 cursor-pointer flex items-center gap-3 border-b border-gray-100 last:border-0" 
                                            onClick={() => {
                                                setEditingTestimonial({ 
                                                    ...editingTestimonial, 
                                                    name: u.name, 
                                                    image: u.avatar || '',
                                                    role: editingTestimonial?.role // Preserve if typed
                                                });
                                                setMemberSearch('');
                                                setShowMemberDropdown(false);
                                            }}
                                        >
                                            {u.avatar ? <img src={u.avatar} className="w-8 h-8 rounded-full object-cover shadow-sm"/> : <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{u.name.charAt(0)}</div>}
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-gray-800">{u.name}</p>
                                                <p className="text-xs text-gray-500">@{u.username || 'user'}</p>
                                            </div>
                                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Select</span>
                                        </div>
                                    ))}
                                    {users.filter(u => u.name?.toLowerCase().includes(memberSearch.toLowerCase())).length === 0 && (
                                        <div className="p-3 text-center text-gray-400 text-xs italic">No member found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input placeholder="Name" className="border p-2 rounded" value={editingTestimonial.name || ''} onChange={e => setEditingTestimonial({...editingTestimonial, name: e.target.value})} />
                            <input placeholder="Role (e.g. Diamond Member)" className="border p-2 rounded" value={editingTestimonial.role || ''} onChange={e => setEditingTestimonial({...editingTestimonial, role: e.target.value})} />
                            <div className="md:col-span-2">
                                <textarea placeholder="Content" className="border p-2 rounded w-full" rows={2} value={editingTestimonial.content || ''} onChange={e => setEditingTestimonial({...editingTestimonial, content: e.target.value})} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="text-xs text-gray-500 mb-1 block">Photo</label>
                                <div className="flex gap-2 items-center">
                                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'testimonial')} className="text-sm" />
                                    {editingTestimonial.image && <img src={editingTestimonial.image} className="h-10 w-10 rounded-full object-cover" />}
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                            <button onClick={() => setEditingTestimonial(null)} className="text-gray-500 text-sm">Cancel</button>
                            <button onClick={saveTestimonial} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm font-bold">Save</button>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {settings.landingPage.testimonials?.map(t => (
                        <div key={t.id} className="border p-3 rounded-lg flex gap-3 items-start relative bg-gray-50">
                            <img src={t.image} className="w-12 h-12 rounded-full object-cover bg-gray-200" />
                            <div>
                                <p className="font-bold text-sm">{t.name}</p>
                                <p className="text-xs text-blue-600 font-bold mb-1">{t.role}</p>
                                <p className="text-xs text-gray-600 line-clamp-2">{t.content}</p>
                            </div>
                            <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={() => setEditingTestimonial(t)} className="text-blue-500 hover:text-blue-700"><Icons.Settings /></button>
                                <button onClick={() => deleteTestimonial(t.id)} className="text-red-500 hover:text-red-700"><Icons.Trash /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Product Page Catalog Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Product Catalog Config</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Page Title</label>
                        <input value={settings.productPage.title} onChange={e => setSettings({...settings, productPage: {...settings.productPage, title: e.target.value}})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Catalog Subtitle</label>
                        <input value={settings.productPage.subtitle} onChange={e => setSettings({...settings, productPage: {...settings.productPage, subtitle: e.target.value}})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Footer Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Footer Content</h3>
                <div className="grid grid-cols-1 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">About Text</label>
                        <textarea value={settings.landingPage.footer.aboutText} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, aboutText: e.target.value}}})} className="w-full px-4 py-2 border rounded-lg" rows={2} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                            <input value={settings.landingPage.footer.contactEmail} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, contactEmail: e.target.value}}})} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                            <input value={settings.landingPage.footer.contactPhone} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, contactPhone: e.target.value}}})} className="w-full px-4 py-2 border rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
                        <input value={settings.landingPage.footer.copyrightText} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, copyrightText: e.target.value}}})} className="w-full px-4 py-2 border rounded-lg" />
                    </div>
                    
                    {/* Social Media */}
                    <div className="mt-4 border-t pt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-3">Social Media Links</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="flex items-center gap-2">
                               <Icons.Facebook />
                               <input placeholder="Facebook URL" value={settings.landingPage.footer.socialMedia.facebook} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, facebook: e.target.value}}}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                           </div>
                           <div className="flex items-center gap-2">
                               <Icons.Instagram />
                               <input placeholder="Instagram URL" value={settings.landingPage.footer.socialMedia.instagram} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, instagram: e.target.value}}}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                           </div>
                           <div className="flex items-center gap-2">
                               <Icons.WhatsApp />
                               <input placeholder="WhatsApp URL" value={settings.landingPage.footer.socialMedia.whatsapp} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, whatsapp: e.target.value}}}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                           </div>
                           <div className="flex items-center gap-2">
                               <Icons.TikTok />
                               <input placeholder="TikTok URL" value={settings.landingPage.footer.socialMedia.tiktok} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, tiktok: e.target.value}}}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                           </div>
                           <div className="flex items-center gap-2">
                               <Icons.Youtube />
                               <input placeholder="YouTube URL" value={settings.landingPage.footer.socialMedia.youtube || ''} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, youtube: e.target.value}}}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                           </div>
                           <div className="flex items-center gap-2">
                               <Icons.Telegram />
                               <input placeholder="Telegram URL" value={settings.landingPage.footer.socialMedia.telegram || ''} onChange={e => setSettings({...settings, landingPage: {...settings.landingPage, footer: {...settings.landingPage.footer, socialMedia: {...settings.landingPage.footer.socialMedia, telegram: e.target.value}}}})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                           </div>
                        </div>

                        {/* Custom Links */}
                        <div className="mt-4">
                           <h5 className="text-xs font-bold text-gray-500 uppercase mb-2">Other Links</h5>
                           <div className="flex gap-2 mb-2">
                              <input placeholder="Platform Name (e.g. LinkedIn)" className="border p-2 rounded text-sm flex-1" value={newSocialName} onChange={e => setNewSocialName(e.target.value)} />
                              <input placeholder="URL" className="border p-2 rounded text-sm flex-1" value={newSocialUrl} onChange={e => setNewSocialUrl(e.target.value)} />
                              <button onClick={addCustomSocial} className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-bold">+</button>
                           </div>
                           <div className="space-y-2">
                              {settings.landingPage.footer.socialMedia.others?.map((link, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm border">
                                    <div className="flex gap-2">
                                        <span className="font-bold">{link.name}:</span>
                                        <span className="text-blue-600 truncate max-w-xs">{link.url}</span>
                                    </div>
                                    <button onClick={() => removeCustomSocial(idx)} className="text-red-500 hover:text-red-700"><Icons.Trash /></button>
                                </div>
                              ))}
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {activeTab === 'COMMISSION' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Commission & Financials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Commission Levels</label>
                    <input type="number" min="1" max="10" value={settings.commissionLevels} onChange={(e) => handleLevelCountChange(parseInt(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Point Rate (1 Point = Rp X)</label>
                    <input type="number" value={settings.pointRate} onChange={(e) => setSettings({...settings, pointRate: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PPn / Tax (%)</label>
                    <input type="number" value={settings.taxPercentage || 0} onChange={(e) => setSettings({...settings, taxPercentage: parseFloat(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                </div>
            </div>
            
            <h4 className="font-bold text-gray-700 mb-3">Level Percentages</h4>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg border">
                {settings.levelPercentages.map((percent, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                        <span className="w-20 text-sm font-bold text-gray-600">Level {idx + 1}</span>
                        <input 
                            type="number" 
                            value={percent} 
                            onChange={(e) => handlePercentChange(idx, parseFloat(e.target.value))}
                            className="w-24 px-3 py-1.5 border rounded-md"
                        />
                        <span className="text-gray-500">%</span>
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeTab === 'MEMBER' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">Member Profile Configuration</h3>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                        <h4 className="font-bold text-gray-800">Show Birth Details</h4>
                        <p className="text-sm text-gray-500">Allow members to see/edit Birth Date, Time, and City in their profile.</p>
                    </div>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={settings.memberProfileConfig?.showBirthDetails !== false} 
                            onChange={(e) => setSettings({
                                ...settings, 
                                memberProfileConfig: { 
                                    ...settings.memberProfileConfig, 
                                    showBirthDetails: e.target.checked 
                                }
                            })} 
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        </div>
      )}

      {successMsg && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative animate-pulse">{successMsg}</div>}
      {errorMsg && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative animate-pulse">{errorMsg}</div>}

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg">Save Configuration</button>
      </div>
    </div>
  );
};

export default Settings;
