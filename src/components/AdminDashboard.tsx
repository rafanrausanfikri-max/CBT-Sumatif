import React, { useState, useEffect } from 'react';
import { MathText } from './MathText';
import { Exam, ExamSubmission, Question, Student } from '../types';
import { compressBase64Image, compressEmbeddedImagesInText } from '../lib/imageUtils';
import {
  saveExam,
  updateExam,
  deleteExam,
  unlockStudentSubmission,
  forceSubmitStudentSubmission,
  addStudentTime,
  deleteSubmission,
  clearExamSubmissions,
  markAllViolationLogsAsRead,
  updateTeacherPin,
  subscribeStudents,
  addStudent,
  deleteStudent,
  seedInitialStudents,
  subscribeClasses,
  addSchoolClass,
  deleteSchoolClass
} from '../services/examService';
import {
  parseExcelQuestions,
  parseWordQuestions,
  downloadExcelTemplate,
  downloadWordTemplate
} from '../lib/importer';
import { exportSubmissionsToExcel, exportSubmissionsToPDF } from '../lib/exporter';
import {
  Users,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Clock,
  ShieldAlert,
  Unlock,
  CheckCircle,
  FileDown,
  RefreshCw,
  Search,
  KeyRound,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Image as ImageIcon,
  Eye,
  Check,
  GraduationCap,
  Users as UsersIcon,
  X,
  Shuffle,
  BarChart3
} from 'lucide-react';
import { ParticipantAccessModal } from './ParticipantAccessModal';
import { ItemAnalysisDashboard } from './ItemAnalysisDashboard';

