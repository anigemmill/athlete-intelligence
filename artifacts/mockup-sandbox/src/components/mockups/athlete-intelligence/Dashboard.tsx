import React from "react";
import { AppLayout } from "./_shared/AppLayout";
import { Plus, Activity, Bell, Users, Search, ArrowUpRight, Clock, FileText, Database, ShieldAlert, BarChart3, Medal, MoveRight } from "lucide-react";
import "./_group.css";

const athletes = [
  { name: "Lola Anderson", sport: "100m/200m Sprint", age: 22, country: "NZ", status: "active", lastUpdate: "12m ago", unread: 2, alert: true, avatar: "LA", rank: "3rd NZ", pb: "11.24s" },
  { name: "Marcus Webb", sport: "Decathlon", age: 25, country: "AUS", status: "active", lastUpdate: "2h ago", unread: 0, alert: false, avatar: "MW", rank: "National Squad", pb: "7,842pts" },
  { name: "Priya Nair", sport: "5000m/10000m", age: 20, country: "NZ", status: "active", lastUpdate: "5h ago", unread: 1, alert: true, avatar: "PN", rank: "Olympic Pathway", pb: "15:08" },
  { name: "James Kowalski", sport: "High Jump", age: 23, country: "UK", status: "active", lastUpdate: "1d ago", unread: 0, alert: false, avatar: "JK", rank: "World Athletics", pb: "2.24m" },
  { name: "Sophie Chen", sport: "400m Hurdles", age: 21, country: "NZ", status: "paused", lastUpdate: "3d ago", unread: 0, alert: false, avatar: "SC", rank: "Paused Agent", pb: "-" },
];

const feedItems = [
  { 
    id: 1, 
    athlete: "Lola Anderson", 
    summary: "New race entry detected: Sydney Track Classic (100m). Performance projection indicates 65% chance of PB based on recent training data.", 
    category: "Competition", 
    source: "World Athletics DB / Regional Entry Lists",
    time: "12m ago",
    active: true,
    icon: <Medal size={14} className="text-blue-400" />
  },
  { 
    id: 2, 
    athlete: "Priya Nair", 
    summary: "Biomechanical analysis report uploaded from Auckland HP camp. Ground contact times show 4% improvement since last mesocycle.", 
    category: "Performance", 
    source: "Sports Science Dept. / Force Plates",
    time: "5h ago",
    active: true,
    icon: <BarChart3 size={14} className="text-blue-400" />
  },
  { 
    id: 3, 
    athlete: "Marcus Webb", 
    summary: "Mentioned in Athletics Australia preliminary selection narrative for upcoming Oceania Champs.", 
    category: "Selection", 
    source: "Internal Comm / Pathway Memos",
    time: "Yesterday",
    active: false,
    icon: <FileText size={14} className="text-zinc-400" />
  },
  { 
    id: 4, 
    athlete: "James Kowalski", 
    summary: "UK Athletics published new High Jump standards. Current PB (2.24m) is 3cm short of automatic A-qualifier.", 
    category: "Standards", 
    source: "UK Athletics / Official Criteria",
    time: "Yesterday",
    active: false,
    icon: <Database size={14} className="text-zinc-400" />
  },
  { 
    id: 5, 
    athlete: "Lola Anderson", 
    summary: "Physio flag updated: Minor hamstring tightness reported post-session. Intervention planned.", 
    category: "Medical", 
    source: "AMS Integration / Medical Notes",
    time: "2 days ago",
    active: false,
    icon: <ShieldAlert size={14} className="text-zinc-400" />
  },
];

