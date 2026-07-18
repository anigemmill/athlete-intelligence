import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import "./_group.css";
import {
  Activity,
  MapPin,
  Trophy,
  Bell,
  MoreHorizontal,
  Newspaper,
  Award,
  Briefcase,
  Flag,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Filter
} from "lucide-react";

type ItemCategory = "result" | "media" | "sponsorship" | "career";

interface FeedItem {
  id: string;
  category: ItemCategory;
  summary: string;
  quote: string;
  sourceDomain: string;
  date: string;
  confidence: number;
  sourcesCount: number;
  timestamp: string;
}

const feedData: FeedItem[] = [
  {
    id: "item-1",
    category: "result",
    summary: "Secured 1st place in the 100m final at the Sir Graeme Douglas International, setting a season-best time.",
    quote: "Anderson dominated the field from the blocks, crossing the line in 11.28s (+1.2m/s), signaling strong early-season form ahead of the Oceania Championships.",
    sourceDomain: "athletics.org.nz",
    date: "14 Mar 2024",
    confidence: 99,
    sourcesCount: 3,
    timestamp: "2 hours ago"
  },
  {
    id: "item-2",
    category: "media",
    summary: "Featured in an exclusive interview discussing Olympic qualification pathways and domestic preparation.",
    quote: "The 22-year-old sprint sensation revealed she has shifted her training base to Auckland to access specialised biomechanical analysis facilities, a move she hopes will shave crucial milliseconds off her PB.",
    sourceDomain: "nzherald.co.nz",
    date: "12 Mar 2024",
    confidence: 95,
    sourcesCount: 1,
    timestamp: "1 day ago"
  },
  {
    id: "item-3",
    category: "sponsorship",
    summary: "Signed a 2-year regional ambassadorship deal with Puma Athletics Oceania.",
    quote: "Puma is thrilled to welcome Lola Anderson to our elite roster. Her trajectory over the past 18 months aligns perfectly with our high-performance sprint division.",
    sourceDomain: "sportsbusinessjournal.com",
    date: "05 Mar 2024",
    confidence: 88,
    sourcesCount: 2,
    timestamp: "1 week ago"
  },
  {
    id: "item-4",
    category: "career",
    summary: "Transitioned primary coaching relationship to former national sprint coach David Liti.",
    quote: "Official registration changes filed with Athletics NZ confirm Anderson has joined the elite squad at AUT Millennium under Liti's direct supervision.",
    sourceDomain: "athletics.org.nz",
    date: "28 Feb 2024",
    confidence: 100,
    sourcesCount: 1,
    timestamp: "2 weeks ago"
  },
  {
    id: "item-5",
    category: "result",
    summary: "Finished 3rd in the 200m at the Sydney Track Classic against a strong international field.",
    quote: "While the 100m remains her primary focus, Anderson showed impressive endurance in the 200m, stopping the clock at 23.15s to claim bronze behind Australia's top sprinters.",
    sourceDomain: "athletics.com.au",
    date: "20 Feb 2024",
    confidence: 98,
    sourcesCount: 4,
    timestamp: "3 weeks ago"
  },
  {
    id: "item-6",
    category: "media",
    summary: "Mentioned as a 'key athlete to watch' in the World Athletics preview for the upcoming Oceania Championships.",
    quote: "New Zealand's Lola Anderson arrives with momentum. Having consistently hit sub-11.30s marks this domestic season, she is a strong contender for individual medals and relay duties.",
    sourceDomain: "worldathletics.org",
    date: "15 Feb 2024",
    confidence: 92,
    sourcesCount: 1,
    timestamp: "1 month ago"
  }
];

