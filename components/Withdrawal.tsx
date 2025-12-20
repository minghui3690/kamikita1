
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { walletApi } from '../services/walletService';
import { User, UserRole, WithdrawalRequest, ManualPaymentMethod, SystemSettings } from '../types';
import { Icons } from '../constants';
import CommissionTable from './CommissionTable';

interface WithdrawalProps {
  user: User;
  onRefresh: () => void;
  systemSettings?: SystemSettings;
}

const Withdrawal: React.FC<WithdrawalProps> = ({ user, onRefresh, systemSettings }) => {
  const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.MANAGER;
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);

  // Admin Processing State
  const [processingRequest, setProcessingRequest] = useState<WithdrawalRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState<string>('');
  const [proofLink, setProofLink] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');
  
  // Member Viewing State
  const [viewProof, setViewProof] = useState<WithdrawalRequest | null>(null);

  // Member State
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<ManualPaymentMethod | null>(null);

  // Admin Commission View State
  const [showAdminCommissions, setShowAdminCommissions] = useState(false);

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRequestWithdrawal = async () => {
      if (!selectedMethod || !requestAmount) return;
      try {
          // Construct bank details string from Selected Method
          const details = `${selectedMethod.name} - ${selectedMethod.accountNumber} (${selectedMethod.accountName || user.name})`;
          
          await walletApi.requestWithdrawal(Number(requestAmount), details);
          alert('Withdrawal requested successfully!');
          setRequestAmount('');
          setSelectedMethod(null);
          loadData();
          onRefresh && onRefresh();
      } catch (e: any) {
          alert('Failed: ' + (e.response?.data?.message || e.message));
      }
  };

  const loadData = async () => {
    try {
        // As Admin, walletApi.getWithdrawals returns ALL (via backend)
        const data = await walletApi.getWithdrawals();
        setWithdrawals(data);
    } catch(e) {
        console.error("Failed to load withdrawals", e);
    }
  };

  const openApproveModal = (req: WithdrawalRequest) => {
      setProcessingRequest(req);
      setProofImage('');
      setProofLink('');
  };

  const openRejectModal = (id: string) => {
      setRejectingId(id);
      setProofImage('');
      setProofLink('');
      setRejectReason('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (x) => {
              if(x.target?.result) setProofImage(x.target.result as string);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const confirmApproval = async () => {
    if (processingRequest) {
        try {
            await walletApi.updateWithdrawalStatus(processingRequest.id, 'APPROVED', proofImage, proofLink);
            loadData();
            setProcessingRequest(null);
            onRefresh && onRefresh();
        } catch(e) {
            alert('Error approving');
        }
    }
  };

  const confirmRejection = async () => {
      if (rejectingId) {
          if (!rejectReason) {
              alert('Please provide a rejection reason.');
              return;
          }
          try {
              await walletApi.updateWithdrawalStatus(rejectingId, 'REJECTED', proofImage, proofLink, rejectReason);
              loadData();
              setRejectingId(null);
              onRefresh && onRefresh();
          } catch(e) {
              alert('Error rejecting');
          }
      }
  };

  if (isAdmin) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800 text-lg">Withdrawal Requests</h3>
            <button 
                onClick={() => setShowAdminCommissions(true)}
                className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold border border-blue-200 flex items-center gap-2"
            >
                <Icons.Money /> Commissions
            </button>
        </div>

        <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Bank Details</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {withdrawals.map(w => (
                <tr key={w.id}>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(w.requestDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm font-medium">{w.userName}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[150px] truncate">{w.bankDetails}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">Rp {w.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded font-bold ${w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {w.status === 'PENDING' ? (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => openApproveModal(w)} className="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs border border-green-200 font-bold">Approve</button>
                        <button onClick={() => openRejectModal(w.id)} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs border border-red-200 font-bold">Reject</button>
                      </div>
                    ) : (
                       <button onClick={() => setViewProof(w)} className="text-blue-600 hover:underline text-xs">View Details</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
        </table>

        {/* Approval Modal */}
        {processingRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                    <h3 className="font-bold text-lg mb-4 text-green-700">
                        {processingRequest.status === 'APPROVED' ? 'Update Proof' : 'Approve Withdrawal'}
                    </h3>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100 mb-4">
                        <p className="text-xs text-green-800 font-bold uppercase mb-1">Transfer Destination</p>
                        <p className="text-lg font-bold text-gray-800">{processingRequest.bankDetails}</p>
                        <div className="flex justify-between items-end mt-2">
                             <div>
                                 <p className="text-xs text-gray-500">Amount to Transfer</p>
                                 <p className="text-xl font-extrabold text-green-700">Rp {processingRequest.amount.toLocaleString()}</p>
                             </div>
                             <button 
                                onClick={() => navigator.clipboard.writeText(processingRequest.bankDetails)}
                                className="text-xs bg-white border border-green-200 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                             >
                                 Copy Details
                             </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Upload Proof (Image)</label>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="w-full text-sm" />
                            {proofImage && <img src={proofImage} alt="Preview" className="mt-2 h-20 object-cover rounded border" />}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">External Link (Optional)</label>
                            <input 
                                value={proofLink} 
                                onChange={e => setProofLink(e.target.value)} 
                                placeholder="https://..." 
                                className="w-full border p-2 rounded text-sm" 
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setProcessingRequest(null)} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
                        <button onClick={confirmApproval} className="px-4 py-2 bg-green-600 text-white rounded text-sm font-bold">
                            {processingRequest.status === 'APPROVED' ? 'Save Changes' : 'Confirm Transfer'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Rejection Modal exists... */}
        {rejectingId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
                    <h3 className="font-bold text-lg mb-4 text-red-700">Reject Withdrawal</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">Rejection Reason</label>
                            <textarea 
                                value={rejectReason} 
                                onChange={e => setRejectReason(e.target.value)} 
                                placeholder="Explain why this request is rejected..." 
                                className="w-full border p-2 rounded text-sm h-24" 
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Attach Image (Optional)</label>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="w-full text-sm" />
                            {proofImage && <img src={proofImage} alt="Preview" className="mt-2 h-20 object-cover rounded border" />}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Reference Link (Optional)</label>
                            <input 
                                value={proofLink} 
                                onChange={e => setProofLink(e.target.value)} 
                                placeholder="https://..." 
                                className="w-full border p-2 rounded text-sm" 
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                        <button onClick={() => setRejectingId(null)} className="px-4 py-2 text-gray-600 text-sm">Cancel</button>
                        <button onClick={confirmRejection} className="px-4 py-2 bg-red-600 text-white rounded text-sm font-bold">Confirm Reject</button>
                    </div>
                </div>
            </div>
        )}

        {/* View Details Modal Admin Side */}
        {viewProof && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setViewProof(null)}>
                 <div className="bg-white rounded-xl p-6 max-w-lg w-full relative" onClick={e => e.stopPropagation()}>
                     <button onClick={() => setViewProof(null)} className="absolute top-4 right-4"><Icons.X /></button>
                     <h3 className="font-bold mb-4">Request Details</h3>
                     <div className="space-y-4">
                         {viewProof.status === 'REJECTED' && (
                             <div className="bg-red-50 p-3 rounded border border-red-100">
                                 <p className="text-xs font-bold text-red-800">Rejection Reason:</p>
                                 <p className="text-sm">{viewProof.rejectionReason || 'No reason provided'}</p>
                             </div>
                         )}
                         {viewProof.adminProofImage ? (
                             <img src={viewProof.adminProofImage} className="w-full rounded mb-4 max-h-[300px] object-contain bg-gray-50" />
                         ) : (
                             <p className="text-gray-500 italic mb-4">No image uploaded.</p>
                         )}
                         {viewProof.adminProofLink && (
                             <a href={viewProof.adminProofLink} target="_blank" rel="noreferrer" className="text-blue-600 underline block break-all mb-4">
                                 {viewProof.adminProofLink}
                             </a>
                         )}
                         
                         {/* Edit Proof Button for Approved Requests */}
                         {viewProof.status === 'APPROVED' && (
                             <div className="pt-4 border-t border-gray-100 flex justify-end">
                                 <button 
                                    onClick={() => {
                                        setProcessingRequest(viewProof);
                                        setProofImage(viewProof.adminProofImage || '');
                                        setProofLink(viewProof.adminProofLink || '');
                                        setViewProof(null); // Close view modal
                                    }}
                                    className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold hover:bg-black transition-colors"
                                 >
                                     <Icons.Edit /> Edit / Re-upload Proof
                                 </button>
                             </div>
                         )}
                     </div>
                 </div>
             </div>
        )}

        {/* Admin Commission View Modal */}
        {showAdminCommissions && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowAdminCommissions(false)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white sticky top-0 z-10">
                        <h3 className="font-bold text-lg">Admin Commissions & Wallet</h3>
                        <button onClick={() => setShowAdminCommissions(false)}><Icons.X /></button>
                    </div>
                    <div className="p-6">
                        <CommissionTable user={user} systemSettings={systemSettings} />
                    </div>
                </div>
            </div>
        )}
      </div>
    );
  }

  // MEMBER VIEW
  const myWithdrawals = withdrawals.filter(w => w.userId === user.id).sort((a,b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  const totalWithdrawn = myWithdrawals.filter(w => w.status === 'APPROVED').reduce((sum, w) => sum + w.amount, 0);
  const pendingAmount = myWithdrawals.filter(w => w.status === 'PENDING').reduce((sum, w) => sum + w.amount, 0);

  return (
    <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Available Balance</h3>
                        <p className="text-2xl font-bold text-gray-800">Rp {user.walletBalance.toLocaleString()}</p>
                    </div>
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Icons.Wallet /></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Total Withdrawn</h3>
                        <p className="text-2xl font-bold text-green-600">Rp {totalWithdrawn.toLocaleString()}</p>
                    </div>
                     <div className="p-2 bg-green-50 rounded-lg text-green-600"><Icons.Check /></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase mb-1">Pending Request</h3>
                        <p className="text-2xl font-bold text-yellow-600">Rp {pendingAmount.toLocaleString()}</p>
                    </div>
                     <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600"><Icons.Refresh /></div>
                </div>
            </div>
        </div>

        {/* Request Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
                 <h3 className="font-bold text-gray-800 text-lg">Request Withdrawal</h3>
                 <button onClick={() => window.location.href='/profile'} className="text-xs text-blue-600 font-bold hover:underline">Manage Methods</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Withdrawal Destination</label>
                    {user.kyc.withdrawalMethods && user.kyc.withdrawalMethods.length > 0 ? (
                        <div className="space-y-2">
                             {user.kyc.withdrawalMethods.map((m, i) => (
                                 <div 
                                    key={i} 
                                    onClick={() => setSelectedMethod(m)}
                                    className={`border rounded-xl p-3 cursor-pointer transition-all flex items-center justify-between ${selectedMethod?.id === m.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'}`}
                                 >
                                     <div className="flex items-center gap-3">
                                         <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${m.type === 'BANK' ? 'bg-purple-100 text-purple-600' : 'bg-green-100 text-green-600'}`}>
                                             {m.type === 'BANK' ? 'B' : 'E'}
                                         </div>
                                         <div>
                                             <p className="font-bold text-sm text-gray-800">{m.name}</p>
                                             <p className="text-xs text-gray-500">{m.accountNumber}</p>
                                         </div>
                                     </div>
                                     {selectedMethod?.id === m.id && <div className="text-blue-600"><Icons.Check /></div>}
                                 </div>
                             ))}
                        </div>
                    ) : (
                        <div className="text-center p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                            <Icons.Ban />
                            <p className="text-sm text-gray-500 mt-2">No withdrawal methods found.</p>
                            <button onClick={() => window.location.href='/profile'} className="text-blue-600 font-bold text-sm mt-2 hover:underline">Add Method in Profile</button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Amount to Withdraw</label>
                    <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500 font-bold">Rp</span>
                        <input 
                            type="number" 
                            value={requestAmount} 
                            onChange={e => setRequestAmount(e.target.value)} 
                            className="w-full border p-3 pl-10 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                            placeholder="0" 
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Minimum withdrawal Rp 50.000 (Example)</p>
                    
                    <button 
                        onClick={handleRequestWithdrawal}
                        disabled={!selectedMethod || !requestAmount || Number(requestAmount) <= 0}
                        className="w-full mt-6 bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Submit Request
                    </button>
                </div>
            </div>
        </div>

        {/* History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4">My Request History</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Details</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3">Note</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {myWithdrawals.length > 0 ? myWithdrawals.map(w => (
                            <tr key={w.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-500">{new Date(w.requestDate).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-xs text-gray-600">{w.bankDetails}</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-800">Rp {w.amount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${w.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : w.status === 'APPROVED' ? 'bg-green-100 text-green-700' : w.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-red-700'}`}>
                                        {w.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    {w.status === 'PENDING' && (
                                        <button 
                                            onClick={async () => {
                                                if(!confirm('Cancel this request?')) return;
                                                try {
                                                    await walletApi.cancelWithdrawal(w.id);
                                                    loadData();
                                                    onRefresh && onRefresh();
                                                } catch(err: any) {
                                                    alert('Failed: ' + (err.response?.data?.message || err.message));
                                                }
                                            }}
                                            className="text-red-500 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    {w.rejectionReason && <span className="text-red-600">{w.rejectionReason}</span>}
                                    {w.adminProofImage && <a href={w.adminProofImage} target="_blank" rel="noreferrer" className="text-blue-600 underline ml-2">Proof</a>}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-400 italic">No withdrawal history found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Withdrawal;
