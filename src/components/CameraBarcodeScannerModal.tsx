import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, Flashlight, RefreshCw, CheckCircle2, AlertTriangle, Scan, Zap } from 'lucide-react';
import { sound } from '../utils/audio';
import { cleanScannedBarcode } from '../utils/barcode';

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
  description = 'ຈໍ່ກ້ອງໂທລະສັບ ຫຼື WebCam ໃສ່ບາໂຄດ / QR Code ທີ່ຕິດຢູ່ກ່ອງພັດສະດຸ'
}) => {
  const [scannerReady, setScannerReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannedCount, setScannedCount] = useState(0);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'camera-barcode-reader-viewport';
  const isScanningRef = useRef(false);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedTextRef = useRef<string>('');

  // Start Scanner
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setScannerReady(false);
    setErrorMessage(null);

    const initScanner = async () => {
      try {
        // Allow DOM node to render
        await new Promise((r) => setTimeout(r, 150));

        if (!isMounted) return;

        // Cleanup any existing instance
        if (scannerRef.current) {
          try {
            if (isScanningRef.current) {
              await scannerRef.current.stop();
            }
            await scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
          isScanningRef.current = false;
        }

        const scanner = new Html5Qrcode(readerElementId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.DATA_MATRIX
          ],
          verbose: false
        });

        scannerRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Rectangular box optimized for 1D barcodes and 2D codes
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const width = Math.floor(minEdge * 0.9);
            const height = Math.floor(width * 0.55);
            return { width: Math.max(width, 240), height: Math.max(height, 140) };
          },
          aspectRatio: 1.333
        };

        await scanner.start(
          { facingMode },
          config,
          (decodedText) => {
            const now = Date.now();
            const clean = cleanScannedBarcode(decodedText);
            if (!clean) return;

            // Debounce: prevent same code scanning repeatedly within 1.5 seconds
            if (clean === lastScannedTextRef.current && now - lastScanTimeRef.current < 1500) {
              return;
            }

            lastScanTimeRef.current = now;
            lastScannedTextRef.current = clean;

            sound.playSuccess();
            setLastScannedCode(clean);
            setScannedCount(prev => prev + 1);

            // Execute scan callback
            onScan(clean);

            if (!continuousMode) {
              handleClose();
            }
          },
          () => {
            // Frame processing without barcode detected, silently continue
          }
        );

        isScanningRef.current = true;
        if (isMounted) {
          setScannerReady(true);
        }

        // Check if torch/flashlight is supported
        try {
          const track = (scanner as unknown as { getRunningTrackCameraCapabilities?: () => { isTorchSupported?: () => boolean } });
          const caps = track?.getRunningTrackCameraCapabilities?.();
          if (caps?.isTorchSupported?.()) {
            setHasTorch(true);
          }
        } catch {}
      } catch (err: unknown) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Camera Scanner start error:', err);
        setErrorMessage(
          msg.includes('NotAllowedError') || msg.includes('Permission')
            ? 'ກະລຸນາອະນຸຍາດ (Allow) ການເຂົ້າເຖິງກ້ອງຖ່າຍຮູບໃນ Browser ຂອງທ່ານ'
            : msg.includes('NotFoundError') || msg.includes('DevicesNotFoundError')
            ? 'ບໍ່ພົບກ້ອງຖ່າຍຮູບໃນອຸປະກອນນີ້ (Camera not found)'
            : 'ບໍ່ສາມາດເປີດກ້ອງໄດ້: ' + msg
        );
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        if (isScanningRef.current) {
          scannerRef.current.stop().catch(() => {}).finally(() => {
            try {
              scannerRef.current?.clear();
            } catch {}
            scannerRef.current = null;
            isScanningRef.current = false;
          });
        } else {
          try {
            scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
        }
      }
    };
  }, [isOpen, facingMode]);

  const handleClose = async () => {
    if (scannerRef.current && isScanningRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      try {
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
      isScanningRef.current = false;
    }
    onClose();
  };

  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await (scannerRef.current as unknown as { applyVideoConstraints: (c: unknown) => Promise<void> }).applyVideoConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn('Torch toggle error:', e);
    }
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative bg-black flex-1 min-h-[300px] sm:min-h-[360px] flex items-center justify-center overflow-hidden">
          {/* HTML5 QR Code Mount Element */}
          <div id={readerElementId} className="w-full h-full" />

          {/* Scanner Target Guide Overlay */}
          {scannerReady && !errorMessage && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-[85%] max-w-[320px] h-[160px] border-2 border-indigo-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Laser animation */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_#ef4444] animate-pulse top-1/2 -translate-y-1/2" />
                
                {/* Corner reticles */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-indigo-400 rounded-tl" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-indigo-400 rounded-tr" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-indigo-400 rounded-bl" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-indigo-400 rounded-br" />

                <div className="absolute -bottom-6 left-0 right-0 text-center">
                  <span className="text-[11px] font-medium text-white/90 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    ວາງເສັ້ນບາໂຄດໃຫ້ກົງກັບກອບສີ່ຫຼ່ຽມ
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error / Loading States */}
          {errorMessage ? (
            <div className="absolute inset-0 bg-slate-900/95 p-6 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
              <h4 className="text-white font-bold text-sm mb-1">ບໍ່ສາມາດເປີດກ້ອງໄດ້</h4>
              <p className="text-xs text-slate-300 max-w-xs mb-4">{errorMessage}</p>
              <div className="text-[11px] text-slate-400 bg-slate-800 p-3 rounded-xl max-w-sm mb-4 text-left space-y-1">
                <div>💡 <strong>ວິທີແກ້ໄຂ:</strong></div>
                <div>1. ກວດສອບວ່າໄດ້ກົດ <strong>"ອະນຸຍາດ (Allow)"</strong> ເຂົ້າເຖິງກ້ອງແລ້ວບໍ</div>
                <div>2. ຖ້າໃຊ້ໃນຄອມພິວເຕີ ສາມາດໃຊ້ <strong>ເຄື່ອງຍິງບາໂຄດ (USB/Bluetooth)</strong> ຍິງໄດ້ທັນທີ</div>
              </div>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition"
              >
                ປິດໜ້າຈໍນີ້
              </button>
            </div>
          ) : !scannerReady ? (
            <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
              <span className="text-xs text-slate-300 font-medium">ກຳລັງເປີດກ້ອງຖ່າຍຮູບ...</span>
            </div>
          ) : null}
        </div>

        {/* Scan Status & Last Scanned Notification */}
        {lastScannedCode && (
          <div className="bg-emerald-950/80 border-t border-emerald-500/40 px-4 py-2.5 flex items-center justify-between text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <span>ສະແກນໄດ້: </span>
                <span className="font-mono font-bold text-white bg-emerald-900 px-1.5 py-0.5 rounded">
                  {lastScannedCode}
                </span>
              </div>
            </div>
            <span className="text-[11px] text-emerald-400 font-bold bg-emerald-900/60 px-2 py-0.5 rounded-full">
              ລວມ: {scannedCount} ຊິ້ນ
            </span>
          </div>
        )}

        {/* Bottom Control Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {/* Flip Camera */}
            <button
              onClick={handleFlipCamera}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="ສະຫຼັບກ້ອງໜ້າ / ຫຼັງ"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ສະຫຼັບກ້ອງ</span>
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

            {/* Continuous Mode Toggle */}
            <button
              onClick={() => setContinuousMode(prev => !prev)}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                continuousMode ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'
              }`}
              title="ສະແກນຕໍ່ເນື່ອງໂດຍບໍ່ຕ້ອງປິດກ້ອງ"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>ສະແກນຕໍ່ເນື່ອງ: {continuousMode ? 'ເປີດ' : 'ປິດ'}</span>
            </button>
          </div>

          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            ສຳເລັດ / ປິດ
          </button>
        </div>
      </div>
    </div>
  );
};
