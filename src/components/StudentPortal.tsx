import React, { useState, useEffect } from 'react';
import { Exam, Student } from '../types';
import { subscribeStudents, subscribeClasses } from '../services/examService';
import { ShieldCheck, Play, Lock, FileText, Clock, AlertTriangle, Smartphone, CheckCircle2, UserCheck, School, Shuffle } from 'lucide-react';

interface StudentPortalProps {
  exams: Exam[];
  onStartExam: (selectedExam: Exam, studentName: string, nis: string, studentClass: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ exams, onStartExam }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [studentName, setStudentName] = useState('');
  const [nis, setNis] = useState('');
  const [studentClass, setStudentClass] = useState('XII F-1');
  const [passCodeInput, setPassCodeInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAgreementModal, setShowAgreementModal] = useState(false);

  // Student DB Lookup & Classes
  const [dbStudents, setDbStudents] = useState<Student[]>([]);
  const [classesList, setClassesList] = useState<string[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    const unsubStudents = subscribeStudents((students) => {
      setDbStudents(students);
    });
    const unsubClasses = subscribeClasses((classes) => {
      setClassesList(classes);
    });
    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, []);

  // Extract unique classes list combining custom classes & student classes
  const availableClasses = Array.from(
    new Set([...classesList, ...dbStudents.map(s => s.studentClass)])
  ).filter(Boolean).sort();

  // Students in selected class
  const studentsInClass = selectedClassFilter
    ? dbStudents
        .filter(s => s.studentClass === selectedClassFilter)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const handleClassChange = (cls: string) => {
    setSelectedClassFilter(cls);
    setSelectedStudentId('');
    if (cls) {
      setStudentClass(cls);
    }
    setStudentName('');
    setNis('');
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    const s = dbStudents.find(item => item.id === studentId || item.nis === studentId);
    if (s) {
      setStudentName(s.name);
      setNis(s.nis);
      setStudentClass(s.studentClass);
    }
  };

  const activeExams = exams.filter(e => e.isActive);
  const selectedExam = activeExams.find(e => e.id === selectedExamId);

