import React, { useState } from "react";
import { AppLayout } from "./_shared/AppLayout";
import { 
  ArrowLeft, 
  Trophy, 
  Mic2, 
  Briefcase, 
  Activity, 
  Check, 
  ChevronDown,
  Bell,
  Mail,
  Smartphone
} from "lucide-react";

// Mock toggle component to keep things contained
const Switch = ({ checked, onChange }: { checked: boolean, onChange: (checked: boolean) => void }) => {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[20px] w-[36px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d] ${
        checked ? 'bg-[#3b82f6]' : 'bg-[#27272a]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-[16px]' : 'translate-x-0'
        }`}
      />
    </button>
  );
};

interface AlertCategoryProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  frequency: "Immediate" | "Daily" | "Weekly";
  lastTriggered: string;
  onToggle: (id: string, enabled: boolean) => void;
  onFrequencyChange: (id: string, frequency: "Immediate" | "Daily" | "Weekly") => void;
}

const AlertCategoryCard = ({ 
  id, 
  title, 
  description, 
  icon, 
  enabled, 
  frequency, 
  lastTriggered,
  onToggle,
  onFrequencyChange
}: AlertCategoryProps) => {
  return (
    <div className="flex flex-col rounded-lg border border-white/[0.06] bg-[#111114] p-5 transition-colors hover:border-white/[0.1]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/[0.06] bg-white/[0.02] text-[#a1a1aa]">
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#e2e2e6]">{title}</h3>
            <p className="mt-1 text-sm text-[#a1a1aa] leading-relaxed max-w-[480px]">
              {description}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center pt-1">
          <Switch checked={enabled} onChange={(c) => onToggle(id, c)} />
        </div>
      </div>

      <div className={`mt-5 flex items-center justify-between border-t border-white/[0.04] pt-4 transition-opacity duration-200 ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#a1a1aa]">Frequency</span>
          <div className="relative">
            <select
              value={frequency}
              onChange={(e) => onFrequencyChange(id, e.target.value as "Immediate" | "Daily" | "Weekly")}
              disabled={!enabled}
              className="appearance-none rounded border border-white/[0.08] bg-white/[0.03] py-1.5 pl-3 pr-8 text-xs text-[#e2e2e6] focus:border-[#3b82f6] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            >
              <option value="Immediate">Immediate</option>
              <option value="Daily">Daily digest</option>
              <option value="Weekly">Weekly digest</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a1a1aa] pointer-events-none" />
          </div>
        </div>
        
        {lastTriggered && (
          <div className="text-[11px] text-[#71717a]">
            Last triggered: {lastTriggered}
          </div>
        )}
      </div>
    </div>
  );
};

