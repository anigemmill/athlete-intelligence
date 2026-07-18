import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import { 
  Check, 
  ChevronRight, 
  Search, 
  ExternalLink, 
  Trophy, 
  Activity, 
  Globe, 
  ArrowRight,
  User,
  ShieldAlert,
  Target,
  LineChart,
  FileText
} from "lucide-react";

export function AgentCreation() {
  const [selectedId, setSelectedId] = useState<string>("athlete-1");

  return (
    <AppLayout activePage="dashboard">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
      <div 
        className="w-full h-full flex flex-col hide-scrollbar overflow-y-auto"
        style={{ 
          fontFamily: "'Inter', sans-serif",
          backgroundColor: "#0b0b0d",
          color: "#e2e2e6"
        }}
      >
        {/* Header / Stepper */}
        <header className="flex-shrink-0 border-b flex items-center px-8 h-20" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#a1a1aa] hover:text-white cursor-pointer transition-colors">Agents</span>
            <ChevronRight className="w-4 h-4 text-[#52525b]" />
            <span className="text-white font-medium">Create New Agent</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center py-10 px-8">
          <div className="w-full max-w-5xl">
            
            {/* Stepper */}
            <div className="flex items-center justify-between w-full mb-12">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#111114] border border-[#3b82f6] text-[#3b82f6]">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-[#3b82f6] mb-0.5">Step 1</div>
                  <div className="text-sm font-medium text-white">Find Athlete</div>
                </div>
              </div>
              <div className="flex-1 h-px mx-6 bg-gradient-to-r from-[rgba(59,130,246,0.3)] to-[rgba(255,255,255,0.08)]"></div>
              
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#3b82f6] mb-0.5">Step 2</div>
                  <div className="text-sm font-medium text-white">Confirm Identity</div>
                </div>
              </div>
              <div className="flex-1 h-px mx-6 bg-[rgba(255,255,255,0.08)]"></div>
              
              <div className="flex items-center gap-3 opacity-40">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#111114] border border-[rgba(255,255,255,0.2)] text-[#a1a1aa]">
                  <span className="text-sm font-medium">3</span>
                </div>
                <div>
                  <div className="text-xs font-medium text-[#a1a1aa] mb-0.5">Step 3</div>
                  <div className="text-sm font-medium text-[#a1a1aa]">Configure Alerts</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-8">
              {/* Left Column: Disambiguation List */}
              <div className="col-span-5 flex flex-col gap-6">
                
                {/* Search Context */}
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-[#a1a1aa]">Search Context</div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111114]">
                    <div className="flex items-center gap-3">
                      <Search className="w-4 h-4 text-[#52525b]" />
                      <span className="text-white font-medium">"James Kowalski"</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-[rgba(255,255,255,0.04)] text-[#a1a1aa] border border-[rgba(255,255,255,0.04)]">
                        Sport: Athletics
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-[#a1a1aa]">Matches Found (3)</div>
                    <span className="text-xs text-[#52525b]">Select correct profile</span>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    {/* Selected Card */}
                    <button 
                      onClick={() => setSelectedId("athlete-1")}
                      className={`text-left w-full p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
                        selectedId === "athlete-1" 
                          ? "bg-[rgba(59,130,246,0.04)] border-[rgba(59,130,246,0.5)] shadow-[0_0_20px_rgba(59,130,246,0.05)]" 
                          : "bg-[#111114] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#1e1e24] flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.04)]">
                        <User className="w-5 h-5 text-[#a1a1aa]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium truncate">James Kowalski</span>
                          {selectedId === "athlete-1" && <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>}
                        </div>
                        <div className="text-sm text-[#a1a1aa] flex items-center gap-2 mb-2">
                          <span>23</span>
                          <span className="w-1 h-1 rounded-full bg-[#52525b]"></span>
                          <span>UK</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#e2e2e6] border border-[rgba(255,255,255,0.04)]">
                            High Jump
                          </span>
                          <span className="text-xs text-[#a1a1aa]">
                            PB: <span className="text-[#e2e2e6]">2.24m</span>
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Unselected Card 1 */}
                    <button 
                      onClick={() => setSelectedId("athlete-2")}
                      className={`text-left w-full p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
                        selectedId === "athlete-2" 
                          ? "bg-[rgba(59,130,246,0.04)] border-[rgba(59,130,246,0.5)] shadow-[0_0_20px_rgba(59,130,246,0.05)]" 
                          : "bg-[#111114] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#1e1e24] flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.04)]">
                        <User className="w-5 h-5 text-[#a1a1aa]" />
                      </div>
                      <div className="flex-1 min-w-0 opacity-70">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium truncate">James Kowalski</span>
                          {selectedId === "athlete-2" && <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>}
                        </div>
                        <div className="text-sm text-[#a1a1aa] flex items-center gap-2 mb-2">
                          <span>31</span>
                          <span className="w-1 h-1 rounded-full bg-[#52525b]"></span>
                          <span>AUS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#e2e2e6] border border-[rgba(255,255,255,0.04)]">
                            Shot Put
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.2)]">
                            Retired
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Unselected Card 2 */}
                    <button 
                      onClick={() => setSelectedId("athlete-3")}
                      className={`text-left w-full p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
                        selectedId === "athlete-3" 
                          ? "bg-[rgba(59,130,246,0.04)] border-[rgba(59,130,246,0.5)] shadow-[0_0_20px_rgba(59,130,246,0.05)]" 
                          : "bg-[#111114] border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)]"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#1e1e24] flex items-center justify-center flex-shrink-0 border border-[rgba(255,255,255,0.04)]">
                        <User className="w-5 h-5 text-[#a1a1aa]" />
                      </div>
                      <div className="flex-1 min-w-0 opacity-70">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white font-medium truncate">J. Kowalski</span>
                          {selectedId === "athlete-3" && <div className="w-2 h-2 rounded-full bg-[#3b82f6]"></div>}
                        </div>
                        <div className="text-sm text-[#a1a1aa] flex items-center gap-2 mb-2">
                          <span>19</span>
                          <span className="w-1 h-1 rounded-full bg-[#52525b]"></span>
                          <span>POL</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#e2e2e6] border border-[rgba(255,255,255,0.04)]">
                            110m Hurdles
                          </span>
                          <span className="text-xs text-[#a1a1aa]">
                            PB: <span className="text-[#e2e2e6]">13.82s</span>
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                  
                  <button className="text-xs text-[#3b82f6] hover:text-[#60a5fa] font-medium self-start mt-2 px-1 transition-colors">
                    None of these? Refine search
                  </button>
                </div>

              </div>

              {/* Right Column: Selected Detail & Action */}
              <div className="col-span-7 flex flex-col gap-6">
                
                <div className="flex flex-col gap-3">
                  <div className="text-sm text-[#a1a1aa] opacity-0">Details</div> {/* Spacer to align with left col */}
                  
                  {selectedId === "athlete-1" ? (
                    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111114] overflow-hidden flex flex-col">
                      {/* Detail Header */}
                      <div className="p-6 border-b border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#18181b] to-[#111114]">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-[#27272a] border-2 border-[#111114] ring-1 ring-[rgba(255,255,255,0.1)] overflow-hidden">
                               <img src="/__mockup/images/athlete-kowalski.jpg" alt="James Kowalski" className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-500" onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23a1a1aa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'; e.currentTarget.className = 'w-full h-full p-3 object-contain opacity-50'; }} />
                            </div>
                            <div>
                              <h2 className="text-2xl font-semibold text-white tracking-tight mb-1">James Kowalski</h2>
                              <div className="flex items-center gap-3 text-sm text-[#a1a1aa]">
                                <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> UK (GBR)</span>
                                <span className="w-1 h-1 rounded-full bg-[#52525b]"></span>
                                <span>Age 23</span>
                                <span className="w-1 h-1 rounded-full bg-[#52525b]"></span>
                                <span className="text-[#e2e2e6]">High Jump</span>
                              </div>
                            </div>
                          </div>
                          <a href="#" className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#3b82f6] transition-colors px-3 py-1.5 rounded-lg hover:bg-[rgba(59,130,246,0.1)]">
                            WA Profile <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mt-6">
                          <div className="flex flex-col gap-1">
                            <div className="text-xs text-[#a1a1aa] flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Personal Best</div>
                            <div className="text-lg font-medium text-white">2.24m</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-xs text-[#a1a1aa] flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Season Best</div>
                            <div className="text-lg font-medium text-white">2.21m</div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="text-xs text-[#a1a1aa] flex items-center gap-1.5"><LineChart className="w-3.5 h-3.5" /> WA Rank</div>
                            <div className="text-lg font-medium text-white">#42 <span className="text-xs text-[#52525b] font-normal">World</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Monitored Sources */}
                      <div className="p-6 flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            <Target className="w-4 h-4 text-[#a1a1aa]" />
                            Intelligence Coverage
                          </div>
                          <div className="text-xs text-[#3b82f6]">12 domains identified</div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {['worldathletics.org', 'britishathletics.org.uk', 'european-athletics.com', 'bbc.com/sport', 'athleticsweekly.com', 'theguardian.com/sport', 'telegraph.co.uk', 'skysports.com', 'instagram.com', 'x.com'].map(domain => (
                            <div key={domain} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-xs text-[#a1a1aa]">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                              {domain}
                            </div>
                          ))}
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-xs text-[#52525b]">
                            +2 more
                          </div>
                        </div>
                        
                        <div className="mt-2 p-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] flex items-start gap-3">
                          <FileText className="w-4 h-4 text-[#a1a1aa] mt-0.5 flex-shrink-0" />
                          <div className="text-xs text-[#a1a1aa] leading-relaxed">
                            <span className="text-[#e2e2e6] font-medium">Recent Activity detected:</span> Mentions found in 3 recent articles from British Athletics and Athletics Weekly within the last 14 days regarding regional championships.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111114] h-[400px] flex items-center justify-center text-[#52525b] text-sm">
                      Select an athlete to view details
                    </div>
                  )}

                  {/* Primary Action */}
                  <div className="mt-4">
                    <button 
                      className={`w-full py-3.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-200 ${
                        selectedId 
                          ? "bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-[0_4px_14px_0_rgba(59,130,246,0.39)]" 
                          : "bg-[rgba(255,255,255,0.06)] text-[#52525b] cursor-not-allowed"
                      }`}
                      disabled={!selectedId}
                    >
                      Confirm Athlete & Continue
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Step 3 Preview (Faded) */}
                  <div className="mt-6 border border-[rgba(255,255,255,0.04)] rounded-xl p-5 bg-[rgba(255,255,255,0.01)] opacity-40 grayscale pointer-events-none">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldAlert className="w-5 h-5 text-[#a1a1aa]" />
                      <div className="text-sm font-medium text-white">Next: Configure Alert Thresholds</div>
                    </div>
                    <div className="h-2 w-1/3 bg-[rgba(255,255,255,0.06)] rounded mb-3"></div>
                    <div className="h-2 w-2/3 bg-[rgba(255,255,255,0.06)] rounded"></div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
