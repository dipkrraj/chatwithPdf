import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../api';

export default function Dropzone({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const uploadFile = async (file) => {
    if (!file) return;

    // Validate client-side first
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('Please upload a valid PDF file.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20MB limit.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setProgress(10); // start transition

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/api/v1/pdfs/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 90) / progressEvent.total
          );
          setProgress(10 + percentCompleted); // scale to 10-100%
        },
      });

      setSuccess(`"${file.name}" uploaded successfully! Processing in background.`);
      setProgress(100);

      // Trigger callback to list PDFs
      if (onUploadSuccess) {
        onUploadSuccess(data);
      }

      // Reset success notice after 4 seconds
      setTimeout(() => {
        setSuccess('');
        setProgress(0);
        setUploading(false);
      }, 4000);
    } catch (err) {
      setError(err.message || 'Failed to upload PDF.');
      setProgress(0);
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <motion.div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        whileHover={{ scale: uploading ? 1 : 1.01 }}
        whileTap={{ scale: uploading ? 1 : 0.99 }}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
          dragActive
            ? 'border-brand-500 bg-brand-500/10'
            : uploading
            ? 'border-dark-700 bg-dark-900/20 pointer-events-none'
            : 'border-dark-700 hover:border-brand-500/50 hover:bg-brand-500/5'
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf"
          disabled={uploading}
          onChange={handleChange}
        />

        <label
          htmlFor={uploading ? undefined : 'file-upload'}
          className={`flex flex-col items-center justify-center cursor-pointer ${
            uploading ? 'cursor-not-allowed' : ''
          }`}
        >
          {uploading ? (
            <div className="w-full space-y-4">
              <div className="relative w-12 h-12 flex items-center justify-center bg-brand-500/10 rounded-full animate-bounce">
                <File className="w-6 h-6 text-brand-400" />
              </div>
              <div className="text-sm font-semibold text-white">
                Uploading PDF...
              </div>
              <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className="bg-gradient-to-r from-brand-500 to-blue-500 h-full rounded-full"
                />
              </div>
              <div className="text-xs text-dark-400">
                {progress}% uploaded
              </div>
            </div>
          ) : (
            <>
              <div className="p-4 bg-dark-900/80 border border-dark-700 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8 text-brand-400" />
              </div>
              <div className="text-sm font-semibold text-white">
                Drag & Drop PDF
              </div>
              <div className="text-xs text-dark-400 mt-1">
                or click to browse (Max 20MB)
              </div>
            </>
          )}
        </label>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl mt-4 text-xs font-medium"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl mt-4 text-xs font-medium"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
