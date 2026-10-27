import { 
  BrowserMultiFormatReader, 
  BarcodeFormat, 
  DecodeHintType, 
  MultiFormatReader, 
  RGBLuminanceSource, 
  BinaryBitmap, 
  HybridBinarizer, 
  GlobalHistogramBinarizer 
} from '@zxing/library';
import Quagga from '@ericblade/quagga2';
import { cleanScannedBarcode } from './barcode';

// All formats commonly used on logistics parcels & express waybills
const LOGISTICS_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX
];

/**
 * Configure ZXing MultiFormatReader with TRY_HARDER: true
 */
function createZxingReader(): MultiFormatReader {
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, LOGISTICS_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();
  reader.setHints(hints);
  return reader;
}

/**
 * Configure BrowserMultiFormatReader for live video scanning
 */
export function createBrowserScanner(): BrowserMultiFormatReader {
  const hints = new Map<DecodeHintType, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, LOGISTICS_FORMATS);
  hints.set(DecodeHintType.TRY_HARDER, true);

  // 150ms between decode attempts for snappy real-time feedback
  return new BrowserMultiFormatReader(hints, 150);
}

/**
 * Helper to decode a canvas image using ZXing with both Hybrid & GlobalHistogram binarizers
 */
export function decodeCanvasWithZxing(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return null;
  const imgData = ctx.getImageData(0, 0, width, height);
  const rgba = imgData.data;

  // Convert RGBA to luminance byte array
  const luminances = new Uint8ClampedArray(width * height);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    // Standard luminance formula
    luminances[i] = (r * 306 + g * 601 + b * 117) >> 10;
  }

  const lumSource = new RGBLuminanceSource(luminances, width, height);
  const reader = createZxingReader();

  // Try 1: GlobalHistogramBinarizer (superior for 1D barcodes on paper with gradient/glare)
  try {
    const bitmap = new BinaryBitmap(new GlobalHistogramBinarizer(lumSource));
    const result = reader.decode(bitmap);
    if (result && result.getText()) {
      return cleanScannedBarcode(result.getText());
    }
  } catch {}

  // Try 2: HybridBinarizer (adaptive threshold)
  try {
    const bitmap = new BinaryBitmap(new HybridBinarizer(lumSource));
    const result = reader.decode(bitmap);
    if (result && result.getText()) {
      return cleanScannedBarcode(result.getText());
    }
  } catch {}

  return null;
}

/**
 * Helper to decode a canvas or data URL using Quagga2 (sub-pixel 1D specialist)
 */
export async function decodeWithQuagga(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      Quagga.decodeSingle(
        {
          src: dataUrl,
          numOfWorkers: 0,
          inputStream: {
            size: 1000,
            singleChannel: false
          },
          locator: {
            patchSize: 'medium',
            halfSample: true
          },
          decoder: {
            readers: [
              'code_128_reader',
              'code_39_reader',
              'ean_reader',
              'ean_8_reader',
              'upc_reader',
              'upc_e_reader',
              'codabar_reader',
              'i2of5_reader'
            ],
            multiple: false
          },
          locate: true
        },
        (result) => {
          if (result && result.codeResult && result.codeResult.code) {
            resolve(cleanScannedBarcode(result.codeResult.code));
          } else {
            resolve(null);
          }
        }
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Rotate an HTMLCanvasElement by specific degrees
 */
function createRotatedCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const rad = (degrees * Math.PI) / 180;
  const isPerpendicular = Math.abs(degrees % 180) === 90;

  canvas.width = isPerpendicular ? source.height : source.width;
  canvas.height = isPerpendicular ? source.width : source.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);

  return canvas;
}

/**
 * Crop center of a canvas
 */
function createCenterCroppedCanvas(source: HTMLCanvasElement, scale: number = 0.75): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  const cropW = Math.floor(source.width * scale);
  const cropH = Math.floor(source.height * scale);
  const startX = Math.floor((source.width - cropW) / 2);
  const startY = Math.floor((source.height - cropH) / 2);

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(source, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
  return canvas;
}

/**
 * Enhance contrast and binarize canvas to defeat thermal paper glare / reflections
 */
function createHighContrastCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Simple contrast stretch and binarization
  let sum = 0;
  const len = data.length / 4;
  for (let i = 0; i < len; i++) {
    const idx = i * 4;
    const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
    sum += gray;
  }
  const threshold = (sum / len) * 0.92;

  for (let i = 0; i < len; i++) {
    const idx = i * 4;
    const gray = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114);
    const val = gray < threshold ? 0 : 255;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Master multi-engine, multi-angle decoder for photo files.
 * Designed to decode 1D & 2D barcodes from any mobile camera upload even if tilted, blurry, or washed out.
 */
