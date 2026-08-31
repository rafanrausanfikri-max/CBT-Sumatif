import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer, Copy, Check, X, Maximize2, Minimize2, Shield, Clock, FileText, Sparkles, Key } from 'lucide-react';
import { Exam } from '../types';

interface ExamQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
}

export const ExamQRCodeModal: React.FC<ExamQRCodeModalProps> = ({
  isOpen,
  onClose,
  exam,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isProjectorMode, setIsProjectorMode] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Generate QR payload
  const qrPayload = exam
    ? JSON.stringify({
        type: 'cbt_exam',
        examId: exam.id,
        subject: exam.subject,
        title: exam.title,
        gradeClass: exam.gradeClass,
        passCode: exam.passCode,
        durationMinutes: exam.durationMinutes,
      })
    : '';

  useEffect(() => {
    if (exam && qrPayload) {
      QRCode.toDataURL(qrPayload, {
        width: 480,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })
        .then((url) => {
          setQrDataUrl(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [exam, qrPayload]);

  if (!isOpen || !exam) return null;

  const handleCopyPayload = () => {
    if (qrPayload) {
      navigator.clipboard.writeText(qrPayload);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_Ujian_${exam.subject.replace(/\s+/g, '_')}_${exam.gradeClass}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    const printContent = document.getElementById('cbt-qr-print-area');
    if (!printContent) return;

    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Lembar QR Code Asesmen - ${exam.subject}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 40px; color: #0f172a; }
            .card { border: 2px solid #0f172a; border-radius: 16px; padding: 30px; max-width: 460px; margin: 0 auto; }
            .badge { display: inline-block; background: #e0e7ff; color: #4338ca; font-weight: bold; font-size: 12px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 12px; }
            h1 { font-size: 22px; margin: 6px 0; }
            h2 { font-size: 16px; color: #475569; font-weight: normal; margin: 4px 0 20px 0; }
            img { width: 280px; height: 280px; margin: 10px auto; display: block; }
            .token-box { background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 12px; padding: 12px; margin-top: 16px; }
            .token-label { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; }
            .token-val { font-size: 20px; font-weight: bold; letter-spacing: 3px; color: #1e293b; margin-top: 4px; }
            .meta { display: flex; justify-content: space-around; margin-top: 16px; font-size: 12px; color: #475569; }
            .instruction { font-size: 11px; color: #64748b; margin-top: 20px; border-top: 1px solid #e2e8f0; pt: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge">SISTEM ASESMEN SUMATIF (CBT)</span>
            <h1>${exam.subject}</h1>
            <h2>${exam.title} (${exam.gradeClass})</h2>
            <img src="${qrDataUrl}" alt="QR Code Asesmen" />
            <div class="token-box">
              <div class="token-label">Kode Token Ujian:</div>
              <div class="token-val">${exam.passCode}</div>
            </div>
            <div class="meta">
              <div>Durasi: <strong>${exam.durationMinutes} Menit</strong></div>
              <div>Jumlah: <strong>${exam.questions?.length || exam.questionCount} Soal</strong></div>
            </div>
            <div class="instruction">
              Pindai QR Code ini menggunakan menu <strong>Pindai QR Code</strong> pada Portal Siswa untuk masuk langsung ke ujian.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 ${isProjectorMode ? 'p-0' : ''}`}>
      <div
        className={`bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${
          isProjectorMode
            ? 'w-full h-full rounded-none justify-between p-6 sm:p-10'
            : 'max-w-md w-full max-h-[92vh]'
        }`}
      >
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                  {exam.gradeClass}
                </span>
                <h3 className="font-extrabold text-sm sm:text-base text-white line-clamp-1">{exam.subject}</h3>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{exam.title}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setIsProjectorMode(!isProjectorMode)}
              title={isProjectorMode ? 'Keluar Mode Layar Penuh' : 'Mode Proyektor Papan Tulis'}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              {isProjectorMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className={`p-6 flex-1 flex flex-col items-center justify-center overflow-y-auto text-center ${isProjectorMode ? 'scale-110 sm:scale-125' : ''}`}>
          
          <div id="cbt-qr-print-area" ref={printRef} className="flex flex-col items-center">
            {/* High Contrast QR Container */}
            <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-indigo-500/30 flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${exam.subject}`}
                  className="w-52 h-52 sm:w-60 sm:h-60 object-contain"
                />
              ) : (
                <div className="w-52 h-52 flex items-center justify-center text-slate-400 text-xs">
                  Membuat QR Code...
                </div>
              )}
            </div>

            {/* Token Badge */}
            <div className="mt-4 inline-flex items-center space-x-2 bg-slate-800 border border-slate-700 px-4 py-2 rounded-2xl shadow-inner">
              <Key className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-slate-400">Kode Token:</span>
              <strong className="text-base font-mono font-extrabold tracking-widest text-indigo-300 uppercase">
                {exam.passCode}
              </strong>
            </div>

            {/* Meta info */}
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{exam.durationMinutes} Menit</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>{exam.questions?.length || exam.questionCount} Soal</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>Anti-Cheat</span>
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-400 max-w-sm mt-4">
            Siswa dapat membuka <strong>Portal Siswa</strong> dan menekan tombol <strong>Pindai QR Code</strong> untuk memulai ujian secara instan tanpa mengetik manual.
          </p>

        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'Tersalin!' : 'Salin Data'}</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>Cetak Lembar QR</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadQR}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Gambar PNG</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
