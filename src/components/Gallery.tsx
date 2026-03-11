import { useState } from 'react';
import type { ExtractedFrame } from '../utils/videoProcessor';
import { RefreshCw, Trash2, Download, X, Maximize2 } from 'lucide-react';

interface GalleryProps {
  frames: ExtractedFrame[];
  onReplaceClick: (frameId: string) => void;
  onEditClick: (frameId: string) => void;
  onRemove: (frameId: string) => void;
  onDownloadAll: () => void;
  isDownloading: boolean;
}

export function Gallery({ frames, onReplaceClick, onEditClick, onRemove, onDownloadAll, isDownloading }: GalleryProps) {
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  if (frames.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Extracted Images <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', fontWeight: 'normal' }}>({frames.length})</span></h2>
        <button 
          className="btn btn-primary" 
          onClick={onDownloadAll}
          disabled={isDownloading || frames.length === 0}
        >
          {isDownloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
          Download ZIP
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
        gap: '1.5rem'
      }}>
        {frames.map((frame) => (
          <div key={frame.id} className="glass-card" style={{ overflow: 'hidden', position: 'relative', paddingBottom: '0.5rem', display: 'flex', flexDirection: 'column' }}>
            <div 
              style={{ width: '100%', aspectRatio: '16/9', background: '#000', cursor: 'zoom-in', position: 'relative' }}
              onClick={() => setZoomedImage(frame.objectUrl)}
            >
              <img 
                src={frame.objectUrl} 
                alt={`Frame at ${frame.timestamp}s`}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.25rem', borderRadius: '4px', opacity: 0.7 }}>
                <Maximize2 size={16} color="white" />
              </div>
            </div>
            
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Time: {frame.timestamp.toFixed(2)}s</span>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                  onClick={() => onEditClick(frame.id)}
                  title="Crop & Edit"
                >
                  Edit
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.875rem' }}
                  onClick={() => onReplaceClick(frame.id)}
                >
                  Replace
                </button>
                <button 
                  className="btn btn-danger"
                  style={{ padding: '0.5rem' }}
                  onClick={() => onRemove(frame.id)}
                  title="Remove Image"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div className="image-zoom-overlay animate-fade-in" onClick={() => setZoomedImage(null)}>
          <div className="image-zoom-content animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button className="image-zoom-close" onClick={() => setZoomedImage(null)}>
              <X size={24} />
            </button>
            <img src={zoomedImage} alt="Zoomed View" className="image-zoom-img" />
          </div>
        </div>
      )}

    </div>
  );
}
