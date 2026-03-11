import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import { getCroppedImg } from '../utils/cropImage';

interface ImageEditorModalProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onClose: () => void;
}

export function ImageEditorModal({ imageUrl, onSave, onClose }: ImageEditorModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedImageBlob = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        { brightness, contrast, saturation }
      );
      if (croppedImageBlob) {
        onSave(croppedImageBlob);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to edit image');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: '2rem'
    }} className="animate-fade-in image-editor-container">
      
      <div className="glass-panel animate-scale-up" style={{
        maxWidth: '1000px',
        width: '100%',
        height: '80vh',
        display: 'flex',
        flexDirection: 'row',
        gap: '2rem',
        padding: '2rem',
        position: 'relative'
      }}>
        
        {/* Main Cropper Area */}
        <div style={{ flex: '1', position: 'relative', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
          }}>
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9} // Remove to allow free cropping, or set to undefined
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
        </div>

        {/* Controls Sidebar */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }} className="editor-controls">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Edit Image</h3>
            <button className="btn btn-secondary" style={{ padding: '0.5rem' }} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="control-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Zoom</span>
              <span>{zoom.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

          <div className="control-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Brightness</span>
              <span>{brightness}%</span>
            </label>
            <input
              type="range"
              value={brightness}
              min={0}
              max={200}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="control-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Contrast</span>
              <span>{contrast}%</span>
            </label>
            <input
              type="range"
              value={contrast}
              min={0}
              max={200}
              onChange={(e) => setContrast(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div className="control-group">
            <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span>Saturation</span>
              <span>{saturation}%</span>
            </label>
            <input
              type="range"
              value={saturation}
              min={0}
              max={200}
              onChange={(e) => setSaturation(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => {
              setBrightness(100); setContrast(100); setSaturation(100); setZoom(1); setCrop({x:0, y:0});
            }}>Reset All</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={isProcessing}
            >
              <Check size={18} />
              {isProcessing ? 'Saving...' : 'Save Image'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
