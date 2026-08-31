import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MathText } from './MathText';
import { Exam, ExamSubmission, Question, ViolationRecord } from '../types';
import { encryptStudentAnswers, generatePayloadChecksum } from '../lib/encryption';
import { saveSubmission, logViolationEvent } from '../services/examService';
import {
  Clock,
  ShieldAlert,
  AlertOctagon,
  Lock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Maximize,
  Send,
  Flag,
  FileText,
  KeyRound,
  Shuffle
} from 'lucide-react';

interface ExamEngineProps {
  exam: Exam;
  studentName: string;
  nis: string;
  studentClass: string;
  initialSubmission?: ExamSubmission;
  onFinishExam: (submission: ExamSubmission) => void;
  adminPin: string;
}

// Deterministic Pseudo Random Generator based on simple seed string (e.g. Student NIS + Exam ID)
// ensures the randomized order stays consistent during the student's entire exam session across refreshes
function createSeededRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  let state = Math.abs(hash) || 123456789;
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function shuffleArrayWithRng<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

export interface DisplayOption {
  originalIndex: number;
  text: string;
}

export interface ProcessedQuestion extends Question {
  displayOptions: DisplayOption[];
}

export const ExamEngine: React.FC<ExamEngineProps> = ({
  exam,
  studentName,
  nis,
  studentClass,
  initialSubmission,
  onFinishExam,
  adminPin
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>(
    initialSubmission?.answers || {}
  );
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(
    initialSubmission?.remainingSeconds || exam.durationMinutes * 60
  );
  const [violationCount, setViolationCount] = useState<number>(
    initialSubmission?.violationCount || 0
  );
  const [violations, setViolations] = useState<ViolationRecord[]>(
    initialSubmission?.violations || []
  );
  const [isLocked, setIsLocked] = useState<boolean>(
    initialSubmission?.isLocked || false
  );
  const [lockReason, setLockReason] = useState<string>(
    initialSubmission?.lockedReason || ''
  );
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [latestViolationType, setLatestViolationType] = useState<string>('');
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);

  // Compute processed questions with randomized order & randomized options per student
  const isRandomQuestions = exam.randomizeQuestions !== undefined ? exam.randomizeQuestions : true;
  const isRandomOptions = exam.randomizeOptions !== undefined ? exam.randomizeOptions : true;

  const questions: ProcessedQuestion[] = useMemo(() => {
    const rawQuestions = exam.questions || [];
    const seed = `${exam.id}_${(nis || '').trim()}_${(studentName || '').trim()}`;
    const rng = createSeededRandom(seed);

    let processed: ProcessedQuestion[] = rawQuestions.map((q, qIndex) => {
      const optRng = createSeededRandom(`${seed}_q_${q.id || qIndex}`);
      const rawOptions = (q.options || []).map((text, originalIndex) => ({
        originalIndex,
        text,
      }));

      const displayOptions = isRandomOptions
        ? shuffleArrayWithRng(rawOptions, optRng)
        : rawOptions;

      return {
        ...q,
        displayOptions,
      };
    });

    if (isRandomQuestions) {
      processed = shuffleArrayWithRng(processed, rng);
    }

    return processed;
  }, [exam.id, exam.questions, isRandomQuestions, isRandomOptions, nis, studentName]);

  const currentQuestion = questions[currentQuestionIndex];

  const submissionIdRef = useRef<string>(
    initialSubmission?.id || `sub_${exam.id}_${studentName.trim().replace(/\s+/g, '_')}_${nis}`
  );

  // Helper to test if browser is currently in fullscreen
  const checkIsFullscreen = () => {
    const doc = document as any;
    return Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  };

  // Request Fullscreen across all browser vendors
  const enterFullscreen = async () => {
    try {
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (e) {
      console.warn('Fullscreen request bypassed or requires gesture:', e);
      setIsFullscreen(checkIsFullscreen());
    }
  };

  // Auto-request Fullscreen immediately upon mount & fallback on next gesture if restricted
  useEffect(() => {
    enterFullscreen();

    // Secondary automatic trigger on very first click/tap if initial browser policy blocked it
    const handleGestureFullscreen = () => {
      if (!checkIsFullscreen()) {
        enterFullscreen();
      }
    };

    document.addEventListener('click', handleGestureFullscreen, { once: true });
    document.addEventListener('touchstart', handleGestureFullscreen, { once: true });

    return () => {
      document.removeEventListener('click', handleGestureFullscreen);
      document.removeEventListener('touchstart', handleGestureFullscreen);
    };
  }, []);

  // Prevent browser Back/Forward navigation & accidental page unload
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      handleViolation('NAVIGATION_ATTEMPT', 'Mencoba menekan tombol kembali / navigasi browser');
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Ujian sedang berlangsung! Keluar akan membatalkan ujian Anda.';
      return e.returnValue;
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [exam.antiCheatEnabled, violationCount, isLocked]);

  // Sync / Auto-save to Firestore with AES Encryption
  const syncSubmissionToFirestore = async (
    currentAnswers: Record<string, number>,
    remSeconds: number,
    vCount: number,
    vList: ViolationRecord[],
    lockedState: boolean,
    lReason: string,
    isFinalSubmit: boolean = false
  ) => {
    try {
      const encrypted = encryptStudentAnswers(currentAnswers, exam.passCode);
      const checksum = generatePayloadChecksum(studentName, nis, currentAnswers);

      // Compute score if final submit or live tracking
      let score = 0;
      let totalPoints = 0;
      questions.forEach((q) => {
        totalPoints += q.points;
        if (currentAnswers[q.id] === q.correctAnswer) {
          score += q.points;
        }
      });

      const subData: Partial<ExamSubmission> = {
        id: submissionIdRef.current,
        examId: exam.id,
        studentName,
        studentClass,
        nis,
        encryptedAnswers: encrypted,
        checksum,
        answers: currentAnswers,
        score,
        totalPoints,
        status: isFinalSubmit ? 'submitted' : lockedState ? 'locked' : 'in_progress',
        startedAt: initialSubmission?.startedAt || new Date().toISOString(),
        submittedAt: isFinalSubmit ? new Date().toISOString() : undefined,
        remainingSeconds: remSeconds,
        violationCount: vCount,
        violations: vList,
        isLocked: lockedState,
        lockedReason: lReason
      };

      await saveSubmission(subData);

      if (isFinalSubmit) {
        onFinishExam(subData as ExamSubmission);
      }
    } catch (err) {
      console.error('Error syncing submission to Firestore:', err);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (isLocked) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Time expired -> Auto submit
          syncSubmissionToFirestore(
            answers,
            0,
            violationCount,
            violations,
            false,
            'Waktu pengerjaan habis',
            true
          );
          return 0;
        }
        const nextSec = prev - 1;
        // Auto-sync every 15 seconds
        if (nextSec % 15 === 0) {
          syncSubmissionToFirestore(answers, nextSec, violationCount, violations, isLocked, lockReason);
        }
        return nextSec;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, answers, violationCount, violations, lockReason]);

  // Anti-Cheat Violation Handler
  const handleViolation = (type: ViolationRecord['type'], description: string) => {
    if (isLocked) return;

    const newViolation: ViolationRecord = {
      timestamp: new Date().toISOString(),
      type,
      description
    };

    const newCount = violationCount + 1;
    const updatedViolations = [...violations, newViolation];

    setViolationCount(newCount);
    setViolations(updatedViolations);
    setLatestViolationType(description);

    // Log to Firestore real-time for Admin notifications
    logViolationEvent(exam.id, studentName, studentClass, type, description);

    // Check if max violations reached
    if (exam.antiCheatEnabled && newCount >= exam.maxViolations) {
      const reason = `Terdeteksi melanggar tata tertib sebanyak ${newCount} kali (${description}).`;
      setIsLocked(true);
      setLockReason(reason);
      syncSubmissionToFirestore(answers, remainingSeconds, newCount, updatedViolations, true, reason);
    } else {
      setShowWarningModal(true);
      syncSubmissionToFirestore(answers, remainingSeconds, newCount, updatedViolations, false, '');
    }
  };

  // Anti-Cheat Global Listeners
  useEffect(() => {
    if (!exam.antiCheatEnabled) return;

    // 1. Visibility change (Tab switch / App minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation('TAB_SWITCH', 'Membuka tab baru / meminimalkan aplikasi');
      }
    };

    // 2. Window Blur (Focus loss)
    const handleWindowBlur = () => {
      if (document.hidden) return; // Tab switch is already handled by visibilitychange
      handleViolation('WINDOW_BLUR', 'Layar kehilangan fokus / membuka jendela lain');
    };

    // 3. Fullscreen Exit
    const handleFullscreenChange = () => {
      const activeFullscreen = checkIsFullscreen();
      if (!activeFullscreen) {
        setIsFullscreen(false);
        handleViolation('FULLSCREEN_EXIT', 'Keluar dari mode layar penuh (fullscreen)');
      } else {
        setIsFullscreen(true);
      }
    };

    // 4. Keyboard Shortcuts Block (Alt+Tab, Ctrl+C, Ctrl+V, F11, F12, Escape, Windows key)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.altKey ||
        e.metaKey ||
        e.key === 'F11' ||
        e.key === 'F12' ||
        e.key === 'Escape' ||
        (e.ctrlKey && ['c', 'v', 'x', 'a', 't', 'n', 'w', 'p', 's', 'r', 'u', 'j', 'i', 'h'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'S'].includes(e.key.toUpperCase()))
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation('KEYBOARD_SHORTCUT', `Pintasan tombol dilarang (${e.key})`);
      }
    };

    // 5. Context Menu & Select Block
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      handleViolation('CONTEXT_MENU', 'Klik kanan / Menu konteks dilarang');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [exam.antiCheatEnabled, violationCount, isLocked]);

  // Answer Option Selection
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    if (isLocked) return;
    const newAnswers = { ...answers, [questionId]: optionIndex };
    setAnswers(newAnswers);
    // Instant encrypted sync
    syncSubmissionToFirestore(newAnswers, remainingSeconds, violationCount, violations, isLocked, lockReason);
  };

  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    if (unlockPinInput.trim() === adminPin || unlockPinInput.trim() === exam.passCode) {
      setIsLocked(false);
      setLockReason('');
      setUnlockPinInput('');
      enterFullscreen();
      syncSubmissionToFirestore(answers, remainingSeconds, violationCount, violations, false, '');
    } else {
      setUnlockError('PIN Buka Kunci Salah! Minta bantuan Guru Pengawas.');
    }
  };

  const handleFinalSubmitConfirm = () => {
    setShowSubmitConfirmModal(false);
    syncSubmissionToFirestore(answers, remainingSeconds, violationCount, violations, false, '', true);
  };

  // Format Timer
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      
      {/* Top Exam Action Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
        
        {/* Exam Title & Student Name */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm">
            {currentQuestionIndex + 1}
          </div>
          <div>
            <h2 className="font-bold text-sm text-white line-clamp-1">{exam.subject} — {exam.title}</h2>
            <p className="text-xs text-slate-400">Siswa: <strong className="text-slate-200">{studentName}</strong> ({studentClass})</p>
          </div>
        </div>

        {/* Live Timer & Violation Status */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Randomization Badge */}
          {(isRandomQuestions || isRandomOptions) && (
            <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold" title="Urutan butir soal & opsi pilihan jawaban diacak secara unik per siswa">
              <Shuffle className="w-3.5 h-3.5 text-purple-400" />
              <span>{isRandomQuestions && isRandomOptions ? 'Soal & Jawaban Teracak' : isRandomQuestions ? 'Soal Teracak' : 'Jawaban Teracak'}</span>
            </div>
          )}

          {/* Violation Counter Badge */}
          {exam.antiCheatEnabled && (
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              violationCount === 0
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : violationCount >= exam.maxViolations - 1
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Pelanggaran: {violationCount}/{exam.maxViolations}</span>
            </div>
          )}

          {/* Fullscreen Restore Button if exited */}
          {!isFullscreen && (
            <button
              onClick={enterFullscreen}
              className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
            >
              <Maximize className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Layar Penuh</span>
            </button>
          )}

          {/* Countdown Clock */}
          <div className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base ${
            remainingSeconds <= 300
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse'
              : 'bg-slate-800 border-slate-700 text-indigo-300'
          }`}>
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <button
            onClick={() => setShowSubmitConfirmModal(true)}
            className="hidden sm:flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Selesai & Kumpulkan</span>
          </button>
        </div>

      </div>

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left / Center: Question & Options (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {currentQuestion ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
              
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2">
                  <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-lg">
                    Soal No. {currentQuestionIndex + 1}
                  </span>
                  <span className="text-xs text-slate-400">
                    Bobot: {currentQuestion.points} Poin
                  </span>
                </div>

                <button
                  onClick={() => toggleFlagQuestion(currentQuestion.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    flaggedQuestions[currentQuestion.id]
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Ragu-ragu</span>
                </button>
              </div>

              {/* Question Image if present as explicit imageUrl */}
              {currentQuestion.imageUrl && !currentQuestion.questionText.includes(currentQuestion.imageUrl) && (
                <div className="my-3 text-center">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Gambar Soal"
                    className="max-h-72 sm:max-h-96 w-auto max-w-full rounded-xl border border-slate-700/80 mx-auto shadow-lg object-contain bg-slate-900/40 p-1"
                  />
                </div>
              )}

              {/* Question Text */}
              <div className="text-slate-100 text-base sm:text-lg font-medium leading-relaxed">
                <MathText text={currentQuestion.questionText} />
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQuestion.displayOptions.map((opt, displayIdx) => {
                  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
                  const isSelected = answers[currentQuestion.id] === opt.originalIndex;

                  return (
                    <button
                      key={opt.originalIndex}
                      onClick={() => handleSelectOption(currentQuestion.id, opt.originalIndex)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-center space-x-4 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/10'
                          : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 hover:border-slate-600 text-slate-200'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {optionLetters[displayIdx]}
                      </div>
                      <div className="text-sm sm:text-base leading-snug flex-1">
                        <MathText text={opt.text} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <div className="text-xs text-slate-400 font-medium">
                  {answeredCount} dari {questions.length} Dijawab
                </div>

                <button
                  disabled={currentQuestionIndex === questions.length - 1}
                  onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-400">Soal tidak ditemukan.</div>
          )}

        </div>

        {/* Right Column: Question Navigator Palette (1 col) */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Navigasi Soal</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {answeredCount}/{questions.length}
              </span>
            </div>

            {/* Grid Palette */}
            <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = answers[q.id] !== undefined;
                const isFlagged = flaggedQuestions[q.id];

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-10 rounded-xl font-bold text-xs transition relative flex items-center justify-center cursor-pointer ${
                      isCurrent
                        ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 bg-indigo-600 text-white'
                        : isAnswered
                        ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 border-t border-slate-800 pt-3">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-emerald-600/30 border border-emerald-500 rounded-md" />
                <span>Sudah Dijawab</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-slate-800 border border-slate-700 rounded-md" />
                <span>Belum Dijawab</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-amber-400 rounded-full" />
                <span>Ragu-ragu</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 bg-indigo-600 rounded-md" />
                <span>Soal Aktif</span>
              </div>
            </div>

            <button
              onClick={() => setShowSubmitConfirmModal(true)}
              className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Kumpulkan Hasil Ujian</span>
            </button>
          </div>
        </div>

      </div>

      {/* Fullscreen Required Modal / Enforcement Overlay */}
      {!isFullscreen && !isLocked && exam.antiCheatEnabled && (
        <div className="fixed inset-0 z-45 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto">
              <Maximize className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-extrabold text-xl text-white">Mode Layar Penuh Wajib</h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Ujian ini menerapkan sistem pengawasan ketat. Anda wajib berada dalam mode <strong>Layar Penuh (Fullscreen)</strong> agar tidak dapat beralih aplikasi atau membuka jendela lain.
              </p>
            </div>
            <button
              type="button"
              onClick={enterFullscreen}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
              <span>Kunci Layar Penuh & Lanjutkan Ujian</span>
            </button>
          </div>
        </div>
      )}

      {/* Warning Modal for Anti-Cheat Violation */}
      {showWarningModal && !isLocked && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center text-rose-400 mx-auto">
              <AlertOctagon className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Peringatan Pelanggaran!</h3>
              <p className="text-xs text-rose-300 font-semibold mt-1">
                Terdeteksi: {latestViolationType}
              </p>
            </div>
            <p className="text-xs text-slate-300">
              Ujian Anda tercatat melakukan pelanggaran ke-<strong>{violationCount}</strong> dari maksimal <strong>{exam.maxViolations}</strong>.
              Layar akan MENGUNCI jika Anda melanggar lagi!
            </p>
            <button
              onClick={() => {
                setShowWarningModal(false);
                enterFullscreen();
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
            >
              Kembali Ke Ujian (Layar Penuh)
            </button>
          </div>
        </div>
      )}

      {/* Lock Screen Overlay (Automatic Lock / Screen Lockdown) */}
      {isLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-lg flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/60 rounded-2xl max-w-lg w-full p-8 text-center space-y-6 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center justify-center text-rose-400 mx-auto animate-bounce">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="bg-rose-500/20 text-rose-300 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                Layar Ujian Terkunci (Lockdown)
              </span>
              <h3 className="text-2xl font-black text-white">Akses Asesmen Terhenti</h3>
              <p className="text-xs text-slate-300 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                {lockReason || 'Terdeteksi indikasi pelanggaran aturan integritas ujian.'}
              </p>
            </div>

            <form onSubmit={handleAdminUnlock} className="space-y-4 text-left border-t border-slate-800 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  PIN / Kode Buka Kunci Pengawas Guru
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Masukkan PIN Buka Kunci"
                    value={unlockPinInput}
                    onChange={(e) => setUnlockPinInput(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3" />
                </div>
              </div>

              {unlockError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/30">
                  {unlockError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                Buka Kunci Layar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Submission Modal */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-emerald-400">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Kumpulkan Hasil Ujian?</h3>
                <p className="text-xs text-slate-400">Pastikan semua soal telah diperiksa.</p>
              </div>
            </div>

            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Soal Terjawab:</span>
                <strong className="text-emerald-400">{answeredCount} dari {questions.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Belum Dijawab:</span>
                <strong className="text-rose-400">{questions.length - answeredCount}</strong>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Kembali Periksa
              </button>
              <button
                type="button"
                onClick={handleFinalSubmitConfirm}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition"
              >
                Ya, Kumpulkan Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
