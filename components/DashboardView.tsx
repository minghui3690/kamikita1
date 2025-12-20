import React from 'react';
import { User, SystemSettings, Announcement } from '../types';
import * as db from '../services/mockDatabase';
import { getNetworkStats, getDownlineDetails, getTransactions } from '../services/mockDatabase';
import { Icons } from '../constants';
import RecentActions from './RecentActions';

interface DashboardViewProps {
    currentUser: User;
    systemSettings: SystemSettings;
    t: any;
    isAdmin: boolean;
    editAnnounceId: string | null;
    setEditAnnounceId: (id: string | null) => void;
    tempAnnounceData: Partial<Announcement>;
    setTempAnnounceData: (data: Partial<Announcement>) => void;
    handleSaveAnnounce: () => void;
    currentLang: string;
}

const DashboardView: React.FC<DashboardViewProps> = ({ 
    currentUser, systemSettings, t, isAdmin, 
    editAnnounceId, setEditAnnounceId, tempAnnounceData, setTempAnnounceData, handleSaveAnnounce, currentLang 
}) => {
    const [stats, setStats] = React.useState<any>(null);

    React.useEffect(() => {
        const loadStats = async () => {
            try {
                // Determine if we need admin stats or user stats
                // Our API /users/stats handles both based on token role
                const data = await import('../services/transactionService').then(m => m.transactionApi.getStats());
                setStats(data);
            } catch (e) {
                console.error("Failed to load dashboard stats", e);
            }
        };
        loadStats();
    }, [currentUser.id]);

    const theme = systemSettings.branding?.theme || { cardBackground: '#ffffff', cardText: '#1f2937' };
    
    // Stats to display
    const totalPoints = stats?.totalPoints || currentUser.walletBalance;
    const withdrawalBalance = stats?.withdrawalBalance || 0;
    const lifetimeEarnings = stats?.lifetimeEarnings || 0;
    const totalSalesVolume = stats?.totalSalesVolume || 0;

    return (
        <div className="space-y-6">
              {/* STATS SECTION */}
              {isAdmin && stats?.isAdmin ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between bg-white">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Icons.Users /></div>
                             <span className="text-sm uppercase font-bold text-gray-400">Total Members</span>
                         </div>
                         <p className="text-2xl font-bold text-gray-800">{stats.totalMembers}</p>
                    </div>
                    <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between bg-white">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><Icons.Money /></div>
                             <span className="text-sm uppercase font-bold text-gray-400">Total Revenue</span>
                         </div>
                         <p className="text-2xl font-bold text-gray-800">Rp {stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between bg-white">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Icons.Product /></div>
                             <span className="text-sm uppercase font-bold text-gray-400">Products Sold</span>
                         </div>
                         <p className="text-2xl font-bold text-gray-800">{stats.itemsSold}</p>
                    </div>
                     <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between bg-white">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Icons.Wallet /></div>
                             <span className="text-sm uppercase font-bold text-gray-400">Pending Withdrawals</span>
                         </div>
                         <p className="text-2xl font-bold text-gray-800">{stats.pendingWithdrawals}</p>
                         {stats.pendingWithdrawals > 0 && <span className="text-xs text-orange-600 font-bold mt-1">Action Required</span>}
                    </div>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                       <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between" style={{ backgroundColor: theme.cardBackground, color: theme.cardText }}>
                           <div className="flex items-center gap-2">
                               <p className="text-sm uppercase font-bold tracking-wide opacity-70">{t.totalPoints}</p>
                               <span className="text-[10px] opacity-60">({t.pointRateInfo} {systemSettings.pointRate})</span>
                           </div>
                           <p className="text-2xl font-bold mt-2">{totalPoints.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                       </div>
                       <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between" style={{ backgroundColor: theme.cardBackground, color: theme.cardText }}>
                           <p className="text-sm uppercase font-bold tracking-wide opacity-70">{t.withdrawalBal}</p>
                           <p className="text-2xl font-bold mt-2">Rp {withdrawalBalance.toLocaleString('id-ID', {minimumFractionDigits: 2})}</p>
                       </div>
                       <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between" style={{ backgroundColor: theme.cardBackground, color: theme.cardText }}>
                           <p className="text-sm uppercase font-bold tracking-wide opacity-70">{t.lifetimeEarn}</p>
                           <p className="text-2xl font-bold mt-2">{lifetimeEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                       </div>
                       <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between" style={{ backgroundColor: theme.cardBackground, color: theme.cardText }}>
                           <p className="text-sm uppercase font-bold tracking-wide opacity-70">{t.totalSales}</p>
                           <p className="text-2xl font-bold mt-2">Rp {totalSalesVolume.toLocaleString('id-ID', {minimumFractionDigits: 2})}</p>
                       </div>

                       {/* MEMBERSHIP STATUS CARD */}
                       {currentUser.membershipExpiryDate && (
                           <div className="p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between" style={{ backgroundColor: theme.cardBackground, color: theme.cardText }}>
                               <p className="text-sm uppercase font-bold tracking-wide opacity-70">Membership Status</p>
                               {(() => {
                                   const now = new Date();
                                   const expiry = new Date(currentUser.membershipExpiryDate);
                                   const diff = expiry.getTime() - now.getTime();
                                   const daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
                                   
                                   if (daysLeft <= 0) {
                                       return (
                                           <div>
                                               <p className="text-2xl font-bold mt-2 text-red-500">EXPIRED</p>
                                               <p className="text-xs opacity-60">Renew now to access premium features</p>
                                           </div>
                                       );
                                   } else {
                                        return (
                                           <div>
                                               <p className="text-2xl font-bold mt-2 text-emerald-500">{daysLeft} Days Left</p>
                                               <p className="text-xs opacity-60">Active until {expiry.toLocaleDateString()}</p>
                                           </div>
                                       );
                                   }
                               })()}
                           </div>
                       )}
                  </div>
              )}
 
               <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Icons.Dashboard /> {t.news}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {systemSettings.announcements?.map((ann) => (
                          <div key={ann.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                              {editAnnounceId === ann.id ? (
                                  <div className="p-4 flex-1 flex flex-col space-y-3 bg-yellow-50">
                                      <input className="border p-2 rounded" value={tempAnnounceData.title} onChange={e => setTempAnnounceData({...tempAnnounceData, title: e.target.value})} />
                                      <input type="date" className="border p-2 rounded" value={tempAnnounceData.date ? new Date(tempAnnounceData.date).toISOString().split('T')[0] : ''} onChange={e => setTempAnnounceData({...tempAnnounceData, date: e.target.value})} />
                                      <textarea className="border p-2 rounded flex-1" value={tempAnnounceData.content} onChange={e => setTempAnnounceData({...tempAnnounceData, content: e.target.value})} />
                                      <div className="flex gap-2">
                                          <button onClick={handleSaveAnnounce} className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-bold">Save</button>
                                          <button onClick={() => setEditAnnounceId(null)} className="text-gray-500 text-sm">Cancel</button>
                                      </div>
                                  </div>
                              ) : (
                                  <>
                                      <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex justify-between items-start">
                                          <div>
                                              <h4 className="font-bold text-lg">{ann.title}</h4>
                                              <p className="text-xs text-slate-300 mt-1">{new Date(ann.date).toLocaleDateString()}</p>
                                          </div>
                                          {isAdmin && <button onClick={() => setEditAnnounceId(ann.id)} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">Edit</button>}
                                      </div>
                                      <div className="p-6 bg-white flex-1">
                                          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{ann.content}</p>
                                      </div>
                                  </>
                              )}
                          </div>
                      ))}
                  </div>
               </div>
  
               <RecentActions user={currentUser} currentLang={currentLang} />
               

               
               {!isAdmin && (
                   <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col items-center justify-center">
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Connect With Admin</p>
                       <div className="flex flex-wrap justify-center gap-4">
                          {systemSettings.landingPage.footer.socialMedia.facebook && (
                              <a href={systemSettings.landingPage.footer.socialMedia.facebook} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors"><Icons.Facebook /></a>
                          )}
                          {systemSettings.landingPage.footer.socialMedia.instagram && (
                              <a href={systemSettings.landingPage.footer.socialMedia.instagram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors"><Icons.Instagram /></a>
                          )}
                          {systemSettings.landingPage.footer.socialMedia.whatsapp && (
                              <a href={systemSettings.landingPage.footer.socialMedia.whatsapp} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-green-600 transition-colors"><Icons.WhatsApp /></a>
                          )}
                          {systemSettings.landingPage.footer.socialMedia.tiktok && (
                              <a href={systemSettings.landingPage.footer.socialMedia.tiktok} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black transition-colors"><Icons.TikTok /></a>
                          )}
                          {systemSettings.landingPage.footer.socialMedia.telegram && (
                              <a href={systemSettings.landingPage.footer.socialMedia.telegram} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors"><Icons.Telegram /></a>
                          )}
                       </div>
                   </div>
               )}
           </div>
    );
};

export default DashboardView;
