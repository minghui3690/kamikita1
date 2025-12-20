
import React, { useState, useEffect } from 'react';
import { User, HumanDesignProfile, HDCenters } from '../types';
import * as userService from '../services/userService';
import * as hdService from '../services/hdService';
import { Icons } from '../constants';
import KnowledgeAccordion from './KnowledgeAccordion';

interface Props {
    currentUser: User;
}

const MemberHumanDesignView: React.FC<Props> = ({ currentUser }) => {
    const [profile, setProfile] = useState<HumanDesignProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [knowledgeMap, setKnowledgeMap] = useState<Record<string, any>>({});
    const [debugStatus, setDebugStatus] = useState<string>('Idle');
    
    // State for Interaction
    const [activeLevel, setActiveLevel] = useState<number | null>(null); // Toggle level 1-4
    const [modalLevel, setModalLevel] = useState<number | null>(null); // For legacy compatibility if needed
    const [selectedKey, setSelectedKey] = useState<string | null>(null); // Currently expanded item
    const [isChartOpen, setIsChartOpen] = useState(true); // Collapsible Chart State

    // --- LOGIC: Fetch Profile & Knowledge ---
    useEffect(() => {
        const fetchProfile = async () => {
             try {
                 const data = await userService.getHumanDesign(currentUser.id);
                 setProfile(data);
                 if (data) {
                    fetchKnowledge(data);
                 }
             } catch(e) {
                 console.error('Failed to load profile', e);
             } finally {
                 setLoading(false);
             }
        };
        fetchProfile();
    }, [currentUser.id]);

    const fetchKnowledge = async (profileData: HumanDesignProfile) => {
        setDebugStatus('Start Key Generation...');
        const keys: Set<string> = new Set();
        
        const addKeys = (prefix: string, value?: string | null, forceTypeBase?: string) => {
            if (!value && !forceTypeBase) return;
            const candidates: string[] = [];
            if (value) {
                const cleanVal = value.split('(')[0].trim().toUpperCase()
                    .replace(/[^A-Z0-9]+/g, '_')
                    .replace(/^_+|_+$/g, '');
                if (cleanVal) candidates.push(`${prefix}_${cleanVal}`);
            }
            if (forceTypeBase) candidates.push(`${prefix}_${forceTypeBase}`);
            candidates.forEach(k => keys.add(k));
        };

        let typeBase = '';
        if (profileData.type) {
            typeBase = profileData.type.split('(')[0].trim().toUpperCase()
                .replace(/[^A-Z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
        }

        addKeys('TYPE', profileData.type, typeBase);
        addKeys('PROFILE', profileData.profile);
        addKeys('AUTHORITY', profileData.authority);
        addKeys('STRATEGY', profileData.strategy, typeBase);
        addKeys('DEFINITION', profileData.definition);
        addKeys('SIGNATURE', profileData.signature, typeBase);
        addKeys('THEME', profileData.notSelfTheme, typeBase); 
        addKeys('NOT_SELF_THEME', profileData.notSelfTheme, typeBase); 
        addKeys('CROSS', profileData.incarnationCross);
        addKeys('DIGESTION', profileData.digestion);
        addKeys('SENSE', profileData.sense);
        addKeys('DESIGNSENSE', profileData.designSense);
        addKeys('MOTIVATION', profileData.motivation);
        addKeys('PERSPECTIVE', profileData.perspective);
        addKeys('ENVIRONMENT', profileData.environment);
        
        const centerItems = [
            { k: 'head', keyBase: 'HEAD' },
            { k: 'ajna', keyBase: 'AJNA' },
            { k: 'throat', keyBase: 'THROAT' },
            { k: 'gCenter', keyBase: 'GCENTER' },
            { k: 'heart', keyBase: 'HEART' },
            { k: 'sacral', keyBase: 'SACRAL' },
            { k: 'root', keyBase: 'ROOT' },
            { k: 'spleen', keyBase: 'SPLEEN' },
            { k: 'solarPlexus', keyBase: 'SOLARPLEXUS' }
        ];

        centerItems.forEach(c => {
            // Add generic key
            keys.add(`CENTER_${c.keyBase}`);
            // Add status-specific key
            // @ts-ignore
            const status = profileData.centers?.[c.k];
            if (status) {
                const cleanStatus = status.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
                keys.add(`CENTER_${c.keyBase}_${cleanStatus}`);
            }
        });

        // @ts-ignore
        if (profileData.channels && Array.isArray(profileData.channels)) {
            // @ts-ignore
            profileData.channels.forEach((ch: any) => {
                if (typeof ch !== 'string') return;
                const match = ch.match(/^(\d+\s*-\s*\d+)/);
                if (match) {
                    const code = match[1].replace(/\s+/g, ''); 
                    keys.add(`CHANNEL_${code}`);
                }
            });
        }
        
        // Add Gate Keys
         // Helper to extract gate number
        const extractGate = (val: string) => {
            if (!val) return null;
            const match = val.match(/(\d+)/);
            return match ? parseInt(match[1], 10) : null;
        };
        const gateNums = new Set<number>();
        if (profileData.design) Object.values(profileData.design).forEach(v => { const n = extractGate(v as string); if(n) gateNums.add(n); });
        if (profileData.personality) Object.values(profileData.personality).forEach(v => { const n = extractGate(v as string); if(n) gateNums.add(n); });
        gateNums.forEach(g => keys.add(`GATE_${g}`));


        if (keys.size > 0) {
            try {
                const responseData = await hdService.getMyKnowledge(Array.from(keys));
                let items = [];
                const map: Record<string, any> = {};

                if (Array.isArray(responseData)) {
                    items = responseData;
                } else if (responseData.items) {
                    items = responseData.items;
                }
                
                items.forEach((item: any) => {
                    map[item.key] = item;
                });

                // Aliasing Logic
                const mapAlias = (prefix: string, value: string | null | undefined, typeBase: string) => {
                    if (!value) return;
                    const valKey = `${prefix}_${value.split('(')[0].trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
                    const typeKey = `${prefix}_${typeBase}`;
                    
                    if (map[typeKey] && !map[valKey]) map[valKey] = { ...map[typeKey], key: valKey };
                    if (map[valKey] && !map[typeKey]) map[typeKey] = { ...map[valKey], key: typeKey };
                    if (prefix === 'THEME') {
                         const notSelfKey = `NOT_SELF_THEME_${typeBase}`;
                         if (map[notSelfKey] && !map[valKey]) map[valKey] = { ...map[notSelfKey], key: valKey };
                    }
                };

                if (typeBase) {
                    mapAlias('STRATEGY', profileData.strategy, typeBase);
                    mapAlias('SIGNATURE', profileData.signature, typeBase);
                    mapAlias('THEME', profileData.notSelfTheme, typeBase);
                    const themeValKey = `THEME_${profileData.notSelfTheme?.split('(')[0].trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
                    const nstKey = `NOT_SELF_THEME_${typeBase}`;
                    if (map[nstKey]) map[themeValKey] = { ...map[nstKey], key: themeValKey };
                }
                setKnowledgeMap(map);
                setDebugStatus('Done.');
            } catch (e: any) {
                console.error(e);
            }
        }
    };

    const generateKey = (prefix: string, value?: string | null) => {
        if (!value) return '';
        const cleanVal = value.split('(')[0].trim().toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return `${prefix}_${cleanVal}`;
    };

    const getK = (key: string) => knowledgeMap[key];

    const getChannelKey = (raw: string) => {
         if (!raw) return '';
         const match = raw.match(/^(\d+\s*-\s*\d+)/);
         if (match) return `CHANNEL_${match[1].replace(/\s+/g, '')}`;
         return '';
    };

    // --- SECTION: DEFINED GATES LOGIC ---
    const getDefinedGates = () => {
        if (!profile) return [];
        const gates = new Set<number>();
        
        const extract = (val: string) => {
            if (!val) return;
            const match = val.match(/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num)) gates.add(num);
            }
        };

        if (profile.design) {
            Object.values(profile.design).forEach(v => extract(v as string));
        }
        if (profile.personality) {
             Object.values(profile.personality).forEach(v => extract(v as string));
        }

        return Array.from(gates).sort((a, b) => a - b);
    };

    const definedGates = getDefinedGates();


    // --- RENDERERS ---

    const renderKnowledgeContent = (item: any) => {
        if (!item || !activeLevel) return null;
        
        const content = item[`contentLevel${activeLevel}`];

        if (!content) {
            return (
                <div className="text-sm text-gray-400 italic py-2">
                    Description for Level {activeLevel} is not available.
                </div>
            );
        }

        return (
            <div className="animate-fade-in">
                <div className="mb-3">
                     <span className={`
                        px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                        ${activeLevel === 1 ? 'bg-blue-100 text-blue-700' : ''}
                        ${activeLevel === 2 ? 'bg-green-100 text-green-700' : ''}
                        ${activeLevel === 3 ? 'bg-orange-100 text-orange-700' : ''}
                        ${activeLevel === 4 ? 'bg-purple-100 text-purple-700' : ''}
                     `}>
                        Level {activeLevel} Description
                     </span>
                </div>
                <div 
                    className="prose prose-sm max-w-none text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
        );
    };

    const renderAttributeRow = (label: string, value: string | undefined | null, keyPrefix: string, valOverride?: string) => {
        const key = generateKey(keyPrefix, valOverride || value);
        const knowledgeItem = getK(key);
        const isOpen = selectedKey === key;
        const isMissing = !knowledgeItem;

        // Interaction Logic:
        // If activeLevel is NULL -> Disabled (No arrow, click does nothing)
        // If activeLevel is SET -> Enabled (Show arrow, click toggles)
        const isInteractive = activeLevel !== null && !isMissing;

        return (
            <div className={`border-b last:border-0 border-gray-100 ${!isInteractive ? 'opacity-90' : ''}`}>
                <div 
                    onClick={() => {
                        if (isInteractive) setSelectedKey(isOpen ? null : key);
                    }}
                    className={`
                        flex justify-between items-center p-4 transition-colors
                        ${isInteractive ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
                        ${isOpen ? 'bg-purple-50' : ''}
                    `}
                >
                    <span className="text-sm font-bold text-gray-600 uppercase tracking-wide w-1/3">{label}</span>
                    <div className="flex-1 text-right flex items-center justify-end gap-3 text-sm font-semibold text-gray-900">
                         {value || ''}
                         {isInteractive && (
                             <svg className={`w-4 h-4 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180 text-purple-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                             </svg>
                         )}
                    </div>
                </div>
                
                {isOpen && knowledgeItem && activeLevel && (
                    <div className="bg-white p-4 border-t border-b border-purple-100 shadow-inner relative animate-fade-in">
                        <button 
                             onClick={(e) => {
                                 e.stopPropagation();
                                 setSelectedKey(null);
                             }}
                             className="absolute top-2 left-2 p-1 text-gray-400 hover:text-red-500 transition-colors z-10 bg-white/80 rounded-full hover:bg-red-50"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>

                        <div className="pt-8 pl-1 pr-1">
                             <div className="mb-4 text-center sm:text-left">
                                 <h4 className="text-lg font-bold text-purple-800 mb-1">{knowledgeItem.title}</h4>
                                 <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{knowledgeItem.category}</span>
                             </div>

                             {renderKnowledgeContent(knowledgeItem)}
                             
                             <div className="mt-6 text-center">
                                 <button 
                                    onClick={() => setSelectedKey(null)}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                                >
                                    Close Description
                                </button>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderCenters = () => {
         const centerItems = [
            { k: 'head', l: 'Head / Kepala', keyBase: 'HEAD' },
            { k: 'ajna', l: 'Ajna / Pikiran', keyBase: 'AJNA' },
            { k: 'throat', l: 'Throat / Tenggorokan', keyBase: 'THROAT' },
            { k: 'gCenter', l: 'G-Center / Jati Diri', keyBase: 'GCENTER' },
            { k: 'heart', l: 'Heart / Jantung', keyBase: 'HEART' },
            { k: 'sacral', l: 'Sacral / Perut', keyBase: 'SACRAL' },
            { k: 'root', l: 'Root / Dasar', keyBase: 'ROOT' },
            { k: 'spleen', l: 'Spleen / Limpa', keyBase: 'SPLEEN' },
            { k: 'solarPlexus', l: 'Solar Plexus / Emosional', keyBase: 'SOLARPLEXUS' }
        ];

        return (
            <div className="mt-8">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-2">9 PUSAT ENERGI</h3>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                    {centerItems.map((c) => {
                         // @ts-ignore
                        const val = profile.centers?.[c.k] || 'Defined';
                        
                        // Generates keys: CENTER_HEAD_DEFINED or CENTER_HEAD_UNDEFINED (primary)
                        // Fallback: CENTER_HEAD (if specific one missing)
                        const cleanStatus = val ? val.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_') : 'DEFINED';
                        const genericKey = `CENTER_${c.keyBase}`;
                        const specificKey = `CENTER_${c.keyBase}_${cleanStatus}`;
                        
                        // We use specificKey for selection, but we check if knowledge exists for it.
                        // If specific exists, use it. If not, check generic.
                        const hasSpecific = !!getK(specificKey);
                        const hasGeneric = !!getK(genericKey);
                        
                        // Effective Key to use for interaction
                        const effectiveKey = hasSpecific ? specificKey : (hasGeneric ? genericKey : specificKey);
                        const knowledgeItem = getK(effectiveKey);

                        const isOpen = selectedKey === effectiveKey;
                        const isInteractive = activeLevel !== null && !!knowledgeItem;
                        const isDefined = val?.toLowerCase().includes('defined') && !val?.toLowerCase().includes('undefined');
                        const statusColor = isDefined ? 'text-green-600' : 'text-gray-400';

                         return (
                            <div key={c.k}>
                                <div 
                                    onClick={() => isInteractive && setSelectedKey(isOpen ? null : effectiveKey)}
                                    className={`flex justify-between items-center p-4 transition-colors ${isInteractive ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'} ${isOpen ? 'bg-purple-50' : ''}`}
                                >
                                     <span className="text-sm text-gray-600">{c.l}</span>
                                     <span className={`text-sm font-bold ${statusColor}`}>{val}</span>
                                     {isInteractive && (
                                         <svg className={`w-4 h-4 text-gray-400 ml-2 transform transition-transform ${isOpen ? 'rotate-180 text-purple-600' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                                         </svg>
                                     )}
                                </div>
                                {isOpen && knowledgeItem && activeLevel && (
                                     <div className="p-4 bg-white border-t border-purple-100 relative">
                                        <button 
                                             onClick={(e) => { e.stopPropagation(); setSelectedKey(null); }}
                                             className="absolute top-2 left-2 text-gray-400 hover:text-red-500"
                                        >
                                            <Icons.X className="w-5 h-5"/>
                                        </button>
                                         <div className="pt-8">
                                            <div className="mb-4 text-center sm:text-left">
                                                <h4 className="text-lg font-bold text-purple-800 mb-1">{knowledgeItem.title}</h4>
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{knowledgeItem.category} - {cleanStatus}</span>
                                            </div>
                                            {renderKnowledgeContent(knowledgeItem)}
                                         </div>
                                     </div>
                                )}
                            </div>
                        );
                    })}
                 </div>
            </div>
        );
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Human Design...</div>;

    if (!profile) {
         return (
             <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-gray-100">
                 <h3 className="font-bold text-lg">Profile Not Available</h3>
             </div>
         );
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
             {/* Header */}
             <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                      <h2 className="text-2xl font-bold text-gray-800">My Human Design</h2>
                      <p className="text-xs text-gray-500 mt-1">Select a Level to view detailed descriptions below.</p>
                  </div>
                  
                  {/* Access Level Toggles */}
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">View Level:</span>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4].map(level => {
                            // @ts-ignore
                            const isUnlocked = currentUser[`hdAccessLevel${level}`];
                            const isActive = activeLevel === level;
                            return (
                                <button 
                                    key={level}
                                    onClick={() => isUnlocked && setActiveLevel(isActive ? null : level)}
                                    disabled={!isUnlocked}
                                    className={`
                                        w-8 h-8 rounded flex items-center justify-center text-sm font-bold transition-all relative
                                        ${!isUnlocked ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 
                                          isActive ? 'bg-purple-600 text-white shadow-md scale-105 ring-2 ring-purple-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300 hover:text-purple-600'}
                                    `}
                                    title={!isUnlocked ? "Locked" : `View Level ${level}`}
                                >
                                    {level}
                                    {!isUnlocked && <div className="absolute -top-1 -right-1 text-[8px]">🔒</div>}
                                </button>
                            );
                        })}
                    </div>
                 </div>
             </div>

             {/* Chart + Blueprint Data */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden text-sm">
                 <div 
                    onClick={() => setIsChartOpen(!isChartOpen)}
                    className="p-3 bg-purple-50 text-purple-900 font-bold flex justify-between items-center cursor-pointer hover:bg-purple-100 transition-colors"
                >
                    <span className="flex items-center gap-2">
                        <Icons.User className="w-4 h-4 opacity-70"/>
                        Blueprint Chart & Biodata
                    </span>
                    <Icons.ChevronDown className={`w-4 h-4 transition-transform ${isChartOpen ? 'rotate-180' : ''}`} />
                </div>
                
                {isChartOpen && (
                    <div className="animate-fade-in border-t border-purple-100">
                        <div className="p-4 flex flex-col items-center">
                            <div className="w-full max-w-5xl">
                                {profile.chartImage ? (
                                    <img src={profile.chartImage} alt="BodyGraph" className="w-full h-auto object-contain rounded-lg shadow-sm" />
                                ) : (
                                    <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-400">No Chart</div>
                                )}
                            </div>
                        </div>

                        {/* Biodata Table */}
                        <div className="border-t border-gray-100 p-6">
                            <h5 className="font-bold text-xs text-gray-500 uppercase tracking-widest mb-4">BIODATA CHART</h5>
                            <div className="space-y-2 text-sm">
                                {[
                                    { l: 'Nama', v: profile.chartName },
                                    { l: 'Tanggal Lahir', v: profile.chartBirthDate },
                                    { l: 'Tempat Lahir', v: profile.chartBirthCity },
                                    { l: 'Jam Lahir', v: profile.chartBirthTime },
                                    { l: 'Tanggal Desain', v: profile.chartDesignDate },
                                ].map((item, i) => (
                                    <div key={i} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                                        <span className="text-gray-600">{item.l}:</span>
                                        <span className="font-medium text-gray-900 text-right">{item.v || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PROFILE DETAILS LIST */}
            <div>
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-2">PROFILE DETAILS</h3>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {renderAttributeRow('Tipe', profile.type, 'TYPE')}
                    {renderAttributeRow('Strategi', profile.strategy, 'STRATEGY')}
                    {renderAttributeRow('Otoritas Batin', profile.authority, 'AUTHORITY')}
                    {renderAttributeRow('Tujuan Utama', profile.signature, 'SIGNATURE')}
                    {renderAttributeRow('Tema Emosional', profile.notSelfTheme, 'THEME')}
                    {renderAttributeRow('Definisi', profile.definition, 'DEFINITION')}
                    {renderAttributeRow('Profil', profile.profile, 'PROFILE')}
                    {renderAttributeRow('Sistem Pencernaan', profile.digestion, 'DIGESTION')}
                    {renderAttributeRow('Kepekaan Sadar (Sense)', profile.sense, 'SENSE')}
                    {renderAttributeRow('Kepekaan Tak Sadar (Design Sense)', profile.designSense, 'DESIGNSENSE')}
                    {renderAttributeRow('Motivasi', profile.motivation, 'MOTIVATION')}
                    {renderAttributeRow('Perspektif', profile.perspective, 'PERSPECTIVE')}
                    {renderAttributeRow('Lingkungan', profile.environment, 'ENVIRONMENT')}
                    {renderAttributeRow('Misi Jiwa (Incarnation Cross)', profile.incarnationCross, 'CROSS')}
                 </div>
            </div>

            {/* 9 CENTERS */}
            {renderCenters()}

            {/* CHANNELS */}
            <div>
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-2">JALUR POTENSI / CHANNELS</h3>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-4 space-y-2">
                     {/* @ts-ignore */}
                    {profile.channels && profile.channels.length > 0 ? profile.channels.map((ch: string, idx: number) => {
                        const key = getChannelKey(ch);
                        const knowledgeItem = getK(key);
                        const isOpen = selectedKey === key;
                        const isInteractive = activeLevel !== null && !!knowledgeItem;

                        return (
                            <div key={idx} className="border rounded bg-purple-50/50 border-purple-100 overflow-hidden">
                                <div 
                                    onClick={() => isInteractive && setSelectedKey(isOpen ? null : key)}
                                    className={`p-3 text-sm font-semibold text-purple-900 flex justify-between items-center transition-colors ${isInteractive ? 'cursor-pointer hover:bg-purple-100' : ''}`}
                                >
                                    <span>{ch}</span>
                                    {isInteractive && <Icons.ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
                                </div>
                                {isOpen && knowledgeItem && activeLevel && (
                                    <div className="p-4 bg-white border-t border-purple-100 relative">
                                        <button 
                                             onClick={(e) => { e.stopPropagation(); setSelectedKey(null); }}
                                             className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                        >
                                           <Icons.X className="w-5 h-5" />
                                        </button>
                                        <div className="pt-6">
                                            {renderKnowledgeContent(knowledgeItem)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }) : <div className="text-gray-400 text-sm italic">No channels defined</div>}
                 </div>
            </div>

            {/* DEFINED GATES - SORTED & UNIQUE */}
            <div>
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest px-4 mb-2">GERBANG TERDEFINISI / AKTIF (DEFINED GATES)</h3>
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                    {definedGates.length > 0 ? definedGates.map((gate) => {
                         const key = `GATE_${gate}`;
                         const knowledgeItem = getK(key);
                         const isOpen = selectedKey === key;
                         const isInteractive = activeLevel !== null && !!knowledgeItem;
                         
                         return (
                            <div key={gate}>
                                <div 
                                    onClick={() => isInteractive && setSelectedKey(isOpen ? null : key)}
                                    className={`
                                        flex justify-between items-center p-4 transition-colors
                                        ${isInteractive ? 'cursor-pointer hover:bg-gray-50' : 'cursor-default'}
                                        ${isOpen ? 'bg-purple-50' : ''}
                                    `}
                                >
                                    <span className="text-sm font-medium text-gray-800">Gerbang {gate}</span>
                                    {isInteractive && (
                                        <Icons.ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </div>
                                {isOpen && knowledgeItem && activeLevel && (
                                    <div className="p-6 bg-white border-t border-purple-100 relative shadow-inner">
                                        <button 
                                             onClick={(e) => { e.stopPropagation(); setSelectedKey(null); }}
                                             className="absolute top-2 left-2 p-1 text-gray-400 hover:text-red-500 bg-white/50 rounded-full"
                                        >
                                            <Icons.X className="w-5 h-5" />
                                        </button>
                                        <div className="pt-4">
                                            <h4 className="font-bold text-purple-700 text-lg mb-2">{knowledgeItem.title}</h4>
                                            {renderKnowledgeContent(knowledgeItem)}
                                        </div>
                                    </div>
                                )}
                            </div>
                         );
                    }) : (
                        <div className="p-4 text-gray-400 italic">No gates data found.</div>
                    )}
                 </div>
                 <div className="h-10"></div>
            </div>

        </div>
    );
};

export default MemberHumanDesignView;
