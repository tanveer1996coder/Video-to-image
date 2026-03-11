import { useRef, useState, useEffect } from 'react';
import { X, RefreshCw, Check } from 'lucide-react';

interface ScrubberModalProps {
  videoFile: File;
  initialTime: number;
  onConfirm: (blob: Blob, timestamp: number) => void;
  onClose: () => void;
}

export function ScrubberModal({ videoFile, initialTime, onConfirm, onClose }: ScrubberModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = initialTime;
    }
  }, [initialTime]);

  const handleLoadedMetadata = async () => {
    if (videoRef.current) {
      let dur = videoRef.current.duration;
      if (dur === Infinity || isNaN(dur)) {
        videoRef.current.currentTime = Number.MAX_SAFE_INTEGER;
        await new Promise<void>((resolveSeek) => {
          const handler = () => {
            if (videoRef.current) {
              videoRef.current.removeEventListener('seeked', handler);
              dur = videoRef.current.duration;
              setDuration(dur);
              videoRef.current.currentTime = initialTime;
            }
            resolveSeek();
          };
          videoRef.current?.addEventListener('seeked', handler);
        });
      } else {
        setDuration(dur);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          onConfirm(blob, video.currentTime);
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '2rem'
    }} className="animate-fade-in">
      
      <div className="glass-panel animate-scale-up" style={{
        maxWidth: '800px',
        width: '100%',
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>Manual Frame Selection</h3>
          <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          <video
            ref={videoRef}
            src={URL.createObjectURL(videoFile)}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            controls={false}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            <span>{currentTime === Infinity ? '0.00' : currentTime.toFixed(2)}s</span>
            <span>{duration === Infinity ? '...' : duration.toFixed(2)}s</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              setCurrentTime(t);
              if (videoRef.current) videoRef.current.currentTime = t;
            }}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            onClick={handleCapture}
            disabled={isCapturing}
          >
            {isCapturing ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
            Capture & Replace
          </button>
        </div>

        {/* Hidden canvas for extraction */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );
}