export function AlertConfig() {
  const [categories, setCategories] = useState([
    {
      id: "results",
      title: "Results & Rankings",
      description: "Competition results, ranking changes, personal bests, world rankings updates and qualifying times.",
      icon: <Trophy className="h-4 w-4" />,
      enabled: true,
      frequency: "Immediate" as const,
      lastTriggered: "2 hours ago"
    },
    {
      id: "media",
      title: "Media & Interviews",
      description: "Press mentions, televised interviews, podcast appearances, and significant social media traction.",
      icon: <Mic2 className="h-4 w-4" />,
      enabled: true,
      frequency: "Daily" as const,
      lastTriggered: "Yesterday, 09:00"
    },
    {
      id: "sponsorship",
      title: "Sponsorships & Partnerships",
      description: "Brand deals, dropped sponsors, gear changes, and commercial announcements.",
      icon: <Briefcase className="h-4 w-4" />,
      enabled: false,
      frequency: "Weekly" as const,
      lastTriggered: "Mar 12, 2024"
    },
    {
      id: "career",
      title: "Career Changes",
      description: "Agent representation changes, coaching staff updates, and training base relocations.",
      icon: <Activity className="h-4 w-4" />,
      enabled: true,
      frequency: "Daily" as const,
      lastTriggered: "Jan 05, 2024"
    }
  ]);

  const [deliveryMethod, setDeliveryMethod] = useState<"both" | "in-app">("both");
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleToggle = (id: string, enabled: boolean) => {
    setCategories(categories.map(c => c.id === id ? { ...c, enabled } : c));
    setHasSaved(false);
  };

  const handleFrequencyChange = (id: string, frequency: "Immediate" | "Daily" | "Weekly") => {
    setCategories(categories.map(c => c.id === id ? { ...c, frequency } : c));
    setHasSaved(false);
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2000);
    }, 600);
  };

  return (
    <AppLayout activePage="alerts">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
      `}} />
      
      <div className="flex h-full w-full flex-col bg-[#0b0b0d] font-['Inter']">
        {/* Header */}
        <header className="flex shrink-0 flex-col gap-4 border-b border-white/[0.06] bg-[#0b0b0d] px-8 py-6">
          <button className="group flex w-fit items-center gap-2 text-sm text-[#a1a1aa] transition-colors hover:text-[#e2e2e6]">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Back to Intelligence Feed
          </button>
          
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#e2e2e6]">
                Alert Configuration
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-[#a1a1aa]">
                <span className="font-medium text-[#e2e2e6]">Priya Nair</span>
                <span className="h-1 w-1 rounded-full bg-white/[0.2]" />
                <span>5000m / 10000m</span>
                <span className="h-1 w-1 rounded-full bg-white/[0.2]" />
                <span>NZL</span>
              </div>
            </div>
            
            <button 
              onClick={handleSave}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                hasSaved 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90 shadow-[0_0_12px_rgba(59,130,246,0.2)]'
              }`}
            >
              {isSaving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : hasSaved ? (
                <>
                  <Check className="h-4 w-4" />
                  Saved
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl space-y-10">
            
            {/* Alert Categories */}
            <section>
              <div className="mb-6">
                <h2 className="text-base font-medium text-[#e2e2e6]">Intelligence Categories</h2>
                <p className="mt-1 text-sm text-[#a1a1aa]">
                  Select which types of intelligence should trigger a notification.
                </p>
              </div>
              
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {categories.map((category) => (
                  <AlertCategoryCard
                    key={category.id}
                    {...category}
                    onToggle={handleToggle}
                    onFrequencyChange={handleFrequencyChange}
                  />
                ))}
              </div>
            </section>

            {/* Global Preferences */}
            <section className="border-t border-white/[0.06] pt-10">
              <div className="mb-6 flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#a1a1aa]" />
                <h2 className="text-base font-medium text-[#e2e2e6]">Delivery Preferences</h2>
              </div>
              
              <div className="rounded-lg border border-white/[0.06] bg-[#111114] p-5">
                <div className="grid gap-6 md:grid-cols-2">
                  
                  <button 
                    onClick={() => { setDeliveryMethod("both"); setHasSaved(false); }}
                    className={`flex flex-col items-start gap-3 rounded-md border p-4 text-left transition-all ${
                      deliveryMethod === "both" 
                        ? 'border-[#3b82f6] bg-[#3b82f6]/[0.04]' 
                        : 'border-white/[0.06] hover:border-white/[0.1] bg-transparent'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className={`h-4 w-4 ${deliveryMethod === "both" ? 'text-[#3b82f6]' : 'text-[#a1a1aa]'}`} />
                        <span className={`text-sm font-medium ${deliveryMethod === "both" ? 'text-[#3b82f6]' : 'text-[#e2e2e6]'}`}>Email & In-App</span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${deliveryMethod === "both" ? 'border-[#3b82f6]' : 'border-white/[0.2]'}`}>
                        {deliveryMethod === "both" && <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />}
                      </div>
                    </div>
                    <p className="text-xs text-[#a1a1aa] leading-relaxed">
                      Receive notifications in the platform and via email to <span className="text-[#e2e2e6]">d.director@athletics.org.nz</span>
                    </p>
                  </button>

                  <button 
                    onClick={() => { setDeliveryMethod("in-app"); setHasSaved(false); }}
                    className={`flex flex-col items-start gap-3 rounded-md border p-4 text-left transition-all ${
                      deliveryMethod === "in-app" 
                        ? 'border-[#3b82f6] bg-[#3b82f6]/[0.04]' 
                        : 'border-white/[0.06] hover:border-white/[0.1] bg-transparent'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className={`h-4 w-4 ${deliveryMethod === "in-app" ? 'text-[#3b82f6]' : 'text-[#a1a1aa]'}`} />
                        <span className={`text-sm font-medium ${deliveryMethod === "in-app" ? 'text-[#3b82f6]' : 'text-[#e2e2e6]'}`}>In-App Only</span>
                      </div>
                      <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${deliveryMethod === "in-app" ? 'border-[#3b82f6]' : 'border-white/[0.2]'}`}>
                        {deliveryMethod === "in-app" && <div className="h-2 w-2 rounded-full bg-[#3b82f6]" />}
                      </div>
                    </div>
                    <p className="text-xs text-[#a1a1aa] leading-relaxed">
                      Keep my inbox clean. Only show alerts within the Intelligence platform when I log in.
                    </p>
                  </button>

                </div>
              </div>
            </section>
            
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
