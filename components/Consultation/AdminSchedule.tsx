import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getSchedule, createSlots, updateSessionNotes, updateSessionStatus, sendReminder, adminReschedule } from '../../services/consultationService';
import * as userService from '../../services/userService';
import { Icons } from '../../constants';

interface ConsultationSlot {
    id: string;
    startTime: string; // ISO
    endTime: string;
    isBooked: boolean;
    session?: {
        id: string;
        status: string;
        adminNotes?: string;
        clientNotes?: string;
        recordingUrl?: string;
        credit: {
            user?: { name: string; email: string };
            customer?: { name: string; email: string };
            productName: string;
        }
    }
}

const AdminSchedule = () => {
    const [slots, setSlots] = useState<ConsultationSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date()); // View reference date
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Add Slot State
    const [addDate, setAddDate] = useState('');
    const [addStartTime, setAddStartTime] = useState('');
    const [addEndTime, setAddEndTime] = useState('');

    // Details Modal
    const [selectedSlot, setSelectedSlot] = useState<ConsultationSlot | null>(null);
    const [notesForm, setNotesForm] = useState({ adminNotes: '', clientNotes: '', recordingUrl: '' });
    
    // New Feature States
    const [isRescheduling, setIsRescheduling] = useState(false);

    const navigate = useNavigate();

    const location = useLocation();

    useEffect(() => {
        loadSchedule();
        if (location.state && (location.state as any).view) {
             setView((location.state as any).view);
        }
    }, [location.state]);

    const loadSchedule = async () => {
        try {
            const data = await getSchedule();
            setSlots(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSlot = async () => {
        if (!addDate || !addStartTime || !addEndTime) return alert('Please fill all fields');
        
        try {
            const start = new Date(`${addDate}T${addStartTime}`);
            const end = new Date(`${addDate}T${addEndTime}`);
            
            await createSlots([{ startTime: start, endTime: end }]);
            setShowAddModal(false);
            loadSchedule();
            alert('Slot created!');
        } catch (error: any) {
            console.error(error);
            const msg = error.response?.data?.details || error.response?.data?.message || error.message;
            alert(`Failed to create slot: ${msg}`);
        }
    };

    const handleUpdateNotes = async () => {
        if (!selectedSlot?.session) return;
        try {
            await updateSessionNotes(selectedSlot.session.id, notesForm);
            alert('Notes updated!');
            setSelectedSlot(null);
            loadSchedule();
        } catch (error) {
            alert('Failed to update notes');
        }
    };

    const handleStatusUpdate = async (status: string) => {
        if (!selectedSlot?.session) return;
        if (!confirm(`Mark session as ${status}?`)) return;
        try {
            await updateSessionStatus(selectedSlot.session.id, status);
            alert('Status updated!');
            setSelectedSlot(null);
            loadSchedule();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleSendReminder = async () => {
        if (!selectedSlot?.session) return;
        try {
            await sendReminder(selectedSlot.session.id);
            alert('Reminder sent (check server logs for mock content)');
        } catch (error) {
            alert('Failed to send reminder');
        }
    };

    const handleReschedule = async (newSlotId: string) => {
        if (!selectedSlot?.session) return;
        if (!confirm('Confirm reschedule to this slot?')) return;
        try {
            await adminReschedule(selectedSlot.session.id, newSlotId);
            alert('Session rescheduled!');
            setIsRescheduling(false);
            setSelectedSlot(null);
            loadSchedule();
        } catch (error) {
            alert('Reschedule failed');
        }
    };


    // Helper: Week Navigation
    const getWeekDays = (date: Date) => {
        const start = new Date(date);
        start.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)); // Adjust to Monday start
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        
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

    // Clients/Credits State
    const [view, setView] = useState<'schedule' | 'clients' | 'notes'>('schedule');
    const [credits, setCredits] = useState<any[]>([]);

    useEffect(() => {
        if (view === 'schedule') loadSchedule();
        if (view === 'clients') loadCredits();
        if (view === 'notes') loadSchedule(); // Re-use schedule data to extract sessions
    }, [view]);

    const loadCredits = async () => {
        try {
            // @ts-ignore
            const { getCredits } = await import('../../services/consultationService');
            const data = await getCredits();
            setCredits(data);
        } catch (error) {
            console.error(error);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Magic Link Copied!');
    };

    const handleManageAccess = (credit: any) => {
        if (credit.userId) {
            navigate('/members', { state: { openPurchasesFor: credit.userId } });
        } else if (credit.customerId) {
            navigate('/customers', { state: { openEmailFor: credit.customerId } });
        } else {
             alert('No user associated with this credit.');
        }
    };

    // Helper to get flattened sessions for Notes view
    const getAllSessions = () => {
        return slots
            .filter(slot => slot.session)
            .map(slot => ({
                ...slot.session!,
                slotDate: slot.startTime,
                slotId: slot.id
            }))
            .sort((a, b) => new Date(b.slotDate).getTime() - new Date(a.slotDate).getTime());
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Consultation Management</h2>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setView('schedule')}
                        className={`px-4 py-2 rounded-md font-bold text-sm ${view === 'schedule' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Schedule
                    </button>
                    <button 
                        onClick={() => setView('clients')}
                        className={`px-4 py-2 rounded-md font-bold text-sm ${view === 'clients' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Clients & Links
                    </button>
                    <button 
                        onClick={() => setView('notes')}
                        className={`px-4 py-2 rounded-md font-bold text-sm ${view === 'notes' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}
                    >
                        Session Notes & History
                    </button>
                </div>
            </div>

            {view === 'notes' ? (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Date/Time</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Client</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Admin Notes</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {getAllSessions().map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/50">
                                        <td className="p-4 text-sm">
                                            <div className="font-bold text-gray-800">
                                                {new Date(s.slotDate).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(s.slotDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold text-gray-700">
                                                {s.credit.user?.name || s.credit.customer?.name}
                                            </div>
                                            <div className="text-xs text-gray-500">{s.credit.productName}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                s.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                s.status === 'CANCELED' ? 'bg-red-100 text-red-700' :
                                                s.status === 'RESCHEDULED' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 max-w-xs truncate">
                                            {s.adminNotes || <i className="text-gray-300">No notes</i>}
                                        </td>
                                        <td className="p-4">
                                            <button 
                                                onClick={() => {
                                                    const slot = slots.find(sl => sl.id === s.slotId);
                                                    if (slot) {
                                                        setSelectedSlot(slot);
                                                        setNotesForm({
                                                            adminNotes: s.adminNotes || '',
                                                            clientNotes: s.clientNotes || '',
                                                            recordingUrl: s.recordingUrl || ''
                                                        });
                                                    }
                                                }}
                                                className="px-3 py-1 bg-blue-50 text-blue-600 font-bold rounded text-xs hover:bg-blue-100 border border-blue-200"
                                            >
                                                Manage
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {getAllSessions().length === 0 && (
                                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">No sessions recorded yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                 </div>
            ) : view === 'clients' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr key="header-row">
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Client</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Product</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Quota</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase">Magic Link</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {credits.map((c) => (
                                    <tr key={c.id}>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{c.user?.name || c.customer?.name || 'Guest'}</div>
                                            <div className="text-xs text-gray-500">{c.user?.email || c.customer?.email}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{c.productName}</td>
                                        <td className="p-4">
                                            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {c.usedQuota} / {c.totalQuota} Used
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <input readOnly value={c.magicLink} className="text-xs border rounded p-1 w-40 text-gray-500 bg-gray-50" />
                                                <button onClick={() => copyToClipboard(c.magicLink)} className="text-blue-600 hover:text-blue-800 font-bold text-xs">
                                                    Copy
                                                </button>
                                                <button 
                                                    onClick={() => handleManageAccess(c)}
                                                    className="ml-2 bg-purple-100 hover:bg-purple-200 text-purple-700 font-bold px-2 py-1 rounded text-xs flex items-center gap-1"
                                                    title="Manage Files/Access"
                                                >
                                                    <Icons.Upload className="w-3 h-3" /> Upload
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {credits.length === 0 && (
                                    <tr><td colSpan={4} className="p-8 text-center text-gray-400">No active clients found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                <div className="flex justify-end mb-4">
                     <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <Icons.Plus className="w-5 h-5" /> Add Slot
                    </button>
                </div>

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
                        
                        <div className="bg-gray-50 min-h-[400px] rounded-xl p-2 space-y-2 border border-dashed border-gray-200">
                            {getSlotsForDay(day).map(slot => (
                                <div 
                                    key={slot.id}
                                    onClick={() => {
                                        setSelectedSlot(slot);
                                        if (slot.session) {
                                            setNotesForm({
                                                adminNotes: slot.session.adminNotes || '',
                                                clientNotes: slot.session.clientNotes || '',
                                                recordingUrl: slot.session.recordingUrl || ''
                                            });
                                        }
                                    }}
                                    className={`p-2 rounded-lg text-xs cursor-pointer border hover:shadow-md transition-all ${
                                        slot.isBooked 
                                        ? 'bg-emerald-100 border-emerald-200 text-emerald-800' 
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                                    }`}
                                >
                                    <div className="font-bold">
                                        {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="truncate">
                                        {slot.isBooked 
                                            ? slot.session?.credit.user?.name || slot.session?.credit.customer?.name || 'Booked'
                                            : 'Available'
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            </>
            )}

            {/* Add Slot Modal - MOVED OUTSIDE CONDITIONAL */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-4">
                        <h3 className="text-lg font-bold">Add Consultation Slot</h3>
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Date</label>
                            <input 
                                type="date" 
                                value={addDate}
                                onChange={e => setAddDate(e.target.value)}
                                className="w-full border rounded p-2"
                            />
                        </div>
                        <div className="flex gap-2">
                             <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Start Time</label>
                                <input 
                                    type="time" 
                                    value={addStartTime}
                                    onChange={e => setAddStartTime(e.target.value)}
                                    className="w-full border rounded p-2"
                                />
                             </div>
                             <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 mb-1">End Time</label>
                                <input 
                                    type="time" 
                                    value={addEndTime}
                                    onChange={e => setAddEndTime(e.target.value)}
                                    className="w-full border rounded p-2"
                                />
                             </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-gray-500">Cancel</button>
                            <button onClick={handleCreateSlot} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail / Notes Modal - MOVED OUTSIDE CONDITIONAL */}
            {selectedSlot && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
  <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Session Details</h3>
                            <button onClick={() => setSelectedSlot(null)}><Icons.X /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                                <div>
                                    <div className="text-xs text-gray-500">Time Slot (Local)</div>
                                    <div className="font-bold text-blue-800">
                                        {new Date(selectedSlot.startTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${selectedSlot.isBooked ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                                    {selectedSlot.isBooked ? 'BOOKED' : 'AVAILABLE'}
                                </div>
                            </div>

                            {selectedSlot.isBooked && selectedSlot.session ? (
                                <>
                                    {isRescheduling ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-bold">Select New Slot</h4>
                                                <button onClick={() => setIsRescheduling(false)} className="text-gray-500 text-sm">Cancel</button>
                                            </div>
                                            <div className="max-h-60 overflow-y-auto space-y-2">
                                                {slots.filter(s => !s.isBooked && new Date(s.startTime) > new Date()).map(s => (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => handleReschedule(s.id)}
                                                        className="p-3 border rounded hover:bg-blue-50 cursor-pointer flex justify-between"
                                                    >
                                                        <span className="font-bold text-gray-700">
                                                            {new Date(s.startTime).toLocaleString()}
                                                        </span>
                                                        <span className="text-blue-600 text-xs font-bold">Select</span>
                                                    </div>
                                                ))}
                                                {slots.filter(s => !s.isBooked && new Date(s.startTime) > new Date()).length === 0 && (
                                                    <p className="text-gray-500 text-sm">No future slots available. Create new slots first.</p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-4 bg-gray-50 p-3 rounded">
                                                <div>
                                                    <h4 className="font-bold text-lg">{selectedSlot.session.status}</h4>
                                                    <p className="text-xs text-gray-500">Session Status</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {selectedSlot.session.status !== 'COMPLETED' && (
                                                        <button 
                                                            onClick={handleSendReminder}
                                                            className="p-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                                            title="Send Email Reminder"
                                                        >
                                                            <Icons.Envelope className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => setIsRescheduling(true)}
                                                        className="p-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                                        title="Reschedule"
                                                    >
                                                        <Icons.Ticket className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                    
                                            {/* Existing Client Info Grids... */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500">Client Name</label>
                                                    <div className="text-sm font-medium">
                                                        {selectedSlot.session.credit.user?.name || selectedSlot.session.credit.customer?.name}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-gray-500">Email</label>
                                                    <div className="text-sm font-medium">
                                                        {selectedSlot.session.credit.user?.email || selectedSlot.session.credit.customer?.email}
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-xs font-bold text-gray-500">Product</label>
                                                    <div className="text-sm font-medium">{selectedSlot.session.credit.productName}</div>
                                                </div>
                                            </div>

                                            <hr className="border-gray-100 my-4" />

                                            {/* Notes Sections */}
                                            <div className="space-y-3">
                                                <h4 className="font-bold flex items-center gap-2"><Icons.FileText className="w-4 h-4" /> Session Notes</h4>
                                                
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Recording URL (Zoom/Meet)</label>
                                                    <input 
                                                        type="text" 
                                                        value={notesForm.recordingUrl}
                                                        onChange={e => setNotesForm({...notesForm, recordingUrl: e.target.value})}
                                                        placeholder="https://..."
                                                        className="w-full border rounded p-2 text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Public Notes (Client Sees This)</label>
                                                    <textarea 
                                                        rows={3}
                                                        value={notesForm.clientNotes}
                                                        onChange={e => setNotesForm({...notesForm, clientNotes: e.target.value})}
                                                        placeholder="Summary, Key Takeaways, Homework..."
                                                        className="w-full border rounded p-2 text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">Private Admin Notes</label>
                                                    <textarea 
                                                        rows={3}
                                                        value={notesForm.adminNotes}
                                                        onChange={e => setNotesForm({...notesForm, adminNotes: e.target.value})}
                                                        placeholder="Internal notes..."
                                                        className="w-full border rounded p-2 text-sm bg-yellow-50"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-400 italic">
                                    This slot is empty. Correct details will appear once booked.
                                </div>
                            )}
                        </div>

                        {selectedSlot.isBooked && !isRescheduling && (
                            <div className="p-4 border-t bg-gray-50 flex justify-between">
                                <div className="flex gap-2">
                                    {selectedSlot.session?.status !== 'COMPLETED' ? (
                                        <button 
                                            onClick={() => handleStatusUpdate('COMPLETED')}
                                            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 text-sm"
                                        >
                                            Mark Done
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleStatusUpdate('SCHEDULED')} // Revert?
                                            className="px-4 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600 text-sm"
                                        >
                                            Re-open
                                        </button>
                                    )}
                                    {selectedSlot.session?.status !== 'CANCELED' && (
                                         <button 
                                            onClick={() => handleStatusUpdate('CANCELED')}
                                            className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg hover:bg-red-200 text-sm"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                <button 
                                    onClick={handleUpdateNotes}
                                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm"
                                >
                                    Save Notes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default AdminSchedule;
