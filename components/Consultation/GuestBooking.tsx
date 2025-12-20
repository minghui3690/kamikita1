import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { validateToken, getGuestSessions, bookSlot, rescheduleSlot, getSchedule } from '../../services/consultationService';
import { Icons } from '../../constants';
// Reusing some AdminSchedule logic or creating a simplified view

interface Slot {
    id: string;
    startTime: string;
    endTime: string;
    isBooked: boolean;
}

interface Session {
    id: string;
    slot: Slot;
    status: string;
    meetingLink?: string;
    clientNotes?: string;
    recordingUrl?: string;
    rescheduleCount: number;
}

interface CreditInfo {
    productName: string;
    totalQuota: number;
    usedQuota: number;
    ownerName: string;
}

const GuestBooking = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [credit, setCredit] = useState<CreditInfo | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
    
    const [view, setView] = useState<'cal' | 'my'>('cal'); // Calendar | My Sessions
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        if (!token) {
            setError('Missing consultation token.');
            setLoading(false);
            return;
        }
        init();
    }, [token]);

    const init = async () => {
        try {
            // 1. Validate Token & Get Info
            const validation = await validateToken(token!);
            if (!validation.credit) throw new Error(validation.message || 'Invalid token');
            
            setCredit({
                productName: validation.credit.productName,
                totalQuota: validation.credit.totalQuota,
                usedQuota: validation.credit.usedQuota,
                ownerName: validation.credit.user?.name || validation.credit.customer?.name || 'Guest'
            });

            // Set Slots from validation response
            if (validation.availableSlots) {
                setSlots(validation.availableSlots);
            }

            // 2. Load My Sessions
            const mySessions = await getGuestSessions(token!);
            setSessions(mySessions);

            setLoading(false);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to load booking details');
            setLoading(false);
        }
    };
    
    // Helper: Week Navigation
    const getWeekDays = (date: Date) => {
        const start = new Date(date);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));
        
        const week = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(monday);
            day.setDate(monday.getDate() + i);
            week.push(day);
        }
        return week;
    };

    const weekDays = getWeekDays(new Date(currentDate));

    const isSameDate = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() && 
               d1.getMonth() === d2.getMonth() && 
               d1.getFullYear() === d2.getFullYear();
    };

    const getSlotsForDay = (date: Date) => {
        return slots.filter(s => isSameDate(new Date(s.startTime), date));
    };

    const [rescheduleSessionId, setRescheduleSessionId] = useState<string | null>(null);

    const handleBook = async (slotId: string) => {
        const action = rescheduleSessionId ? 'Reschedule' : 'Book';
        if (!confirm(`${action} this slot?`)) return;
        
        try {
            if (rescheduleSessionId) {
                await rescheduleSlot(token!, rescheduleSessionId, slotId);
                alert('Reschedule Successful!');
                setRescheduleSessionId(null);
            } else {
                await bookSlot(token!, slotId);
                alert('Booking Successful!');
            }
            // Refresh
            init();
            setView('my');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Booking/Reschedule failed');
        }
    };

    const startReschedule = (sessionId: string) => {
        setRescheduleSessionId(sessionId);
        setView('cal');
        alert('Please select a new slot from the calendar.');
    };

    if (loading) return <div className="p-10 text-center">Loading booking details...</div>;
    if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;

    const remaining = (credit?.totalQuota || 0) - (credit?.usedQuota || 0);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-10 px-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white relative">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">Consultation Booking</h1>
                            <p className="opacity-90 text-lg">Hi, {credit?.ownerName}</p>
                            <div className="mt-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg inline-flex">
                                <Icons.Product />
                                <span className="font-bold">{credit?.productName}</span>
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="text-4xl font-bold">{remaining}</div>
                             <div className="text-sm opacity-80 uppercase font-bold tracking-wider">Sessions Left</div>
                        </div>
                    </div>
                    {rescheduleSessionId && (
                        <div className="bg-yellow-500 text-white p-2 text-center text-sm font-bold absolute bottom-0 w-full left-0">
                            Rescheduling Mode Active. Select a new slot. 
                            <button onClick={() => setRescheduleSessionId(null)} className="ml-2 underline">Cancel</button>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button 
                        onClick={() => setView('cal')}
                        className={`flex-1 py-4 font-bold text-center ${view === 'cal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        {rescheduleSessionId ? 'Reschedule Session' : 'Book a Session'}
                    </button>
                    <button 
                        onClick={() => setView('my')}
                        className={`flex-1 py-4 font-bold text-center ${view === 'my' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        My Sessions ({sessions.length})
                    </button>
                </div>

                <div className="p-8">
                    {view === 'cal' ? (
                       <div className="space-y-6">
                            {/* Calendar Controls */}
                            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <button 
                                    onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                                >
                                    <Icons.ArrowLeft />
                                </button>
                                <div className="text-center">
                                    <div className="text-lg font-bold text-gray-800">
                                        {weekDays[0].toLocaleDateString()} - {weekDays[6].toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Times shown in your local timezone</div>
                                </div>
                                <button 
                                    onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
                                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                                >
                                    <Icons.ArrowRight />
                                </button>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-7 gap-2">
                                {weekDays.map((day, idx) => (
                                    <div key={idx} className="flex flex-col gap-2">
                                        <div className={`p-3 text-center rounded-xl font-bold ${isSameDate(day, new Date()) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                            <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                            <div className="text-xl">{day.getDate()}</div>
                                        </div>
                                        
                                        <div className="bg-gray-50 min-h-[300px] rounded-xl p-2 space-y-2 border border-dashed border-gray-200">
                                            {getSlotsForDay(day).map(slot => (
                                                <button 
                                                    key={slot.id}
                                                    onClick={() => handleBook(slot.id)}
                                                    className="w-full text-left p-2 rounded-lg text-xs cursor-pointer border bg-white border-blue-200 text-blue-800 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    <div className="font-bold text-center">
                                                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </button>
                                            ))}
                                            {getSlotsForDay(day).length === 0 && (
                                                <div className="text-xs text-gray-400 text-center py-4">No slots</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                       </div>
                    ) : (
                        <div className="space-y-4">
                            {sessions.length === 0 && (
                                <div className="text-center text-gray-500 py-10">You haven't booked any sessions yet.</div>
                            )}
                            {sessions.map(s => (
                                <div key={s.id} className="border rounded-xl p-4 flex flex-col gap-4 hover:shadow-md transition-shadow bg-white">
                                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-100 text-blue-800 p-3 rounded-lg font-bold text-center min-w-[80px]">
                                                <div className="text-xs uppercase">{new Date(s.slot.startTime).toLocaleString('default', { month: 'short' })}</div>
                                                <div className="text-2xl">{new Date(s.slot.startTime).getDate()}</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg">
                                                    {new Date(s.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(s.slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-1 ${
                                                    s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    s.status === 'CANCELED' ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'
                                                }`}>
                                                    {s.status}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Notes Section */}
                                    {(s.clientNotes || s.recordingUrl) && (
                                        <div className="bg-blue-50/50 p-4 rounded-lg space-y-2 border border-blue-100">
                                            {s.clientNotes && (
                                                <div>
                                                    <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Session Notes</div>
                                                    <p className="text-sm text-gray-700 whitespace-pre-line">{s.clientNotes}</p>
                                                </div>
                                            )}
                                            {s.recordingUrl && (
                                                <div>
                                                     <div className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Recording</div>
                                                     <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-bold bg-white p-2 rounded border border-blue-200 w-fit">
                                                        <Icons.Play className="w-4 h-4" /> Watch Recording
                                                     </a>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-2 border-t">
                                        {s.status === 'SCHEDULED' && (
                                            <button 
                                                onClick={() => startReschedule(s.id)}
                                                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200"
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
        </div>
    );
};

export default GuestBooking;