  const handleValidateForm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedExam) {
      setErrorMessage('Silakan pilih mata pelajaran / ujian terlebih dahulu.');
      return;
    }
    if (!studentName.trim()) {
      setErrorMessage('Silakan masukkan nama lengkap siswa.');
      return;
    }
    if (!nis.trim()) {
      setErrorMessage('Silakan masukkan NIS / Nomor Induk Siswa.');
      return;
    }

    if (selectedExam.passCode && passCodeInput.trim().toUpperCase() !== selectedExam.passCode.toUpperCase()) {
      setErrorMessage('Kode Token Ujian / Password tidak valid! Silakan tanyakan ke Guru pengawas.');
      return;
    }

    // Check if student is blocked
    const studentRecord = dbStudents.find(s => s.nis === nis.trim() || s.id === selectedStudentId);
    if (studentRecord?.isBlocked) {
      setErrorMessage('Akses Ditolak: Akun siswa dengan NIS ini sedang ditangguhkan / diblokir oleh administrator.');
      return;
    }

    // Check Exam Participant Restrictions
    if (selectedExam.accessRestrictionType === 'class_only') {
      const allowed = selectedExam.allowedClasses || [];
      if (allowed.length > 0 && !allowed.includes(studentClass)) {
        setErrorMessage(`Akses Terbatas: Ujian ini hanya dibuka untuk rombel/kelas [${allowed.join(', ')}]. Kelas Anda (${studentClass}) tidak terdaftar.`);
        return;
      }
    } else if (selectedExam.accessRestrictionType === 'selected_students') {
      const allowedNis = selectedExam.allowedStudentNis || [];
      if (allowedNis.length > 0 && !allowedNis.includes(nis.trim())) {
        setErrorMessage(`Akses Khusus: NIS Anda (${nis}) tidak terdaftar dalam whitelist peserta asesmen ini (Ujian Khusus/Susulan).`);
        return;
      }
    }

    // Open Anti-cheat agreement modal
    setShowAgreementModal(true);
  };

  const handleConfirmAndStart = () => {
    if (selectedExam) {
      // Attempt immediate fullscreen request directly from user gesture
      try {
        const docEl = document.documentElement as any;
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          docEl.msRequestFullscreen();
        }
      } catch (err) {
        console.warn('Initial fullscreen gesture error:', err);
      }
      onStartExam(selectedExam, studentName, nis, studentClass);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 text-slate-100 flex items-center justify-center">
      <div className="max-w-xl w-full space-y-6">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Mode Ujian Aman (Secure CBT Engine)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Portal Asesmen Sumatif Siswa
          </h2>
          <p className="text-sm text-slate-400">
            Lengkapi data diri dan kode token ujian untuk memulai asesmen pilihan ganda.
          </p>
        </div>

        {/* Exam Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          
          <form onSubmit={handleValidateForm} className="space-y-5">
            
            {/* Student Identitas & Selection from DB */}
            <div className="space-y-4">
              {/* Select Class then Select Student Name from Database */}
              {dbStudents.length > 0 && (
                <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <span className="flex items-center space-x-2 text-indigo-300 font-bold text-xs uppercase tracking-wider">
                      <School className="w-4 h-4 text-indigo-400" />
                      <span>Pilih Data Siswa Terdaftar</span>
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded border border-indigo-500/30">
                      {dbStudents.length} Siswa Total
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Step 1: Select Class */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                        <span>Pilih Kelas *</span>
                      </label>
                      <select
                        value={selectedClassFilter}
                        onChange={(e) => handleClassChange(e.target.value)}
                        className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                      >
                        <option value="">-- Langkah 1: Pilih Kelas --</option>
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls} ({dbStudents.filter(s => s.studentClass === cls).length} Siswa)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Step 2: Select Student Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                        <span>Pilih Nama Siswa *</span>
                      </label>
                      <select
                        value={selectedStudentId}
                        onChange={(e) => handleStudentSelect(e.target.value)}
                        disabled={!selectedClassFilter}
                        className="w-full bg-slate-900 border border-indigo-500/40 rounded-xl px-3 py-2.5 text-base sm:text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <option value="">
                          {!selectedClassFilter
                            ? '-- Pilih Kelas Terlebih Dahulu --'
                            : `-- Langkah 2: Pilih Nama (${studentsInClass.length} Siswa) --`}
                        </option>
                        {studentsInClass.map((student) => (
                          <option key={student.id || student.nis} value={student.id || student.nis}>
                            {student.name} (NIS: {student.nis})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {studentName && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
                      <div className="flex items-center space-x-2.5">
                        <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <span className="font-bold text-white block">{studentName}</span>
                          <span className="text-[11px] text-slate-300">NIS: {nis} | Kelas: {studentClass}</span>
                        </div>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-300 font-bold text-[10px] px-2 py-0.5 rounded border border-emerald-500/30 shrink-0">
                        Terpilih & Terverifikasi
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Exam Selector (Placed after Pilih Data Siswa Terdaftar) */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Pilih Mata Pelajaran / Ujian *
                  </label>
                  {activeExams.length === 0 ? (
                    <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl text-center text-sm text-slate-400">
                      Belum ada asesmen aktif dari guru. Silakan hubungi pengawas.
                    </div>
                  ) : (
                    <select
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                    >
                      <option value="">Pilih Mata Pelajaran/Ujian</option>
                      {activeExams.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.subject || exam.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedExam && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-xs text-slate-300">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        <span>Durasi: <strong className="text-white">{selectedExam.durationMinutes} Menit</strong></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-sky-400" />
                        <span>Jumlah: <strong className="text-white">{selectedExam.questions?.length || selectedExam.questionCount} Soal</strong></span>
                      </div>
                    </div>
                    
                    {/* Randomization Badges */}
                    {(selectedExam.randomizeQuestions !== false || selectedExam.randomizeOptions !== false) && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {selectedExam.randomizeQuestions !== false && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 flex items-center space-x-1.5">
                            <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Urutan Soal Diacak</span>
                          </span>
                        )}
                        {selectedExam.randomizeOptions !== false && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center space-x-1.5">
                            <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                            <span>Pilihan Jawaban (A-E) Diacak</span>
                          </span>
                        )}
                      </div>
                    )}

                    {selectedExam.examSessionSchedule && (
                      <div className="bg-purple-950/40 border border-purple-800/40 px-3 py-1.5 rounded-xl text-purple-300 text-xs flex items-center justify-between">
                        <span className="font-semibold">Jadwal Sesi:</span>
                        <span className="font-bold text-white font-mono">{selectedExam.examSessionSchedule}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: ALYA APRILLIA"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    NIS / Nomor Induk *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 242510363"
                    value={nis}
                    onChange={(e) => setNis(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Kelas / Rombel *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: XII F-1"
                    value={studentClass}
                    onChange={(e) => setStudentClass(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Kode Token Ujian (Dari Pengawas) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SUMATIF123"
                    value={passCodeInput}
                    onChange={(e) => setPassCodeInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white tracking-widest font-mono uppercase placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedExam}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Masuk Ruang Ujian</span>
            </button>
          </form>
        </div>

        {/* Device & Security Features Notice */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
          <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Fitur Pengawasan & Integritas Ujian Aktif:</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5 list-disc text-slate-400">
            <li>Layar Penuh (Fullscreen Required)</li>
            <li>Deteksi Keluar Tab / Aplikasi</li>
            <li>Blokir Pintasan Keyboard & Copy</li>
            <li>Enkripsi Real-Time AES-256</li>
          </ul>
        </div>

      </div>

      {/* Anti-Cheat Protocol Agreement Modal */}
      {showAgreementModal && selectedExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-indigo-400">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Tata Tertib & Penguncian Layar</h3>
                <p className="text-xs text-slate-400">Perhatikan aturan berikut sebelum layar dikunci:</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 text-xs text-slate-300">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Layar perangkat akan masuk ke mode <strong>Fullscreen / Layar Penuh</strong>.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Dilarang membuka tab baru</strong>, berpindah ke aplikasi pesan, atau menekan tombol beranda/menu.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Sistem mencatat setiap pelanggaran secara real-time dan akan <strong>MENGUNCI LAYAR</strong> jika melampaui batas ({selectedExam.maxViolations}x pelanggaran).</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Jawaban Anda dienkripsi otomatis secara berkala dengan kunci enkripsi AES.</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAgreementModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAndStart}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Setuju & Mulai Ujian Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
