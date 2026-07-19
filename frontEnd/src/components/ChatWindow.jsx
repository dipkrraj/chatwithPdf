import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, BookOpen, User, Sparkles, Loader2, X } from 'lucide-react';
import api from '../api';

export default function ChatWindow({ pdf }) {
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [selectedSource, setSelectedSource] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch Chat History
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['chat_history', pdf.id],
    queryFn: async () => {
      const { data } = await api.get(`/api/v1/chat/history/${pdf.id}?limit=100`);
      return data.items;
    },
  });

  const messages = historyData || [];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send Message Mutation
  const sendMutation = useMutation({
    mutationFn: async (text) => {
      const { data } = await api.post('/api/v1/chat/', {
        pdf_id: pdf.id,
        question: text,
      });
      return data;
    },
    onMutate: async (text) => {
      // Cancel queries to avoid overwrites
      await queryClient.cancelQueries(['chat_history', pdf.id]);

      const previousHistory = queryClient.getQueryData(['chat_history', pdf.id]) || [];

      // Optimistically add user query to UI
      const optimisticUserMsg = {
        id: Date.now(),
        role: 'user',
        content: text,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ['chat_history', pdf.id],
        [...previousHistory, optimisticUserMsg]
      );

      return { previousHistory };
    },
    onError: (err, text, context) => {
      queryClient.setQueryData(['chat_history', pdf.id], context.previousHistory);
      alert(err.message || 'Failed to send message');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat_history', pdf.id]);
    },
  });

  // Clear Chat History Mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/v1/chat/history/${pdf.id}`);
    },
    onSuccess: () => {
      queryClient.setQueryData(['chat_history', pdf.id], []);
    },
    onError: (err) => {
      alert(err.message || 'Failed to clear chat history');
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (!question.trim() || sendMutation.isPending) return;

    const text = question;
    setQuestion('');
    sendMutation.mutate(text);
  };

  const renderMessageContent = (content) => {
    // Simple robust markdown formatter for lists and bold styling
    return content.split('\n').map((line, idx) => {
      let formattedLine = line;

      // Handle Bold text: **text** -> <strong>text</strong>
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        formattedLine = line.replace(boldRegex, (match, p1) => `<strong>${p1}</strong>`);
      }

      // Handle Bullet Points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const text = line.trim().substring(2);
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
    <div className="flex h-full overflow-hidden relative">
      {/* Messages area */}
      <div className="flex-1 flex flex-col h-full bg-dark-950">
        {/* Header */}
        <div className="p-4 border-b border-dark-800 bg-dark-900/20 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white truncate max-w-[400px]">
              {pdf.filename}
            </h3>
            <p className="text-xs text-dark-400">
              {pdf.page_count} Pages • {pdf.chunk_count} Chunks Indexed
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Clear all chat history for this document?')) {
                clearMutation.mutate();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dark-700/50 text-xs font-semibold hover:border-red-500/30 hover:bg-red-500/10 text-dark-300 hover:text-red-400 transition-all"
            title="Clear Chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
              <span className="text-sm text-dark-400">Loading chat history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-4">
              <div className="p-4 bg-brand-500/5 rounded-2xl border border-brand-500/10">
                <Sparkles className="w-8 h-8 text-brand-400" />
              </div>
              <h4 className="text-lg font-bold">Ask anything about this document</h4>
              <p className="text-sm text-dark-400">
                Query the PDF to run semantic searches on stored chunks. Try: "Summarize this PDF" or "What are the main results?".
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={msg.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}
                  >
                    {/* Bot Avatar */}
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-400 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    {/* Chat Bubble */}
                    <div className="max-w-[70%] space-y-2">
                      <div className={`p-4 rounded-2xl ${
                        isUser
                          ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white rounded-tr-none'
                          : 'bg-dark-900/60 border border-dark-800 text-dark-100 rounded-tl-none'
                      }`}>
                        {renderMessageContent(msg.content)}
                      </div>

                      {/* Source Chunks references */}
                      {!isUser && msg.source_chunks && msg.source_chunks.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-dark-400 px-1">
                          <BookOpen className="w-3.5 h-3.5 text-brand-400" />
                          <span>Sources:</span>
                          {msg.source_chunks.map((source, sIdx) => (
                            <button
                              key={sIdx}
                              onClick={() => setSelectedSource(source)}
                              className="px-2 py-0.5 rounded-md bg-dark-900 border border-dark-800 hover:border-brand-500/50 hover:bg-brand-500/10 text-[10px] font-bold text-brand-400 transition-all flex items-center gap-0.5"
                            >
                              Page {source.page_number}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* User Avatar */}
                    {isUser && (
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Loader during pending request */}
              {sendMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-400 shrink-0 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-dark-900/60 border border-dark-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-3">
                    <span className="w-4 h-4 border-2 border-brand-500/30 border-t-brand-400 rounded-full animate-spin" />
                    <span className="text-sm text-dark-300">Consulting PDF chunks...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Form */}
        <div className="p-4 border-t border-dark-800 bg-dark-950/40">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-3">
            <input
              type="text"
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={sendMutation.isPending}
              className="flex-1 bg-dark-900 border border-dark-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 rounded-2xl py-3.5 px-5 text-sm text-white placeholder-dark-500 outline-none transition-all disabled:opacity-50"
              placeholder="Ask a question about this document..."
            />
            <button
              type="submit"
              disabled={!question.trim() || sendMutation.isPending}
              className="p-3.5 bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 disabled:from-dark-800 disabled:to-dark-850 text-white rounded-2xl transition-all disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Slide-over Source Detail Side-Drawer */}
      <AnimatePresence>
        {selectedSource && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSource(null)}
              className="absolute inset-0 bg-black/60 z-30"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-96 glass border-l border-dark-800 p-6 z-40 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-dark-800 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-400" />
                  <h4 className="font-bold text-white">Source Fragment</h4>
                </div>
                <button
                  onClick={() => setSelectedSource(null)}
                  className="p-1 rounded-lg hover:bg-dark-900 text-dark-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="flex items-center justify-between bg-dark-900 border border-dark-800 p-3 rounded-xl">
                  <span className="text-xs text-dark-400">Page Reference</span>
                  <span className="px-2.5 py-1 rounded-md bg-brand-500/20 text-brand-400 text-xs font-bold">
                    Page {selectedSource.page_number}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                    Text Content
                  </div>
                  <div className="bg-dark-900/60 border border-dark-800 rounded-2xl p-4 text-sm text-dark-200 leading-relaxed font-sans select-text whitespace-pre-wrap">
                    {selectedSource.text_preview}
                  </div>
                </div>

                <div className="text-[10px] text-dark-500 bg-dark-900/20 p-3 rounded-xl border border-dark-800/40">
                  ID: <span className="font-mono">{selectedSource.chunk_id}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
