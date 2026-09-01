/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppMode, Exam, ExamSubmission } from './types';
import { Navbar } from './components/Navbar';
import { StudentPortal } from './components/StudentPortal';
import { ExamEngine } from './components/ExamEngine';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ViolationNotificationToast } from './components/ViolationNotificationToast';
import { subscribeExams, subscribeSubmissions, subscribeViolationLogs, markAllViolationLogsAsRead, subscribeTeacherPin } from './services/examService';
import { ShieldCheck, CheckCircle2, RotateCcw, FileText, Award } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState<AppMode>('student');
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [unreadViolationsCount, setUnreadViolationsCount] = useState<number>(0);

  // Active Student Session state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState<string>('');
  const [nis, setNis] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('');
  const [completedSubmission, setCompletedSubmission] = useState<ExamSubmission | null>(null);

  // Admin PIN
  const [adminPin, setAdminPin] = useState<string>('123456');
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState<boolean>(false);

  // Subscribe to Teacher PIN real-time
  useEffect(() => {
    const unsubPin = subscribeTeacherPin((loadedPin) => {
      setAdminPin(loadedPin);
    });
    return () => unsubPin();
  }, []);

  // Subscribe to Exams real-time
  useEffect(() => {
    const unsubExams = subscribeExams((loadedExams) => {
      setExams(loadedExams);
      if (loadedExams.length > 0 && !selectedExamId) {
        setSelectedExamId(loadedExams[0].id);
      }
    });

    return () => unsubExams();
  }, []);

  // Subscribe to Submissions real-time ONLY in admin mode to save Firestore quota
  useEffect(() => {
    if (mode !== 'admin') {
      setSubmissions([]);
      return;
    }

    const unsubSubmissions = subscribeSubmissions(selectedExamId, (loadedSubs) => {
      setSubmissions(loadedSubs);
    });

    return () => unsubSubmissions();
  }, [selectedExamId, mode]);

  // Subscribe to Violation logs count ONLY in admin mode
  useEffect(() => {
    if (mode !== 'admin') {
      setUnreadViolationsCount(0);
      return;
    }

    const unsubLogs = subscribeViolationLogs((logs) => {
      const recentCount = logs.filter(l => !l.read).length;
      setUnreadViolationsCount(recentCount);
    });

    return () => unsubLogs();
  }, [mode]);

  // Clear unread violation count when teacher is in admin mode
  useEffect(() => {
    if (mode === 'admin') {
      markAllViolationLogsAsRead();
    }
  }, [mode]);

  const handleStartExam = (
    exam: Exam,
    name: string,
    studentNis: string,
    sClass: string
  ) => {
    setActiveExam(exam);
    setStudentName(name);
    setNis(studentNis);
    setStudentClass(sClass);
    setCompletedSubmission(null);
  };

  const handleFinishExam = (submission: ExamSubmission) => {
    setCompletedSubmission(submission);
    setActiveExam(null);
  };

  const handleResetToPortal = () => {
    setActiveExam(null);
    setCompletedSubmission(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col antialiased">
      
      {/* Navigation Bar */}
      <Navbar
        mode={mode}
        onModeChange={(newMode) => {
          if (newMode === 'admin') {
            setIsAdminLoginOpen(true);
          } else {
            setMode('student');
          }
        }}
        unreadViolationsCount={unreadViolationsCount}
        isInExam={activeExam !== null}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      {/* Main Content Router */}
      <main className="flex-1">
        
        {/* Active Exam Engine */}
        {activeExam ? (
          <ExamEngine
            exam={activeExam}
            studentName={studentName}
            nis={nis}
            studentClass={studentClass}
            onFinishExam={handleFinishExam}
            adminPin={adminPin}
          />
        ) : completedSubmission ? (
          /* Completed Exam Result Screen */
          <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6">
            <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl">
              
              <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
                <Award className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-emerald-500/20">
                  Asesmen Telah Diselesaikan
                </span>
                <h2 className="text-2xl font-black text-white">Hasil Jawaban Terekam!</h2>
                <p className="text-xs text-slate-400">
                  Siswa: <strong className="text-white">{completedSubmission.studentName}</strong> ({completedSubmission.studentClass})
                </p>
              </div>

              {/* Score Box */}
              <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 space-y-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nilai Asesmen Total</p>
                <div className="text-4xl sm:text-5xl font-black text-indigo-400">
                  {completedSubmission.score} <span className="text-lg font-normal text-slate-500">/ {completedSubmission.totalPoints}</span>
                </div>
                <p className="text-xs text-emerald-400 font-semibold pt-1">
                  Persentase Kelulusan: {completedSubmission.totalPoints > 0 ? Math.round((completedSubmission.score / completedSubmission.totalPoints) * 100) : 0}%
                </p>
              </div>

              {/* Integrity Status */}
              <div className="grid grid-cols-2 gap-3 text-xs text-left bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block">Enkripsi Jawaban:</span>
                  <strong className="text-emerald-400 font-mono">AES-256 Valid</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Record Pelanggaran:</span>
                  <strong className={completedSubmission.violationCount > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {completedSubmission.violationCount > 0 ? `${completedSubmission.violationCount}x Kejadian` : 'Bersih (0)'}
                  </strong>
                </div>
              </div>

              <button
                onClick={handleResetToPortal}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Kembali ke Halaman Utama</span>
              </button>

            </div>
          </div>
        ) : mode === 'student' ? (
          /* Student Portal View */
          <StudentPortal
            exams={exams}
            onStartExam={handleStartExam}
          />
        ) : (
          /* Admin / Teacher Dashboard View */
          <AdminDashboard
            exams={exams}
            submissions={submissions}
            selectedExamId={selectedExamId}
            onSelectExamId={setSelectedExamId}
            adminPin={adminPin}
            onChangeAdminPin={setAdminPin}
          />
        )}

      </main>

      {/* Floating Real-time Violation Toast Notification for Admin */}
      <ViolationNotificationToast />

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => {
          setMode('admin');
        }}
        adminPin={adminPin}
      />

    </div>
  );
}
