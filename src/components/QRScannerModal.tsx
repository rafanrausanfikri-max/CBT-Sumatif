import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, Upload, X, RefreshCw, AlertCircle, CheckCircle2, QrCode, Sparkles } from 'lucide-react';
import { Exam, Student } from '../types';

export interface ScannedQRData {
  examId?: string;
  passCode?: string;
  subject?: string;
  studentName?: string;
  nis?: string;
  studentClass?: string;
  rawText: string;
}

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  exams: Exam[];
  students: Student[];
  onScanSuccess: (data: ScannedQRData) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  exams,
  students,
  onScanSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scannedResult, setScannedResult] = useState<ScannedQRData | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = 'cbt-qr-reader';

  const isMountedRef = useRef(true);

  // Sound feedback on success
  const playSuccessBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // Audio context might be restricted before interaction
    }
  };

  // Parse QR contents intelligently
  const parseQRText = (decodedText: string): ScannedQRData => {
    const trimmed = decodedText.trim();
    const result: ScannedQRData = { rawText: trimmed };

    // 1. Try parsing JSON format
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.examId) result.examId = parsed.examId;
        if (parsed.passCode || parsed.token || parsed.code) {
          result.passCode = parsed.passCode || parsed.token || parsed.code;
        }
        if (parsed.subject) result.subject = parsed.subject;
        if (parsed.name || parsed.studentName) {
          result.studentName = parsed.name || parsed.studentName;
        }
        if (parsed.nis) result.nis = parsed.nis;
        if (parsed.class || parsed.studentClass) {
          result.studentClass = parsed.class || parsed.studentClass;
        }
        return result;
      } catch {
        // Continue to fallback parsers
      }
    }

    // 2. Try URL Query Params format (e.g. https://...?examId=xxx&token=yyy or cbt://?...)
    if (trimmed.includes('?') || trimmed.includes('=')) {
      try {
        const queryStr = trimmed.includes('?') ? trimmed.split('?')[1] : trimmed;
        const params = new URLSearchParams(queryStr);
        if (params.get('examId')) result.examId = params.get('examId')!;
        if (params.get('token') || params.get('passCode')) {
          result.passCode = params.get('token') || params.get('passCode')!;
        }
        if (params.get('nis')) result.nis = params.get('nis')!;
        if (params.get('name')) result.studentName = params.get('name')!;
        if (params.get('class')) result.studentClass = params.get('class')!;
        if (result.examId || result.passCode || result.nis) return result;
      } catch {
        // fallback
      }
    }

    // 3. Try custom colon/pipe separated format: EXAM_ID:PASSCODE or NIS:NAME:CLASS
    if (trimmed.includes(':') || trimmed.includes('|')) {
      const separator = trimmed.includes('|') ? '|' : ':';
      const parts = trimmed.split(separator).map(s => s.trim());
      
      // Check if matches an exam ID
      const matchingExam = exams.find(e => e.id === parts[0]);
      if (matchingExam) {
        result.examId = matchingExam.id;
        if (parts[1]) result.passCode = parts[1];
        return result;
      }

      // Check if matches a student NIS
      const matchingStudent = students.find(s => s.nis === parts[0]);
      if (matchingStudent) {
        result.nis = matchingStudent.nis;
        result.studentName = matchingStudent.name;
        result.studentClass = matchingStudent.studentClass;
        return result;
      }
    }

    // 4. Direct Exam Token / Passcode match
    const examByToken = exams.find(
      e => e.passCode && e.passCode.toUpperCase() === trimmed.toUpperCase()
    );
    if (examByToken) {
      result.examId = examByToken.id;
      result.passCode = examByToken.passCode;
      result.subject = examByToken.subject;
      return result;
    }

    // 5. Direct Exam ID match
    const examById = exams.find(e => e.id === trimmed);
    if (examById) {
      result.examId = examById.id;
      result.passCode = examById.passCode;
      result.subject = examById.subject;
      return result;
    }

    // 6. Direct Student NIS match
    const studentByNis = students.find(s => s.nis === trimmed);
    if (studentByNis) {
      result.nis = studentByNis.nis;
      result.studentName = studentByNis.name;
      result.studentClass = studentByNis.studentClass;
      return result;
    }

    // Fallback: treat raw text as passCode/token
    result.passCode = trimmed.toUpperCase();
    return result;
  };

  const handleScanSuccess = (decodedText: string) => {
    playSuccessBeep();
    const parsed = parseQRText(decodedText);
    setScannedResult(parsed);
    setErrorMessage('');
    
    // Stop camera
    stopCamera();

    // Auto-apply after brief visual confirmation
    setTimeout(() => {
      onScanSuccess(parsed);
      onClose();
    }, 900);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping QR scanner:', err);
      }
      scannerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  };

  const startCamera = async (mode: 'environment' | 'user', retryCount = 0) => {
    if (!isOpen || activeTab !== 'camera' || !isMountedRef.current) return;

    setErrorMessage('');

    // Wait until DOM element is present and rendered
    const container = document.getElementById(scannerContainerId);
    if (!container || container.clientWidth === 0) {
      if (retryCount < 10) {
        setTimeout(() => {
          if (isMountedRef.current && isOpen && activeTab === 'camera') {
            startCamera(mode, retryCount + 1);
          }
        }, 150);
        return;
      } else {
        setErrorMessage('Elemen pemindai kamera tidak siap. Silakan gunakan opsi Unggah Foto QR.');
        return;
      }
    }

    setIsScanning(true);

    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch {
          // ignore
        }
        scannerRef.current = null;
      }

      // Double check container still exists
      const targetEl = document.getElementById(scannerContainerId);
      if (!targetEl) return;

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      // Check available cameras
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 1 && isMountedRef.current) {
          setHasMultipleCameras(true);
        }
      } catch {
        // ignore
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const boxSize = Math.max(180, Math.floor(minDim * 0.75));
          return { width: boxSize, height: boxSize };
        },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: mode },
        config,
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Frame parse error - ignore standard noise
        }
      );
    } catch (err: any) {
      console.warn('QR Camera start caught:', err);
      if (isMountedRef.current) {
        setIsScanning(false);
        if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
          setErrorMessage('Izin kamera ditolak. Silakan izinkan akses kamera pada browser Anda atau gunakan opsi unggah foto QR.');
        } else {
          setErrorMessage('Tidak dapat mengakses kamera pada peramban ini. Anda dapat menggunakan opsi Unggah Foto QR.');
        }
      }
    }
  };

  const handleFlipCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    stopCamera().then(() => {
      startCamera(nextMode);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    try {
      const tempId = 'file-qr-temp';
      let tempEl = document.getElementById(tempId);
      if (!tempEl) {
        tempEl = document.createElement('div');
        tempEl.id = tempId;
        tempEl.style.display = 'none';
        document.body.appendChild(tempEl);
      }

      const html5QrCode = new Html5Qrcode(tempId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleScanSuccess(decodedText);
    } catch (err) {
      console.warn('Scan file error:', err);
      setErrorMessage('QR Code tidak terdeteksi pada gambar. Pastikan gambar jelas dan tidak buram.');
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    if (isOpen && activeTab === 'camera') {
      const timer = setTimeout(() => {
        startCamera(facingMode);
      }, 200);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Pindai QR Code Ujian</h3>
              <p className="text-[11px] text-slate-400">Mulai asesmen otomatis dengan QR Code</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Camera vs Image File */}
        <div className="grid grid-cols-2 p-2 bg-slate-950/60 border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
            }}
            className={`py-2 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Gunakan Kamera</span>
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab('file');
            }}
            className={`py-2 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition cursor-pointer ${
              activeTab === 'file'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Foto QR</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col items-center justify-center">
          
          {/* Success Notification Banner */}
          {scannedResult && (
            <div className="w-full mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center space-x-3 animate-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-400" />
              <div>
                <strong className="block text-white text-sm">QR Code Terverifikasi!</strong>
                <span>Menerapkan data asesmen ke form...</span>
              </div>
            </div>
          )}

          {/* Tab 1: Live Camera View */}
          <div className={`w-full flex flex-col items-center ${activeTab === 'camera' ? 'block' : 'hidden'}`}>
            <div className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/40 shadow-inner flex items-center justify-center">
              
              {/* HTML5 QR Container */}
              <div id={scannerContainerId} className="w-full h-full" />

              {/* Animated Scanner Laser Overlay */}
              {isScanning && !scannedResult && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-56 h-56 border-2 border-dashed border-indigo-400/70 rounded-2xl relative">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-400" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-400" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-400" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-400" />
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent shadow-[0_0_8px_#818cf8] animate-pulse" />
                  </div>
                </div>
              )}
            </div>

            {/* Camera Controls */}
            <div className="mt-3 flex items-center justify-between w-full max-w-[320px] text-xs">
              <span className="text-slate-400 text-[11px]">Arahkan kamera ke QR Code</span>
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center space-x-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ganti Kamera</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab 2: File Upload View */}
          <div className={`w-full flex flex-col items-center ${activeTab === 'file' ? 'block' : 'hidden'}`}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-[320px] aspect-square rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-950/50 hover:bg-slate-900/50 transition flex flex-col items-center justify-center p-6 text-center cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-110 flex items-center justify-center mb-3 transition">
                <Upload className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-sm text-white">Klik untuk Pilih Gambar QR</h4>
              <p className="text-xs text-slate-400 mt-1">
                Pilih tangkapan layar (screenshot) atau foto kartu ujian siswa
              </p>
              <span className="mt-3 px-3 py-1 bg-slate-800 text-indigo-300 text-[11px] font-semibold rounded-lg">
                Format JPG, PNG, WEBP
              </span>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-3.5 w-full p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Info Tip */}
          <div className="mt-4 w-full bg-slate-800/40 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              QR Code yang dipindai akan otomatis mengisi mata pelajaran, token ujian, serta data siswa terdaftar.
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};
