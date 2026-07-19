import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, FileText, Trash2, RefreshCw, 
  MessageSquare, Send, Paperclip, LogOut, Sparkles, BookOpen, Clock, AlertTriangle, User, CheckCircle2, Layers
} from 'lucide-react';
import api from '../api';
import logo from '../assets/logo.png';

const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&q=80";

export default function Dashboard({ onLogout }) {
  const queryClient = useQueryClient();
  const [pdfs, setPdfs] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingPdfs, setLoadingPdfs] = useState(true);

  // File Upload State
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');

  // Chat State
  const [question, setQuestion] = useState('');
  const messagesEndRef = useRef(null);

  // Read Google profile picture from profile API or fallback to localStorage
  const userAvatar = profile?.profile_pic || localStorage.getItem('user_avatar') || DEFAULT_AVATAR;

  // Fetch initial profile and PDF files
  useEffect(() => {
    fetchProfile();
    fetchPdfs();
  }, []);

  // Poll status if any PDFs are unfinished (status is not done or failed)
  useEffect(() => {
    const hasUnfinishedPdfs = pdfs.some(
      (pdf) => pdf.status !== 'done' && pdf.status !== 'failed'
    );

    if (hasUnfinishedPdfs) {
      const interval = setInterval(fetchPdfs, 1500);
      return () => clearInterval(interval);
    }
  }, [pdfs]);

  // If a selected PDF is currently loading, keep updating its status object in state
  useEffect(() => {
    if (selectedPdf) {
      const updated = pdfs.find(p => p.id === selectedPdf.id);
      if (updated && updated.status !== selectedPdf.status) {
        setSelectedPdf(updated);
      }
    }
  }, [pdfs, selectedPdf]);

  // Auto-select PDF once loaded to start chat immediately (only on initial load)
  useEffect(() => {
    if (pdfs.length > 0 && !selectedPdf) {
      const readyPdf = pdfs.find(p => p.status === 'done') || pdfs[0];
      setSelectedPdf(readyPdf);
    }
  }, [pdfs, selectedPdf]);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get('/api/v1/auth/me');
      setProfile(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPdfs = async () => {
    try {
      const { data } = await api.get('/api/v1/pdfs/');
      setPdfs(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPdfs(false);
    }
  };

  // Chat History Query using TanStack Query
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['chat_history', selectedPdf?.id],
    queryFn: async () => {
      if (!selectedPdf || selectedPdf.status !== 'done') return [];
      const { data } = await api.get(`/api/v1/chat/history/${selectedPdf.id}?limit=100`);
      return data.items;
    },
    enabled: !!selectedPdf && selectedPdf.status === 'done',
  });

  const messages = historyData || [];

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async (text) => {
      const { data } = await api.post('/api/v1/chat/', {
        pdf_id: selectedPdf.id,
        question: text,
      });
      return data;
    },
    onMutate: async (text) => {
      await queryClient.cancelQueries(['chat_history', selectedPdf.id]);
      const previousHistory = queryClient.getQueryData(['chat_history', selectedPdf.id]) || [];

      const optimisticUserMsg = {
        id: Date.now(),
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ['chat_history', selectedPdf.id],
        [...previousHistory, optimisticUserMsg]
      );

      return { previousHistory };
    },
    onError: (err, text, context) => {
      queryClient.setQueryData(['chat_history', selectedPdf.id], context.previousHistory);
      alert(err.message || 'Failed to send message');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat_history', selectedPdf.id]);
    },
  });

  // Clear Chat History Mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/v1/chat/history/${selectedPdf.id}`);
    },
    onSuccess: () => {
      queryClient.setQueryData(['chat_history', selectedPdf.id], []);
    },
  });

  // Delete PDF
  const handleDeletePdf = async (e, pdfId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this PDF and its chat logs?')) return;

    try {
      await api.delete(`/api/v1/pdfs/${pdfId}`);
      if (selectedPdf?.id === pdfId) {
        setSelectedPdf(null);
      }
      fetchPdfs();
    } catch (err) {
      alert(err.message || 'Failed to delete PDF');
    }
  };

  // Upload File Logic
  const uploadFile = async (file) => {
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setUploadError('Only PDF files are supported.');
      return;
    }

    setUploading(true);
    setUploadError('');
    setProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/api/v1/pdfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 90) / progressEvent.total);
          setProgress(10 + percent);
        },
      });
      setProgress(100);
      
      // Select the newly uploaded PDF immediately to show the processing loader
      setSelectedPdf(data);
      
      setTimeout(() => {
        setUploading(false);
        fetchPdfs();
      }, 1000);
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!question.trim() || sendMutation.isPending || !selectedPdf) return;

    const text = question;
    setQuestion('');
    sendMutation.mutate(text);
  };

  const handleLogout = async () => {
    try {
      const rt = localStorage.getItem('refresh_token');
      if (rt) await api.post('/api/v1/auth/logout', { refresh_token: rt });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_avatar');
      onLogout();
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'done': return 'Ready';
      case 'parsing': return 'Parsing text (1/3)...';
      case 'embedding': return 'Vectorizing content (2/3)...';
      case 'indexing': return 'Storing in database (3/3)...';
      case 'failed': return 'Failed';
      default: return 'Queued';
    }
  };

  const getStatusPercent = (status) => {
    switch (status) {
      case 'parsing': return 33;
      case 'embedding': return 66;
      case 'indexing': return 90;
      case 'done': return 100;
      case 'failed': return 0;
      default: return 10;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />;
      default:
        return <RefreshCw className="w-4 h-4 text-brand-400 animate-spin shrink-0" />;
    }
  };

  const renderMessageContent = (content) => {
    // Clean split guarding to prevent any UI unresponsiveness
    return (content || '').split('\n').map((line, idx) => {
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        formattedLine = line.replace(boldRegex, (match, p1) => `<strong>${p1}</strong>`);
      }

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm leading-relaxed mb-1" dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[\-\*]\s/, '') }} />
        );
      }
      return (
        <p key={idx} className="text-sm leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: formattedLine }} />
      );
    });
  };

  return (
    <div className="min-h-screen bg-[#080d16] text-[#eef0f2] p-6 flex justify-center items-stretch overflow-hidden">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 h-[calc(100vh-3rem)]">
        
        {/* LEFT COLUMN: Controls & Document List (40% width) */}
        <div className="w-full lg:w-[40%] flex flex-col gap-6 h-full overflow-y-auto shrink-0 pr-1">
          
          {/* Logo & Header Card */}
          <div className="bg-[#131b26] border border-[#222f44] rounded-2xl p-6 shadow-xl relative overflow-hidden shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="w-10 h-10 object-contain select-none" />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    DverseAI 
                  </h1>
                  <p className="text-xs text-dark-400 mt-0.5">
                    Upload files and chat with AI assistant
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {profile && (
                  <div className="flex items-center gap-2.5 text-xs bg-[#1a2332] pl-1.5 pr-3.5 py-1.5 rounded-xl border border-dark-800">
                    <div className="relative">
                      <img
                        src={userAvatar}
                        alt="Profile"
                        className="w-5 h-5 rounded-lg object-cover border border-white/20 select-none"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#1a2332]" />
                    </div>
                    <span className="font-semibold text-white">
                      {profile.username.charAt(0).toUpperCase() + profile.username.slice(1)}
                    </span>
                  </div>
                )}
                <button 
                  onClick={handleLogout}
                  className="p-2 rounded-xl bg-[#1a2332] border border-dark-800 hover:border-red-500/30 hover:bg-red-500/10 text-dark-400 hover:text-red-400 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick File Upload Drag and Drop box */}
          <div className="bg-[#131b26] border border-[#222f44] rounded-2xl p-6 shadow-xl relative overflow-hidden shrink-0">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border border-dashed rounded-xl py-10 px-4 text-center transition-all relative ${
                dragActive 
                  ? 'border-brand-500 bg-brand-500/10' 
                  : uploading 
                  ? 'border-dark-700 bg-dark-900/10 pointer-events-none' 
                  : 'border-[#222f44] hover:border-brand-500/50 bg-[#0c121e]/50 hover:bg-brand-500/5'
              }`}
            >
              <input
                type="file"
                id="dashboard-file-upload"
                className="hidden"
                accept=".pdf"
                disabled={uploading}
                onChange={(e) => uploadFile(e.target.files?.[0])}
              />
              
              <label htmlFor="dashboard-file-upload" className="flex flex-col items-center justify-center cursor-pointer">
                {uploading ? (
                  <div className="w-full max-w-xs space-y-3">
                    <RefreshCw className="w-6 h-6 text-brand-400 animate-spin mx-auto" />
                    <div className="text-xs font-semibold text-white">Uploading Document...</div>
                    <div className="w-full bg-[#1e293b] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-gradient-to-r from-brand-500 to-blue-500 h-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-brand-400 mb-2" />
                    <span className="text-sm font-semibold text-white">Quick File Upload</span>
                    <span className="text-xs text-dark-400 mt-1">
                      Drag files here or <span className="text-brand-400 hover:text-brand-300 underline font-medium">browse</span>
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Upload Error notification */}
            {uploadError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}
          </div>

          {/* Active Document List Card */}
          <div className="bg-[#131b26] border border-[#222f44] rounded-2xl p-6 shadow-xl flex-1 flex flex-col min-h-[220px]">
            <div className="text-[10px] font-bold text-dark-400 uppercase tracking-widest mb-3 select-none">
              Active Document List
            </div>
            {loadingPdfs ? (
              <div className="flex-1 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-brand-500 animate-spin" />
              </div>
            ) : pdfs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <FileText className="w-8 h-8 text-dark-500 mb-2" />
                <span className="text-xs text-dark-400">No PDFs uploaded yet.</span>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                {pdfs.map((pdf) => {
                  const isSelected = selectedPdf?.id === pdf.id;
                  const isReady = pdf.status === 'done';
                  return (
                    <div
                      key={pdf.id}
                      onClick={() => setSelectedPdf(pdf)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-[#8b5cf6]/20 border-brand-500/30 text-white' 
                          : 'bg-[#1a2332] border-dark-800 text-dark-300 hover:border-dark-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 shrink-0 text-dark-400" />
                        <span className="font-semibold truncate max-w-[140px]">{pdf.filename}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {!isReady && (
                          <div className="flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-brand-400" />
                            <span className="text-[9px] text-dark-400">{getStatusLabel(pdf.status)}</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => handleDeletePdf(e, pdf.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-dark-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chat with AI Assistant (60% width) */}
        <div className="w-full lg:w-[60%] bg-[#131b26] border border-[#222f44] rounded-2xl shadow-xl flex flex-col h-full overflow-hidden">
          
          {/* Card Header */}
          <div className="p-4 border-b border-[#222f44] flex items-center justify-between bg-[#111721]/30">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {/* Chat with AI Assistant */}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 select-none">
                Online
              </span>
            </div>
            
            {selectedPdf && (
              <div className="flex items-center gap-3">
                <span className="text-xs text-dark-400 hidden sm:inline">
                  Viewing: <strong className="text-white">{selectedPdf.filename}</strong>
                </span>
                {selectedPdf.status === 'done' && (
                  <button
                    onClick={() => {
                      if (window.confirm('Clear chat log for this PDF?')) clearMutation.mutate();
                    }}
                    className="text-xs text-dark-400 hover:text-red-400 font-semibold transition-colors"
                  >
                    Clear History
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Messages list view */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0c121d]/40">
            {!selectedPdf ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <MessageSquare className="w-8 h-8 text-brand-400" />
                <div className="text-sm font-semibold text-white">No active document selected</div>
                <p className="text-xs text-dark-500 max-w-xs">
                  Please upload a PDF document on the left to begin chatting.
                </p>
              </div>
            ) : selectedPdf.status !== 'done' ? (
              /* Processing Loader Workspace inside the chat view */
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
                <div className="w-12 h-12 rounded-2xl bg-[#8b5cf6]/10 flex items-center justify-center border border-brand-500/20 text-[#8b5cf6] animate-pulse">
                  <Layers className="w-6 h-6 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-base">Processing "{selectedPdf.filename}"</h4>
                  <p className="text-xs text-dark-400">
                    We are analyzing your document. The chat workspace will open automatically as soon as indexing is complete.
                  </p>
                </div>
                
                {/* Visual Steps Chain */}
                <div className="w-full grid grid-cols-3 gap-2 text-left pt-2 text-[10px]">
                  <div className={`p-3 rounded-xl border ${
                    selectedPdf.status === 'parsing' 
                      ? 'bg-brand-500/10 border-brand-500/30 text-white' 
                      : ['embedding', 'indexing', 'done'].includes(selectedPdf.status)
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-dark-900/40 border-dark-800 text-dark-500'
                  }`}>
                    <div className="font-bold mb-0.5">Step 1: Parsing</div>
                    <div>Extracting raw text...</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    selectedPdf.status === 'embedding' 
                      ? 'bg-brand-500/10 border-brand-500/30 text-white' 
                      : ['indexing', 'done'].includes(selectedPdf.status)
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-dark-900/40 border-dark-800 text-dark-500'
                  }`}>
                    <div className="font-bold mb-0.5">Step 2: Vectorizing</div>
                    <div>Generating concept mapping...</div>
                  </div>
                  <div className={`p-3 rounded-xl border ${
                    selectedPdf.status === 'indexing' 
                      ? 'bg-brand-500/10 border-brand-500/30 text-white' 
                      : ['done'].includes(selectedPdf.status)
                      ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                      : 'bg-dark-900/40 border-dark-800 text-dark-500'
                  }`}>
                    <div className="font-bold mb-0.5">Step 3: Indexing</div>
                    <div>Saving to DB...</div>
                  </div>
                </div>

                {/* Progress bar percentage */}
                <div className="w-full space-y-2">
                  <div className="w-full bg-[#1e293b] h-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getStatusPercent(selectedPdf.status)}%` }}
                      transition={{ duration: 0.3 }}
                      className="bg-gradient-to-r from-[#8b5cf6] to-blue-500 h-full rounded-full"
                    />
                  </div>
                  <div className="text-[10px] font-bold text-brand-400 uppercase tracking-widest flex items-center justify-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{getStatusLabel(selectedPdf.status)}</span>
                  </div>
                </div>
              </div>
            ) : loadingHistory ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
                <span className="text-xs text-dark-400">Loading chat logs...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 max-w-sm mx-auto">
                <div className="w-10 h-10 rounded-2xl bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white">Ask anything about {selectedPdf.filename}</h4>
                <p className="text-xs text-dark-400">
                  Get structural answers, scan definitions, or list key takeaways instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, index) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={msg.id || index} className={`flex items-start gap-3 ${isUser ? 'justify-end' : ''}`}>
                      {/* Robot Avatar (Bot Message) */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-400 shrink-0 select-none">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}

                      <div className="max-w-[75%] space-y-1.5">
                        <div className={`py-2 px-4 rounded-2xl text-sm ${
                          isUser 
                            ? 'bg-[#223047] text-white rounded-tr-none border border-[#2d3f5c]' 
                            : 'bg-[#1b2535] text-dark-100 rounded-tl-none border border-[#253349]'
                        }`}>
                          {renderMessageContent(msg.content)}
                        </div>

                        {/* Page citations links */}
                        {!isUser && msg.source_chunks && msg.source_chunks.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-dark-400 px-1">
                            <BookOpen className="w-3.5 h-3.5 text-brand-400" />
                            <span>Sources:</span>
                            {msg.source_chunks.map((source, sIdx) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded bg-dark-900 border border-dark-800 text-[9px] font-bold text-brand-400 select-none"
                              >
                                Page {source.page_number}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Real User Profile Image (User Message) */}
                      {isUser && (
                        <img
                          src={userAvatar}
                          alt="User profile"
                          className="w-8 h-8 rounded-lg object-cover shrink-0 select-none border border-white"
                        />
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input control field area */}
          <div className="p-4 border-t border-[#222f44] bg-[#111721]/30 shrink-0">
            <form onSubmit={handleSend} className="flex items-center gap-3 relative">
              
              {/* Attachment Clip button */}
              <label 
                htmlFor="dashboard-file-upload" 
                className="p-3 bg-[#1a2332] hover:bg-[#222e42] border border-dark-800 text-dark-400 hover:text-white rounded-xl cursor-pointer transition-colors shrink-0"
                title="Attach PDF file"
              >
                <Paperclip className="w-4 h-4" />
              </label>

              {/* Text input area */}
              <input
                type="text"
                required
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={sendMutation.isPending || !selectedPdf || selectedPdf.status !== 'done'}
                className="flex-1 bg-[#0c121e] border border-[#222f44] focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-xl py-3 px-4 text-sm text-white placeholder-dark-500 outline-none transition-all disabled:opacity-50"
                placeholder={
                  !selectedPdf 
                    ? "Upload a PDF above to activate chat" 
                    : selectedPdf.status !== 'done' 
                    ? `Please wait... currently ${getStatusLabel(selectedPdf.status).toLowerCase()}` 
                    : "Type your message..."
                }
              />

              {/* Send button */}
              <button
                type="submit"
                disabled={!question.trim() || sendMutation.isPending || !selectedPdf || selectedPdf.status !== 'done'}
                className="p-3 bg-[#8b5cf6] hover:bg-brand-500 disabled:bg-dark-800 text-white rounded-xl transition-colors disabled:opacity-40 shrink-0"
              >
                {sendMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            {/* Helper Tag Suggestion Chips below input */}
            {selectedPdf && selectedPdf.status === 'done' && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1 select-none">
                <button
                  type="button"
                  onClick={() => setQuestion('Summarize this document.')}
                  className="px-3 py-1 rounded-full bg-[#182130] hover:bg-[#202c3f] border border-[#233147] text-[11px] text-dark-300 font-medium transition-colors whitespace-nowrap"
                >
                  Analyze file
                </button>
                <button
                  type="button"
                  onClick={() => setQuestion('What are the key points of this file?')}
                  className="px-3 py-1 rounded-full bg-[#182130] hover:bg-[#202c3f] border border-[#233147] text-[11px] text-dark-300 font-medium transition-colors whitespace-nowrap"
                >
                  File capabilities
                </button>
                <button
                  type="button"
                  onClick={() => setQuestion('List the main conclusions of this document.')}
                  className="px-3 py-1 rounded-full bg-[#182130] hover:bg-[#202c3f] border border-[#233147] text-[11px] text-dark-300 font-medium transition-colors whitespace-nowrap"
                >
                  Get started
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
