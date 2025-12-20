
import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { getUsers } from '../services/userService'; // Reuse existing service
import api from '../services/api';
import { User, UserRole } from '../types';

interface Message {
    role: 'user' | 'model';
    content: string;
}

interface Member {
    id: string;
    name: string;
    email: string;
    role: string;
    humanDesign?: any; 
}

interface HDChatAssistantProps {
    currentUser?: User;
}

const HDChatAssistant: React.FC<HDChatAssistantProps> = ({ currentUser }) => {
    // State
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMemberId, setSelectedMemberId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // [NEW] Expiry Check
    if (currentUser?.membershipExpiryDate) {
        const now = new Date();
        const expiry = new Date(currentUser.membershipExpiryDate);
        if (now > expiry) {
             return (
                <div className="flex h-[calc(100vh-6rem)] items-center justify-center bg-white rounded-xl shadow-lg border border-gray-200">
                    <div className="text-center p-8">
                        <div className="text-red-500 text-6xl flex justify-center mb-4"><Icons.Lock /></div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Membership Expired</h2>
                        <p className="text-gray-500">Please renew your membership to access the AI Consultant.</p>
                    </div>
                </div>
            );
        }
    }

    // Initial Load
    useEffect(() => {
        loadMembers();
    }, [currentUser]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadMembers = async () => {
        const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.MANAGER;

        if (isAdmin) {
            try {
                const data = await getUsers();
                setMembers(data);
                if (data.length > 0) setSelectedMemberId(data[0].id);
            } catch (error) {
                console.error('Failed to load members', error);
            }
        } else if (currentUser) {
            // Member Mode: Chat about self
            const selfMember: Member = {
                id: currentUser.id,
                name: currentUser.name,
                email: currentUser.email,
                role: currentUser.role,
                humanDesign: (currentUser as any).humanDesign || null 
            };
            setMembers([selfMember]);
            setSelectedMemberId(currentUser.id);
            setIsSidebarOpen(false); // Default closed for single user
        }
    };

    const handleSend = async () => {
        if (!input.trim() || !selectedMemberId) return;

        const newUserMsg: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Include history? For now, we send the whole history for context if needed, 
            // but the backend controller might just take the last one or whole array.
            // Our backend controller in implementation plan was designed to take 'messages' array.
            
            const payloadMessages = [...messages, newUserMsg];

            const response = await api.post('/chat/ask', {
                memberId: selectedMemberId,
                messages: payloadMessages
            });

            const botMsg: Message = { role: 'model', content: response.data.response };
            setMessages(prev => [...prev, botMsg]);

        } catch (error: any) {
            console.error(error);
            const errorMsg: Message = { 
                role: 'model', 
                content: error.response?.data?.message 
                    ? `⚠️ Error: ${error.response.data.message}`
                    : "⚠️ I'm sorry, I encountered an error. Please try again."
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const selectedMember = members.find(m => m.id === selectedMemberId);

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Sidebar (Member Selector) */}
            <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} bg-gray-50 border-r border-gray-200 transition-all duration-300 flex flex-col overflow-hidden`}>
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <Icons.User className="w-5 h-5 text-blue-600" />
                        Select Client
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Chat context will be based on their HD Chart.</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {members.map(m => (
                        <button
                            key={m.id}
                            onClick={() => { setSelectedMemberId(m.id); setMessages([]); }} // Clear chat on switch
                            className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                                selectedMemberId === m.id ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${selectedMemberId === m.id ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                {m.name.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold truncate">{m.name}</p>
                                <p className="text-[10px] text-gray-500 truncate">{m.role}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Header */}
                <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                        >
                            {isSidebarOpen ? <Icons.ArrowLeft className="w-5 h-5" /> : <Icons.Menu className="w-5 h-5" />}
                        </button>
                        
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <span className="text-2xl">🤖</span> 
                                AI Human Design Consultant
                            </h2>
                            {selectedMember && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Context: {selectedMember.name}'s Chart
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
                            <Icons.MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Select a client and ask a question.</p>
                            <p className="text-sm">"How should I communicate with them?"</p>
                        </div>
                    ) : (
                        messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                                    msg.role === 'user' 
                                        ? 'bg-blue-600 text-white rounded-br-none' 
                                        : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                                }`}>
                                    <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                                        {/* Simple formatting for bold text if AI returns markdown-ish bold */}
                                        {msg.role === 'model' ? (
                                            msg.content.split('**').map((part, i) => 
                                                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                                            )
                                        ) : msg.content}
                                    </div>
                                    <p className={`text-[10px] mt-2 text-right ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {msg.role === 'user' ? 'You' : 'AI Consultant'}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-3 max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder={selectedMember ? `Ask about ${selectedMember.name}...` : "Select a member first..."}
                            disabled={!selectedMember || isLoading}
                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || !selectedMember || isLoading}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/30"
                        >
                            <Icons.Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-gray-400 mt-2">
                        AI can make mistakes. Please verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HDChatAssistant;
