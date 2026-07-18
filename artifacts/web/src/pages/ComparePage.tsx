import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";
import {
  Trophy, TrendingUp, TrendingDown, Users, Activity,
  Sparkles, ShieldCheck, ExternalLink, Calendar, Plus, X, ChevronRight, Star, BarChart2,
} from "lucide-react";

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(["lola", "priya"]);
  const [showAdd, setShowAdd] = useState(false);

  const roster = [
    { id: "lola", name: "Lola Anderson", color: "#E75D50", event: "100m Sprint", worldRank: 127, pb: "11.24s", pbRaw: 94, totalFollowers: 24500 },
    { id: "priya", name: "Priya Nair", color: "#344F9F", event: "5000m", worldRank: 241, pb: "15:12.4", pbRaw: 71, totalFollowers: 8100 },
    { id: "james", name: "James Kowalski", color: "#7C6FA0", event: "High Jump", worldRank: 42, pb: "2.24m", pbRaw: 88, totalFollowers: 16700 },
  ];

  const selected = roster.filter(a => selectedIds.includes(a.id));
  const available = roster.filter(a => !selectedIds.includes(a.id));

  return (
    <AppLayout activePage="dashboard">
      <div className="h-full flex flex-col bg-[#FCFAFA] overflow-hidden">
        {/* Top bar */}
        <div className="h-14 border-b border-[#DCE2EF] flex items-center px-6 shrink-0 bg-[#FCFAFA]">
          <div className="flex items-center gap-2 text-[13px] font-medium text-[#8A90A8]">
            <BarChart2 size={14} className="text-[#9097B0]" />
            <ChevronRight size={14} className="text-[#C0C8DC]" />
            <span className="text-[#293055] font-semibold">Compare Athletes</span>
          </div>
        </div>

        {/* Athlete selector */}
        <div className="px-6 py-3 border-b border-[#DCE2EF] bg-[#FCFAFA] shrink-0 flex items-center gap-2 flex-wrap">
          {selected.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-xl border text-[12px] font-semibold"
              style={{ background: a.color + "12", borderColor: a.color + "30", color: a.color }}
            >
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: a.color }}>
                {a.name.substring(0,2).toUpperCase()}
              </div>
              {a.name}
              {selectedIds.length > 2 && (
                <button onClick={() => setSelectedIds(prev => prev.filter(x => x !== a.id))} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                  <X size={11} />
                </button>
              )}
            </div>
          ))}

          {selected.length < 4 && (
            <div className="relative">
              <button
                onClick={() => setShowAdd(!showAdd)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-[#DCE2EF] text-[12px] text-[#8A90A8] hover:border-[#8A90A8] hover:text-[#293055] transition-all bg-white"
              >
                <Plus size={12} /> Add athlete
              </button>
              {showAdd && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-xl border border-[#DCE2EF] shadow-xl z-50 py-2 min-w-[180px]">
                  {available.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setSelectedIds(p => [...p, a.id]); setShowAdd(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-[#FCFAFA] transition-colors text-left"
                    >
                      <div className="text-[12px] font-semibold text-[#1C1F3A]">{a.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar px-6 py-5">
           <div className="rounded-xl border border-[#DCE2EF] bg-white overflow-hidden shadow-sm">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b border-[#DCE2EF] bg-[#FCFAFA]">
                   <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-[#A0A8C0]">Athlete</th>
                   {selected.map(a => <th key={a.id} className="p-4 font-semibold text-[#1C1F3A]">{a.name}</th>)}
                 </tr>
               </thead>
               <tbody className="divide-y divide-[#DCE2EF]">
                 <tr>
                   <td className="p-4 text-[12px] font-medium text-[#6B7080]">Event</td>
                   {selected.map(a => <td key={a.id} className="p-4 text-sm font-medium">{a.event}</td>)}
                 </tr>
                 <tr>
                   <td className="p-4 text-[12px] font-medium text-[#6B7080]">World Rank</td>
                   {selected.map(a => <td key={a.id} className="p-4 text-lg font-bold">#{a.worldRank}</td>)}
                 </tr>
                 <tr>
                   <td className="p-4 text-[12px] font-medium text-[#6B7080]">Personal Best</td>
                   {selected.map(a => <td key={a.id} className="p-4 text-sm font-medium">{a.pb}</td>)}
                 </tr>
                 <tr>
                   <td className="p-4 text-[12px] font-medium text-[#6B7080]">Total Followers</td>
                   {selected.map(a => <td key={a.id} className="p-4 text-sm font-medium">{a.totalFollowers.toLocaleString()}</td>)}
                 </tr>
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </AppLayout>
  );
}
