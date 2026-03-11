import { useState, useRef, useEffect } from 'react';
import { Camera, Square, Check, X } from 'lucide-react';

interface LiveCaptureZoneProps {
  onCaptureComplete: (file: File) => void;
  onCancel: () => void;
}

export function LiveCaptureZone({ onCaptureComplete, onCancel }: LiveCaptureZoneProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  
  const [cycleTime, setCycleTime] = useState(0); // 0 to 3000ms

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStartTimeRef = useRef<number>(0);
  
  useEffect(() => {
    let animationFrame: number;
    
    if (isRecording) {
      recordStartTimeRef.current = Date.now();
      
      const updateCycle = () => {
        const elapsed = Date.now() - recordStartTimeRef.current;
        setCycleTime(elapsed % 3000); // 3 second cycle
        animationFrame = requestAnimationFrame(updateCycle);
      };
      animationFrame = requestAnimationFrame(updateCycle);
    } else {
      setCycleTime(0);
    }
    
    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isRecording]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera on mobile
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Camera access denied or unavailable. Please check your browser permissions.');
    }
  };

  useEffect(() => {
    // Start camera immediately when component mounts
    startCamera();
    
    // Cleanup function to stop all tracks when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleStartCapture = () => {
    if (!stream) return;
    
    setRecordedChunks([]);
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = () => {
      // Once stopped, we compile chunks but wait for state flush.
      // This is handled in a useEffect below to ensure chunks are up to date.
    };

    mediaRecorder.start(100); // collect 100ms chunks
    setIsRecording(true);
  };

  const handleStopCapture = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop the camera feed to save battery and indicate finish
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
  };

  // Compile chunks into blob when recording stops
  useEffect(() => {
    if (!isRecording && recordedChunks.length > 0 && !stream) {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedBlobUrl(url);
    }
  }, [isRecording, recordedChunks, stream]);

  const handleApprove = () => {
    if (!recordedBlobUrl || recordedChunks.length === 0) return;
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    // Convert Blob to File to match existing API
    const file = new File([blob], 'live_capture.webm', { type: 'video/webm' });
    onCaptureComplete(file);
  };
  
  const handleDiscard = () => {
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
    }
    setRecordedBlobUrl(null);
    setRecordedChunks([]);
    startCamera(); // Restart camera allowing them to try again
  };

  if (error) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--danger)' }}>Camera Error</h3>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: '1rem' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onCancel}>Switch back to Upload</button>
      </div>
    );
  }

  // Phase 2: Review captured video
  if (recordedBlobUrl) {
    return (
      <div className="glass-card animate-scale-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <h3>Extract Unique Images?</h3>
        
        <div style={{ width: '100%', maxWidth: '600px', aspectRatio: '16/9', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          <video 
            src={recordedBlobUrl} 
            controls 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', width: '100%', justifyContent: 'center' }}>
          <button className="btn btn-secondary" style={{ flex: '1 1 auto', minWidth: '160px' }} onClick={handleDiscard}>
            <X size={18} /> Discard & Retake
          </button>
          <button className="btn btn-primary" style={{ flex: '1 1 auto', minWidth: '160px' }} onClick={handleApprove}>
            <Check size={18} /> Yes, Extract Now
          </button>
        </div>
      </div>
    );
  }

  // Phase 1: Live Recording View
  
  const cyclePhase = cycleTime < 1500 ? 'hold' : 'flip';
  const progressRatio = cycleTime / 3000;
  const showFlash = cycleTime >= 1500 && cycleTime < 1650; // 150ms flash at the apex
  
  return (
    <div className="glass-card animate-fade-in" style={{ 
      padding: '0', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden',
      position: 'relative'
    }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000' }}>
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        {/* Recording Indicator Overlay */}
        {isRecording && (
          <div style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'rgba(239, 68, 68, 0.2)', backdropFilter: 'blur(4px)',
            padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            color: 'var(--danger)', fontWeight: 600, fontSize: '0.875rem',
            border: '1px solid rgba(239, 68, 68, 0.5)'
          }}>
            <div style={{ 
              width: '10px', height: '10px', borderRadius: '50%', background: 'var(--danger)',
              opacity: cycleTime % 1000 < 500 ? 1 : 0.4, transition: 'opacity 0.2s ease'
            }} />
            REC
          </div>
        )}

        {/* Shutter Flash */}
        {isRecording && showFlash && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255, 255, 255, 0.8)',
            zIndex: 10
          }} />
        )}

        {/* Pacing Timer Overlay */}
        {isRecording && (
           <div style={{
             position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
             background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
             padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-full)',
             color: 'white', display: 'flex', alignItems: 'center', gap: '1rem',
             boxShadow: '0 4px 6px rgba(0,0,0,0.3)', minWidth: '220px', zIndex: 11
           }}>
             
             {/* Circular Progress Indicator */}
             <div style={{
               width: '24px', height: '24px', borderRadius: '50%',
               background: `conic-gradient(var(--accent-primary) ${progressRatio * 360}deg, rgba(255,255,255,0.2) 0deg)`,
               flexShrink: 0
             }} />

             <span style={{ 
               fontWeight: cyclePhase === 'hold' ? 600 : 400,
               color: cyclePhase === 'hold' ? '#10b981' : 'white',
               whiteSpace: 'nowrap',
               fontSize: '0.95rem'
             }}>
               {cyclePhase === 'hold' ? 'Hold steady...' : 'Flip to next page!'}
             </span>
           </div>
        )}
      </div>

      <div style={{ padding: '1.5rem 1rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-secondary)', gap: '1rem' }}>
        {!isRecording ? (
          <>
             <button className="btn btn-secondary" onClick={onCancel} style={{ flex: 1, minWidth: '100px', fontSize: '0.875rem' }}>
               Cancel
             </button>
             <button 
               className="btn btn-primary" 
               style={{ flex: 2, minWidth: '200px', borderRadius: 'var(--radius-full)', padding: '1rem 2rem', fontSize: '1.1rem' }}
               onClick={handleStartCapture}
             >
               <Camera size={24} /> Start Capture
             </button>
          </>
        ) : (
          <button 
            className="btn btn-danger" 
            style={{ width: '100%', borderRadius: 'var(--radius-full)', padding: '1rem 2rem', fontSize: '1.1rem', background: 'var(--danger)', color: 'white' }}
            onClick={handleStopCapture}
          >
            <Square size={20} fill="white" /> Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}
