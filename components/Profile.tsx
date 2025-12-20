import React, { useState, useEffect } from 'react';
import { User, UserRole, ManualPaymentMethod, QRISConfig } from '../types';
import { updateProfile } from '../services/userService';
import { settingsApi } from '../services/settingsService';
import { Icons } from '../constants';
import CityAutocomplete from './CityAutocomplete';

interface ProfileProps {
  user: User;
  onUpdate: () => void;
  onNavigate: (path: string) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate, onNavigate }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.kyc.phone,
    address: user.kyc.address,
    bankName: user.kyc.bankName,
    accountNumber: user.kyc.accountNumber,
    accountHolder: user.kyc.accountHolder,
    gender: user.kyc.gender || 'Man',
    birthDate: user.kyc.birthDate || '',
    birthCity: user.kyc.birthCity || '',
    birthTime: user.kyc.birthTime || '',
    avatar: user.avatar || '',
    withdrawalMethods: user.kyc.withdrawalMethods || []
  });
  
  // State for adding new withdrawal method (Member)
  const [newWithdrawalMethod, setNewWithdrawalMethod] = useState<Partial<ManualPaymentMethod>>({ type: 'BANK', name: '', accountNumber: '', accountHolder: '', isActive: true });

  // Settings State
  const [settings, setSettings] = useState<any>(null);
  const [midtransConfig, setMidtransConfig] = useState<any>({
      merchantId: '', clientKey: '', serverKey: '', snapUrl: '', isProduction: false
  });
  const [manualMethods, setManualMethods] = useState<ManualPaymentMethod[]>([]);
  const [qrisConfig, setQrisConfig] = useState<QRISConfig>({ image: '', nmid: '' });
  const [newMethod, setNewMethod] = useState<Partial<ManualPaymentMethod>>({ type: 'EWALLET', name: '', accountNumber: '', accountHolder: '', isActive: true });

  useEffect(() => {
      const loadSettings = async () => {
          try {
              const data = await settingsApi.getSettings();
              setSettings(data);
              if (data.paymentConfig?.midtrans) {
                  setMidtransConfig(data.paymentConfig.midtrans);
              }
              if (data.paymentConfig) {
                  setManualMethods(data.paymentConfig.manualMethods || []);
                  setQrisConfig(data.paymentConfig.qris || { image: '', nmid: '' });
              }
          } catch (e) {
              console.error('Failed to load settings', e);
          }
      };
      loadSettings();
  }, []);
  
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save via API
    // Save via API
    try {
        await updateProfile({
            name: formData.name,
            email: formData.email,
            avatar: formData.avatar,
            password: newPassword ? newPassword : undefined, 
            kyc: { 
                ...user.kyc, 
                phone: formData.phone,
                address: formData.address,
                bankName: formData.bankName,
                accountNumber: formData.accountNumber,
                accountHolder: formData.accountHolder,
                gender: formData.gender,
                birthDate: formData.birthDate,
                birthCity: formData.birthCity,
                birthTime: formData.birthTime,
                withdrawalMethods: formData.withdrawalMethods
            }
        });
    } catch (e: any) {
        console.error('User update failed', e);
        alert(`Failed to save User Profile: ${e.response?.data?.message || e.message}`);
        return; 
    }

    // Save Admin Payment Config if Admin
    if (isAdmin && settings) {
        try {
            const newSettings = { 
                ...settings, 
                paymentConfig: { 
                    ...settings.paymentConfig, 
                    midtrans: midtransConfig,
                    manualMethods: manualMethods,
                    qris: qrisConfig
                } 
            };
            await settingsApi.updateSettings(newSettings);
        } catch (e: any) {
            console.error('Settings update failed', e);
            alert(`User Saved, but Failed to save Admin Settings: ${e.response?.data?.message || e.message}`);
            return; 
        }
    }

    alert('Profile Saved Successfully!');
    onUpdate();
    // window.location.reload(); // Removed to prevent logout/refresh issues
  };

  const handleChangePassword = async () => {
    if (!newPassword) return;
    try {
        await updateProfile({ password: newPassword });
        setMsg('Password Changed Successfully!');
        setNewPassword('');
    } catch(e) {
        setMsg('Failed to change password');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (x) => {
              if (x.target?.result) setFormData({ ...formData, avatar: x.target.result as string });
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
      <div className="bg-slate-900 px-8 py-6 text-white flex justify-between items-center rounded-t-xl">
        <div>
           <h2 className="text-2xl font-bold">Profile & KYC</h2>
           <p className="text-slate-400">Manage your account and billing information</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
         {/* Avatar Section */}
         <div className="flex flex-col items-center mb-6">
            <div className="relative group cursor-pointer">
                {formData.avatar ? (
                    <img src={formData.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 shadow-md" />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-3xl font-bold border-4 border-gray-100 shadow-md">
                        {user.name.charAt(0)}
                    </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icons.Camera />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Click to upload photo</p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
               <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-1">Personal Info</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Editable)</label>
              <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border p-2 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as any})} className="w-full border p-2 rounded-lg">
                  <option value="Man">Man</option>
                  <option value="Woman">Woman</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border p-2 rounded-lg" />
            </div>
            {(isAdmin || settings?.memberProfileConfig?.showBirthDetails !== false) && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                  <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full border p-2 rounded-lg" />
                </div>
                <div className="relative z-10">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth City</label>
                  <CityAutocomplete 
                    value={formData.birthCity} 
                    onChange={(val) => setFormData({...formData, birthCity: val})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Birth Time (24h)</label>
                  <input type="time" value={formData.birthTime} onChange={e => setFormData({...formData, birthTime: e.target.value})} className="w-full border p-2 rounded-lg" />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border p-2 rounded-lg" rows={2} />
            </div>

            <div className="md:col-span-2 pt-4">
               <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-1">Bank Information (Withdrawal)</h3>
            </div>
            {/* Withdrawal Methods Management for Members */}
            <div className="md:col-span-2 space-y-4">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-800">My Withdrawal Destinations</h4>
                </div>

                {/* List of Methods */}
                <div className="space-y-3">
                    {formData.withdrawalMethods && formData.withdrawalMethods.length > 0 ? (
                        formData.withdrawalMethods.map((m, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                     <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-sm font-bold border border-blue-100">
                                         {m.type === 'BANK' ? 'B' : 'E'}
                                     </div>
                                    <div>
                                        <p className="font-bold text-gray-800">{m.name} <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-2 uppercase">{m.type}</span></p>
                                        <p className="text-sm text-gray-600 font-mono">{m.accountNumber} <span className="text-gray-400 mx-1">|</span> {m.accountHolder}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => {
                                    const newMethods = formData.withdrawalMethods.filter((_, i) => i !== idx);
                                    setFormData({...formData, withdrawalMethods: newMethods});
                                }} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"><Icons.Trash /></button>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded text-center border-dashed border border-gray-200">
                            No withdrawal methods added yet. Add one below to request withdrawals.
                        </p>
                    )}
                </div>

                {/* Add New Method Form */}
                <div className="bg-slate-50 p-5 rounded-xl border border-dashed border-slate-300 mt-4">
                     <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">+ Add New Destination</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                             <select value={newWithdrawalMethod.type} onChange={e => setNewWithdrawalMethod({...newWithdrawalMethod, type: e.target.value as any})} className="w-full border p-2 rounded text-sm bg-white">
                                 <option value="BANK">Bank Account</option>
                                 <option value="EWALLET">E-Wallet (OVO/DANA/etc)</option>
                             </select>
                         </div>
                         <div>
                             <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Provider Name</label>
                             <input placeholder="e.g. BCA, OVO, GoPay" value={newWithdrawalMethod.name} onChange={e => setNewWithdrawalMethod({...newWithdrawalMethod, name: e.target.value})} className="w-full border p-2 rounded text-sm" />
                         </div>
                         <div className="md:col-span-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Number / Phone</label>
                            <input placeholder="Account Number or Phone" value={newWithdrawalMethod.accountNumber} onChange={e => setNewWithdrawalMethod({...newWithdrawalMethod, accountNumber: e.target.value})} className="w-full border p-2 rounded text-sm font-mono" />
                         </div>
                         <div className="md:col-span-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Account Holder</label>
                            <input placeholder="Name on Account" value={newWithdrawalMethod.accountHolder} onChange={e => setNewWithdrawalMethod({...newWithdrawalMethod, accountHolder: e.target.value})} className="w-full border p-2 rounded text-sm" />
                         </div>
                         
                         <div className="md:col-span-2 mt-2">
                             <button type="button" onClick={() => {
                                 if(!newWithdrawalMethod.name || !newWithdrawalMethod.accountNumber || !newWithdrawalMethod.accountHolder) return alert('All fields required');
                                 
                                 const updatedMethods = [...(formData.withdrawalMethods || []), { 
                                     ...newWithdrawalMethod, 
                                     id: Date.now().toString(), 
                                     isActive: true 
                                 } as ManualPaymentMethod];
                                 
                                 setFormData({ ...formData, withdrawalMethods: updatedMethods });
                                 setNewWithdrawalMethod({ type: 'BANK', name: '', accountNumber: '', accountHolder: '', isActive: true });
                             }} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-900 shadow transition-all">
                                 Add Payment Method
                             </button>
                         </div>
                     </div>
                </div>
            </div>

            {isAdmin && settings && (
                <>
                    <div className="md:col-span-2 pt-8">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-1">MANUAL PAYMENT & QRIS</h3>
                    </div>

                    {/* QRIS SECTION */}
                    <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Icons.Scan /> QRIS Configuration</h4>
                        <div className="flex gap-6 items-start">
                            <div>
                                {qrisConfig.image ? (
                                    <img src={qrisConfig.image} className="w-32 h-32 object-contain bg-white border rounded-lg shadow-sm" />
                                ) : (
                                    <div className="w-32 h-32 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs shadow-inner">No QRIS</div>
                                )}
                                <div className="mt-2 text-xs flex justify-center">
                                    <label className="cursor-pointer bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-900 shadow-md transition-all">
                                        Upload QRIS
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                            if(e.target.files?.[0]) {
                                                const r = new FileReader();
                                                r.onload = x => setQrisConfig({...qrisConfig, image: x.target?.result as string});
                                                r.readAsDataURL(e.target.files[0]);
                                            }
                                        }} />
                                    </label>
                                </div>
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Brand Name / NMID</label>
                                    <input value={qrisConfig.nmid || ''} onChange={e => setQrisConfig({...qrisConfig, nmid: e.target.value})} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="e.g. Rich Dragon Store (ID123...)" />
                                </div>
                                <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded border border-blue-100">
                                    <Icons.Info /> Upload image QRIS dari penyedia layanan pembayaran Anda. Image ini akan ditampilkan pada saat member melakukan pembayaran.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* MANUAL METHODS LIST */}
                    <div className="md:col-span-2 mt-4">
                        <h4 className="font-bold text-gray-800 mb-3">Methods List (Bank & E-Wallet)</h4>
                        <div className="space-y-3">
                            {manualMethods.map((m, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white border border-gray-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-all">
                                    <div className="flex items-center gap-4">
                                        {m.logo ? <img src={m.logo} className="w-10 h-10 rounded-lg object-contain border bg-gray-50" /> : <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-500">{m.name.charAt(0)}</div>}
                                        <div>
                                            <p className="font-bold text-gray-800">{m.name} <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full ml-2">{m.type}</span></p>
                                            <p className="text-sm text-gray-600 font-mono">{m.accountNumber} <span className="text-gray-400 mx-1">|</span> {m.accountHolder}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setManualMethods(manualMethods.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"><Icons.Trash /></button>
                                </div>
                            ))}
                            {manualMethods.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No manual payment methods added yet.</p>}
                        </div>

                        {/* ADD NEW METHOD */}
                        <div className="mt-6 bg-slate-50 p-5 rounded-xl border border-dashed border-slate-300">
                             <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">+ Add New Method</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Type</label>
                                     <select value={newMethod.type} onChange={e => setNewMethod({...newMethod, type: e.target.value as any})} className="w-full border p-2 rounded text-sm bg-white">
                                         <option value="BANK">Bank Transfer</option>
                                         <option value="EWALLET">E-Wallet (OVO/GoPay/etc)</option>
                                     </select>
                                 </div>
                                 <div>
                                     <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Provider Name</label>
                                     <input placeholder="e.g. BCA, OVO" value={newMethod.name} onChange={e => setNewMethod({...newMethod, name: e.target.value})} className="w-full border p-2 rounded text-sm" />
                                 </div>
                                 <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Number / Phone</label>
                                    <input placeholder="08..." value={newMethod.accountNumber} onChange={e => setNewMethod({...newMethod, accountNumber: e.target.value})} className="w-full border p-2 rounded text-sm font-mono" />
                                 </div>
                                 <div className="md:col-span-1">
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Account Holder</label>
                                    <input placeholder="Name" value={newMethod.accountHolder} onChange={e => setNewMethod({...newMethod, accountHolder: e.target.value})} className="w-full border p-2 rounded text-sm" />
                                 </div>
                                 
                                 <div className="md:col-span-2">
                                     <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Icon / Logo (Optional)</label>
                                     <div className="flex gap-2">
                                        <input placeholder="Image URL..." value={newMethod.logo || ''} onChange={e => setNewMethod({...newMethod, logo: e.target.value})} className="border p-2 rounded text-sm flex-1" />
                                        <label className="cursor-pointer bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-bold hover:bg-gray-300 transition-colors">
                                            Upload
                                            <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                if(e.target.files?.[0]) {
                                                    const r = new FileReader();
                                                    r.onload = x => setNewMethod({...newMethod, logo: x.target?.result as string});
                                                    r.readAsDataURL(e.target.files[0]);
                                                }
                                            }} />
                                        </label> 
                                     </div>
                                 </div>
                                 
                                 <div className="md:col-span-2 mt-2">
                                     <button type="button" onClick={() => {
                                         if(!newMethod.name || !newMethod.accountNumber) return alert('Name and Number required');
                                         setManualMethods([...manualMethods, { ...newMethod, id: Date.now().toString(), isActive: true } as ManualPaymentMethod]);
                                         setNewMethod({ type: 'EWALLET', name: '', accountNumber: '', accountHolder: '', isActive: true });
                                     }} className="w-full bg-slate-800 text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-900 shadow-lg transition-all">
                                         Add Payment Method
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="md:col-span-2 pt-8">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 border-b pb-1">PAYMENT GATEWAY CONFIGURATION (MIDTRANS)</h3>
                    </div>
                    {/* Existing Midtrans config follows... */}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                        <input value={midtransConfig.merchantId} onChange={e => setMidtransConfig({...midtransConfig, merchantId: e.target.value})} className="w-full border p-2 rounded-lg font-mono text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Client Key</label>
                        <input value={midtransConfig.clientKey} onChange={e => setMidtransConfig({...midtransConfig, clientKey: e.target.value})} className="w-full border p-2 rounded-lg font-mono text-sm" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Server Key</label>
                        <input value={midtransConfig.serverKey} onChange={e => setMidtransConfig({...midtransConfig, serverKey: e.target.value})} className="w-full border p-2 rounded-lg font-mono text-sm" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Snap URL</label>
                        <input value={midtransConfig.snapUrl} onChange={e => setMidtransConfig({...midtransConfig, snapUrl: e.target.value})} className="w-full border p-2 rounded-lg font-mono text-sm" />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-2">
                        <input type="checkbox" checked={midtransConfig.isProduction} onChange={e => setMidtransConfig({...midtransConfig, isProduction: e.target.checked})} className="w-4 h-4" />
                        <label className="text-sm font-medium text-gray-700">Is Production Mode?</label>
                    </div>
                </>
            )}

            <div className="md:col-span-2 pt-4 flex justify-between items-center">
               <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Security</h3>
               <button type="button" onClick={() => setPasswordModal(true)} className="text-blue-600 text-sm font-bold hover:underline">Change Password</button>
            </div>
         </div>

         <div className="pt-4 flex justify-end gap-3">
           <button type="button" onClick={() => onNavigate('/dashboard')} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold">
             Cancel
           </button>
           <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all">
             Save Changes
           </button>
         </div>
      </form>

      {/* Password Modal */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                <h3 className="font-bold text-lg mb-4">Change Password</h3>
                {msg ? (
                    <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-sm">{msg}</div>
                ) : (
                    <div className="mb-4">
                        <label className="block text-sm mb-1">New Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)} 
                                className="w-full border p-2 rounded pr-10" 
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? <Icons.EyeOff size={18} /> : <Icons.Eye size={18} />}
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex justify-end gap-2">
                    <button onClick={() => { setPasswordModal(false); setMsg(''); }} className="text-gray-500 px-4 py-2">Close</button>
                    {!msg && <button onClick={handleChangePassword} className="bg-blue-600 text-white px-4 py-2 rounded">Update</button>}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
