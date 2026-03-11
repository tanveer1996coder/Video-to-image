import React, { useRef, useState } from 'react';
import { UploadCloud, FileVideo } from 'lucide-react';

interface UploadZoneProps {
  onVideoSelect: (file: File) => void;
}

export function UploadZone({ onVideoSelect }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onVideoSelect(file);
      } else {
        alert('Please upload a video file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      onVideoSelect(file);
    }
  };

  return (
    <div
      className={`glass-card ${isDragging ? 'glow-border' : ''} animate-fade-in`}
      style={{
        padding: '3rem',
        textAlign: 'center',
        borderStyle: 'dashed',
        borderWidth: '2px',
        borderColor: isDragging ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '1rem', borderRadius: '50%' }}>
        <UploadCloud size={48} color="var(--accent-primary)" />
      </div>
      <h2>Drag & Drop your video video</h2>
      <p style={{ color: 'var(--text-secondary)' }}>or click to browse from your computer</p>
      
      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', color: 'var(--text-muted)' }}>
        <FileVideo size={20} />
        <span>Supports MP4, WebM, MOV</span>
      </div>
    </div>
  );
}
