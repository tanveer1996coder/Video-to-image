import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { UploadZone } from './components/UploadZone';
import { LiveCaptureZone } from './components/LiveCaptureZone';
import { Gallery } from './components/Gallery';
import { ScrubberModal } from './components/ScrubberModal';
import { ImageEditorModal } from './components/ImageEditorModal';
import { processVideo, type ExtractedFrame } from './utils/videoProcessor';
import { Camera, UploadCloud } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'capture'>('upload');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  const [replacingFrameId, setReplacingFrameId] = useState<string | null>(null);
  const [editingFrameId, setEditingFrameId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleVideoSelect = async (file: File) => {
    setVideoFile(file);
    setFrames([]);
    setIsProcessing(true);
    setProgress(0);
    setStatusText('Initializing video...');

    try {
      const extracted = await processVideo(file, {
        intervalSec: 1, // evaluate every 1 second
        minClarity: 10,  // adjust clarity threshold based on results
        maxHamming: 8,   // allow small variance (64 bit hash, 8 bits diff = highly similar)
        onProgress: (p, status) => {
          setProgress(p);
          setStatusText(status);
        },
      });
      setFrames(extracted);
    } catch (error) {
      console.error(error);
      alert('Failed to process video.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReplaceClick = (frameId: string) => {
    setReplacingFrameId(frameId);
  };

  const handleEditClick = (frameId: string) => {
    setEditingFrameId(frameId);
  };

  const handleFrameRemove = (frameId: string) => {
    setFrames((prev) => {
      const remaining = prev.filter(f => f.id !== frameId);
      // clean up object urls
      const removed = prev.find(f => f.id === frameId);
      if (removed) URL.revokeObjectURL(removed.objectUrl);
      return remaining;
    });
  };

  const handleReplaceConfirm = (blob: Blob, timestamp: number) => {
    if (!replacingFrameId) return;

    setFrames((prev) => 
      prev.map(f => {
        if (f.id === replacingFrameId) {
          URL.revokeObjectURL(f.objectUrl);
          return {
            ...f,
            blob,
            objectUrl: URL.createObjectURL(blob),
            timestamp,
          };
        }
        return f;
      })
    );
    setReplacingFrameId(null);
  };

  const handleEditSave = (blob: Blob) => {
    if (!editingFrameId) return;

    setFrames((prev) => 
      prev.map(f => {
        if (f.id === editingFrameId) {
          URL.revokeObjectURL(f.objectUrl);
          return {
            ...f,
            blob,
            objectUrl: URL.createObjectURL(blob)
          };
        }
        return f;
      })
    );
    setEditingFrameId(null);
  };

  const handleDownloadAll = async () => {
    if (frames.length === 0) return;
    setIsDownloading(true);

    try {
      const zip = new JSZip();
      frames.forEach((frame, idx) => {
        // Pad the index to maintain order
        const num = String(idx + 1).padStart(3, '0');
        const filename = `frame_${num}_${frame.timestamp.toFixed(2)}s.jpg`;
        zip.file(filename, frame.blob);
      });

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'extracted_frames.zip');
    } catch (error) {
      console.error('Failed to create zip', error);
      alert('Failed to download zip');
    } finally {
      setIsDownloading(false);
    }
  };

  const replacingFrame = frames.find(f => f.id === replacingFrameId);

  return (
    <div className="app-container">
      <header className="header" style={{ maxWidth: '800px', margin: '0 auto 2rem auto' }}>
        <h1>Video to Image Extractor</h1>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '1rem', marginTop: '0.5rem' }}>
          Free, Private, Client-Side Video Frame Extraction
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>
          Instantly extract clear, high-quality, and unique images from any video. Powered entirely by your browser—no file uploads, no AI APIs, and zero server costs. Extract frames perfectly suited for thumbnails, AI datasets, or photography selection.
        </p>
      </header>

      {!videoFile && !isProcessing && frames.length === 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.75rem 2rem', borderRadius: 'var(--radius-full)' }}
            onClick={() => setActiveTab('upload')}
          >
            <UploadCloud size={18} /> Upload Video
          </button>
          <button 
            className={`btn ${activeTab === 'capture' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.75rem 2rem', borderRadius: 'var(--radius-full)' }}
            onClick={() => setActiveTab('capture')}
          >
            <Camera size={18} /> Live Capture
          </button>
        </div>
      )}

      {!videoFile && !isProcessing && activeTab === 'upload' && (
        <UploadZone onVideoSelect={handleVideoSelect} />
      )}

      {!videoFile && !isProcessing && activeTab === 'capture' && (
        <LiveCaptureZone 
          onCaptureComplete={handleVideoSelect} 
          onCancel={() => setActiveTab('upload')} 
        />
      )}

      {isProcessing && (
        <div className="glass-card animate-scale-up" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>Processing Video...</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{statusText}</p>
          
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-primary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div 
              style={{
                height: '100%',
                width: `${progress}%`,
                background: 'var(--accent-primary)',
                transition: 'width 0.3s ease'
              }}
            />
          </div>
        </div>
      )}

      {!isProcessing && frames.length > 0 && (
        <Gallery 
          frames={frames} 
          onReplaceClick={handleReplaceClick}
          onEditClick={handleEditClick} 
          onRemove={handleFrameRemove}
          onDownloadAll={handleDownloadAll}
          isDownloading={isDownloading}
        />
      )}

      {/* Manual Replacement Scrubber */}
      {replacingFrameId && videoFile && replacingFrame && (
        <ScrubberModal
          videoFile={videoFile}
          initialTime={replacingFrame.timestamp}
          onConfirm={handleReplaceConfirm}
          onClose={() => setReplacingFrameId(null)}
        />
      )}

      {/* Image Editor Modal */}
      {editingFrameId && (
        <ImageEditorModal
          imageUrl={frames.find(f => f.id === editingFrameId)?.objectUrl || ''}
          onSave={handleEditSave}
          onClose={() => setEditingFrameId(null)}
        />
      )}

      {!isProcessing && videoFile && frames.length === 0 && (
        <div className="glass-card animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>No distinct frames extracted</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Try a video with more motion or clearer scenes.
          </p>
          <button className="btn btn-secondary" onClick={() => setVideoFile(null)}>
            Upload Another Video
          </button>
        </div>
      )}
      
      {!isProcessing && frames.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={() => {
            frames.forEach(f => URL.revokeObjectURL(f.objectUrl));
            setVideoFile(null);
            setFrames([]);
          }}>
            Start Over
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