export async function decodeBarcodeFromImageFile(
  fileOrBlob: Blob | File,
  onProgress?: (step: string) => void
): Promise<{ success: boolean; code?: string; engine?: string; error?: string }> {
  try {
    onProgress?.('ກຳລັງອ່ານ ແລະ ປັບແຕ່ງຮູບພາບ...');

    // Load file into an Image element
    const imgUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imgUrl;
    });

    // Scale image down to max 1280px to eliminate mobile 12MP noise and speed up scanning
    const MAX_DIM = 1280;
    let w = img.width;
    let h = img.height;
    if (w > MAX_DIM || h > MAX_DIM) {
      if (w > h) {
        h = Math.round((h * MAX_DIM) / w);
        w = MAX_DIM;
      } else {
        w = Math.round((w * MAX_DIM) / h);
        h = MAX_DIM;
      }
    }

    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = w;
    baseCanvas.height = h;
    const ctx = baseCanvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(imgUrl);
      return { success: false, error: 'Cannot create canvas context' };
    }
    ctx.drawImage(img, 0, 0, w, h);

    // 1. FASTEST & MOST ACCURATE: Try native hardware BarcodeDetector on the raw image directly
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const formats = await (window as any).BarcodeDetector.getSupportedFormats?.() || [];
        if (formats.length > 0) {
          const detector = new (window as any).BarcodeDetector({ formats });
          const barcodes = await detector.detect(img);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            URL.revokeObjectURL(imgUrl);
            return {
              success: true,
              code: cleanScannedBarcode(barcodes[0].rawValue),
              engine: 'Native BarcodeDetector (Direct)'
            };
          }
        }
      } catch {}
    }

    // Helper: rectangular crop for standard horizontal barcode
    const createBarcodeRectCrop = (source: HTMLCanvasElement): HTMLCanvasElement => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return source;
      const cropW = Math.floor(source.width * 0.88);
      const cropH = Math.floor(source.height * 0.40);
      const startX = Math.floor((source.width - cropW) / 2);
      const startY = Math.floor((source.height - cropH) / 2);
      canvas.width = cropW;
      canvas.height = cropH;
      ctx.drawImage(source, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
      return canvas;
    };

    // Prepare candidate canvas list (Normal, Rectangular Crop, Rotated, High Contrast)
    const candidates: { name: string; canvas: HTMLCanvasElement }[] = [
      { name: 'Barcode Strip Crop', canvas: createBarcodeRectCrop(baseCanvas) },
      { name: 'Original', canvas: baseCanvas },
      { name: 'Center Crop', canvas: createCenterCroppedCanvas(baseCanvas, 0.70) },
      { name: 'High Contrast', canvas: createHighContrastCanvas(baseCanvas) },
      { name: 'Rotated 90°', canvas: createRotatedCanvas(baseCanvas, 90) },
      { name: 'Rotated 270°', canvas: createRotatedCanvas(baseCanvas, 270) },
      { name: 'Tilt +5°', canvas: createRotatedCanvas(baseCanvas, 5) },
      { name: 'Tilt -5°', canvas: createRotatedCanvas(baseCanvas, -5) },
      { name: 'Rotated 180°', canvas: createRotatedCanvas(baseCanvas, 180) },
    ];

    onProgress?.('ກຳລັງກວດສອບບາໂຄດດ້ວຍ Multi-Engine (ZXing + Quagga)...');

    // 2. Try ZXing with GlobalHistogram on each candidate
    for (const c of candidates) {
      const zxingRes = decodeCanvasWithZxing(c.canvas);
      if (zxingRes) {
        URL.revokeObjectURL(imgUrl);
        return { success: true, code: zxingRes, engine: `ZXing (${c.name})` };
      }
    }

    // 3. Try Quagga2 on the top candidates (Barcode Strip, Original, High Contrast)
    for (const c of candidates.slice(0, 3)) {
      onProgress?.(`ກຳລັງວິເຄາະບາໂຄດແບບ Sub-pixel (${c.name})...`);
      const dataUrl = c.canvas.toDataURL('image/jpeg', 0.90);
      const quaggaRes = await decodeWithQuagga(dataUrl);
      if (quaggaRes) {
        URL.revokeObjectURL(imgUrl);
        return { success: true, code: quaggaRes, engine: `Quagga2 (${c.name})` };
      }
    }

    URL.revokeObjectURL(imgUrl);
    return {
      success: false,
      error: 'ບໍ່ສາມາດອ່ານບາໂຄດຈາກຮູບພາບໄດ້. ກະລຸນາຖ່າຍຮູບໃຫ້ເຫັນເສັ້ນບາໂຄດຊັດເຈນ ຫຼື ປ້ອນລະຫັດເຄື່ອງດ້ວຍມື.'
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error processing image' };
  }
}
