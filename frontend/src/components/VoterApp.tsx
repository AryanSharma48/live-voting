import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Check, Flame, AlertCircle } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description: string;
  image_url: string;
}

export default function VoterApp() {
  const [session, setSession] = useState<any>({ 
    user: { id: "00000000-0000-0000-0000-000000000001", email: 'tester@fest.local' },
    access_token: 'dummy-token'
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [voted, setVoted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auth Check Bypassed for testing
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from('teams').select('*').order('name');
      if (error) throw error;
      setTeams(data || []);
    } catch (err: any) {
      console.error('Error fetching teams:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    // Bypassed
  };

  const handleVote = async (teamId: string) => {
    if (!session) return;
    setVoting(true);
    setError(null);

    try {
      // Hit our Express Backend endpoint
      // Ensure backend URL is in .env, default to localhost for dev
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      
      const response = await fetch(`${apiUrl}/api/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ teamId })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.error === 'Already Voted') {
          setVoted(true);
        } else {
          throw new Error(data.error || 'Failed to vote');
        }
      } else {
        setVoted(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setVoting(false);
    }
  };

  if (voted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#181818] via-[#23272e] to-[#0d0d0d] flex flex-col items-center justify-center p-6">
        <div className="bg-[#23272e]/80 backdrop-blur-lg border border-[#222] rounded-2xl p-8 max-w-sm w-full shadow-2xl space-y-4">
          <div className="flex items-center space-x-3 text-[#00FF66]">
            <Check size={40} className="drop-shadow-[0_0_15px_rgba(0,255,102,0.8)]" />
            <h1 className="text-3xl font-black uppercase tracking-tighter">Vote Recorded</h1>
          </div>
          <p className="text-gray-300 font-medium">
            Your vote has been locked in for the festival. Check the main projector for live updates!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181818] via-[#23272e] to-[#0d0d0d] text-white flex justify-center pb-20 relative overflow-hidden">
      <div className="w-full max-w-md px-4 mt-8 space-y-8 relative z-10">
        {/* Header - Glassmorphism Dark */}
        <div className="space-y-1 py-4 border-b-2 border-[#222] flex flex-col justify-end min-h-[120px]">
          <div className="flex items-center space-x-2 text-[#FF3333]">
            <Flame size={28} className="animate-pulse drop-shadow-[0_0_8px_rgba(255,51,51,0.8)]" />
            <span className="font-black text-xs tracking-[0.3em] uppercase opacity-80">Fest 2026 // Live</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tighter leading-[0.85] mt-2 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-[#f8fafc] to-[#a3a3a3]">
            Cast Your<br/>Vote Now.
          </h1>
        </div>
        {!session ? (
          <div className="bg-[#23272e]/80 backdrop-blur-lg border border-[#222] rounded-2xl p-6 space-y-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-[#FF3333]/10 to-transparent translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500 ease-in-out"></div>
            <p className="text-gray-300 font-medium relative z-10">
              Authentication required to prevent double-voting. One student, one vote.
            </p>
            <button 
              onClick={handleGoogleLogin}
              className="w-full bg-[#181818] text-white font-black uppercase tracking-[0.2em] py-5 hover:bg-[#FF3333] hover:text-white transition-all duration-300 flex items-center justify-center space-x-3 relative z-10 hover:shadow-[0_0_20px_rgba(255,51,51,0.4)] rounded-xl"
            >
              <span>Login to Vote</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-[#23272e]/80 backdrop-blur-lg border border-[#00FF66] rounded-xl p-4 flex justify-between items-center text-sm font-bold">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 tracking-widest uppercase mb-1">Authenticated As</span>
                <span className="text-white truncate max-w-[200px]">{session?.user?.email}</span>
              </div>
              <span className="uppercase text-[#00FF66] text-xs font-black tracking-[0.2em] px-2 py-1 shadow-[0_0_10px_rgba(0,255,102,0.2)] rounded-lg bg-[#181818]">Verified</span>
            </div>
            {error && (
              <div className="bg-[#FF3333]/10 border border-[#FF3333] p-4 flex items-center space-x-3 text-[#FF3333] animate-pulse rounded-xl">
                <AlertCircle size={20} />
                <span className="text-sm font-bold tracking-widest uppercase">{error}</span>
              </div>
            )}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Select Team</h2>
                <div className="h-[1px] bg-gray-700 flex-grow ml-4"></div>
              </div>
              {loading ? (
                <div className="animate-pulse flex flex-col space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-[#23272e]/80 border border-[#222] rounded-xl w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {teams.map((team, idx) => (
                    <div 
                      key={team.id} 
                      className="group relative border border-[#222] bg-[#181818]/80 rounded-xl hover:border-[#FF3333] transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,51,51,0.15)] overflow-hidden"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="absolute inset-0 bg-[#FF3333]/5 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300 rounded-xl"></div>
                      <button
                        onClick={() => handleVote(team.id)}
                        disabled={voting}
                        className="w-full text-left flex items-center p-4 relative z-10"
                      >
                        <div className="h-16 w-16 bg-[#23272e] border border-[#222] rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden group-hover:border-[#FF3333]/50 transition-colors">
                          {team.image_url ? (
                            <img src={team.image_url} alt={team.name} className="h-full w-full object-cover grayscale mix-blend-luminosity group-hover:mix-blend-normal group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110 rounded-xl" />
                          ) : (
                            <span className="font-black text-3xl text-gray-400 group-hover:text-[#FF3333] transition-colors">{team.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="ml-5 flex-grow">
                          <h3 className="font-black text-2xl uppercase tracking-tighter group-hover:text-white text-gray-200 transition-colors">{team.name}</h3>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-1 font-medium tracking-wide">{team.description}</p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 pr-2 text-[#FF3333]">
                          <Check size={28} className="drop-shadow-[0_0_8px_rgba(255,51,51,0.8)]" />
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
