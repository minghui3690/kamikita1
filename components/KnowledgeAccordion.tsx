import React, { useState } from 'react';
import 'react-quill/dist/quill.bubble.css'; // Use bubble theme just for css reset if needed, or just standard styles

interface KnowledgeItem {
    key: string;
    title: string;
    category: string;
    contentLevel1?: string | null;
    contentLevel2?: string | null;
    contentLevel3?: string | null;
    contentLevel4?: string | null;
}

interface Props {
    label: string;
    value: string;
    item?: KnowledgeItem;
    className?: string;
    activeLevel?: number | null; // [NEW] Support for external filtering
    debugKey?: string; // [NEW] For debugging missing content
}

const KnowledgeAccordion: React.FC<Props> = ({ label, value, item, className, activeLevel, debugKey }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Auto-open if activeLevel is set and we have that content
    React.useEffect(() => {
        if (activeLevel && item) {
            const hasTargetLevel = item[`contentLevel${activeLevel}` as keyof KnowledgeItem];
            if (hasTargetLevel) setIsOpen(true);
        } else if (activeLevel === null) {
            // Optional: Close all when filter cleared? Or leave as is. User might want to keep reading.
            // Let's leave it as is to be less intrusive, or maybe just do nothing.
        }
    }, [activeLevel, item]);

    // If no knowledge content is available at all, just render plain text
    const hasContent = item && (item.contentLevel1 || item.contentLevel2 || item.contentLevel3 || item.contentLevel4);

    if (!hasContent) {
        return (
            <div className={`flex justify-between py-1 border-b border-dashed border-gray-200 text-xs items-start ${className}`}>
                <span className="text-gray-600 font-bold whitespace-nowrap mr-2">{label}:</span>
                <div className="text-right">
                    <span className="text-gray-900 font-medium break-words max-w-[60%]">{value}</span>
                    {debugKey && !item && <span className="block text-[9px] text-red-500 font-bold font-mono mt-0.5">(Missing Key: {debugKey})</span>}
                    {debugKey && item && !hasContent && <span className="block text-[9px] text-orange-500 font-bold font-mono mt-0.5">(Found but Empty/Locked)</span>}
                </div>
            </div>
        );
    }

    return (
        <div className={`border-b border-dashed border-gray-200 ${className} transition-all`}>
            {/* Header */}
            <div 
                onClick={() => setIsOpen(!isOpen)} 
                className={`flex justify-between py-1 text-xs items-start cursor-pointer hover:bg-purple-50 rounded px-1 -mx-1 ${isOpen ? 'bg-purple-50' : ''}`}
            >
                <div className="flex items-center gap-1">
                    <span className="text-gray-600 font-bold whitespace-nowrap mr-2">{label}:</span>
                    {isOpen && <span className="text-[10px] text-purple-600 font-bold">(Click to close)</span>}
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-purple-700 font-bold text-right break-words max-w-[60%] underline decoration-dotted">{value}</span>
                    <span className="text-[10px] text-gray-400 transform transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </div>
            </div>

            {/* Content Body */}
            {isOpen && (
                <div className="py-3 px-2 bg-gray-50 rounded-lg mt-1 mb-2 space-y-4 animate-fade-in-up border border-purple-100 shadow-sm">
                    {[1, 2, 3, 4]
                        .filter(level => !activeLevel || activeLevel === level) // Filter by activeLevel if set
                        .map(level => {
                            const content = item[`contentLevel${level}` as keyof KnowledgeItem];
                            if (!content) return null;
                            
                            return (
                                <div key={level} className="text-sm">
                                    {/* Level Badge */}
                                    <div className="mb-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-200 text-purple-800">
                                        {level === 1 && 'Level 1: Basic'}
                                        {level === 2 && 'Level 2: Deep Dive'}
                                        {level === 3 && 'Level 3: Advanced'}
                                        {level === 4 && 'Level 4: Expert'}
                                    </div>
                                    
                                    <div 
                                        className="prose prose-sm max-w-none text-gray-700"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                    />
                                </div>
                            );
                    })}
                    {/* Show message if activeLevel is set but no content for it */}
                    {activeLevel && !item[`contentLevel${activeLevel}` as keyof KnowledgeItem] && (
                        <div className="text-xs text-gray-400 italic text-center py-2">No content available for Level {activeLevel}</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default KnowledgeAccordion;