const categoryConfig = {
  result: { label: "Results & Rankings", icon: Trophy, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  media: { label: "Media & Interviews", icon: Newspaper, color: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" },
  sponsorship: { label: "Sponsorships & Partnerships", icon: Award, color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
  career: { label: "Career Changes", icon: Briefcase, color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" },
};

type TabFilter = "all" | ItemCategory;

export function AthleteFeed() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const filteredData = activeTab === "all" ? feedData : feedData.filter(item => item.category === activeTab);

  const getCount = (tab: TabFilter) => {
    if (tab === "all") return feedData.length;
    return feedData.filter(item => item.category === tab).length;
  };

  const tabs: { id: TabFilter; label: string }[] = [
    { id: "all", label: "All Intelligence" },
    { id: "result", label: "Results & Rankings" },
    { id: "media", label: "Media & Interviews" },
    { id: "sponsorship", label: "Sponsorships & Partnerships" },
    { id: "career", label: "Career Changes" }
  ];

  return (
    <AppLayout activePage="feed">
      <div className="athlete-intelligence-root h-full flex flex-col relative w-full overflow-hidden bg-[#FCFAFA]">
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Breadcrumb / Top Bar */}
        <div className="h-14 border-b border-[rgba(41,48,85,0.10)] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Athletics NZ</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="hover:text-[#3D426A] cursor-pointer transition-colors">Monitored Athletes</span>
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055]">Lola Anderson</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
          {/* Athlete Profile Header */}
          <div className="px-8 py-8 border-b border-[rgba(41,48,85,0.10)] bg-gradient-to-b from-[#F5F0F0] to-[#FCFAFA]">
            <div className="flex justify-between items-start max-w-5xl mx-auto w-full">
              <div className="flex gap-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border border-[rgba(41,48,85,0.15)] shadow-2xl shrink-0 bg-[#E8E0E0]">
                  <img src="/__mockup/images/lola-anderson.jpg" className="w-full h-full object-cover" alt="Lola Anderson" />
                </div>
                
                <div className="flex flex-col justify-center py-1">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h1 className="text-[26px] font-semibold text-[#1C1F3A] tracking-tight leading-none">Lola Anderson</h1>
                    <span className="px-2 py-0.5 rounded-md bg-[rgba(231,93,80,0.10)] text-[#344F9F] text-[11px] font-semibold tracking-wide border border-[rgba(231,93,80,0.18)]">
                      National Squad
                    </span>
                  </div>
                  
                  <div className="text-[14px] text-[#7A8090] mb-4 flex items-center gap-2 font-medium">
                    <span>100m/200m Sprint</span>
                    <span className="w-1 h-1 rounded-full bg-[#C0C8DC]"></span>
                    <span>Athletics NZ</span>
                  </div>
                  
                  <div className="flex items-center gap-5 text-[12px]">
                    <div className="flex items-center gap-1.5 text-[#6B7080]">
                      <MapPin size={14} className="text-[#9097B0]" />
                      NZ, 22 yrs
                    </div>
                    <div className="w-px h-3.5 bg-[rgba(41,48,85,0.15)]"></div>
                    <div className="flex items-center gap-1.5 text-[#6B7080]">
                      <Trophy size={14} className="text-[#9097B0]" />
                      Ranked 3rd NZ
                    </div>
                    <div className="w-px h-3.5 bg-[rgba(41,48,85,0.15)]"></div>
                    <div className="flex items-center gap-1.5 text-[#6B7080]">
                      <Activity size={14} className="text-[#9097B0]" />
                      PB 11.24s (100m)
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-4 py-1">
                <div className="flex items-center gap-2 text-[11px] text-[#8A90A8] font-medium border border-[rgba(41,48,85,0.10)] rounded-full px-3 py-1 bg-[#FFFFFF]">
                  <div className="flex items-center justify-center w-3 h-3 rounded-full bg-[rgba(16,185,129,0.15)] relative">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                  </div>
                  Agent Active <span className="text-[#B0B8D0]">·</span> Last crawled 12m ago
                </div>
                
                <button className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[rgba(41,48,85,0.08)] border border-[rgba(41,48,85,0.12)] hover:bg-[rgba(255,255,255,0.09)] transition-all text-[#293055] text-[13px] font-medium shadow-sm">
                  <Bell size={14} className="text-[#7A8090]" />
                  Configure Alerts
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto w-full px-8 mt-6">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between border-b border-[rgba(41,48,85,0.12)] mb-6">
              <div className="flex gap-6">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const count = getCount(tab.id);
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative pb-3 text-[13px] font-medium transition-colors flex items-center gap-2 ${
                        isActive ? "text-[#293055]" : "text-[#8A90A8] hover:text-[#6B7080]"
                      }`}
                    >
                      {tab.label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isActive 
                          ? "bg-[rgba(41,48,85,0.15)] text-[#293055]" 
                          : "bg-[rgba(41,48,85,0.08)] text-[#9097B0]"
                      }`}>
                        {count}
                      </span>
                      {isActive && <div className="tab-active-indicator" />}
                    </button>
                  );
                })}
              </div>
              <div className="pb-3 flex items-center gap-2 text-[#8A90A8] text-[13px] cursor-pointer hover:text-[#293055] transition-colors">
                <Filter size={14} />
                Filters
              </div>
            </div>

            {/* Intelligence Feed */}
            <div className="flex flex-col space-y-4">
              {filteredData.map((item) => {
                const config = categoryConfig[item.category];
                const Icon = config.icon;
                
                return (
                  <div key={item.id} className="card-hover-fx border border-[rgba(41,48,85,0.10)] rounded-xl bg-[#FFFFFF] p-5 relative overflow-hidden group">
                    {/* Category and timestamp */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-semibold"
                          style={{
                            backgroundColor: config.bg,
                            borderColor: `rgba(${config.color.replace('#', '')}, 0.2)`, // Simplified for mockup
                            color: config.color
                          }}
                        >
                          <Icon size={12} strokeWidth={2.5} />
                          {config.label}
                        </div>
                        <div className="text-[12px] font-medium text-[#9097B0]">{item.timestamp}</div>
                      </div>
                      <button className="text-[#B0B8D0] hover:text-[#293055] transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                    
                    {/* Summary */}
                    <h3 className="text-[15px] font-medium text-[#293055] leading-snug mb-3">
                      {item.summary}
                    </h3>
                    
                    {/* Quote block */}
                    <div className="border-l-2 border-[#DDDAE0] pl-4 py-0.5 mb-4 text-[#7A8090] text-[13px] leading-relaxed">
                      "{item.quote}"
                    </div>
                    
                    {/* Attribution and Confidence */}
                    <div className="flex items-center justify-between pt-3.5 border-t border-[rgba(41,48,85,0.06)] mt-2">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[12px] text-[#8A90A8] font-medium">
                          <ExternalLink size={12} className="text-[#9097B0]" />
                          {item.sourceDomain}
                          <span className="mx-1 text-[#C0C8DC]">·</span>
                          {item.date}
                        </div>
                        
                        <div className="w-px h-3 bg-[rgba(41,48,85,0.12)]"></div>
                        
                        <div className="flex items-center gap-1.5 text-[12px] font-medium">
                          <ShieldCheck size={14} className={item.confidence >= 95 ? "text-[#E75D50]" : "text-[#10b981]"} />
                          <span className="text-[#6B7080]">
                            {item.confidence}% Confidence
                          </span>
                          {item.sourcesCount > 1 && (
                            <span className="text-[#9097B0] ml-1">
                              ({item.sourcesCount} sources)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button className="flex items-center gap-1.5 text-[11px] font-medium text-[#9097B0] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100">
                        <Flag size={12} />
                        Report
                      </button>
                    </div>
                  </div>
                );
              })}
              
              {filteredData.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center border border-[rgba(41,48,85,0.06)] rounded-xl border-dashed">
                  <div className="w-12 h-12 rounded-full bg-[rgba(41,48,85,0.04)] flex items-center justify-center mb-3">
                    <Activity size={20} className="text-[#9097B0]" />
                  </div>
                  <h3 className="text-[14px] font-medium text-[#293055] mb-1">No intelligence found</h3>
                  <p className="text-[13px] text-[#8A90A8]">There are no recent updates in this category.</p>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-center pb-8">
              <button className="text-[13px] font-medium text-[#8A90A8] hover:text-[#293055] transition-colors flex items-center gap-2">
                Load more activity
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
