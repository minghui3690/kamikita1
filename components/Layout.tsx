
import React, { useMemo } from 'react';
import { Icons, TRANSLATIONS } from '../constants';
import { User, UserRole } from '../types';
import { getNetworkStats, getSettings } from '../services/mockDatabase';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  currentLang: string;
  onLangChange: (lang: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentPage, onNavigate, currentLang, onLangChange }) => {
  const isSuperAdmin = user.role === UserRole.ADMIN;
  const isManager = user.role === UserRole.MANAGER; // Assuming UserRole.MANAGER exists now
  const isAdminOrManager = isSuperAdmin || isManager;

  const networkStats = useMemo(() => getNetworkStats(user.id), [user]);
  const settings = getSettings();
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS['EN'];



  // Menu Configuration
  const allMenuItems = [
    { id: 'dashboard', label: t.dashboard, icon: Icons.Dashboard, visible: true },
    { id: 'stats', label: t.stats, icon: Icons.Chart, visible: isAdminOrManager },
    { id: 'member-stats', label: t.stats, icon: Icons.Chart, visible: !isAdminOrManager }, // [NEW] Member Business Stats
    { id: 'products', label: isAdminOrManager ? t.products : t.shop, icon: Icons.Product, visible: true },
    { id: isAdminOrManager ? 'members' : 'network', label: isAdminOrManager ? t.memberDir : t.myNet, icon: Icons.Network, visible: true },

    // Member Specific
    { id: 'purchases', label: t.purchases, icon: Icons.Document, visible: !isAdminOrManager },
    
    // Admin/Manager Wallet Functions
    { id: 'wallet', label: t.reqWithdraw, icon: Icons.Wallet, visible: isAdminOrManager },
    { id: 'admin-wallet', label: t.adminWallet, icon: Icons.Money, visible: isAdminOrManager },
    
    // Customers (Both see it, label differs)
    { id: 'customers', label: isAdminOrManager ? t.customers : t.guestCustomers, icon: Icons.User, visible: true },

    // Consultation (Admin/Manager Only)
    { id: 'consultations', label: t.manageConsultations, icon: Icons.Calendar, visible: isAdminOrManager },
    { id: 'my-consultations', label: t.consultations, icon: Icons.Calendar, visible: !isAdminOrManager }, // [NEW] Member View
    
    // Member Commissions
    { id: 'commissions', label: t.commissions, icon: Icons.Money, visible: !isAdminOrManager },
    
    // Kaka (Member View) - Only if unlocked
    { id: 'kaka', label: t.infoKaka, icon: Icons.Info, visible: !isAdminOrManager && user.isKakaUnlocked },
    { id: 'human-design', label: t.myHumanDesign, icon: Icons.Chart, visible: !isAdminOrManager && user.isHumanDesignUnlocked },
    
    { id: 'admin/knowledge', label: t.hdKnowledge, icon: Icons.Book, visible: isSuperAdmin },
    { id: 'ai-consultant', label: t.aiConsultant, icon: Icons.MessageSquare, visible: isAdminOrManager || (user.isAiAssistantUnlocked || false) }, // [NEW] AI Access logic

    // Settings (Super Admin Only)
    { id: 'settings', label: t.settings, icon: Icons.Settings, visible: isSuperAdmin },
    
    // Profile
    { id: 'profile', label: t.profile, icon: Icons.User, visible: true },
  ];

  const menuItems = allMenuItems.filter(item => item.visible);

  const handleCopyReferral = () => {
     const url = `https://rdabusiness.com/ref/${user.referralCode}`;
     navigator.clipboard.writeText(url);
     alert('Referral Link Copied: ' + url);
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl z-10 hidden md:flex">
        <div className="p-6 border-b border-slate-800 flex flex-col items-center text-center">
          {settings.branding.logo && (
             <img src={settings.branding.logo} className="h-12 w-auto mb-3 object-contain" alt="Logo" />
          )}
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            {settings.branding.appTitle}
          </h1>
          <p className="text-xs text-slate-400 mt-1">{settings.branding.appSubtitle}</p>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center text-left px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                currentPage === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="mr-3">{item.icon()}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            {user.avatar ? (
                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" alt="Avatar" />
            ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold">
                  {user.name.charAt(0)}
                </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-300 hover:bg-red-900/20 hover:text-red-200 rounded-lg transition-colors"
          >
            <span className="mr-2"><Icons.Logout /></span>
            {t.logout}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800 capitalize flex items-center gap-2">
              <span className="md:hidden"><Icons.Dashboard /></span>
              {menuItems.find(m => m.id === currentPage)?.label || t.dashboard}
            </h2>
              <div className="flex items-center gap-4">

               <div className="hidden md:flex flex-col items-end border-r pr-4 mr-0">
                   <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Username</span>
                   <span className="text-sm font-mono font-bold text-blue-900">{user.username || '...'}</span>
               </div>
              
              <div className="flex items-center">
                  <span className="mr-2 text-xs text-gray-400"><Icons.Globe /></span>
                  <select 
                      value={currentLang} 
                      onChange={(e) => onLangChange(e.target.value)}
                      className="border-none text-sm font-bold text-gray-600 bg-transparent focus:ring-0 cursor-pointer outline-none"
                  >
                      <option value="EN">English</option>
                      <option value="ID">Indonesia</option>
                      <option value="ZH_CN">简体中文</option>
                      <option value="ZH_TW">繁體中文</option>
                  </select>
              </div>

              <div className="hidden md:flex flex-col items-end mr-4 border-l pl-4 ml-4">
                 <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Your Referral Link</span>
                 <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">
                      {user.referralCode}
                    </span>
                    <button onClick={handleCopyReferral} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600 font-medium">
                      Copy
                    </button>
                 </div>
              </div>
              
              <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 flex items-center gap-3">
                 <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{t.frontline}</p>
                    <p className="text-sm font-bold text-slate-800">{networkStats.frontline}</p>
                 </div>
                 <div className="w-px h-8 bg-slate-200"></div>
                 <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">{t.totalGroup}</p>
                    <p className="text-sm font-bold text-blue-600">{networkStats.groupCount}</p>
                 </div>
              </div>
            </div>
          </div>
        </header>
        <div className="p-6 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
