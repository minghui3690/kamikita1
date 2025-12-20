import React, { useState, useEffect } from 'react';
import { Icons } from "../../constants";

const MemberConsultation: React.FC = () => {
    const [consultations, setConsultations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConsultations();
    }, []);

    const fetchConsultations = async () => {
        try {
            const token = localStorage.getItem('rda_token');
            // Update port to 5001 to match server/index.ts
            const res = await fetch('http://localhost:5001/api/consultation/my-consultations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setConsultations(data);
            }
        } catch (error) {
            console.error('Failed to fetch', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenBooking = (magicLink: string) => {
        window.open(magicLink, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading consultations...</div>;

    if (consultations.length === 0) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-500">
                        <Icons.Calendar />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">No Active Consultations</h2>
                    <p className="text-gray-500 mb-6">
                        You haven't purchased any consultation packages yet. 
                        Visit the shop to get started with your expert consultation!
                    </p>
                    {/* Optional: Add Link to Shop */}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Icons.Calendar /> My Consultations
            </h1>

            {consultations.map((credit) => {
                const isFullyBooked = credit.usedQuota >= credit.totalQuota;
                
                return (
                    <div key={credit.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-50 flex justify-between items-start bg-gradient-to-r from-gray-50 to-white">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                                        isFullyBooked ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                                    }`}>
                                        {isFullyBooked ? 'Completed' : 'Active'}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono text-[10px]">ID: {credit.id.slice(0, 8)}</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Consultation Package</h3>
                                <p className="text-sm text-gray-500">
                                    {credit.usedQuota} / {credit.totalQuota} sessions used
                                </p>
                            </div>
                            
                            {!isFullyBooked && (
                                <button 
                                    onClick={() => handleOpenBooking(credit.magicLink)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-blue-200"
                                >
                                    <Icons.Calendar />
                                    Book Session
                                </button>
                            )}
                        </div>

                        {/* Sessions List */}
                        <div className="p-6">
                            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Session History</h4>
                            
                            {credit.sessions.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No sessions booked yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {credit.sessions.map((session: any) => (
                                        <div key={session.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className={`mt-1 w-2 h-2 rounded-full ${
                                                    session.status === 'COMPLETED' ? 'bg-green-500' :
                                                    session.status === 'SCHEDULED' ? 'bg-blue-500' : 
                                                    'bg-gray-400'
                                                }`} />
                                                <div>
                                                    <p className="font-bold text-gray-800">
                                                        {new Date(session.slot.startTime).toLocaleDateString('en-US', { 
                                                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                                                        })}
                                                    </p>
                                                    <p className="text-sm text-gray-600 font-medium">
                                                        {new Date(session.slot.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} 
                                                        {' - '}
                                                        {new Date(session.slot.endTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <div className="mt-1 flex items-center gap-2">
                                                        <span className="text-xs font-bold px-2 py-0.5 bg-white border border-gray-200 rounded text-gray-600">
                                                            {session.status}
                                                        </span>
                                                        {session.rescheduleCount > 0 && (
                                                            <span className="text-[10px] text-orange-500 font-medium">
                                                                Rescheduled {session.rescheduleCount}x
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action / Notes */}
                                            <div className="flex flex-col items-end gap-2">
                                                {session.clientNotes && (
                                                    <div className="text-sm bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100 max-w-xs">
                                                        <span className="font-bold text-xs block mb-1">Notes from Admin:</span>
                                                        {session.clientNotes}
                                                    </div>
                                                )}
                                                
                                                {session.status === 'SCHEDULED' && session.rescheduleCount < 1 && (
                                                    <button 
                                                        onClick={() => handleOpenBooking(credit.magicLink)}
                                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                                    >
                                                        Reschedule
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MemberConsultation;
