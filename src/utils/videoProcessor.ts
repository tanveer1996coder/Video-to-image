// Perceptual Average Hashing (aHash) implementation
export async function computeAHash(imageData: ImageData): Promise<string> {
  const data = imageData.data;
  const grayscale: number[] = [];
  let total = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luminosity method for grayscale
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    grayscale.push(gray);
    total += gray;
  }

  const avg = total / grayscale.length;

  let hash = '';
  for (let i = 0; i < grayscale.length; i++) {
    hash += grayscale[i] >= avg ? '1' : '0';
  }

  return hash;
}

export function hammingDistance(hash1: string, hash2: string): number {
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

// Variance of Laplacian to detect blur (clarity score)
export function computeClarity(imageData: ImageData): number {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  const grayscale = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    grayscale[j] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const laplacian = new Float32Array(width * height);
  let mean = 0;
  let count = 0;

  // Apply 3x3 Laplacian kernel
  // 0  1  0
  // 1 -4  1
  // 0  1  0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const val = 
        grayscale[idx - width] + // top
        grayscale[idx - 1] +     // left
        grayscale[idx + 1] +     // right
        grayscale[idx + width] - // bottom
        4 * grayscale[idx];      // center
      
      laplacian[idx] = val;
      mean += val;
      count++;
    }
  }

  mean /= count;

  let variance = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const diff = laplacian[idx] - mean;
      variance += diff * diff;
    }
  }

  return variance / count;
}

export interface ExtractedFrame {
  id: string;
  blob: Blob;
  objectUrl: string;
  timestamp: number;
  clarity: number;
  hash: string;
  isKept: boolean;
}

export interface VideoProcessingOptions {
  intervalSec: number;
  minClarity: number; // Threshold for blur
  maxHamming: number; // Threshold for uniqueness (0-64, e.g., 5 means mostly identical)
  onProgress?: (progress: number, status: string) => void;
  onFrameExtracted?: (frame: ExtractedFrame) => void;
}

export async function processVideo(
  videoFile: File,
  options: VideoProcessingOptions
): Promise<ExtractedFrame[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;

    const keptFrames: ExtractedFrame[] = [];

    video.onloadedmetadata = async () => {
      let duration = video.duration;

      // Workaround for Chrome/WebM bug where duration is Infinity or NaN on generated Blobs
      if (duration === Infinity || isNaN(duration)) {
        video.currentTime = Number.MAX_SAFE_INTEGER;
        await new Promise<void>((resolveSeek) => {
          const handler = () => {
            video.removeEventListener('seeked', handler);
            duration = video.duration;
            resolveSeek();
          };
          video.addEventListener('seeked', handler);
        });
      }

      const width = video.videoWidth;
      const height = video.videoHeight;
      const totalFramesToExtract = duration && duration !== Infinity ? Math.max(1, Math.floor(duration / options.intervalSec)) : 100;
      let framesExtractedCount = 0;

      // Extract high resolution frame
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Resize canvas for hash (8x8)
      const hashCanvas = document.createElement('canvas');
      hashCanvas.width = 8;
      hashCanvas.height = 8;
      const hashCtx = hashCanvas.getContext('2d', { willReadFrequently: true });

      if (!ctx || !hashCtx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      let currentTime = 0;

      video.onseeked = async () => {
        // Draw frame to high-res canvas for extraction and clarity check
        ctx.drawImage(video, 0, 0, width, height);
        
        // Compute clarity using a scaled down version to improve speed slightly but preserve features, or real size.
        // Actually computing clarity on full image can be very slow. Let's compute it on a max 400x400 image.
        const scale = Math.min(1, 400 / Math.max(width, height));
        const clarityWidth = Math.floor(width * scale);
        const clarityHeight = Math.floor(height * scale);
        
        const clarityCanvas = document.createElement('canvas');
        clarityCanvas.width = clarityWidth;
        clarityCanvas.height = clarityHeight;
        const clarityCtx = clarityCanvas.getContext('2d', { willReadFrequently: true });
        clarityCtx?.drawImage(video, 0, 0, clarityWidth, clarityHeight);
        
        const clarityImageData = clarityCtx?.getImageData(0, 0, clarityWidth, clarityHeight);
        let clarity = 0;
        if (clarityImageData) {
           clarity = computeClarity(clarityImageData);
        }

        // Draw to 8x8 for hashing
        hashCtx.drawImage(video, 0, 0, 8, 8);
        const hashImageData = hashCtx.getImageData(0, 0, 8, 8);
        const hash = await computeAHash(hashImageData);

        // Check against logic
        let isUnique = true;
        for (const frame of keptFrames) {
          if (hammingDistance(hash, frame.hash) <= options.maxHamming) {
            isUnique = false;
            break;
          }
        }

        const isClear = clarity >= options.minClarity;
        
        const isKept = isUnique && isClear;

        if (isKept) {
          // get blob
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
          if (blob) {
            const frame: ExtractedFrame = {
              id: Math.random().toString(36).substring(2, 9),
              blob,
              objectUrl: URL.createObjectURL(blob),
              timestamp: currentTime,
              clarity,
              hash,
              isKept: true
            };
            keptFrames.push(frame);
            if (options.onFrameExtracted) {
              options.onFrameExtracted(frame);
            }
          }
        }

        framesExtractedCount++;
        if (options.onProgress) {
          options.onProgress(framesExtractedCount / totalFramesToExtract * 100, `Processing frame ${framesExtractedCount} of ${totalFramesToExtract}`);
        }

        currentTime += options.intervalSec;
        if (currentTime <= duration) {
          video.currentTime = currentTime;
        } else {
          URL.revokeObjectURL(video.src);
          resolve(keptFrames);
        }
      };

      // Start the process
      video.currentTime = currentTime;
    };

    video.onerror = () => {
      reject(new Error('Failed to load video file.'));
    };
  });
}
