import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  Camera, 
  X, 
  Flashlight, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Upload, 
  Keyboard, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { sound } from '../utils/audio';
import { cleanScannedBarcode } from '../utils/barcode';
import { decodeBarcodeFromImageFile, decodeCanvasWithZxing } from '../utils/barcodeScannerEngine';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'ສະແກນບາໂຄດດ້ວຍກ້ອງ (Camera Barcode Scanner)',
  description = 'ຈໍ່ກ້ອງໂທລະສັບໃສ່ບາໂຄດ / QR Code ທີ່ຕິດຢູ່ກ່ອງພັດສະດຸ'
}) => {
  const [scannerReady, setScannerReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);
  const [flashSuccess, setFlashSuccess] = useState(false);

  // File upload state
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [fileDecodeProgress, setFileDecodeProgress] = useState<string | null>(null);
  const [fileDecodeError, setFileDecodeError] = useState<string | null>(null);

  // Manual text input fallback in modal
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const isScanningActiveRef = useRef(false);
  const scanLoopIdRef = useRef<number | null>(null);
  const lastScanTimestampRef = useRef<number>(0);
  const lastScannedTextRef = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeDetectorRef = useRef<any>(null);

  // Initialize native BarcodeDetector if browser supports it
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const supported = ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'itf', 'upc_a', 'upc_e', 'qr_code'];
        nativeDetectorRef.current = new (window as any).BarcodeDetector({ formats: supported });
      } catch (e) {
        console.warn('Native BarcodeDetector init fallback:', e);
      }
    }
  }, []);

  // Enumerate video cameras
  useEffect(() => {
    if (!isOpen) return;

    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          const backCam = videoInputs.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('0')
          );
          if (backCam) {
            setSelectedDeviceId(backCam.deviceId);
          } else {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        }
      }).catch((err) => {
        console.warn('Could not enumerate media devices:', err);
      });
    }
  }, [isOpen, selectedDeviceId]);

  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const continuousModeRef = useRef(continuousMode);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    continuousModeRef.current = continuousMode;
  }, [continuousMode]);

  // Successful scan handler with stable refs
  const handleSuccessfulScan = useCallback((rawText: string) => {
    const clean = cleanScannedBarcode(rawText);
    if (!clean) return;

    const now = Date.now();
    // Debounce duplicate scans within 1.2s for identical code
    if (clean === lastScannedTextRef.current && now - lastScanTimestampRef.current < 1200) {
      return;
    }

    lastScanTimestampRef.current = now;
    lastScannedTextRef.current = clean;

    // Trigger visual flash & audio & vibration without disturbing video stream
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([120]);
      }
    } catch {}

    sound.playSuccess();
    setFlashSuccess(true);
    setTimeout(() => setFlashSuccess(false), 450);

    setLastScannedCode(clean);
    setScannedCount(prev => prev + 1);

    // Call external handler via ref so parent state changes do NOT cause camera stream teardown
    if (onScanRef.current) {
      onScanRef.current(clean);
    }

    if (!continuousModeRef.current) {
      handleClose();
    }
  }, []);

  // Frame processing loop: high-speed sampling with zero video stream disruption
  const runFrameScanner = useCallback(() => {
    if (!isScanningActiveRef.current) return;

    const video = videoRef.current;
    if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const now = Date.now();
      // Throttle decode attempts to every 70ms for optimal battery & instant recognition
      if (now - lastScanTimestampRef.current > 70) {
        // Priority 1: Hardware-accelerated native BarcodeDetector
        if (nativeDetectorRef.current) {
          nativeDetectorRef.current.detect(video)
            .then((barcodes: any[]) => {
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                handleSuccessfulScan(barcodes[0].rawValue);
              }
            })
            .catch(() => {});
        }

        // Priority 2: Cropped center reticle region with ZXing
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        const canvas = offscreenCanvasRef.current;
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Crop the central 82% width and 45% height (matching the reticle frame)
        const cropW = Math.floor(vw * 0.82);
        const cropH = Math.floor(vh * 0.45);
        const cropX = Math.floor((vw - cropW) / 2);
        const cropY = Math.floor((vh - cropH) / 2);

        // Scale down cropped canvas to max 640px width for near-instant 1D binarization
        const targetW = Math.min(cropW, 640);
        const targetH = Math.round((cropH * targetW) / cropW);

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
          const decoded = decodeCanvasWithZxing(canvas);
          if (decoded) {
            handleSuccessfulScan(decoded);
          }
        }
      }
    }

    if (isScanningActiveRef.current) {
      scanLoopIdRef.current = requestAnimationFrame(runFrameScanner);
    }
  }, [handleSuccessfulScan]);

  // Keep runFrameScanner reference stable in a ref
  const runFrameScannerRef = useRef(runFrameScanner);
  useEffect(() => {
    runFrameScannerRef.current = runFrameScanner;
  }, [runFrameScanner]);

  // Start persistent camera stream (NEVER teardown on scan or parent re-renders)
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setScannerReady(false);
    setErrorMessage(null);
    setFileDecodeError(null);

    const startCamera = async () => {
      try {
        // Stop any old stream
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach(t => t.stop());
          activeStreamRef.current = null;
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: selectedDeviceId ? {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          } : {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 },
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        activeStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          await videoRef.current.play().catch(e => {
            console.warn('Video play error:', e);
          });
        }

        // Check torch support
        const track = stream.getVideoTracks()[0];
        if (track) {
          const caps = (track as any).getCapabilities?.();
          if (caps && caps.torch) {
            setHasTorch(true);
          }
        }

        if (isMounted) {
          setScannerReady(true);
          isScanningActiveRef.current = true;
          if (scanLoopIdRef.current) {
            cancelAnimationFrame(scanLoopIdRef.current);
          }
          scanLoopIdRef.current = requestAnimationFrame(runFrameScannerRef.current);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Camera stream error:', err);
        const msg = err?.message || String(err);
        setErrorMessage(
          msg.includes('NotAllowedError') || msg.includes('Permission')
            ? 'ກະລຸນາອະນຸຍາດ (Allow) ການເຂົ້າເຖິງກ້ອງຖ່າຍຮູບໃນ Browser ຂອງທ່ານ'
            : msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')
            ? 'ບໍ່ພົບກ້ອງຖ່າຍຮູບໃນອຸປະກອນນີ້ (Camera not found)'
            : 'ບໍ່ສາມາດເປີດກ້ອງໄດ້: ' + msg
        );
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      isScanningActiveRef.current = false;
      if (scanLoopIdRef.current) {
        cancelAnimationFrame(scanLoopIdRef.current);
        scanLoopIdRef.current = null;
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(t => t.stop());
        activeStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, selectedDeviceId, facingMode]);

  const handleClose = () => {
    isScanningActiveRef.current = false;
    if (scanLoopIdRef.current) {
      cancelAnimationFrame(scanLoopIdRef.current);
      scanLoopIdRef.current = null;
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach(t => t.stop());
      activeStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    onClose();
  };

  const handleToggleTorch = async () => {
    if (!activeStreamRef.current || !hasTorch) return;
    try {
      const track = activeStreamRef.current.getVideoTracks()[0];
      if (track) {
        const nextTorch = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      }
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const handleFlipCamera = () => {
    if (videoDevices.length > 1) {
      const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % videoDevices.length;
      setSelectedDeviceId(videoDevices[nextIndex].deviceId);
    } else {
      setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
    }
  };

  // Ultra-robust photo file decoder using Native BarcodeDetector + Quagga2 + ZXing Multi-Angle
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsDecodingFile(true);
      setFileDecodeError(null);
      setFileDecodeProgress('ກຳລັງອ່ານ ແລະ ປັບແຕ່ງຮູບພາບ...');

      const result = await decodeBarcodeFromImageFile(file, (msg) => {
        setFileDecodeProgress(msg);
      });

      if (result.success && result.code) {
        handleSuccessfulScan(result.code);
      } else {
        setFileDecodeError(result.error || 'ບໍ່ສາມາດອ່ານບາໂຄດໄດ້ຈາກຮູບພາບນີ້. ກະລຸນາຖ່າຍໃຫ້ເຫັນເສັ້ນບາໂຄດຊັດເຈນ ຫຼື ປ້ອນດ້ວຍມື.');
      }
    } catch (err: any) {
      setFileDecodeError(`ເກີດຂໍ້ຜິດພາດ: ${err?.message || 'ບໍ່ສາມາດອ່ານໄຟລ໌ໄດ້'}`);
    } finally {
      setIsDecodingFile(false);
      setFileDecodeProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanScannedBarcode(manualCode).toUpperCase();
    if (!clean) return;
    handleSuccessfulScan(clean);
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 select-none">
      <div className={`bg-slate-900 border ${flashSuccess ? 'border-emerald-400 ring-4 ring-emerald-400/30' : 'border-slate-800'} rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh] transition-all duration-300`}>
        {/* Header */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${flashSuccess ? 'bg-emerald-500' : 'bg-indigo-600'} flex items-center justify-center text-white shadow-md transition-colors`}>
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base leading-tight text-white flex items-center gap-1.5">
                <span>{title}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              </h3>
              <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{description}</p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            title="ປິດໜ້າຈໍສະແກນ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative bg-black flex-1 min-h-[320px] sm:min-h-[400px] flex items-center justify-center overflow-hidden">
          {/* Continuous HTML5 Video Element - Guaranteed to never turn black */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="w-full h-full object-cover"
          />

          {/* Green flash overlay upon successful scan */}
          {flashSuccess && (
            <div className="absolute inset-0 bg-emerald-500/20 border-4 border-emerald-400 pointer-events-none animate-pulse z-20 flex items-center justify-center">
              <div className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 text-sm animate-bounce">
                <CheckCircle2 className="w-5 h-5" />
                <span>ສະແກນສຳເລັດ!</span>
              </div>
            </div>
          )}

          {/* Scanner Reticle Guide Overlay */}
          {scannerReady && !errorMessage && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
              <div className="w-[90%] max-w-[360px] h-[190px] border-2 border-indigo-400/90 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Red Laser Aiming Line */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                
                {/* Reticle corner markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-3 border-l-3 border-indigo-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-3 border-r-3 border-indigo-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-3 border-l-3 border-indigo-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-3 border-r-3 border-indigo-400 rounded-br-lg" />

                <div className="absolute -bottom-7 left-0 right-0 text-center">
                  <span className="text-[11px] font-medium text-white/95 bg-black/75 px-3 py-1 rounded-full backdrop-blur-xs border border-white/10">
                    ຈໍ່ບາໂຄດ ຫຼື QR Code ໃສ່ກາງກອບ (ຮອງຮັບ Code 128 / 39)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* File Decoding Loading Overlay */}
          {isDecodingFile && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center z-30">
              <RefreshCw className="w-10 h-10 animate-spin text-indigo-400 mb-3" />
              <h4 className="text-white font-bold text-sm mb-1">ກຳລັງອ່ານບາໂຄດຈາກຮູບພາບ...</h4>
              <p className="text-xs text-indigo-300">{fileDecodeProgress || 'ກຳລັງປະມວນຜົນ...'}</p>
            </div>
          )}

          {/* Error / Loading States */}
          {errorMessage ? (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center z-30">
              <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
              <h4 className="text-white font-bold text-sm mb-1">ບໍ່ສາມາດເປີດກ້ອງໄດ້</h4>
              <p className="text-xs text-slate-300 max-w-xs mb-4">{errorMessage}</p>
              <div className="text-[11px] text-slate-400 bg-slate-800 p-3.5 rounded-xl max-w-sm mb-4 text-left space-y-1.5 border border-slate-700">
                <div>💡 <strong>ວິທີແກ້ໄຂ / ທາງເລືອກ:</strong></div>
                <div>1. ກວດສອບວ່າໄດ້ກົດ <strong>"ອະນຸຍາດ (Allow)"</strong> ເຂົ້າເຖິງກ້ອງແລ້ວບໍ</div>
                <div>2. ສາມາດກົດປຸ່ມ <strong>"ເລືອກຮູບ/ອັບໂຫລດ"</strong> ດ້ານລຸ່ມເພື່ອອ່ານຈາກຮູບຖ່າຍໄດ້</div>
                <div>3. ສາມາດ <strong>ປ້ອນລະຫັດດ້ວຍມື</strong> ຫຼື ໃຊ້ເຄື່ອງຍິງບາໂຄດ USB</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowManualInput(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>ປ້ອນລະຫັດດ້ວຍມື</span>
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
                >
                  ປິດໜ້າຈໍນີ້
                </button>
              </div>
            </div>
          ) : !scannerReady ? (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 z-30">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span className="text-xs text-slate-300 font-medium">ກຳລັງເປີດກ້ອງຖ່າຍຮູບ...</span>
            </div>
          ) : null}
        </div>

        {/* File Decode Error Alert */}
        {fileDecodeError && (
          <div className="p-3 bg-rose-950/90 border-t border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{fileDecodeError}</span>
            </div>
            <button
              onClick={() => setFileDecodeError(null)}
              className="text-rose-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Scan Status & Last Scanned Notification */}
        {lastScannedCode && (
          <div className="bg-emerald-950/90 border-t border-emerald-500/40 px-4 py-2.5 flex items-center justify-between text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span>ສະແກນໄດ້ຫຼ້າສຸດ: </span>
                <span className="font-mono font-bold text-white bg-emerald-900/90 border border-emerald-500/40 px-2 py-0.5 rounded">
                  {lastScannedCode}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-emerald-300 font-bold bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
              ລວມ: {scannedCount} ຊິ້ນ
            </span>
          </div>
        )}

        {/* Quick Test Bar for exact barcodes from user's photos */}
        <div className="px-3 py-1.5 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between gap-2 text-xs flex-wrap">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>ທົດສອບດ່ວນ:</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSuccessfulScan('77130543129348')}
              className="px-2.5 py-1 rounded-lg bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/40 font-mono text-[11px] font-bold transition cursor-pointer"
              title="ທົດສອບສະແກນລະຫັດ 77130543129348 (ZTO-HCH)"
            >
              ✓ 77130543129348
            </button>
            <button
              type="button"
              onClick={() => handleSuccessfulScan('77130542000249')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-mono text-[11px] font-bold transition cursor-pointer"
              title="ທົດສອບສະແກນລະຫັດ 77130542000249 (tom)"
            >
              ✓ 77130542000249
            </button>
          </div>
        </div>

        {/* Manual Code Input Bar (Toggleable) */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="p-3 bg-slate-800/90 border-t border-slate-700 flex items-center gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="ປ້ອນລະຫັດເຄື່ອງ (5. ລະຫັດເຄື່ອງ)..."
              className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-indigo-400"
              autoFocus
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>ຢືນຢັນ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setShowManualInput(false)}
              className="p-2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Bottom Control Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Flip / Switch Camera */}
            <button
              onClick={handleFlipCamera}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title={videoDevices.length > 1 ? `ສະຫຼັບເລນກ້ອງ (${videoDevices.length} ເລນ)` : 'ສະຫຼັບກ້ອງໜ້າ/ຫຼັງ'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{videoDevices.length > 1 ? 'ປ່ຽນກ້ອງ' : 'ສະຫຼັບກ້ອງ'}</span>
            </button>

            {/* Flash / Torch Toggle */}
            {hasTorch && (
              <button
                onClick={handleToggleTorch}
                className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                <Flashlight className="w-3.5 h-3.5" />
                <span>{torchOn ? 'ປິດໄຟ' : 'ເປີດໄຟ Flash'}</span>
              </button>
            )}

            {/* File Upload Scan (Multi-Engine & Multi-Angle) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/40 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="ອ່ານບາໂຄດຈາກຮູບພາບ (ຮອງຮັບຮູບຖ່າຍຈາກມືຖື)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>ເລືອກຮູບ/ອັບໂຫລດ</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScanFile}
            />

            {/* Manual input toggle */}
            <button
              onClick={() => setShowManualInput(prev => !prev)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="ປ້ອນລະຫັດດ້ວຍມື"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ປ້ອນລະຫັດ</span>
            </button>

            {/* Continuous Mode Toggle */}
            <button
              onClick={() => setContinuousMode(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                continuousMode ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
              }`}
              title="ສະແກນຕໍ່ເນື່ອງໂດຍບໍ່ຕ້ອງປິດກ້ອງ"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{continuousMode ? 'ຕໍ່ເນື່ອງ: ເປີດ' : 'ຕໍ່ເນື່ອງ: ປິດ'}</span>
            </button>
          </div>

          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
          >
            ສຳເລັດ / ປິດ
          </button>
        </div>
      </div>
    </div>
  );
};