export function Dashboard() {
  return (
    <AppLayout activePage="dashboard">
      <div className="flex flex-col h-full ai-dashboard">
        
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between px-8 pt-8 pb-6 border-b" style={{ borderColor: "var(--ai-border)" }}>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#f0f0f3]">Overview</h1>
            <p className="text-sm mt-1" style={{ color: "var(--ai-text-secondary)" }}>
              Monitoring 42 active intelligence agents for Athletics NZ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search athletes..." 
                className="bg-[#16161a] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all w-64"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-60">
                <kbd className="bg-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-white/10">⌘</kbd>
                <kbd className="bg-white/5 rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 border border-white/10">K</kbd>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ai-btn-primary">
              <Plus className="w-4 h-4" />
              New Target
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 ai-scrollbar">
          
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="ai-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-sm font-medium text-zinc-400">Total Monitored</div>
                <Users className="w-4 h-4 text-zinc-500" />
              </div>
              <div className="text-2xl font-semibold text-zinc-100">42</div>
              <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                <span className="text-emerald-400 flex items-center"><ArrowUpRight className="w-3 h-3" /> 3</span>
                <span>since last month</span>
              </div>
            </div>
            <div className="ai-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-sm font-medium text-zinc-400">New Items Today</div>
                <Activity className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-semibold text-zinc-100">18</div>
              <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                <span>Across 12 different sources</span>
              </div>
            </div>
            <div className="ai-card p-5 relative overflow-hidden group cursor-pointer">
              <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-start justify-between mb-3 relative z-10">
                <div className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Unread Alerts</div>
                <Bell className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-semibold text-zinc-100 relative z-10">3</div>
              <div className="text-xs text-blue-400 mt-2 flex items-center gap-1 relative z-10 font-medium">
                Review required <MoveRight className="w-3 h-3" />
              </div>
            </div>
            <div className="ai-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="text-sm font-medium text-zinc-400">Agents Active</div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              </div>
              <div className="text-2xl font-semibold text-zinc-100">98%</div>
              <div className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                <span>All core scrapers functional</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            
            {/* Primary Section: Monitored Athletes */}
            <div className="col-span-2 ai-card flex flex-col min-h-[400px]">
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--ai-border)" }}>
                <h2 className="text-sm font-medium text-zinc-100">Priority Targets</h2>
                <button className="text-xs text-zinc-400 hover:text-blue-400 font-medium transition-colors">View All</button>
              </div>
              
              <div className="flex-1">
                <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr] px-5 py-3 text-xs font-medium text-zinc-500 border-b border-white/5 uppercase tracking-wider">
                  <div>Athlete</div>
                  <div>Status / PB</div>
                  <div>Last Update</div>
                  <div className="text-right">Action</div>
                </div>
                
                <div className="flex flex-col">
                  {athletes.map((athlete, i) => (
                    <div key={i} className="grid grid-cols-[2fr_1.5fr_1fr_1fr] items-center px-5 py-4 ai-table-row cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className={`w-8 h-8 rounded bg-gradient-to-br flex items-center justify-center text-[10px] font-bold text-white shadow-inner
                            ${athlete.status === 'paused' ? 'from-zinc-700 to-zinc-800 text-zinc-400' : 'from-blue-600 to-blue-900'}
                          `}>
                            {athlete.avatar}
                          </div>
                          {athlete.alert && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[#111114]"></div>
                          )}
                        </div>
                        <div>
                          <div className={`text-sm font-medium flex items-center gap-2 ${athlete.status === 'paused' ? 'text-zinc-500' : 'text-zinc-200'}`}>
                            {athlete.name}
                            {athlete.unread > 0 && (
                              <span className="bg-blue-500/10 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-sm font-semibold border border-blue-500/20">
                                {athlete.unread} new
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1.5">
                            <span className="opacity-80">{athlete.country}</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                            <span>{athlete.sport}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className={`text-xs ${athlete.status === 'paused' ? 'text-zinc-600' : 'text-zinc-300'}`}>
                          {athlete.rank}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5 font-mono">
                          PB: {athlete.pb}
                        </div>
                      </div>
                      
                      <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                        <Clock size={12} />
                        {athlete.lastUpdate}
                      </div>
                      
                      <div className="flex justify-end">
                        <button className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 opacity-0 group-hover:opacity-100">
                          Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Secondary Section: Intelligence Feed */}
            <div className="ai-card flex flex-col">
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: "var(--ai-border)" }}>
                <h2 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                  <Activity size={14} className="text-blue-400" />
                  Live Intelligence
                </h2>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto ai-scrollbar">
                <div className="ai-feed-container">
                  {feedItems.map((item) => (
                    <div key={item.id} className={`ai-feed-item ${item.active ? 'active' : ''}`}>
                      <div className="ai-feed-item-dot"></div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-zinc-200">{item.athlete}</span>
                        <span className="text-[10px] text-zinc-500 px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                          {item.category}
                        </span>
                        <span className="text-[10px] text-zinc-500 ml-auto">{item.time}</span>
                      </div>
                      <p className={`text-xs leading-relaxed mb-2 ${item.active ? 'text-zinc-300' : 'text-zinc-400'}`}>
                        {item.summary}
                      </p>
                      
                      <div className="flex items-center gap-1.5 mt-2 bg-[#0b0b0d] p-2 rounded border border-white/5">
                        {item.icon}
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wide truncate">
                          {item.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-2 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors border border-dashed border-white/10 rounded-md hover:bg-white/5 hover:border-white/20 flex items-center justify-center gap-1">
                  Load Older Items <Activity size={12} />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
