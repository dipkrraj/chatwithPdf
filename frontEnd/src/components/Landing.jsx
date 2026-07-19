import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, FileText, BookOpen, Layers, Search, Shield, 
  ArrowRight, Upload, MessageSquare, HelpCircle, CheckCircle2 
} from 'lucide-react';
import logo from '../assets/logo.png';

const GithubIcon = (props) => (
  <svg 
    viewBox="0 0 24 24" 
    width="24" 
    height="24" 
    stroke="currentColor" 
    strokeWidth="2" 
    fill="none" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={props.className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const features = [
  {
    icon: <MessageSquare className="w-5 h-5 text-brand-400" />,
    title: "AI Chat",
    desc: "Natural conversations with documents to query information instantly."
  },
  {
    icon: <Sparkles className="w-5 h-5 text-brand-400" />,
    title: "Smart Summaries",
    desc: "Auto-generate key takeaways, bulleted lists, and executive briefs."
  },
  {
    icon: <BookOpen className="w-5 h-5 text-brand-400" />,
    title: "Source Citations",
    desc: "Trustworthy answers backed by exact page references."
  },
  {
    icon: <Layers className="w-5 h-5 text-brand-400" />,
    title: "Multi-PDF Support",
    desc: "Maintain and switch chat contexts across multiple active documents."
  },
  {
    icon: <Search className="w-5 h-5 text-brand-400" />,
    title: "Fast Search",
    desc: "Semantic lookup parses document layers to find exact meanings."
  },
  {
    icon: <Shield className="w-5 h-5 text-brand-400" />,
    title: "Secure Processing",
    desc: "Encryption-first pipeline ensures your files remain private."
  }
];

const steps = [
  {
    num: "01",
    title: "Upload",
    desc: "Drag & drop your files securely into the workspace."
  },
  {
    num: "02",
    title: "AI Understands",
    desc: "The system parses text and generates concept vectors."
  },
  {
    num: "03",
    title: "Ask Anything",
    desc: "Query the document in natural conversational language."
  },
  {
    num: "04",
    title: "Get Answers",
    desc: "Receive accurate answers backlinked directly to sources."
  }
];

export default function Landing({ onStartFree, onLoginClick }) {
  return (
    <div className="min-h-screen bg-[#080d16] text-[#eef0f2] selection:bg-brand-500/30 selection:text-white">
      
      {/* 1. Header/Navigation */}
      <header className="border-b border-[#222f44] bg-[#0c121e]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-9 h-9 object-contain select-none" />
            <span className="text-xl font-bold tracking-tight text-white select-none">DverseAI</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/dipkrraj/chatwithPdf"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 px-3 text-dark-300 hover:text-white bg-[#131b26] border border-[#222f44] hover:border-dark-600 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="View on GitHub"
            >
              <GithubIcon className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
            <button 
              onClick={onLoginClick}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl transition-all"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        {/* Glow BG blobs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-medium select-none">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Document Assistant</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Chat with Your <br />
              <span className="bg-gradient-to-r from-brand-400 to-blue-400 bg-clip-text text-transparent">Documents.</span>
            </h1>
            
            <p className="text-base text-dark-400 max-w-xl leading-relaxed">
              Upload a document once. Ask anything. Get accurate answers with page references.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button 
                onClick={onStartFree}
                className="px-6 py-3.5 rounded-xl bg-[#8b5cf6] hover:bg-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 transition-all flex items-center gap-2 group"
              >
                <span>Start Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={onStartFree}
                className="px-6 py-3.5 rounded-xl bg-[#131b26] hover:bg-[#1a2433] border border-[#222f44] hover:border-dark-600 text-dark-300 hover:text-white text-sm font-semibold transition-all"
              >
                Live Demo
              </button>
            </div>
          </div>

          {/* Product Preview Interface Illustration */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 to-blue-500 rounded-3xl blur-2xl opacity-10" />
            
            {/* Live Chat Mockup */}
            <div className="relative bg-[#131b26] border border-[#222f44] rounded-2xl shadow-2xl overflow-hidden text-left h-[380px] flex flex-col">
              <div className="p-4 border-b border-[#222f44] flex items-center justify-between bg-[#111721]/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Product Preview (Live Chat Interface)</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-dark-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-dark-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-dark-700" />
                </div>
              </div>
              
              {/* Mock Chat Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                {/* User Message */}
                <div className="flex items-start gap-2.5 justify-end">
                  <div className="p-3 rounded-2xl bg-[#223047] text-white rounded-tr-none border border-[#2d3f5c] max-w-[80%]">
                    Can you summarize the core agreements of this document?
                  </div>
                </div>
                
                {/* Bot Response */}
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0 select-none">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1.5 max-w-[80%]">
                    <div className="p-3 rounded-2xl bg-[#1b2535] text-dark-100 rounded-tl-none border border-[#253349] space-y-1.5 leading-relaxed">
                      <p>The document outlines three principal clauses:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Clause 1:</strong> Termination guidelines & timelines (Page 4).</li>
                        <li><strong>Clause 2:</strong> intellectual property ownership structures (Page 9).</li>
                      </ul>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-dark-400 px-1">
                      <BookOpen className="w-3 h-3 text-brand-400" />
                      <span>Sources:</span>
                      <span className="px-1.5 py-0.5 rounded bg-dark-900 border border-dark-800 text-brand-400 font-bold">Page 4</span>
                      <span className="px-1.5 py-0.5 rounded bg-dark-900 border border-dark-800 text-brand-400 font-bold">Page 9</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      <section className="py-20 border-t border-[#131b26] bg-[#0c121e]/30">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="space-y-3 max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">Full-Featured Workspace</h2>
            <p className="text-xs text-dark-400 leading-relaxed">
              Everything you need to extract insight, cross-reference data, and parse files instantly.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div 
                key={idx}
                className="bg-[#131b26] border border-[#222f44] hover:border-brand-500/30 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-4 group-hover:bg-[#8b5cf6] group-hover:text-white transition-colors duration-300">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-dark-400 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. How It Works Section */}
      <section className="py-20 border-t border-[#131b26]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="space-y-3 max-w-xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white">How It Works</h2>
            <p className="text-xs text-dark-400 leading-relaxed">
              Go from raw files to structured knowledge in four simple steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((step, idx) => (
              <div 
                key={idx}
                className="bg-[#131b26] border border-[#222f44] rounded-2xl p-6 text-left relative"
              >
                <div className="text-3xl font-extrabold text-brand-500/20 mb-3">{step.num}</div>
                <h3 className="text-sm font-bold text-white mb-1.5">{step.title}</h3>
                <p className="text-xs text-dark-400 leading-relaxed">{step.desc}</p>
                
                {/* Visual arrow indicator for connections */}
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 border-t-2 border-r-2 border-[#222f44] rotate-45 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CTA Footer Section */}
      <section className="py-24 border-t border-[#131b26] bg-[#0c121e]/50 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-4xl mx-auto px-6 text-center space-y-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Ready to save hours reading documents?
          </h2>
          <p className="text-xs text-dark-400 max-w-md mx-auto leading-relaxed">
            Join thousands of professionals parsing PDFs, contracts, and guidelines instantly. No credit card required.
          </p>
          <button 
            onClick={onStartFree}
            className="px-8 py-4 rounded-xl bg-[#8b5cf6] hover:bg-brand-600 text-white text-sm font-bold shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 transition-all inline-flex items-center gap-2 group"
          >
            <span>Start Using DverseAI</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer copyright */}
      <footer className="border-t border-[#131b26] py-8 text-center text-xs text-dark-500 space-y-2">
        <p>&copy; {new Date().getFullYear()} DverseAI. All rights reserved.</p>
        <p className="flex items-center justify-center gap-1 text-[10px]">
          <span>Released under open source license. Link on</span>
          <a 
            href="https://github.com/dipkrraj/chatwithPdf" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-brand-400 hover:underline font-semibold flex items-center gap-0.5"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>
        </p>
      </footer>

    </div>
  );
}
