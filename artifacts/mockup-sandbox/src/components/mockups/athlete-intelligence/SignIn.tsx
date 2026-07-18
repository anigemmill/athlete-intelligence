import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2, Play } from 'lucide-react';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white flex font-sans selection:bg-blue-500/30">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .bg-auth-image {
          background-image: url('/__mockup/images/auth-bg.jpg');
          background-size: cover;
          background-position: center;
        }
      `}</style>
      
      {/* Left Column: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-16 lg:p-24 relative z-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 text-white">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
              <Play className="w-4 h-4 fill-current text-white" />
            </div>
            <span className="font-semibold text-lg tracking-wide">Athlete Intelligence</span>
          </div>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0 my-16">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-4 text-white">
            Welcome back
          </h1>
          <p className="text-[#a1a1aa] mb-10 text-lg">
            Persistent intelligence agents for the athletes you track.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#d4d4d8]">
                Work Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-[#71717a]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-md leading-5 bg-[#111114] text-[#e4e4e7] placeholder-[#71717a] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0b0b0d] focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0b0b0d] text-[#71717a]">Or</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                className="w-full inline-flex justify-center py-3 px-4 border border-white/10 rounded-md shadow-sm bg-[#111114] text-sm font-medium text-[#e4e4e7] hover:bg-white/5 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </div>

        <div>
          <p className="text-sm text-[#71717a] text-center lg:text-left">
            Trusted by national programmes and professional clubs in NZ, AU, and UK.
          </p>
          <div className="mt-4 text-center lg:text-left">
            <a href="#" className="text-sm font-medium text-[#a1a1aa] hover:text-blue-400 transition-colors">
              New organisation? Request access
            </a>
          </div>
        </div>
      </div>

      {/* Right Column: Visual / Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-[#111114] border-l border-white/5 overflow-hidden">
        {/* Background image overlay */}
        <div className="absolute inset-0 bg-auth-image opacity-30 mix-blend-screen" />
        
        {/* Gradient overlays for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0d] via-transparent to-transparent opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0b0d] via-transparent to-[#111114]/20 opacity-80" />

        {/* Abstract intelligence UI elements */}
        <div className="absolute inset-0 flex flex-col justify-center px-12 z-10">
          
          <div className="max-w-lg space-y-6">
            
            {/* Fake dashboard cards floating */}
            <div className="bg-[#18181c]/80 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl transform transition-transform hover:-translate-y-1 duration-500 relative">
              <div className="absolute -left-px top-1/4 w-[2px] h-12 bg-blue-500 rounded-full blur-[2px]" />
              <div className="absolute -left-px top-1/4 w-[2px] h-12 bg-blue-500 rounded-full" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900/40 flex items-center justify-center border border-blue-500/30 text-blue-400 font-medium text-sm">
                    LA
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">Lola Anderson</h4>
                    <p className="text-[#a1a1aa] text-xs">Intelligence Update • 2h ago</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-medium rounded border border-green-500/20">
                  New PB
                </div>
              </div>
              <p className="text-sm text-[#d4d4d8] leading-relaxed">
                Lola achieved a new personal best of 11.24s in the 100m sprint. Performance trajectory indicates a 94% probability of sub-11.20s this season.
              </p>
            </div>

            <div className="bg-[#18181c]/80 backdrop-blur-md border border-white/10 rounded-xl p-5 shadow-2xl transform translate-x-8 transition-transform hover:-translate-y-1 duration-500 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-900/40 flex items-center justify-center border border-blue-500/30 text-blue-400 font-medium text-sm">
                    MW
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">Marcus Webb</h4>
                    <p className="text-[#a1a1aa] text-xs">Squad Selection • 5h ago</p>
                  </div>
                </div>
                <div className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs font-medium rounded border border-blue-500/20">
                  Decathlon
                </div>
              </div>
              
              {/* Fake chart */}
              <div className="flex items-end gap-2 h-16 mt-4 w-full">
                {[40, 60, 45, 80, 55, 90, 75, 100].map((height, i) => (
                  <div key={i} className="flex-1 bg-white/5 rounded-t-sm relative group overflow-hidden" style={{ height: '100%' }}>
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-blue-500/30 group-hover:bg-blue-500/50 transition-colors duration-300" 
                      style={{ height: `${height}%` }}
                    />
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-blue-500 top-0 transition-opacity duration-300 opacity-0 group-hover:opacity-100" 
                      style={{ height: '2px', top: `${100 - height}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
