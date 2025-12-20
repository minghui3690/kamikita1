import React, { useState, useEffect } from 'react';
import { User, HumanDesignProfile, HDPlanetaryData, HDCenters } from '../types';
import { getHumanDesignByUserId, performMockOCR, saveHumanDesignProfiles, getHumanDesignProfiles } from '../services/mockDatabase';
import { Icons } from '../constants';

interface HKViewProps {
  currentUser: User;
  onNavigate?: (path: string) => void;
}

const HumanDesignView: React.FC<HKViewProps> = ({ currentUser, onNavigate }) => {
  const [profile, setProfile] = useState<HumanDesignProfile | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);

  useEffect(() => {
    const p = getHumanDesignByUserId(currentUser.id);
    setProfile(p);
  }, [currentUser.id]);

  const handleScan = async () => {
    if (!scanFile && !confirm("No file selected. Generate random mock data?")) return;
    
    setLoading(true);
    try {
        const result = await performMockOCR(scanFile || 'https://placehold.co/400x600?text=Mock+Chart');
        
        const newProfile: HumanDesignProfile = {
            id: 'hd_' + Date.now(),
            userId: currentUser.id,
            ...result,
            updatedAt: new Date().toISOString()
        } as HumanDesignProfile;

        // Save
        const all = getHumanDesignProfiles();
        const idx = all.findIndex(p => p.userId === currentUser.id);
        if (idx !== -1) all[idx] = newProfile;
        else all.push(newProfile);
        
        saveHumanDesignProfiles(all);
        setProfile(newProfile);
    } catch (e) {
        alert('Scan Failed');
    } finally {
        setLoading(false);
    }
  };

  const PlanetRow = ({ label, pLeft, pRight }: { label: string, pLeft: string, pRight: string }) => (
      <div className="grid grid-cols-3 gap-2 text-xs border-b border-gray-100 py-1 last:border-0">
          <div className="font-mono text-pink-600 font-bold">{pLeft}</div>
          <div className="text-gray-500 text-center uppercase text-[10px] tracking-wider">{label}</div>
          <div className="font-mono text-gray-800 font-bold text-right">{pRight}</div>
      </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <h2 className="text-2xl font-bold text-gray-800">Human Design Profile</h2>
         {profile && (
             <button onClick={() => setProfile(undefined)} className="text-sm text-blue-600 hover:underline">Re-scan</button>
         )}
      </div>

      {!profile ? (
          <div className="bg-white p-8 rounded-xl border border-gray-100 text-center shadow-sm max-w-lg mx-auto">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                  <Icons.Camera />
              </div>
              <h3 className="font-bold text-lg mb-2">Scan Your Chart</h3>
              <p className="text-gray-500 text-sm mb-6">Upload an image of your Human Design chart or generate a test one to unlock your profile insights.</p>
              
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 mb-4 hover:border-blue-400 transition-colors cursor-pointer relative">
                  <input type="file" onChange={e => setScanFile(e.target.files ? e.target.files[0] : null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <p className="text-sm font-bold text-gray-600">{scanFile ? scanFile.name : 'Click to Upload Image'}</p>
              </div>
              
              <button 
                onClick={handleScan} 
                disabled={loading}
                className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                  {loading ? 'Processing AI Analysis...' : 'Analyze Chart'}
              </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Key Info */}
              <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Chart Overview</h3>
                      <div className="space-y-4">
                          <div>
                              <p className="text-xs text-gray-500">Type</p>
                              <p className="font-bold text-lg text-blue-900 uppercase">{profile.type}</p>
                          </div>
                          <div>
                              <p className="text-xs text-gray-500">Profile</p>
                              <p className="font-bold text-gray-800">{profile.profile}</p>
                          </div>
                          <div>
                              <p className="text-xs text-gray-500">Authority</p>
                              <p className="font-bold text-gray-800">{profile.authority}</p>
                          </div>
                          <div>
                              <p className="text-xs text-gray-500">Strategy</p>
                              <p className="font-bold text-gray-800">{profile.strategy}</p>
                          </div>
                      </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Variables</h3>
                      <div className="space-y-3">
                         {[
                             ['Digestion', profile.digestion],
                             ['Sense', profile.sense],
                             ['Motivation', profile.motivation],
                             ['Perspective', profile.perspective],
                             ['Environment', profile.environment]
                         ].map(([k, v]) => (
                             <div key={k as string}>
                                 <p className="text-[10px] text-gray-400 uppercase">{k}</p>
                                 <p className="font-medium text-sm text-gray-800">{v || '-'}</p>
                             </div>
                         ))}
                      </div>
                  </div>
              </div>
              
              {/* Middle: Chart Visual */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
                  <img src={profile.chartImage} className="w-full max-w-[300px] object-contain mb-6" alt="HD Chart" />
                  
                  <div className="w-full grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(profile.centers).map(([center, status]) => (
                          <div key={center} className={`p-2 rounded border text-center ${status === 'Defined' ? 'bg-green-50 border-green-100 text-green-700 font-bold' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                              {center.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                      ))}
                  </div>
              </div>

              {/* Right: Planetary Data */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Planetary Details</h3>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-gray-400 border-b pb-2 mb-2">
                       <div>DESIGN</div>
                       <div className="text-center">PLANET</div>
                       <div className="text-right">PERSONALITY</div>
                  </div>
                  <div className="space-y-1">
                      <PlanetRow label="Sun" pLeft={profile.design.sun} pRight={profile.personality.sun} />
                      <PlanetRow label="Earth" pLeft={profile.design.earth} pRight={profile.personality.earth} />
                      <PlanetRow label="North Node" pLeft={profile.design.northNode} pRight={profile.personality.northNode} />
                      <PlanetRow label="South Node" pLeft={profile.design.southNode} pRight={profile.personality.southNode} />
                      <PlanetRow label="Moon" pLeft={profile.design.moon} pRight={profile.personality.moon} />
                      <PlanetRow label="Mercury" pLeft={profile.design.mercury} pRight={profile.personality.mercury} />
                      <PlanetRow label="Venus" pLeft={profile.design.venus} pRight={profile.personality.venus} />
                      <PlanetRow label="Mars" pLeft={profile.design.mars} pRight={profile.personality.mars} />
                      <PlanetRow label="Jupiter" pLeft={profile.design.jupiter} pRight={profile.personality.jupiter} />
                      <PlanetRow label="Saturn" pLeft={profile.design.saturn} pRight={profile.personality.saturn} />
                      <PlanetRow label="Uranus" pLeft={profile.design.uranus} pRight={profile.personality.uranus} />
                      <PlanetRow label="Neptune" pLeft={profile.design.neptune} pRight={profile.personality.neptune} />
                      <PlanetRow label="Pluto" pLeft={profile.design.pluto} pRight={profile.personality.pluto} />
                  </div>
                  
                  <div className="mt-6 pt-4 border-t">
                     <h4 className="font-bold text-sm mb-2">Incarnation Cross</h4>
                     <p className="text-xs text-gray-600 italic">{profile.incarnationCross}</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default HumanDesignView;
