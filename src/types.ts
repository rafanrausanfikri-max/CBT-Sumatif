export interface Student {
  id: string;
  nis: string;
  nisn: string;
  name: string;
  gender: 'L' | 'P';
  studentClass: string;
  isBlocked?: boolean;
}

export interface SchoolClass {
  id: string;
  name: string;
  createdAt?: string;
}

export interface Question {
  id: string;
  questionText: string;
  options: string[]; // [Option A, Option B, Option C, Option D, Option E]
  correctAnswer: number; // 0 for A, 1 for B, 2 for C, 3 for D, 4 for E
  points: number;
  explanation?: string;
  imageUrl?: string;
}

export interface Exam {
  id: string;
  title: string;
  subject: string;
  gradeClass: string;
  durationMinutes: number;
  passCode: string;
  isActive: boolean;
  antiCheatEnabled: boolean;
  maxViolations: number;
  createdAt: string;
  questionCount: number;
  questions: Question[];
  // Participant Access Control (Pembatasan Peserta Ujian)
  accessRestrictionType?: 'all' | 'class_only' | 'selected_students';
  allowedClasses?: string[];
  allowedStudentNis?: string[];
  maxConcurrentParticipants?: number;
  examSessionSchedule?: string;
  // Randomization Settings (Pengacakan Soal & Pilihan Jawaban)
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
}

export interface ViolationRecord {
  timestamp: string;
  type: 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FULLSCREEN_EXIT' | 'KEYBOARD_SHORTCUT' | 'CONTEXT_MENU' | 'DEVTOOLS' | 'NAVIGATION_ATTEMPT';
  description: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  nis: string;
  encryptedAnswers: string; // AES encrypted JSON string of answers
  checksum: string; // SHA-256 hash for integrity verification
  answers: Record<string, number>; // questionId -> selectedOptionIndex (0-4)
  score: number;
  totalPoints: number;
  status: 'in_progress' | 'submitted' | 'locked' | 'terminated';
  startedAt: string;
  submittedAt?: string;
  remainingSeconds: number;
  violationCount: number;
  violations: ViolationRecord[];
  isLocked: boolean;
  lockedReason?: string;
}

export interface ViolationLog {
  id: string;
  examId: string;
  studentName: string;
  studentClass: string;
  type: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export type AppMode = 'student' | 'admin';
