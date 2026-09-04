/**
 * ============================================================================
 * BARCODE SCANNER - REUSABLE COMPONENT
 * ============================================================================
 * Professional barcode/QR scanner with enhanced camera interface
 * - Animated corner brackets with glow pulse
 * - Vertical scanning line with smooth animation
 * - Gradient overlays for focus
 * - Center crosshair guide
 * - Flash/torch toggle
 * - Camera switch (front/back)
 * - Sound/vibration feedback
 * - Mobile responsive layout
 * ============================================================================
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  Camera, 
  AlertCircle, 
  SwitchCamera, 
  Flashlight, 
  FlashlightOff,
  Volume2,
  VolumeX,
  ScanBarcode 
} from 'lucide-react';

export default function BarcodeScanner({ onScan, onError, autoStart = true }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [error, setError] = useState(null);
  
  // Enhanced features
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  
  const html5QrCodeRef = useRef(null);
  const videoTrackRef = useRef(null);
  const cameraActiveRef = useRef(false);
  const scanHandledRef = useRef(false);
  const beepRef = useRef(null);
  const scannerRegionId = 'barcode-scanner-region';

  useEffect(() => {
    // Load saved preferences
    const savedSound = localStorage.getItem('scanSoundEnabled');
    const savedVibration = localStorage.getItem('scanVibrationEnabled');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
    if (savedVibration !== null) setVibrationEnabled(savedVibration === 'true');

    // Get available cameras
    const getCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        setAvailableCameras(devices);
        
        if (devices.length > 0 && autoStart) {
          // Prefer environment (back) camera
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          const selectedCamera = backCamera || devices[0];
          startCamera(selectedCamera.id);
        }
      } catch (err) {
        console.error('Error getting cameras:', err);
        setError('Could not access camera. Please check permissions.');
        onError?.(err);
      }
    };

    getCameras();

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [autoStart]);

  const startCamera = async (cameraId) => {
    try {
      setError(null);
      
      // Create scanner instance
      html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };

      await html5QrCodeRef.current.start(
        cameraId,
        config,
        (decodedText, decodedResult) => {
          if (scanHandledRef.current) return;
          scanHandledRef.current = true;

          // Stop camera immediately to prevent duplicate scans
          stopCamera().finally(() => {
            // Play feedback once, after the camera has stopped.
            playScanSound();
            triggerVibration();

            // Extract barcode from URL if needed
            let barcode = decodedText;
            if (decodedText.includes('/trace/')) {
              const parts = decodedText.split('/trace/');
              if (parts[1]) {
                barcode = parts[1].split('?')[0]; // Remove query params
              }
            }

            onScan?.(barcode);
          });
        },
        (errorMessage) => {
          // Scanning errors (no code detected) - ignore these
        }
      );

      setCameraActive(true);
      cameraActiveRef.current = true;
      scanHandledRef.current = false;
      
      // Get video track for flash control
      setTimeout(() => {
        const videoElement = document.querySelector(`#${scannerRegionId} video`);
        if (videoElement && videoElement.srcObject) {
          const tracks = videoElement.srcObject.getVideoTracks();
          if (tracks.length > 0) {
            videoTrackRef.current = tracks[0];
          }
        }
      }, 1000);
    } catch (err) {
      console.error('Error starting camera:', err);
      setError('Failed to start camera. Please check permissions.');
      onError?.(err);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && cameraActiveRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        videoTrackRef.current = null;
        setCameraActive(false);
        cameraActiveRef.current = false;
      } catch (err) {
        console.error('Error stopping camera:', err);
      }
    }
  };

  const switchCamera = async () => {
    if (availableCameras.length <= 1) return;
    
    await stopCamera();
    const nextIndex = (currentCameraIndex + 1) % availableCameras.length;
    setCurrentCameraIndex(nextIndex);
    await startCamera(availableCameras[nextIndex].id);
  };

  const toggleFlash = async () => {
    if (!videoTrackRef.current) {
      console.warn('Video track not available for flash');
      return;
    }
    
    try {
      const capabilities = videoTrackRef.current.getCapabilities();
      if (capabilities.torch) {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ torch: !flashEnabled }]
        });
        setFlashEnabled(!flashEnabled);
      }
    } catch (err) {
      console.error('Error toggling flash:', err);
    }
  };

  const playScanSound = () => {
    if (!soundEnabled) return;
    try {
      // Create AudioContext only if it doesn't exist
      if (!window.scannerAudioContext) {
        window.scannerAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const audioContext = window.scannerAudioContext;

      if (beepRef.current) {
        beepRef.current.oscillator.stop();
        beepRef.current.oscillator.disconnect();
        beepRef.current.gainNode.disconnect();
        beepRef.current = null;
      }
      
      // Resume context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => {
          console.warn('Could not resume audio context:', err);
        });
      }
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      beepRef.current = { oscillator, gainNode };
      
      // Clean up after sound finishes
      setTimeout(() => {
        oscillator.disconnect();
        gainNode.disconnect();
        if (beepRef.current?.oscillator === oscillator) {
          beepRef.current = null;
        }
      }, 150);
    } catch (err) {
      // Silently fail - audio feedback is not critical
      console.warn('Scan sound not available:', err.message);
    }
  };

  const triggerVibration = () => {
    if (!vibrationEnabled) return;
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  return (
    <div className="space-y-3">
      <style>{`
        /* Camera container styling - MOBILE RESPONSIVE */
        .barcode-camera-container {
          position: relative;
          width: 100%;
          max-width: 640px;
          aspect-ratio: 4 / 3;
          margin: 0 auto;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        
        /* Responsive adjustments for mobile */
        @media (max-width: 768px) {
          .barcode-camera-container {
            max-width: 100%;
            aspect-ratio: 4 / 3;
            min-height: 0;
          }
        }
        
        @media (max-width: 640px) {
          .barcode-camera-container {
            max-width: 100%;
            aspect-ratio: 4 / 3;
          }

          .barcode-scanner-controls {
            min-width: 0;
          }

          .barcode-scanner-status {
            font-size: 0.65rem;
            white-space: nowrap;
          }

          .barcode-scanner-instruction {
            bottom: 0.75rem;
            padding: 0.35rem 0.65rem;
            max-width: calc(100% - 1rem);
          }

          .barcode-scanner-instruction p {
            font-size: 0.65rem;
          }
        }

        /* Hide default html5-qrcode scanner box completely */
        #${scannerRegionId} > div {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        #${scannerRegionId} video {
          border-radius: 0.75rem;
        }
        
        /* Hide the default qr-shaded-region */
        #${scannerRegionId} .qr-shaded-region {
          display: none !important;
        }
        
        /* Scanning animations */
        @keyframes scanLine {
          0%, 100% { top: 0%; opacity: 0.6; }
          50% { top: 100%; opacity: 1; }
        }
        
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8); }
        }
      `}</style>

      {/* Camera Controls Bar - Mobile Responsive */}
      {cameraActive && (
        <div className="barcode-scanner-controls flex min-w-0 items-center justify-between gap-2 rounded-lg bg-slate-800 p-2 sm:p-3">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button
              onClick={toggleFlash}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                flashEnabled 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title="Toggle Flash"
            >
              {flashEnabled ? (
                <Flashlight className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <FlashlightOff className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
            
            {availableCameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="p-1.5 sm:p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                title="Switch Camera"
              >
                <SwitchCamera className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                localStorage.setItem('scanSoundEnabled', (!soundEnabled).toString());
              }}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                soundEnabled 
                  ? 'bg-green-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              title="Toggle Sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </button>
          </div>

          <div className="barcode-scanner-status flex items-center gap-1 text-xs font-medium text-white sm:gap-2 sm:text-sm">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            Camera Active
          </div>
        </div>
      )}

      {/* Camera View with Professional Overlay */}
      <div className="barcode-camera-container border-4 border-blue-500 shadow-2xl bg-black">
        <div id={scannerRegionId} className="w-full h-full" />
        
        {/* Professional Scanning Overlay */}
        {cameraActive && (
          <div 
            className="absolute inset-0"
            style={{
              pointerEvents: 'none',
              zIndex: 1000
            }}
          >
            {/* Darker Gradient Overlays for Better Focus */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />
            
            {/* Central Scanning Frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: '80%', aspectRatio: '1.2' }}>
                {/* Square QR target aligned with the decoder qrbox */}
                <div className="absolute left-1/2 top-1/2 z-10 aspect-square w-[min(60%,310px)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-dashed border-white/45 bg-white/10 shadow-[0_0_18px_rgba(255,255,255,0.55)]">
                  <div className="absolute left-0 top-0 h-1 w-1/5 rounded-r-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <div className="absolute left-0 top-0 h-1/5 w-1 rounded-b-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <div className="absolute right-0 top-0 h-1 w-1/5 rounded-l-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <div className="absolute right-0 top-0 h-1/5 w-1 rounded-b-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <div className="absolute bottom-0 left-0 h-1 w-1/5 rounded-r-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <div className="absolute bottom-0 left-0 h-1/5 w-1 rounded-t-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <div className="absolute bottom-0 right-0 h-1 w-1/5 rounded-l-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <div className="absolute bottom-0 right-0 h-1/5 w-1 rounded-t-full bg-white/85 shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                  <motion.div
                    animate={{ top: ['2%', '98%', '2%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute left-1 right-1 h-0.5 bg-yellow-400 shadow-[0_0_12px_rgba(250,204,21,1),0_0_24px_rgba(250,204,21,0.8)]"
                  />
                </div>
                
                {/* Corner Brackets - Top Left */}
                <motion.div
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute top-0 left-0"
                  style={{ width: '25%', height: '25%' }}
                >
                  <div className="absolute top-0 left-0 w-full h-1.5 rounded-r-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                  <div className="absolute top-0 left-0 w-1.5 h-full rounded-b-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                </motion.div>
                
                {/* Corner Brackets - Top Right */}
                <motion.div
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.25 }}
                  className="absolute top-0 right-0"
                  style={{ width: '25%', height: '25%' }}
                >
                  <div className="absolute top-0 right-0 w-full h-1.5 rounded-l-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                  <div className="absolute top-0 right-0 w-1.5 h-full rounded-b-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                </motion.div>
                
                {/* Corner Brackets - Bottom Left */}
                <motion.div
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  className="absolute bottom-0 left-0"
                  style={{ width: '25%', height: '25%' }}
                >
                  <div className="absolute bottom-0 left-0 w-full h-1.5 rounded-r-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                  <div className="absolute bottom-0 left-0 w-1.5 h-full rounded-t-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                </motion.div>
                
                {/* Corner Brackets - Bottom Right */}
                <motion.div
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.75 }}
                  className="absolute bottom-0 right-0"
                  style={{ width: '25%', height: '25%' }}
                >
                  <div className="absolute bottom-0 right-0 w-full h-1.5 rounded-l-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                  <div className="absolute bottom-0 right-0 w-1.5 h-full rounded-t-full bg-yellow-400 shadow-[0_0_25px_rgba(234,179,8,1)]" />
                </motion.div>
                
                {/* Animated Scanning Line */}
                <motion.div
                  animate={{
                    top: ['0%', '100%', '0%'],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute left-0 right-0 hidden"
                  style={{ height: '4px' }}
                >
                  <div className="w-full h-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_30px_rgba(234,179,8,1),0_0_60px_rgba(234,179,8,0.6)]" />
                  <div className="absolute inset-x-0 -top-16 h-16 bg-gradient-to-b from-transparent to-yellow-400/40 blur-lg" />
                  <div className="absolute inset-x-0 -bottom-16 h-16 bg-gradient-to-t from-transparent to-yellow-400/40 blur-lg" />
                </motion.div>
                
                {/* Center Crosshair Guide */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <motion.div
                    animate={{
                      scale: [0.9, 1.15, 0.9],
                      opacity: [0.4, 0.8, 0.4]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="hidden w-20 h-px bg-yellow-400/80"
                  />
                  <motion.div
                    animate={{
                      scale: [0.9, 1.15, 0.9],
                      opacity: [0.4, 0.8, 0.4]
                    }}
                    transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                    className="hidden absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-20 w-px bg-yellow-400/80"
                  />
                </div>
                
                {/* Scanning Area Indicator */}
                <div className="hidden absolute inset-0 border-2 border-dashed border-yellow-400/30 rounded-lg" />
              </div>
            </div>
            
            {/* Instruction Text */}
            <div className="barcode-scanner-instruction absolute bottom-6 left-0 right-0 text-center">
              <motion.div
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="px-4 py-2 bg-black/70 backdrop-blur-sm rounded-full inline-block"
              >
                <p className="text-yellow-400 text-sm sm:text-base font-semibold">
                  📱 Position barcode within the yellow frame
                </p>
              </motion.div>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {error && (
          <div className="absolute inset-0 bg-red-50 bg-opacity-95 flex items-center justify-center p-4">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <p className="text-red-800 font-medium">{error}</p>
              <p className="text-sm text-red-600 mt-2">
                Please allow camera access in your browser settings
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!cameraActive && !error && (
          <div className="absolute inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-3 animate-pulse" />
              <p className="font-medium">Initializing camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Info */}
      {cameraActive && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-900 font-medium text-center flex items-center justify-center gap-2">
            <ScanBarcode className="w-4 h-4" />
            Point camera at barcode - automatic detection enabled
          </p>
        </div>
      )}
    </div>
  );
}