interface AdminDashboardProps {
  exams: Exam[];
  submissions: ExamSubmission[];
  selectedExamId: string;
  onSelectExamId: (id: string) => void;
  adminPin: string;
  onChangeAdminPin: (newPin: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  exams,
  submissions,
  selectedExamId,
  onSelectExamId,
  adminPin,
  onChangeAdminPin
}) => {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'exams' | 'reports' | 'analysis' | 'students'>('monitoring');
  const [searchQuery, setSearchQuery] = useState('');
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Partial<Exam> | null>(null);
  const [selectedAccessExam, setSelectedAccessExam] = useState<Exam | null>(null);
  const [showAccessModal, setShowAccessModal] = useState(false);

  // Student Database States
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentNis, setNewStudentNis] = useState('');
  const [newStudentNisn, setNewStudentNisn] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'L' | 'P'>('L');
  const [newStudentClass, setNewStudentClass] = useState('XII F-1');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isSeedingStudents, setIsSeedingStudents] = useState(false);
  const [studentSuccessMsg, setStudentSuccessMsg] = useState('');

  // Class Management States
  const [classesList, setClassesList] = useState<string[]>([]);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState('');
  const [isAddingClass, setIsAddingClass] = useState(false);
  const [classSuccessMsg, setClassSuccessMsg] = useState('');
  const [classErrorMsg, setClassErrorMsg] = useState('');

  // Delete Exam Confirmation States
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);
  const [deleteExamError, setDeleteExamError] = useState('');

  // Delete Student Confirmation States
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);

  // Delete Class Confirmation States
  const [classToDelete, setClassToDelete] = useState<string | null>(null);
  const [isDeletingClass, setIsDeletingClass] = useState(false);

  // Seed 180 Students Confirmation States
  const [showSeedModal, setShowSeedModal] = useState(false);

  // Subscribe to students and classes real-time
  useEffect(() => {
    const unsubStudents = subscribeStudents((data) => {
      setStudentsList(data);
    });
    const unsubClasses = subscribeClasses((data) => {
      setClassesList(data);
    });
    return () => {
      unsubStudents();
      unsubClasses();
    };
  }, []);

  // Combined unique sorted classes
  const availableClassOptions = Array.from(
    new Set([...classesList, ...studentsList.map(s => s.studentClass)])
  ).filter(Boolean).sort();

  // Automatically mark violation notifications read when teacher opens dashboard
  useEffect(() => {
    markAllViolationLogsAsRead();
  }, []);

  // Question editing inside exam modal
  const [questionsList, setQuestionsList] = useState<Question[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Modal states for Change Teacher PIN
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmNewPinInput, setConfirmNewPinInput] = useState('');
  const [pinErrorMsg, setPinErrorMsg] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState('');
  const [isSavingPin, setIsSavingPin] = useState(false);

  // Modal states for AI Question Generator
  const [showAiGeneratorModal, setShowAiGeneratorModal] = useState(false);
  const [aiSubject, setAiSubject] = useState('');
  const [aiGradeClass, setAiGradeClass] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('Sedang');
  const [aiCount, setAiCount] = useState(5);
  const [aiAdditionalPrompt, setAiAdditionalPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiErrorMsg, setAiErrorMsg] = useState('');
  const [generatedAiQuestions, setGeneratedAiQuestions] = useState<Question[]>([]);
  const [selectedAiQuestionIds, setSelectedAiQuestionIds] = useState<string[]>([]);
  const [bulkPointsValue, setBulkPointsValue] = useState<number>(10);

  const handleApplyBulkPoints = () => {
    const val = Math.max(1, bulkPointsValue || 10);
    setQuestionsList(prev => prev.map(q => ({ ...q, points: val })));
  };

  const handleDistributePointsEvenly = () => {
    if (questionsList.length === 0) return;
    const count = questionsList.length;
    const basePoint = Math.floor(100 / count);
    const remainder = 100 % count;
    setQuestionsList(prev => prev.map((q, idx) => ({
      ...q,
      points: basePoint + (idx < remainder ? 1 : 0)
    })));
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinErrorMsg('');
    setPinSuccessMsg('');

    if (currentPinInput.trim() !== adminPin) {
      setPinErrorMsg('PIN lama yang Anda masukkan salah!');
      return;
    }

    if (newPinInput.trim().length < 4) {
      setPinErrorMsg('PIN baru minimal 4 karakter/digit!');
      return;
    }

    if (newPinInput.trim() !== confirmNewPinInput.trim()) {
      setPinErrorMsg('Konfirmasi PIN baru tidak cocok dengan PIN baru!');
      return;
    }

    try {
      setIsSavingPin(true);
      await updateTeacherPin(newPinInput.trim());
      onChangeAdminPin(newPinInput.trim());
      setPinSuccessMsg('PIN Guru berhasil diperbarui dan tersimpan di database!');
      setTimeout(() => {
        setShowChangePinModal(false);
        setPinSuccessMsg('');
        setCurrentPinInput('');
        setNewPinInput('');
        setConfirmNewPinInput('');
      }, 1500);
    } catch (err: any) {
      setPinErrorMsg('Gagal menyimpan PIN: ' + (err?.message || String(err)));
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleGenerateQuestionsWithAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      setAiErrorMsg('Topik / Materi Pembelajaran wajib diisi.');
      return;
    }
    setAiErrorMsg('');
    setIsGeneratingAi(true);
    setGeneratedAiQuestions([]);
    setSelectedAiQuestionIds([]);

    try {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: aiSubject || editingExam?.subject || 'Mata Pelajaran',
          gradeClass: aiGradeClass || editingExam?.gradeClass || 'Kelas XI',
          topic: aiTopic,
          difficulty: aiDifficulty,
          count: aiCount,
          additionalPrompt: aiAdditionalPrompt
        })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(`Gagal memuat respon AI (Status: ${response.status}). Silakan coba beberapa saat lagi.`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghasilkan soal dengan AI.');
      }

      const rawList: any[] = data.questions || [];
      const qList: Question[] = rawList.map((q: any) => ({
        ...q,
        questionText: String(q.questionText || '')
          .replace(/\s*\btrilog(?:y|ies)\b\s*/gi, ' ')
          .trim(),
        options: (q.options || []).map((opt: string) =>
          String(opt || '')
            .replace(/^[A-Ea-e][\.\)\:\-]\s*/, '')
            .replace(/\s*\btrilog(?:y|ies)\b\s*/gi, ' ')
            .trim()
        ),
        explanation: String(q.explanation || '')
          .replace(/\s*\btrilog(?:y|ies)\b\s*/gi, ' ')
          .trim()
      }));
      setGeneratedAiQuestions(qList);
      setSelectedAiQuestionIds(qList.map(q => q.id));
    } catch (err: any) {
      let rawMsg = err?.message || 'Terjadi kesalahan saat membuat soal dengan AI.';
      try {
        if (rawMsg.startsWith('{') && rawMsg.endsWith('}')) {
          const parsed = JSON.parse(rawMsg);
          if (parsed?.error?.message) {
            rawMsg = parsed.error.message;
          } else if (parsed?.error) {
            rawMsg = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
          }
        }
      } catch {
        // keep rawMsg
      }
      setAiErrorMsg(rawMsg);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleToggleSelectAiQuestion = (id: string) => {
    setSelectedAiQuestionIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleApplyGeneratedQuestions = () => {
    const chosen = generatedAiQuestions.filter(q => selectedAiQuestionIds.includes(q.id));
    if (chosen.length === 0) {
      alert('Pilih setidaknya satu soal untuk ditambahkan.');
      return;
    }
    setQuestionsList(prev => [...prev, ...chosen]);
    setShowAiGeneratorModal(false);
    setGeneratedAiQuestions([]);
    setAiTopic('');
  };

  // Modal view for individual student submission answers detail
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState<ExamSubmission | null>(null);

  // Modal states for deleting submission data in reports
  const [deletingSubmissionTarget, setDeletingSubmissionTarget] = useState<ExamSubmission | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDeleteSingle = async () => {
    if (!deletingSubmissionTarget) return;
    try {
      setIsDeleting(true);
      await deleteSubmission(deletingSubmissionTarget.id);
      setDeletingSubmissionTarget(null);
    } catch (err: any) {
      alert('Gagal menghapus submisi: ' + (err?.message || String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmClearAll = async () => {
    try {
      setIsDeleting(true);
      await clearExamSubmissions(selectedExamId);
      setShowClearAllModal(false);
    } catch (err: any) {
      alert('Gagal menghapus semua submisi: ' + (err?.message || String(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  const currentExam = exams.find(e => e.id === selectedExamId) || exams[0];
  const examSubmissions = submissions.filter(s => !selectedExamId || s.examId === selectedExamId);

  const filteredSubmissions = examSubmissions.filter(s =>
    s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nis?.includes(searchQuery) ||
    s.studentClass?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open Exam Form for Create or Edit
  const handleOpenExamModal = (examToEdit?: Exam) => {
    setSaveError(null);
    setIsSaving(false);
    if (examToEdit) {
      setEditingExam({
        ...examToEdit,
        randomizeQuestions: examToEdit.randomizeQuestions !== undefined ? examToEdit.randomizeQuestions : true,
        randomizeOptions: examToEdit.randomizeOptions !== undefined ? examToEdit.randomizeOptions : true,
      });
      setQuestionsList(examToEdit.questions || []);
    } else {
      setEditingExam({
        title: 'Asesmen Sumatif Terbaru',
        subject: 'Mata Pelajaran',
        gradeClass: 'Kelas XI',
        durationMinutes: 30,
        passCode: 'SUMATIF123',
        isActive: true,
        antiCheatEnabled: true,
        maxViolations: 3,
        randomizeQuestions: true,
        randomizeOptions: true,
        questions: []
      });
      setQuestionsList([]);
    }
    setImportMessage('');
    setShowExamModal(true);
  };

  const handleSaveExamForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Compress base64 images in questions before saving to avoid Firestore 1MB document limit
      const processedQuestions = await Promise.all(
        questionsList.map(async (q) => {
          let cleanText = q.questionText || '';
          let cleanImageUrl = q.imageUrl;

          if (cleanText.length > 30000 && cleanText.includes('data:image/')) {
            cleanText = await compressEmbeddedImagesInText(cleanText);
          }

          if (cleanImageUrl && cleanImageUrl.startsWith('data:image/') && cleanImageUrl.length > 30000) {
            cleanImageUrl = await compressBase64Image(cleanImageUrl, 800, 0.75);
          }

          const cleanedQ: Record<string, any> = {
            id: q.id || `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            questionText: cleanText,
            options: Array.isArray(q.options) ? q.options.map(o => o || '') : [],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
            points: typeof q.points === 'number' ? q.points : 10,
          };
          if (q.explanation) cleanedQ.explanation = q.explanation;
          if (cleanImageUrl) cleanedQ.imageUrl = cleanImageUrl;

          return cleanedQ as Question;
        })
      );

      const savedExamId = await saveExam({
        ...editingExam,
        questions: processedQuestions
      });

      if (savedExamId && onSelectExamId) {
        onSelectExamId(savedExamId);
      }

      setShowExamModal(false);
      setEditingExam(null);
    } catch (err: any) {
      console.error('Error saving exam:', err);
      setSaveError(
        err?.message || 'Gagal menyimpan asesmen ke database. Pastikan koneksi internet stabil dan ukuran gambar tidak terlalu besar.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handlePromptDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
    setDeleteExamError('');
  };

  const handleConfirmDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeletingExam(true);
    setDeleteExamError('');
    try {
      await deleteExam(examToDelete.id);
      if (selectedExamId === examToDelete.id) {
        const remaining = exams.filter(e => e.id !== examToDelete.id);
        if (remaining.length > 0) {
          onSelectExamId(remaining[0].id);
        } else {
          onSelectExamId('');
        }
      }
      setExamToDelete(null);
    } catch (err: any) {
      console.error('Error deleting exam:', err);
      setDeleteExamError(err?.message || 'Gagal menghapus asesmen dari database.');
    } finally {
      setIsDeletingExam(false);
    }
  };

  // Import Questions from File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage('');

    try {
      let imported: Question[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        imported = await parseExcelQuestions(file);
      } else if (fileName.endsWith('.docx')) {
        imported = await parseWordQuestions(file);
      } else {
        throw new Error('Format file harus .docx, .xlsx, atau .csv');
      }

      setQuestionsList(prev => [...prev, ...imported]);
      setImportMessage(`Berhasil mengimpor ${imported.length} soal dari file!`);
    } catch (err: any) {
      setImportMessage(err.message || 'Gagal mengimpor file.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  // Add Empty Question manually
  const handleAddManualQuestion = () => {
    const newQ: Question = {
      id: `q_man_${Date.now()}_${questionsList.length}`,
      questionText: 'Tuliskan teks pertanyaan di sini...',
      options: ['Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'Pilihan E'],
      correctAnswer: 0,
      points: 10,
      explanation: 'Penjelasan / pembahasan soal.'
    };
    setQuestionsList(prev => [...prev, newQ]);
  };

  // Student Database Operations
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentNis.trim()) {
      alert('Nama dan NIS wajib diisi!');
      return;
    }
    setIsAddingStudent(true);
    try {
      await addStudent({
        nis: newStudentNis.trim(),
        nisn: newStudentNisn.trim() || '-',
        name: newStudentName.trim().toUpperCase(),
        gender: newStudentGender,
        studentClass: newStudentClass
      });
      setStudentSuccessMsg(`Siswa ${newStudentName} berhasil ditambahkan!`);
      setNewStudentName('');
      setNewStudentNis('');
      setNewStudentNisn('');
      setShowAddStudentModal(false);
      setTimeout(() => setStudentSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error adding student:', err);
      alert('Gagal menambahkan data siswa.');
    } finally {
      setIsAddingStudent(false);
    }
  };

  const handleConfirmSeedDatabase = async () => {
    setIsSeedingStudents(true);
    try {
      await seedInitialStudents();
      setStudentSuccessMsg('Database 180 siswa SMA Negeri 2 Ciamis berhasil dipulihkan!');
      setShowSeedModal(false);
      setTimeout(() => setStudentSuccessMsg(''), 4000);
    } catch (err: any) {
      alert('Gagal memuat data siswa: ' + (err?.message || String(err)));
    } finally {
      setIsSeedingStudents(false);
    }
  };

  // Class Management Operations
  const handleAddClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newClassNameInput.trim().toUpperCase();
    if (!formatted) {
      setClassErrorMsg('Nama kelas / rombel tidak boleh kosong.');
      return;
    }
    if (availableClassOptions.includes(formatted)) {
      setClassErrorMsg(`Kelas "${formatted}" sudah ada dalam daftar.`);
      return;
    }
    setClassErrorMsg('');
    setIsAddingClass(true);
    try {
      await addSchoolClass(formatted);
      setClassSuccessMsg(`Kelas "${formatted}" berhasil ditambahkan!`);
      setNewClassNameInput('');
      setShowAddClassModal(false);
      setTimeout(() => setClassSuccessMsg(''), 4000);
    } catch (err: any) {
      setClassErrorMsg(err?.message || 'Gagal menambahkan kelas.');
    } finally {
      setIsAddingClass(false);
    }
  };

  const handleConfirmDeleteClass = async () => {
    if (!classToDelete) return;
    setIsDeletingClass(true);
    try {
      await deleteSchoolClass(classToDelete);
      setClassSuccessMsg(`Kelas "${classToDelete}" berhasil dihapus.`);
      setClassToDelete(null);
      setTimeout(() => setClassSuccessMsg(''), 3000);
    } catch (err: any) {
      alert('Gagal menghapus kelas: ' + (err?.message || String(err)));
    } finally {
      setIsDeletingClass(false);
    }
  };

  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeletingStudent(true);
    try {
      await deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    } catch (err: any) {
      alert('Gagal menghapus data siswa: ' + (err?.message || String(err)));
    } finally {
      setIsDeletingStudent(false);
    }
  };

  // Summary Metrics
  const totalSubmissions = examSubmissions.length;
  const activeStudents = examSubmissions.filter(s => s.status === 'in_progress').length;
  const lockedStudents = examSubmissions.filter(s => s.isLocked || s.status === 'locked').length;
  const submittedStudents = examSubmissions.filter(s => s.status === 'submitted').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Admin Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center space-x-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Dashboard Pengawas & Administrator Guru</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Pantau aktivitas ujian, kelola bank soal, dan ekspor laporan hasil asesmen secara real-time.
          </p>
        </div>

        {/* Exam Picker Filter & Ganti PIN */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <select
              value={selectedExamId}
              onChange={(e) => onSelectExamId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">Pilih Mata Pelajaran/Ujian</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.subject || e.title}
                </option>
              ))}
            </select>
          </div>

          {selectedExamId && (
            <button
              onClick={() => {
                const ex = exams.find(e => e.id === selectedExamId);
                if (ex) {
                  setSelectedAccessExam(ex);
                  setShowAccessModal(true);
                }
              }}
              className="px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
              title="Atur Hak Akses & Pembatasan Peserta Ujian"
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>Akses Peserta</span>
            </button>
          )}

          <button
            onClick={() => {
              setCurrentPinInput('');
              setNewPinInput('');
              setConfirmNewPinInput('');
              setPinErrorMsg('');
              setPinSuccessMsg('');
              setShowChangePinModal(true);
            }}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
            title="Ganti PIN Administrator / Guru"
          >
            <KeyRound className="w-4 h-4 text-indigo-400" />
            <span>Ganti PIN Guru</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-800 pb-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'monitoring'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Monitoring Real-Time ({activeStudents})</span>
          {lockedStudents > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-extrabold animate-pulse">
              {lockedStudents} Terkunci
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Kelola Asesmen & Import Soal ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Laporan Nilai & Ekspor</span>
        </button>

        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'analysis'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span>Analisis Butir Soal</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'students'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Database Siswa ({studentsList.length})</span>
        </button>
      </div>

      {/* TAB 1: REAL-TIME MONITORING */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <p className="text-xs text-slate-400 font-semibold uppercase">Total Peserta</p>
              <p className="text-2xl font-black text-white">{totalSubmissions}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <p className="text-xs text-indigo-400 font-semibold uppercase">Sedang Ujian</p>
              <p className="text-2xl font-black text-indigo-400">{activeStudents}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <p className="text-xs text-emerald-400 font-semibold uppercase">Selesai</p>
              <p className="text-2xl font-black text-emerald-400">{submittedStudents}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
              <p className="text-xs text-rose-400 font-semibold uppercase">Layar Terkunci</p>
              <p className="text-2xl font-black text-rose-400">{lockedStudents}</p>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari Nama Siswa / NIS / Kelas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="text-xs text-slate-400">
              * Data otomatis diperbarui secara live via Firestore
            </div>
          </div>

          {/* Submissions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800/80 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-700">
                    <th className="p-4">No</th>
                    <th className="p-4">Siswa / NIS</th>
                    <th className="p-4">Kelas</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Nilai Temporary</th>
                    <th className="p-4 text-center">Pelanggaran</th>
                    <th className="p-4 text-center">Integritas AES</th>
                    <th className="p-4 text-center">Aksi Pengawas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        Belum ada data pengerjaan ujian peserta.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub, idx) => (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-4 font-mono font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-4">
                          <p className="font-bold text-white">{sub.studentName}</p>
                          <p className="text-[11px] text-slate-500 font-mono">NIS: {sub.nis}</p>
                        </td>
                        <td className="p-4 font-medium">{sub.studentClass}</td>
                        <td className="p-4 text-center">
                          {sub.isLocked ? (
                            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center space-x-1 animate-pulse">
                              <AlertOctagon className="w-3 h-3" />
                              <span>Terkunci</span>
                            </span>
                          ) : sub.status === 'submitted' ? (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Selesai</span>
                            </span>
                          ) : (
                            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Mengerjakan</span>
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center font-bold text-sm text-white">
                          {sub.score} <span className="text-xs font-normal text-slate-500">/ {sub.totalPoints}</span>
                        </td>
                        <td className="p-4 text-center">
                          {sub.violationCount > 0 ? (
                            <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                              {sub.violationCount}x
                            </span>
                          ) : (
                            <span className="text-slate-500">Bersih</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {sub.checksum ? (
                            <span className="text-emerald-400 text-[10px] font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              AES Valid
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Standard</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => setSelectedSubmissionDetail(sub)}
                              title="Lihat Detail Submisi & Jawaban"
                              className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail</span>
                            </button>

                            {sub.isLocked && (
                              <button
                                onClick={() => unlockStudentSubmission(sub.id)}
                                title="Buka Kunci Layar Siswa"
                                className="p-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Buka Kunci</span>
                              </button>
                            )}

                            {sub.status === 'in_progress' && (
                              <>
                                <button
                                  onClick={() => addStudentTime(sub.id, sub.remainingSeconds, 10)}
                                  title="Tambah Waktu +10 Menit"
                                  className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>+10m</span>
                                </button>

                                <button
                                  onClick={() => forceSubmitStudentSubmission(sub.id)}
                                  title="Paksa Kumpulkan Ujian"
                                  className="p-1.5 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Kumpulkan</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: EXAMS & QUESTION MANAGEMENT */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-bold text-lg text-white">Daftar Asesmen Sumatif</h3>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => {
                  handleOpenExamModal();
                  setShowAiGeneratorModal(true);
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-purple-600/30 flex items-center space-x-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-200" />
                <span>Buat Soal dengan AI</span>
              </button>
              <button
                onClick={() => handleOpenExamModal()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Asesmen Baru</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((ex) => (
              <div key={ex.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl relative">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      {ex.gradeClass}
                    </span>
                    <h4 className="font-extrabold text-base text-white mt-1.5 line-clamp-1">{ex.subject}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{ex.title}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenExamModal(ex)}
                      className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-slate-800 transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePromptDeleteExam(ex)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      title="Hapus Asesmen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-800/50 p-3 rounded-xl border border-slate-800 text-slate-300">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Durasi</span>
                    <strong className="text-white">{ex.durationMinutes} Menit</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Kode Token</span>
                    <strong className="text-indigo-300 font-mono uppercase">{ex.passCode}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Jumlah Soal</span>
                    <strong className="text-white">{ex.questions?.length || ex.questionCount} Soal</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Batas Pelanggaran</span>
                    <strong className="text-rose-400">{ex.maxViolations}x Kunci</strong>
                  </div>
                </div>

                {/* Randomization Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center space-x-1 border ${
                    ex.randomizeQuestions !== false
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    <Shuffle className="w-3 h-3" />
                    <span>Acak Soal: {ex.randomizeQuestions !== false ? 'Aktif' : 'Non-Aktif'}</span>
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg flex items-center space-x-1 border ${
                    ex.randomizeOptions !== false
                      ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    <Shuffle className="w-3 h-3" />
                    <span>Acak Opsi: {ex.randomizeOptions !== false ? 'Aktif' : 'Non-Aktif'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${ex.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {ex.isActive ? '● Aktif' : '○ Non-Aktif'}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedAccessExam(ex);
                        setShowAccessModal(true);
                      }}
                      className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold flex items-center space-x-1 transition cursor-pointer"
                      title="Atur Pembatasan Akses Peserta (Rombel / Whitelist)"
                    >
                      <Users className="w-3.5 h-3.5 text-purple-400" />
                      <span>Akses Peserta</span>
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      onSelectExamId(ex.id);
                      setActiveTab('reports');
                    }}
                    className="text-indigo-400 hover:underline font-bold text-xs cursor-pointer flex items-center space-x-1 shrink-0"
                  >
                    <span>Hasil</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REPORTS & EXPORT */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            
            {/* Filter Asesmen Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <select
                  value={selectedExamId}
                  onChange={(e) => onSelectExamId(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-auto cursor-pointer"
                >
                  <option value="">Pilih Mata Pelajaran/Ujian</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.subject || ex.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-xs text-slate-400">
                Total Submisi: <strong className="text-white">{examSubmissions.length} Siswa</strong>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-white">
                  Laporan Hasil Asesmen: {currentExam?.title || 'Semua Asesmen'}
                </h3>
                <p className="text-xs text-slate-400">
                  Mata Pelajaran: {currentExam?.subject} | Kelas: {currentExam?.gradeClass}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => exportSubmissionsToExcel(examSubmissions, currentExam?.title || 'Asesmen', currentExam?.subject || 'Materi')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Ekspor Excel</span>
                </button>

                <button
                  onClick={() => exportSubmissionsToPDF(examSubmissions, currentExam?.title || 'Asesmen', currentExam?.subject || 'Materi')}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Ekspor PDF</span>
                </button>

                <button
                  onClick={() => setShowClearAllModal(true)}
                  disabled={examSubmissions.length === 0}
                  className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600 disabled:opacity-40 disabled:hover:bg-rose-600/20 text-rose-300 hover:text-white border border-rose-500/30 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
                  title="Hapus / Reset semua data submisi untuk asesmen ini"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus Semua Data</span>
                </button>
              </div>
            </div>

            {/* Preview Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Rata-rata Nilai Kelas</span>
                <strong className="text-xl text-white">
                  {examSubmissions.length > 0
                    ? Math.round(examSubmissions.reduce((a, b) => a + b.score, 0) / examSubmissions.length)
                    : 0}
                </strong>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Nilai Tertinggi</span>
                <strong className="text-xl text-emerald-400">
                  {examSubmissions.length > 0 ? Math.max(...examSubmissions.map(s => s.score)) : 0}
                </strong>
              </div>
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                <span className="text-slate-400 block mb-1">Nilai Terendah</span>
                <strong className="text-xl text-rose-400">
                  {examSubmissions.length > 0 ? Math.min(...examSubmissions.map(s => s.score)) : 0}
                </strong>
              </div>
            </div>

            {/* Submissions Detail Table */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <h4 className="font-bold text-sm text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Daftar Submisi & Lembar Jawaban Peserta</span>
              </h4>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-700">
                      <th className="p-3">No</th>
                      <th className="p-3">Siswa / NIS</th>
                      <th className="p-3">Kelas</th>
                      <th className="p-3 text-center">Waktu Kumpul</th>
                      <th className="p-3 text-center">Pelanggaran</th>
                      <th className="p-3 text-center">Nilai Total</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Aksi Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {examSubmissions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          Belum ada data pengerjaan / submisi untuk asesmen ini.
                        </td>
                      </tr>
                    ) : (
                      examSubmissions.map((sub, idx) => (
                        <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                          <td className="p-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <p className="font-bold text-white">{sub.studentName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">NIS: {sub.nis}</p>
                          </td>
                          <td className="p-3 font-medium">{sub.studentClass}</td>
                          <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {sub.violationCount > 0 ? (
                              <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                {sub.violationCount}x
                              </span>
                            ) : (
                              <span className="text-slate-500">0</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-bold text-sm text-indigo-300">
                            {sub.score} <span className="text-xs font-normal text-slate-500">/ {sub.totalPoints}</span>
                          </td>
                          <td className="p-3 text-center">
                            {sub.status === 'submitted' ? (
                              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Selesai
                              </span>
                            ) : (
                              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Proses
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => setSelectedSubmissionDetail(sub)}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-600/20 inline-flex items-center space-x-1 transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>

                              <button
                                onClick={() => setDeletingSubmissionTarget(sub)}
                                className="px-2.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition cursor-pointer"
                                title="Hapus Submisi Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: DATABASE SISWA */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          {(studentSuccessMsg || classSuccessMsg) && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{studentSuccessMsg || classSuccessMsg}</span>
            </div>
          )}

          {/* Quick Metrics */}
          {(() => {
            const totalCount = studentsList.length;
            const maleCount = studentsList.filter(s => s.gender === 'L').length;
            const femaleCount = studentsList.filter(s => s.gender === 'P').length;

            return (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Total Siswa Terdaftar</p>
                  <p className="text-2xl font-black text-white">{totalCount}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                  <p className="text-xs text-indigo-400 font-semibold uppercase">Laki-laki (L)</p>
                  <p className="text-2xl font-black text-indigo-400">{maleCount}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                  <p className="text-xs text-rose-400 font-semibold uppercase">Perempuan (P)</p>
                  <p className="text-2xl font-black text-rose-400">{femaleCount}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                  <p className="text-xs text-emerald-400 font-semibold uppercase">Total Kelas / Rombel</p>
                  <p className="text-2xl font-black text-emerald-400">{availableClassOptions.length}</p>
                </div>
              </div>
            );
          })()}

          {/* Class / Rombel Management Section */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                <span>Daftar Kelas / Rombel Terdaftar ({availableClassOptions.length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNewClassNameInput('');
                  setClassErrorMsg('');
                  setShowAddClassModal(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kelas Manual</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedClassFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  selectedClassFilter === 'ALL'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                Semua Kelas ({studentsList.length})
              </button>

              {availableClassOptions.map((cls) => {
                const studentCount = studentsList.filter(s => s.studentClass === cls).length;
                const isSelected = selectedClassFilter === cls;
                return (
                  <div
                    key={cls}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs border transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 hover:bg-slate-700/80 text-slate-200 border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedClassFilter(isSelected ? 'ALL' : cls)}
                      className="font-bold flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>{cls}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-semibold ${
                        isSelected ? 'bg-indigo-900/80 text-indigo-100' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {studentCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClassToDelete(cls);
                      }}
                      className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition cursor-pointer ml-1"
                      title={`Hapus kelas ${cls}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Controls Bar: Search, Class Filter, Add Button, Seed Button */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari Nama, NIS, atau NISN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Class Filter */}
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="w-full sm:w-56 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">Semua Kelas ({studentsList.length} siswa)</option>
                {availableClassOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls} ({studentsList.filter(s => s.studentClass === cls).length} siswa)
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowSeedModal(true)}
                disabled={isSeedingStudents}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                title="Pulihkan data 180 siswa SMA Negeri 2 Ciamis dari lampiran"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSeedingStudents ? 'animate-spin' : ''}`} />
                <span>Sync 180 Siswa Original</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewClassNameInput('');
                  setClassErrorMsg('');
                  setShowAddClassModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kelas Manual</span>
              </button>

              <button
                onClick={() => {
                  setNewStudentName('');
                  setNewStudentNis('');
                  setNewStudentNisn('');
                  setNewStudentGender('L');
                  setNewStudentClass(availableClassOptions[0] || 'XII F-1');
                  setShowAddStudentModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Siswa Manual</span>
              </button>
            </div>
          </div>

          {/* Student Table */}
          {(() => {
            const filtered = studentsList.filter(s => {
              const matchesSearch =
                s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                s.nis.includes(studentSearch) ||
                s.nisn.includes(studentSearch);
              const matchesClass = selectedClassFilter === 'ALL' || s.studentClass === selectedClassFilter;
              return matchesSearch && matchesClass;
            });

            return (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>Daftar Siswa Terdaftar ({filtered.length} dari {studentsList.length})</span>
                  </h3>
                  {selectedClassFilter !== 'ALL' && (
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg border border-indigo-500/30 font-bold">
                      Filter: {selectedClassFilter}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 uppercase text-[11px] text-slate-400 font-semibold tracking-wider">
                      <tr>
                        <th className="p-3.5 pl-6">No</th>
                        <th className="p-3.5">NIS</th>
                        <th className="p-3.5">NISN</th>
                        <th className="p-3.5">Nama Lengkap Siswa</th>
                        <th className="p-3.5 text-center">L/P</th>
                        <th className="p-3.5 text-center">Kelas</th>
                        <th className="p-3.5 pr-6 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            Tidak ditemukan siswa dengan kriteria filter tersebut.
                          </td>
                        </tr>
                      ) : (
                        filtered.map((student, idx) => (
                          <tr key={student.id || student.nis} className="hover:bg-slate-800/40 transition">
                            <td className="p-3.5 pl-6 font-mono text-slate-500">{idx + 1}</td>
                            <td className="p-3.5 font-mono text-indigo-300 font-bold">{student.nis}</td>
                            <td className="p-3.5 font-mono text-slate-400">{student.nisn || '-'}</td>
                            <td className="p-3.5 font-bold text-white">{student.name}</td>
                            <td className="p-3.5 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                student.gender === 'L' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {student.gender}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg font-mono text-[11px]">
                                {student.studentClass}
                              </span>
                            </td>
                            <td className="p-3.5 pr-6 text-right">
                              <button
                                onClick={() => setStudentToDelete(student)}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                title="Hapus Siswa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 4: ITEM ANALYSIS (ANALISIS BUTIR SOAL) */}
      {activeTab === 'analysis' && (
        <ItemAnalysisDashboard
          exams={exams}
          submissions={submissions}
          selectedExamId={selectedExamId}
          onSelectExamId={onSelectExamId}
        />
      )}

      {/* CREATE / EDIT EXAM MODAL WITH IMPORT FEATURE */}
      {showExamModal && editingExam && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h3 className="font-extrabold text-lg text-white">
                {editingExam.id ? 'Edit Asesmen & Bank Soal' : 'Buat Asesmen Sumatif Baru'}
              </h3>
              <button
                onClick={() => setShowExamModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Tutup
              </button>
            </div>

            <form onSubmit={handleSaveExamForm} className="space-y-6">
              
              {/* Exam Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    value={editingExam.subject || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, subject: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Judul / Nama Asesmen *</label>
                  <input
                    type="text"
                    required
                    value={editingExam.title || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kelas / Rombel Target</label>
                  <input
                    type="text"
                    value={editingExam.gradeClass || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, gradeClass: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Durasi Timer (Menit) *</label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    required
                    value={editingExam.durationMinutes || 30}
                    onChange={(e) => setEditingExam({ ...editingExam, durationMinutes: parseInt(e.target.value) || 30 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kode Token / Password Ujian *</label>
                  <input
                    type="text"
                    required
                    value={editingExam.passCode || ''}
                    onChange={(e) => setEditingExam({ ...editingExam, passCode: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Maksimal Pelanggaran Sebelum Kunci</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editingExam.maxViolations || 3}
                    onChange={(e) => setEditingExam({ ...editingExam, maxViolations: parseInt(e.target.value) || 3 })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* FITUR PENGACAKAN SOAL & KEAMANAN UJIAN */}
              <div className="bg-slate-800/90 border border-indigo-500/30 p-5 rounded-2xl space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-700/80 pb-2.5">
                  <Shuffle className="w-4 h-4 text-indigo-400" />
                  <h4 className="font-extrabold text-sm text-white">
                    Pengaturan Pengacakan Soal, Jawaban & Keamanan
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Acak Urutan Soal */}
                  <label className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition select-none ${
                    editingExam.randomizeQuestions !== false
                      ? 'bg-indigo-600/15 border-indigo-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingExam.randomizeQuestions !== false}
                      onChange={(e) => setEditingExam({ ...editingExam, randomizeQuestions: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-indigo-600 bg-slate-800 border-slate-700 rounded focus:ring-indigo-500 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center space-x-1.5 text-white">
                        <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Acak Urutan Soal</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Urutan nomor butir soal akan diacak otomatis berbeda untuk setiap peserta ujian.
                      </p>
                    </div>
                  </label>

                  {/* Acak Pilihan Jawaban */}
                  <label className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition select-none ${
                    editingExam.randomizeOptions !== false
                      ? 'bg-purple-600/15 border-purple-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingExam.randomizeOptions !== false}
                      onChange={(e) => setEditingExam({ ...editingExam, randomizeOptions: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-purple-600 bg-slate-800 border-slate-700 rounded focus:ring-purple-500 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center space-x-1.5 text-white">
                        <Shuffle className="w-3.5 h-3.5 text-purple-400" />
                        <span>Acak Pilihan Jawaban (A-E)</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Posisi opsi jawaban (A, B, C, D, E) diacak secara unik pada tiap soal, penilaian tetap 100% akurat.
                      </p>
                    </div>
                  </label>

                  {/* Anti-Cheat Fullscreen Enforcement */}
                  <label className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition select-none ${
                    editingExam.antiCheatEnabled !== false
                      ? 'bg-emerald-600/15 border-emerald-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingExam.antiCheatEnabled !== false}
                      onChange={(e) => setEditingExam({ ...editingExam, antiCheatEnabled: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-emerald-600 bg-slate-800 border-slate-700 rounded focus:ring-emerald-500 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center space-x-1.5 text-white">
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Sistem Pengawasan Anti-Curang</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Wajib layar penuh, cegah split screen, alt-tab, dan blokir salin-tempel/klik kanan.
                      </p>
                    </div>
                  </label>

                  {/* Status Asesmen Aktif */}
                  <label className={`p-3.5 rounded-xl border flex items-start space-x-3 cursor-pointer transition select-none ${
                    editingExam.isActive !== false
                      ? 'bg-sky-600/15 border-sky-500/50 text-white'
                      : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:border-slate-600'
                  }`}>
                    <input
                      type="checkbox"
                      checked={editingExam.isActive !== false}
                      onChange={(e) => setEditingExam({ ...editingExam, isActive: e.target.checked })}
                      className="mt-0.5 w-4 h-4 text-sky-600 bg-slate-800 border-slate-700 rounded focus:ring-sky-500 shrink-0"
                    />
                    <div className="space-y-0.5">
                      <div className="font-bold flex items-center space-x-1.5 text-white">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                        <span>Asesmen Terbuka / Aktif</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Bila aktif, asesmen akan muncul pada daftar ujian yang dapat dipilih siswa di portal.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* IMPORT SOAL SECTION */}
              <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-white flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Import Soal dari File Word (.docx) atau Excel (.xlsx)</span>
                    </h4>
                    <p className="text-xs text-slate-400">Pilih file soal atau gunakan template yang disediakan.</p>
                  </div>

                  {/* Template Download Buttons */}
                  <div className="flex space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={downloadExcelTemplate}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center space-x-1"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Template Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={downloadWordTemplate}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg flex items-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Template Word (.docx)</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <label className="flex-1 cursor-pointer bg-slate-900 border border-dashed border-indigo-500/50 hover:border-indigo-400 rounded-xl p-3 text-center text-xs text-indigo-300 font-semibold transition">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv, .docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {isImporting ? 'Sedang Memproses File...' : '+ Upload File Word (.docx) / Excel Soal Di Sini'}
                  </label>
                </div>

                {importMessage && (
                  <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    {importMessage}
                  </p>
                )}
              </div>

              {/* QUESTIONS LIST EDITOR */}
              <div className="space-y-4 border-t border-slate-800 pt-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-bold text-sm text-white">Daftar Item Soal ({questionsList.length})</h4>
                    <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                      Total: {questionsList.reduce((acc, curr) => acc + (typeof curr.points === 'number' ? curr.points : 10), 0)} Poin
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAiSubject(editingExam?.subject || '');
                        setAiGradeClass(editingExam?.gradeClass || '');
                        setShowAiGeneratorModal(true);
                      }}
                      className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-md shadow-purple-600/30 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                      <span>Buat Soal AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddManualQuestion}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Soal Manual</span>
                    </button>
                  </div>
                </div>

                {/* Bulk Points Toolbar */}
                {questionsList.length > 0 && (
                  <div className="bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-medium text-[11px]">Atur Cepat Bobot Soal:</span>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={bulkPointsValue}
                          onChange={(e) => setBulkPointsValue(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-14 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-center font-bold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                        <span className="text-slate-400 text-[11px]">Poin</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyBulkPoints}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded border border-slate-700 transition"
                      >
                        Terapkan ke Semua
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleDistributePointsEvenly}
                      className="px-2.5 py-1 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 font-semibold rounded border border-indigo-500/30 transition text-[11px]"
                      title="Bagi rata poin ke seluruh soal agar akumulasi total pas 100 poin"
                    >
                      ⚖️ Bagi Rata Total 100 Poin
                    </button>
                  </div>
                )}

                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                  {questionsList.map((q, qIdx) => (
                    <div key={q.id} className="bg-slate-800/50 border border-slate-700/80 rounded-xl p-4 space-y-3 text-xs">
                      <div className="flex flex-wrap gap-2 justify-between items-center pb-2 border-b border-slate-700/60">
                        <div className="flex items-center space-x-3">
                          <span className="font-bold text-indigo-400">Soal #{qIdx + 1}</span>
                          <div className="flex items-center space-x-1.5 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg">
                            <label className="text-[11px] text-slate-300 font-medium flex items-center space-x-1">
                              <span className="text-amber-400 font-bold">★</span>
                              <span>Bobot:</span>
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={typeof q.points === 'number' ? q.points : 10}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const val = raw === '' ? 0 : Math.max(0, parseInt(raw) || 0);
                                setQuestionsList(prev => prev.map((item, idx) => idx === qIdx ? { ...item, points: val } : item));
                              }}
                              className="w-14 bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-center text-xs font-extrabold text-amber-300 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                            <span className="text-[10px] text-slate-400 font-mono">Poin</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQuestionsList(prev => prev.filter((_, idx) => idx !== qIdx))}
                          className="text-rose-400 hover:underline text-[11px]"
                        >
                          Hapus Soal
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={q.questionText}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestionsList(prev => prev.map((item, idx) => idx === qIdx ? { ...item, questionText: val } : item));
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                      />

                      {/* Math Equation Live Preview */}
                      {q.questionText && (
                        <div className="bg-slate-900/80 border border-slate-700/50 p-2.5 rounded-lg text-slate-200 text-xs flex items-center space-x-2">
                          <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider shrink-0 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">Preview Formula:</span>
                          <MathText text={q.questionText} className="flex-1" />
                        </div>
                      )}

                      {/* Image Attachment */}
                      <div className="flex items-center space-x-3 text-xs pt-1">
                        <label className="cursor-pointer text-xs bg-slate-900 hover:bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-slate-200 flex items-center space-x-1.5 transition">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{q.imageUrl ? 'Ganti Gambar Soal' : '+ Sisipkan Gambar Soal'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const url = ev.target?.result as string;
                                  const compressedUrl = await compressBase64Image(url, 800, 0.75);
                                  setQuestionsList(prev => prev.map((item, idx) => idx === qIdx ? { ...item, imageUrl: compressedUrl } : item));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {q.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setQuestionsList(prev => prev.map((item, idx) => idx === qIdx ? { ...item, imageUrl: undefined } : item))}
                            className="text-rose-400 hover:underline text-[11px]"
                          >
                            Hapus Gambar
                          </button>
                        )}
                      </div>

                      {q.imageUrl && (
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-700/60 max-w-xs">
                          <img src={q.imageUrl} alt="Gambar Soal" className="max-h-36 rounded mx-auto object-contain" />
                        </div>
                      )}

                      {/* Options */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`correct_${qIdx}`}
                              checked={q.correctAnswer === oIdx}
                              onChange={() => {
                                setQuestionsList(prev => prev.map((item, idx) => idx === qIdx ? { ...item, correctAnswer: oIdx } : item));
                              }}
                              className="accent-indigo-500"
                            />
                            <div className="flex-1 space-y-1">
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestionsList(prev => prev.map((item, idx) => {
                                    if (idx === qIdx) {
                                      const newOpts = [...item.options];
                                      newOpts[oIdx] = val;
                                      return { ...item, options: newOpts };
                                    }
                                    return item;
                                  }));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-white text-xs"
                              />
                              {opt && (
                                <div className="text-[11px] text-slate-300 px-1">
                                  <MathText text={opt} />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {saveError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium flex items-center space-x-2">
                  <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExamModal(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Menyimpan Asesmen...</span>
                    </>
                  ) : (
                    <span>Simpan Asesmen</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SUBMISSION DETAIL MODAL */}
      {selectedSubmissionDetail && (() => {
        const matchedExam = exams.find(e => e.id === selectedSubmissionDetail.examId) || currentExam;
        const examQuestions = matchedExam?.questions || [];
        const totalQuestions = examQuestions.length;
        
        let correctCount = 0;
        let incorrectCount = 0;
        let unassignedCount = 0;

        examQuestions.forEach(q => {
          const studentAns = selectedSubmissionDetail.answers?.[q.id];
          if (studentAns === undefined) {
            unassignedCount++;
          } else if (studentAns === q.correctAnswer) {
            correctCount++;
          } else {
            incorrectCount++;
          }
        });

        const percentage = selectedSubmissionDetail.totalPoints > 0
          ? Math.round((selectedSubmissionDetail.score / selectedSubmissionDetail.totalPoints) * 100)
          : 0;

        const optionLabels = ['A', 'B', 'C', 'D', 'E'];

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-indigo-500/20 text-indigo-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-indigo-500/30">
                      Detail Submisi Siswa
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      ID: {selectedSubmissionDetail.id}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-xl text-white mt-1">
                    {selectedSubmissionDetail.studentName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    NIS: <strong className="text-slate-200">{selectedSubmissionDetail.nis}</strong> | Kelas: <strong className="text-slate-200">{selectedSubmissionDetail.studentClass}</strong> | Asesmen: <strong className="text-indigo-400">{matchedExam?.subject} — {matchedExam?.title}</strong>
                  </p>
                </div>

                <button
                  onClick={() => setSelectedSubmissionDetail(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Score Card & Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-slate-400 block text-[11px] mb-1">Total Nilai</span>
                  <strong className="text-2xl font-black text-indigo-400">
                    {selectedSubmissionDetail.score} <span className="text-xs font-normal text-slate-500">/ {selectedSubmissionDetail.totalPoints}</span>
                  </strong>
                  <p className="text-[10px] text-emerald-400 font-bold mt-0.5">
                    Grade: {percentage}%
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-slate-400 block text-[11px] mb-1">Jawaban Benar</span>
                  <strong className="text-2xl font-black text-emerald-400">
                    {correctCount} <span className="text-xs font-normal text-slate-500">/ {totalQuestions}</span>
                  </strong>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Salah: {incorrectCount} {unassignedCount > 0 ? `| Kosong: ${unassignedCount}` : ''}
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-slate-400 block text-[11px] mb-1">Pelanggaran</span>
                  <strong className={`text-2xl font-black ${selectedSubmissionDetail.violationCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {selectedSubmissionDetail.violationCount}x
                  </strong>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {selectedSubmissionDetail.isLocked ? 'Status Terkunci' : 'Layar Aman'}
                  </p>
                </div>

                <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 text-center">
                  <span className="text-slate-400 block text-[11px] mb-1">Waktu Submisi</span>
                  <strong className="text-sm font-bold text-white block truncate">
                    {selectedSubmissionDetail.submittedAt ? new Date(selectedSubmissionDetail.submittedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </strong>
                  <p className="text-[10px] text-emerald-400 font-mono mt-1">
                    AES Hash Valid
                  </p>
                </div>
              </div>

              {/* Detailed Questions & Answers List */}
              <div className="space-y-4">
                <h4 className="font-bold text-sm text-white border-b border-slate-800 pb-2">
                  Rincian Lembar Jawaban Siswa ({examQuestions.length} Soal)
                </h4>

                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {examQuestions.map((q, qIdx) => {
                    const studentChoice = selectedSubmissionDetail.answers?.[q.id];
                    const isAnswered = studentChoice !== undefined;
                    const isCorrect = isAnswered && studentChoice === q.correctAnswer;

                    return (
                      <div
                        key={q.id || qIdx}
                        className={`p-4 rounded-xl border text-xs space-y-3 transition ${
                          isCorrect
                            ? 'bg-emerald-950/20 border-emerald-500/30'
                            : isAnswered
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : 'bg-slate-800/30 border-slate-700/50'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-bold text-indigo-400">
                            Soal #{qIdx + 1} ({q.points || 10} poin)
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isAnswered
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-slate-700 text-slate-400'
                          }`}>
                            {isCorrect ? '✓ Benar' : isAnswered ? '✗ Salah' : '○ Tidak Dijawab'}
                          </span>
                        </div>

                        {q.imageUrl && (
                          <div className="my-2">
                            <img src={q.imageUrl} alt="Gambar Soal" className="max-h-48 rounded-lg border border-slate-700 object-contain" />
                          </div>
                        )}

                        <div className="text-slate-100 text-sm font-medium">
                          <MathText text={q.questionText} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt, oIdx) => {
                            const isStudentSelected = studentChoice === oIdx;
                            const isCorrectOption = q.correctAnswer === oIdx;

                            let btnStyle = 'bg-slate-800/60 border-slate-700/80 text-slate-300';
                            let badgeText = '';

                            if (isCorrectOption && isStudentSelected) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-200 font-bold';
                              badgeText = '✓ Jawaban Siswa (Benar)';
                            } else if (isStudentSelected && !isCorrectOption) {
                              btnStyle = 'bg-rose-500/20 border-rose-500/60 text-rose-200 font-bold';
                              badgeText = '✗ Jawaban Siswa (Salah)';
                            } else if (isCorrectOption) {
                              btnStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
                              badgeText = '✓ Kunci Jawaban';
                            }

                            return (
                              <div key={oIdx} className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${btnStyle}`}>
                                <div className="flex items-center space-x-2">
                                  <span className="w-5 h-5 rounded-md bg-slate-900 border border-slate-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                    {optionLabels[oIdx]}
                                  </span>
                                  <span><MathText text={opt} /></span>
                                </div>
                                {badgeText && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ml-2 bg-slate-900/60">
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/60 text-[11px] text-slate-400 space-y-0.5">
                            <strong className="text-indigo-400 block">Pembahasan:</strong>
                            <MathText text={q.explanation} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2 border-t border-slate-800">
                <button
                  onClick={() => setSelectedSubmissionDetail(null)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL CONFIRM DELETE SINGLE SUBMISSION */}
      {deletingSubmissionTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Hapus Data Submisi?</h3>
                <p className="text-xs text-slate-400">Konfirmasi Penghapusan</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
              Apakah Anda yakin ingin menghapus data submisi milik <strong className="text-white">{deletingSubmissionTarget.studentName}</strong> (NIS: <span className="font-mono">{deletingSubmissionTarget.nis}</span>)?
              <br /><br />
              <span className="text-rose-400 font-bold">Peringatan:</span> Data nilai dan jawaban peserta ini akan dihapus secara permanen.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeletingSubmissionTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteSingle}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Mengeksekusi...' : 'Ya, Hapus Submisi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM CLEAR ALL SUBMISSIONS */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Hapus Semua Data Submisi?</h3>
                <p className="text-xs text-slate-400">Konfirmasi Reset Laporan Asesmen</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2 bg-rose-950/20 p-4 rounded-xl border border-rose-500/30">
              <p>
                Anda akan menghapus <strong className="text-rose-300 font-extrabold">{examSubmissions.length} data submisi</strong> untuk asesmen <strong className="text-white">{currentExam?.title}</strong>.
              </p>
              <p className="text-rose-400 font-bold">
                ⚠️ Tindakan ini tidak dapat dibatalkan! Seluruh rekaman nilai, waktu pengerjaan, dan riwayat jawaban peserta akan dihapus dari basis data Firestore.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClearAll}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Menghapus Semua Data...' : 'Ya, Hapus Semua Submisi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE EXAM */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Hapus Paket Asesmen?</h3>
                <p className="text-xs text-slate-400">Konfirmasi Penghapusan Ujian</p>
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-2.5 bg-slate-800/50 p-4 rounded-xl border border-slate-800">
              <p>
                Apakah Anda yakin ingin menghapus asesmen <strong className="text-white">{examToDelete.title}</strong>?
              </p>
              <div className="space-y-1 text-slate-400 text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                <p>• Mata Pelajaran: <span className="text-indigo-300 font-semibold">{examToDelete.subject}</span></p>
                <p>• Tingkat / Kelas: <span className="text-slate-200">{examToDelete.gradeClass}</span></p>
                <p>• Jumlah Soal: <span className="text-slate-200">{examToDelete.questions?.length || examToDelete.questionCount || 0} Soal</span></p>
              </div>
              <p className="text-rose-400 font-bold text-[11px]">
                ⚠️ Peringatan: Seluruh paket soal asesmen ini akan dihapus secara permanen dari basis data.
              </p>
            </div>

            {deleteExamError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {deleteExamError}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setExamToDelete(null);
                  setDeleteExamError('');
                }}
                disabled={isDeletingExam}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteExam}
                disabled={isDeletingExam}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingExam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeletingExam ? 'Menghapus Asesmen...' : 'Ya, Hapus Asesmen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE STUDENT */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Hapus Data Siswa?</h3>
                <p className="text-xs text-slate-400">Konfirmasi Penghapusan Siswa</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
              Apakah Anda yakin ingin menghapus data siswa <strong className="text-white">{studentToDelete.name}</strong> (NIS: <span className="font-mono">{studentToDelete.nis}</span>, Kelas: {studentToDelete.studentClass}) dari master siswa?
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                disabled={isDeletingStudent}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                disabled={isDeletingStudent}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingStudent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeletingStudent ? 'Menghapus...' : 'Ya, Hapus Siswa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM DELETE CLASS */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Hapus Rombel / Kelas?</h3>
                <p className="text-xs text-slate-400">Konfirmasi Penghapusan Kelas</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
              Apakah Anda yakin ingin menghapus rombel / kelas <strong className="text-white">"{classToDelete}"</strong> dari master rombel? Data siswa yang terdaftar pada kelas ini tetap aman.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setClassToDelete(null)}
                disabled={isDeletingClass}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                disabled={isDeletingClass}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeletingClass ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeletingClass ? 'Menghapus...' : 'Ya, Hapus Kelas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRM SEED 180 STUDENTS */}
      {showSeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Pulihkan Data 180 Siswa?</h3>
                <p className="text-xs text-slate-400">Sinkronisasi Data Siswa SMA Negeri 2 Ciamis</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/50 p-3.5 rounded-xl border border-slate-800">
              Sistem akan memuat dan menyinkronkan seluruh 180 data siswa asli SMA Negeri 2 Ciamis (Kelas XII F-1 s.d. XII F-5) ke dalam basis data Firestore.
            </p>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSeedModal(false)}
                disabled={isSeedingStudents}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSeedDatabase}
                disabled={isSeedingStudents}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
              >
                {isSeedingStudents ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isSeedingStudents ? 'Memulihkan...' : 'Ya, Pulihkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHANGE TEACHER PIN */}
      {showChangePinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowChangePinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 text-indigo-400">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Ganti PIN Otorisasi Guru</h3>
                <p className="text-xs text-slate-400">Pembaruan Keamanan Akses Pengawas</p>
              </div>
            </div>

            <form onSubmit={handleSaveNewPin} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  PIN Lama / Saat Ini *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan PIN lama..."
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  PIN Baru *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan PIN baru (min 4 digit)..."
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Konfirmasi PIN Baru *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ulangi PIN baru..."
                  value={confirmNewPinInput}
                  onChange={(e) => setConfirmNewPinInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {pinErrorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 font-medium">
                  {pinErrorMsg}
                </p>
              )}

              {pinSuccessMsg && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 font-medium">
                  {pinSuccessMsg}
                </p>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowChangePinModal(false)}
                  disabled={isSavingPin}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPin}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isSavingPin ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{isSavingPin ? 'Menyimpan...' : 'Simpan PIN Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AI QUESTION GENERATOR */}
      {showAiGeneratorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAiGeneratorModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-purple-400">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-white flex items-center space-x-2">
                  <span>Generator Soal Otomatis Berbasis AI</span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-mono font-semibold">
                    Gemini Flash Lite
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Buat soal pilihan ganda berkualitas lengkap dengan 5 opsi jawaban & pembahasan otomatis.
                </p>
              </div>
            </div>

            {/* AI Generator Form */}
            <form onSubmit={handleGenerateQuestionsWithAi} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Biologi, Matematika, Fisika, Sejarah"
                    value={aiSubject}
                    onChange={(e) => setAiSubject(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Tingkat Kelas / Rombel
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kelas XI SMA, Kelas XII SMK"
                    value={aiGradeClass}
                    onChange={(e) => setAiGradeClass(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Topik / Pokok Bahasan Materi Pembelajaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Sistem Reproduksi Manusia, Persamaan Kuadrat, Hukum Newton"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Tingkat Kesulitan Soal
                  </label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Mudah">Mudah (Pemahaman Dasar)</option>
                    <option value="Sedang">Sedang (Aplikasi & Analisis)</option>
                    <option value="HOTS / Sulit">HOTS / Sulit (Penalaran Tinggi)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Jumlah Soal yang Dibuat
                  </label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value={3}>3 Soal</option>
                    <option value={5}>5 Soal</option>
                    <option value={10}>10 Soal</option>
                    <option value={15}>15 Soal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Instruksi / Catatan Khusus (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sertakan soal studi kasus, gunakan istilah saintifik terkini, atau sertakan rumus matematika."
                  value={aiAdditionalPrompt}
                  onChange={(e) => setAiAdditionalPrompt(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {aiErrorMsg && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 font-medium">
                  {aiErrorMsg}
                </p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isGeneratingAi}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30 transition cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Sedang Menyusun Soal dengan AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Soal AI Sekarang</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Generated Questions Result Preview */}
            {generatedAiQuestions.length > 0 && (
              <div className="space-y-4 border-t border-slate-800 pt-5 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-white flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Hasil Generasi AI ({generatedAiQuestions.length} Soal)</span>
                  </h4>
                  <p className="text-slate-400 text-[11px]">
                    Centang soal yang ingin dimasukkan ke dalam asesmen.
                  </p>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {generatedAiQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      onClick={() => handleToggleSelectAiQuestion(q.id)}
                      className={`p-4 rounded-2xl border transition cursor-pointer ${
                        selectedAiQuestionIds.includes(q.id)
                          ? 'bg-purple-950/30 border-purple-500/50'
                          : 'bg-slate-800/40 border-slate-700/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedAiQuestionIds.includes(q.id)}
                          onChange={() => handleToggleSelectAiQuestion(q.id)}
                          className="mt-1 accent-purple-500 w-4 h-4 rounded cursor-pointer"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-purple-300">
                                Soal #{idx + 1}
                              </span>
                              <div
                                className="flex items-center space-x-1 bg-slate-900/90 border border-purple-500/30 px-2 py-0.5 rounded-md"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-[10px] text-purple-300 font-medium">Bobot:</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={typeof q.points === 'number' ? q.points : 10}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const val = raw === '' ? 0 : Math.max(0, parseInt(raw) || 0);
                                    setGeneratedAiQuestions(prev => prev.map((item, i) => i === idx ? { ...item, points: val } : item));
                                  }}
                                  className="w-12 bg-slate-800 border border-purple-500/40 text-amber-300 text-center text-xs font-bold rounded px-1 py-0.5 focus:outline-none"
                                />
                                <span className="text-[10px] text-slate-400">Poin</span>
                              </div>
                            </div>
                          </div>
                          <div className="font-semibold text-white">
                            <MathText text={q.questionText} />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center space-x-1.5 ${
                                  optIdx === q.correctAnswer
                                    ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                                    : 'bg-slate-900/60 text-slate-300'
                                }`}
                              >
                                <span className="font-mono text-slate-400 font-bold shrink-0">
                                  {String.fromCharCode(65 + optIdx)}.
                                </span>
                                <span>
                                  <MathText text={opt} />
                                </span>
                              </div>
                            ))}
                          </div>

                          {q.explanation && (
                            <div className="text-[11px] text-slate-400 bg-slate-900/80 p-2 rounded-lg border border-slate-800 italic space-x-1">
                              <span>💡 <strong>Pembahasan:</strong></span>
                              <MathText text={q.explanation} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setGeneratedAiQuestions([])}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                  >
                    Reset Hasil
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyGeneratedQuestions}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Gunakan {selectedAiQuestionIds.length} Soal Terpilih</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL TAMBAH SISWA MANUAL */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowAddStudentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 text-indigo-400">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Tambah Data Siswa Manual</h3>
                <p className="text-xs text-slate-400">Input Siswa Baru ke Database Master</p>
              </div>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: AHMAD FAUZI"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NIS (Nomor Induk) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 242510999"
                    value={newStudentNis}
                    onChange={(e) => setNewStudentNis(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    NISN (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0098765432"
                    value={newStudentNisn}
                    onChange={(e) => setNewStudentNisn(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Jenis Kelamin *
                  </label>
                  <select
                    value={newStudentGender}
                    onChange={(e) => setNewStudentGender(e.target.value as 'L' | 'P')}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-300">
                      Kelas / Rombel *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewClassNameInput('');
                        setClassErrorMsg('');
                        setShowAddClassModal(true);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer font-semibold"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Buat Kelas Baru</span>
                    </button>
                  </div>
                  <select
                    value={newStudentClass}
                    onChange={(e) => setNewStudentClass(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer font-mono"
                  >
                    {availableClassOptions.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  disabled={isAddingStudent}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingStudent}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isAddingStudent ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isAddingStudent ? 'Menyimpan...' : 'Simpan Data Siswa'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH KELAS MANUAL */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => {
                setShowAddClassModal(false);
                setClassErrorMsg('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-white">Tambah Kelas / Rombel Manual</h3>
                <p className="text-xs text-slate-400">Daftarkan Nama Rombongan Belajar Baru</p>
              </div>
            </div>

            <form onSubmit={handleAddClassSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Kelas / Rombel *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: XII F-6, XI F-1, X E-2, XII MIPA 1"
                  value={newClassNameInput}
                  onChange={(e) => setNewClassNameInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format penamaan bebas: contoh <span className="font-mono text-slate-400">XII F-6</span>, <span className="font-mono text-slate-400">XI-A</span>, <span className="font-mono text-slate-400">X-1</span>, atau <span className="font-mono text-slate-400">XII MIPA 3</span>.
                </p>
              </div>

              {/* Quick Suggestion Pills */}
              <div>
                <label className="block font-semibold text-slate-400 mb-1.5 text-[11px]">
                  Saran Cepat:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['XII F-6', 'XII F-7', 'XI F-1', 'XI F-2', 'X E-1', 'X E-2', 'XII MIPA 1', 'XII IPS 1'].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setNewClassNameInput(suggestion)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700/80 transition cursor-pointer font-mono"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {classErrorMsg && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold">
                  {classErrorMsg}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddClassModal(false);
                    setClassErrorMsg('');
                  }}
                  disabled={isAddingClass}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isAddingClass}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 transition shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isAddingClass ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span>{isAddingClass ? 'Menyimpan...' : 'Simpan Kelas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participant Access Control Modal */}
      <ParticipantAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
        exam={selectedAccessExam}
        students={studentsList}
        classes={classesList}
        onSave={async (examId, updates) => {
          await updateExam(examId, updates);
        }}
      />

    </div>
  );
};
