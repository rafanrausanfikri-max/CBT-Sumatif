import React, { useState, useEffect } from 'react';
import { Exam, Student } from '../types';
import { 
  Users, 
  ShieldCheck, 
  Search, 
  CheckSquare, 
  Square, 
  School, 
  Lock, 
  Sparkles, 
  X, 
  Save, 
  AlertCircle,
  UserCheck,
  UserX,
  Gauge,
  Check
} from 'lucide-react';

interface ParticipantAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  students: Student[];
  classes: string[];
  liveParticipantsCount?: number;
  onSave: (examId: string, updates: Partial<Exam>) => Promise<void>;
}

export const ParticipantAccessModal: React.FC<ParticipantAccessModalProps> = ({
  isOpen,
  onClose,
  exam,
  students,
  classes,
  liveParticipantsCount = 0,
  onSave,
}) => {
  const [restrictionType, setRestrictionType] = useState<'all' | 'class_only' | 'selected_students'>('all');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedNisList, setSelectedNisList] = useState<string[]>([]);
  const [maxConcurrent, setMaxConcurrent] = useState<number>(0);
  const [sessionSchedule, setSessionSchedule] = useState<string>('');
  
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (exam) {
      setRestrictionType(exam.accessRestrictionType || 'all');
      setSelectedClasses(exam.allowedClasses || []);
      setSelectedNisList(exam.allowedStudentNis || []);
      setMaxConcurrent(exam.maxConcurrentParticipants || 0);
      setSessionSchedule(exam.examSessionSchedule || '');
      setSuccessMessage('');
    }
  }, [exam, isOpen]);

  if (!isOpen || !exam) return null;

  // Toggle class selection
  const handleToggleClass = (className: string) => {
    setSelectedClasses(prev => 
      prev.includes(className) 
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  // Toggle student NIS selection
  const handleToggleStudent = (nis: string) => {
    setSelectedNisList(prev => 
      prev.includes(nis)
        ? prev.filter(n => n !== nis)
        : [...prev, nis]
    );
  };

  // Filter students for whitelist table
  const displayedStudents = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
                        s.nis.includes(searchStudent) ||
                        (s.nisn && s.nisn.includes(searchStudent));
    const matchClass = !filterClass || filterClass === 'ALL' || s.studentClass === filterClass;
    return matchSearch && matchClass;
  });

  const handleSelectAllDisplayed = () => {
    const displayedNis = displayedStudents.map(s => s.nis);
    setSelectedNisList(prev => Array.from(new Set([...prev, ...displayedNis])));
  };

  const handleDeselectAllDisplayed = () => {
    const displayedNisSet = new Set(displayedStudents.map(s => s.nis));
    setSelectedNisList(prev => prev.filter(n => !displayedNisSet.has(n)));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await onSave(exam.id, {
        accessRestrictionType: restrictionType,
        allowedClasses: selectedClasses,
        allowedStudentNis: selectedNisList,
        maxConcurrentParticipants: maxConcurrent,
        examSessionSchedule: sessionSchedule,
      });
      setSuccessMessage('Pengaturan pembatasan akses berhasil disimpan!');
      setTimeout(() => {
        setSuccessMessage('');
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error updating exam access restrictions:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg">
                Hak Akses & Pembatasan Peserta Ujian
              </h3>
              <p className="text-xs text-slate-400">
                {exam.subject} - {exam.title} ({exam.gradeClass})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {successMessage && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Mode Selection Cards */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              1. Pilih Model Pembatasan Akses:
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: All */}
              <div
                onClick={() => setRestrictionType('all')}
                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  restrictionType === 'all'
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">Semua Siswa</span>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      restrictionType === 'all' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-600'
                    }`} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Semua siswa terdaftar di sekolah yang memiliki token ujian dapat masuk.
                  </p>
                </div>
              </div>

              {/* Option 2: Class only */}
              <div
                onClick={() => setRestrictionType('class_only')}
                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  restrictionType === 'class_only'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg shadow-purple-600/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">Batasi Per Kelas</span>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      restrictionType === 'class_only' ? 'border-purple-400 bg-purple-400' : 'border-slate-600'
                    }`} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Hanya siswa dari rombel/kelas tertentu yang diizinkan mengakses.
                  </p>
                </div>
              </div>

              {/* Option 3: Whitelist */}
              <div
                onClick={() => setRestrictionType('selected_students')}
                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  restrictionType === 'selected_students'
                    ? 'bg-pink-600/20 border-pink-500 text-white shadow-lg shadow-pink-600/10'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white">Pilih Siswa Spesifik</span>
                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                      restrictionType === 'selected_students' ? 'border-pink-400 bg-pink-400' : 'border-slate-600'
                    }`} />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Daftar whitelist peserta (sangat pas untuk ujian susulan / remedial).
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Panel: Class Selector (if class_only) */}
          {restrictionType === 'class_only' && (
            <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-purple-800/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                  <School className="w-4 h-4 text-purple-400" />
                  <span>Pilih Rombel / Kelas yang Diizinkan:</span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {selectedClasses.length} kelas dipilih
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
                {classes.map((cls) => {
                  const isChecked = selectedClasses.includes(cls);
                  return (
                    <label
                      key={cls}
                      className={`flex items-center space-x-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleClass(cls)}
                        className="rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700 w-4 h-4 cursor-pointer"
                      />
                      <span className="truncate">{cls}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-Panel: Student Whitelist (if selected_students) */}
          {restrictionType === 'selected_students' && (
            <div className="bg-slate-950/80 p-4 sm:p-5 rounded-2xl border border-pink-800/40 space-y-3 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-xs font-bold text-pink-300 flex items-center space-x-1.5">
                  <UserCheck className="w-4 h-4 text-pink-400" />
                  <span>Daftar Peserta yang Diizinkan (Whitelist):</span>
                </span>
                <div className="text-[11px] text-pink-400 font-extrabold bg-pink-500/10 px-2.5 py-1 rounded-lg border border-pink-500/20">
                  {selectedNisList.length} dari {students.length} Siswa Terpilih
                </div>
              </div>

              {/* Filters & Bulk Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={searchStudent}
                      onChange={(e) => setSearchStudent(e.target.value)}
                      placeholder="Cari nama / NIS siswa..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                    />
                  </div>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-pink-500"
                  >
                    <option value="ALL">Semua Kelas</option>
                    {classes.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-2 text-[11px]">
                  <button
                    type="button"
                    onClick={handleSelectAllDisplayed}
                    className="px-2.5 py-1 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/30 rounded-lg font-bold cursor-pointer"
                  >
                    Pilih Semua ({displayedStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllDisplayed}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg cursor-pointer"
                  >
                    Hapus Pilihan
                  </button>
                </div>
              </div>

              {/* Students List Table */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 border border-slate-850 rounded-xl p-1 bg-slate-900/60">
                {displayedStudents.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    Tidak ada siswa yang sesuai pencarian.
                  </div>
                ) : (
                  displayedStudents.map((st) => {
                    const isSelected = selectedNisList.includes(st.nis);
                    return (
                      <div
                        key={st.id}
                        onClick={() => handleToggleStudent(st.nis)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                          isSelected
                            ? 'bg-pink-600/15 border border-pink-500/40 text-white'
                            : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-pink-400 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 shrink-0" />
                          )}
                          <span className="font-bold">{st.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-400">
                          <span className="bg-slate-950 px-2 py-0.5 rounded text-indigo-300">{st.studentClass}</span>
                          <span>NIS: {st.nis}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Concurrency Limit & Session Schedule */}
          <div className="bg-slate-950/60 p-4 sm:p-5 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Gauge className="w-4 h-4 text-indigo-400" />
              <span>2. Pengaturan Kuota Serentak & Jadwal Sesi (Opsional):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batas Maksimal Siswa Bersamaan:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    value={maxConcurrent}
                    onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 0)}
                    placeholder="0 = Tidak dibatasi"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  *Isi 0 jika tidak ada batasan kuota serentak.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Sesi / Jadwal Ujian:
                </label>
                <input
                  type="text"
                  value={sessionSchedule}
                  onChange={(e) => setSessionSchedule(e.target.value)}
                  placeholder="Contoh: Sesi 1 (07.30 - 09.00)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  *Teks ini akan ditampilkan kepada siswa di portal ujian.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl transition flex items-center space-x-2 shadow-lg shadow-purple-600/30 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pembatasan Peserta'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
