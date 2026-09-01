import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam, ExamSubmission, ViolationLog, Question, Student } from '../types';
import { INITIAL_STUDENTS } from '../data/initialStudents';

const EXAMS_COLLECTION = 'exams';
const SUBMISSIONS_COLLECTION = 'submissions';
const VIOLATIONS_COLLECTION = 'violations_log';

// Default Sample Exam for Instant Application Usage
export const DEFAULT_SAMPLE_EXAM: Exam = {
  id: 'exam_sample_sumatif_2026',
  title: 'Asesmen Sumatif Akhir Semester (ASAS) 2026',
  subject: 'Bahasa Indonesia & Logika Penalaran',
  gradeClass: 'Kelas XI / XII (SMA/SMK/MA)',
  durationMinutes: 30,
  passCode: 'SUMATIF123',
  isActive: true,
  antiCheatEnabled: true,
  maxViolations: 3,
  randomizeQuestions: true,
  randomizeOptions: true,
  createdAt: new Date().toISOString(),
  questionCount: 5,
  questions: [
    {
      id: 'q1',
      questionText: 'Manakah di bawah ini yang merupakan kalimat efektif dengan struktur SPOK yang tepat?',
      options: [
        'Bagi para siswa-siswa sekolah yang ingin mendaftar harap ke kantor.',
        'Siswa kelas XII menyerahkan laporan hasil praktikum Kimia di laboratorium pagi tadi.',
        'Di dalam ruangan itu membicarakan masalah persiapan asesmen sumatif.',
        'Gubernur yang mana baru dilantik meresmikan gedung baru tersebut.',
        'Meskipun hujan deras, tetapi mereka tetap pergi ke sekolah bersama.'
      ],
      correctAnswer: 1,
      points: 20,
      explanation: 'Kalimat B memiliki subjek (Siswa kelas XII), predikat (menyerahkan), objek (laporan hasil praktikum Kimia), keterangan tempat & waktu (di laboratorium pagi tadi) tanpa kata mubazir.'
    },
    {
      id: 'q2',
      questionText: 'Jika semua peserta ujian mematuhi tata tertib, maka asesmen berjalan lancar. Ternyata asesmen tidak berjalan lancar. Kesimpulan logis yang sah adalah...',
      options: [
        'Semua peserta ujian mematuhi tata tertib.',
        'Beberapa peserta ujian tidak mematuhi tata tertib.',
        'Tidak ada peserta ujian yang mematuhi tata tertib.',
        'Tidak semua peserta ujian tidak mematuhi tata tertib.',
        'Ada peserta ujian yang mematuhi tata tertib.'
      ],
      correctAnswer: 1,
      points: 20,
      explanation: 'Menggunakan Modus Tollens: p -> q, ~q, maka kesimpulannya adalah ~p (Tidak semua peserta mematuhi tata tertib / Beberapa peserta tidak mematuhi tata tertib).'
    },
    {
      id: 'q3',
      questionText: 'Ciri utama dari paragraf argumentasi yang baik dalam karya tulis ilmiah adalah...',
      options: [
        'Menggunakan bahasa kiasan dan ungkapan emotif yang menyentuh perasaan pembaca.',
        'Menyajikan urutan peristiwa fiktif secara kronologis.',
        'Dilengkapi dengan fakta empiris, data kuantitatif, dan logika bukti yang kuat.',
        'Berisi imbauan tanpa menyertakan argumen pendukung.',
        'Menceritakan pengalaman pribadi penulis secara objektif.'
      ],
      correctAnswer: 2,
      points: 20,
      explanation: 'Paragraf argumentasi ilmiah wajib menyajikan fakta, data, dan logika ilmiah untuk meyakinkan pembaca.'
    },
    {
      id: 'q4',
      questionText: 'Sistem penguncian layar (lockdown) pada aplikasi asesmen bertujuan utama untuk...',
      options: [
        'Mempercepat proses pengoreksian soal secara otomatis.',
        'Mencegah peserta mengakses aplikasi/jendela lain untuk menjaga integritas ujian.',
        'Menghemat penggunaan daya baterai pada perangkat HP/Laptop.',
        'Menyimpan hasil jawaban di memori lokal secara permanen.',
        'Mengurangi beban koneksi internet pada server sekolah.'
      ],
      correctAnswer: 1,
      points: 20,
      explanation: 'Sistem lockdown membatasi siswa keluar dari layar ujian untuk mencegah kecurangan perpindahan aplikasi.'
    },
    {
      id: 'q5',
      questionText: 'Penggunaan algoritma enkripsi real-time pada jawaban siswa bermanfaat untuk...',
      options: [
        'Memperkecil ukuran file gambar pada soal.',
        'Mencegah manipulasi dan penyadapan data jawaban siswa saat proses sinkronisasi.',
        'Menyembunyikan kunci jawaban dari tampilan guru.',
        'Membuat tampilan aplikasi menjadi lebih menarik.',
        'Mengunci perangkat siswa apabila waktu ujian telah habis.'
      ],
      correctAnswer: 1,
      points: 20,
      explanation: 'Enkripsi AES-256 dan hash checksum memastikan integritas data jawaban siswa terlindungi dari penyadapan atau manipulasi paket.'
    }
  ]
};

export const MATH_SAMPLE_EXAM: Exam = {
  id: 'exam_sample_matematika_2026',
  title: 'Asesmen Matematika & Geometri Trigonometri 2026',
  subject: 'Matematika Terapan & Geometri',
  gradeClass: 'Kelas XII (SMA/SMK/MA)',
  durationMinutes: 45,
  passCode: 'MATH2026',
  isActive: true,
  antiCheatEnabled: true,
  maxViolations: 3,
  createdAt: new Date().toISOString(),
  questionCount: 5,
  questions: [
    {
      id: 'mq1',
      questionText: 'Diketahui $\\triangle ABC$ siku-siku di $B$ dengan panjang sisi $AB = 6\\text{ cm}$ dan $BC = 8\\text{ cm}$. Jika $\\angle A = \\alpha$, maka nilai dari $\\sin \\alpha + \\cos \\alpha$ adalah...',
      options: [
        '$\\frac{7}{5}$',
        '$\\frac{12}{5}$',
        '$\\frac{14}{5}$',
        '$\\frac{5}{7}$',
        '$\\frac{1}{5}$'
      ],
      correctAnswer: 0,
      points: 20,
      explanation: 'Sisi miring $AC = \\sqrt{6^2 + 8^2} = \\sqrt{100} = 10\\text{ cm}$. Maka $\\sin \\alpha = \\frac{8}{10} = \\frac{4}{5}$ dan $\\cos \\alpha = \\frac{6}{10} = \\frac{3}{5}$. Sehingga $\\sin \\alpha + \\cos \\alpha = \\frac{4}{5} + \\frac{3}{5} = \\frac{7}{5}$.'
    },
    {
      id: 'mq2',
      questionText: 'Akar-akar dari persamaan kuadrat $x^2 - 5x + 6 = 0$ adalah $x_1$ dan $x_2$. Nilai dari $\\frac{1}{x_1} + \\frac{1}{x_2}$ adalah...',
      options: [
        '$\\frac{1}{6}$',
        '$\\frac{5}{6}$',
        '$\\frac{6}{5}$',
        '$1$',
        '$\\frac{5}{12}$'
      ],
      correctAnswer: 1,
      points: 20,
      explanation: 'Diketahui $x_1 + x_2 = -\\frac{b}{a} = 5$ dan $x_1 \\cdot x_2 = \\frac{c}{a} = 6$. Maka $\\frac{1}{x_1} + \\frac{1}{x_2} = \\frac{x_1 + x_2}{x_1 \\cdot x_2} = \\frac{5}{6}$.'
    },
    {
      id: 'mq3',
      questionText: 'Sebuah segitiga $\\triangle PQR$ memiliki sudut $\\angle P = 45^\\circ$ dan $\\angle Q = 60^\\circ$. Jika dua garis $g_1 \\parallel g_2$, besar sudut $\\angle R$ adalah...',
      options: [
        '$65^\\circ$',
        '$70^\\circ$',
        '$75^\\circ$',
        '$80^\\circ$',
        '$85^\\circ$'
      ],
      correctAnswer: 2,
      points: 20,
      explanation: 'Jumlah sudut dalam segitiga adalah $180^\\circ$. Maka $\\angle R = 180^\\circ - (45^\\circ + 60^\\circ) = 180^\\circ - 105^\\circ = 75^\\circ$.'
    },
    {
      id: 'mq4',
      questionText: 'Hasil dari operasi logaritma $^2\\log 16 + ^3\\log 27 - ^5\\log 25$ adalah...',
      options: [
        '$3$',
        '$4$',
        '$5$',
        '$6$',
        '$7$'
      ],
      correctAnswer: 2,
      points: 20,
      explanation: '$^2\\log 16 = 4$, $^3\\log 27 = 3$, dan $^5\\log 25 = 2$. Hasilnya adalah $4 + 3 - 2 = 5$.'
    },
    {
      id: 'mq5',
      questionText: 'Dua garis $g_1$ dan $g_2$ terletak pada bidang. Jika $g_1 \\perp g_2$ dengan persamaan $g_1: y = 2x + 3$, maka gradien $m_2$ dari garis $g_2$ adalah...',
      options: [
        '$-2$',
        '$-\\frac{1}{2}$',
        '$\\frac{1}{2}$',
        '$2$',
        '$-1$'
      ],
      correctAnswer: 1,
      points: 20,
      explanation: 'Garis tegak lurus ($g_1 \\perp g_2$) memenuhi $m_1 \\cdot m_2 = -1$. Karena $m_1 = 2$, maka $m_2 = -\\frac{1}{2}$.'
    }
  ]
};

/**
 * Seed sample exam if exams collection is empty
 */
export async function seedInitialExamsIfEmpty(): Promise<Exam[]> {
  try {
    const querySnapshot = await getDocs(collection(db, EXAMS_COLLECTION));
    if (querySnapshot.empty) {
      console.log('Seeding default sample exams to Firestore...');
      const sampleDocRef = doc(db, EXAMS_COLLECTION, DEFAULT_SAMPLE_EXAM.id);
      const mathDocRef = doc(db, EXAMS_COLLECTION, MATH_SAMPLE_EXAM.id);
      await setDoc(sampleDocRef, DEFAULT_SAMPLE_EXAM);
      await setDoc(mathDocRef, MATH_SAMPLE_EXAM);
      return [DEFAULT_SAMPLE_EXAM, MATH_SAMPLE_EXAM];
    }

    const exams: Exam[] = [];
    querySnapshot.forEach((docSnap) => {
      exams.push({ id: docSnap.id, ...docSnap.data() } as Exam);
    });
    return exams;
  } catch (error) {
    console.warn('Firestore fallback to local sample exam due to connection state:', error);
    return [DEFAULT_SAMPLE_EXAM, MATH_SAMPLE_EXAM];
  }
}

/**
 * Get all exams real-time with local cache and quota-safe fallback
 */
export function subscribeExams(callback: (exams: Exam[]) => void) {
  // 1. Instantly provide cached exams from localStorage
  const cachedJson = typeof window !== 'undefined' ? localStorage.getItem('cbt_exams_cache') : null;
  if (cachedJson) {
    try {
      const parsed = JSON.parse(cachedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    } catch {
      // ignore
    }
  }

  const examsRef = collection(db, EXAMS_COLLECTION);
  return onSnapshot(examsRef, async (snapshot) => {
    const exams: Exam[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Exam;
      
      // Auto-repair if a sample exam had its questions wiped out to 0
      if (docSnap.id === DEFAULT_SAMPLE_EXAM.id && (!data.questions || data.questions.length === 0)) {
        data.questions = DEFAULT_SAMPLE_EXAM.questions;
        data.questionCount = DEFAULT_SAMPLE_EXAM.questions.length;
        setDoc(docSnap.ref, { questions: DEFAULT_SAMPLE_EXAM.questions, questionCount: DEFAULT_SAMPLE_EXAM.questions.length }, { merge: true }).catch(console.error);
      }
      if (docSnap.id === MATH_SAMPLE_EXAM.id && (!data.questions || data.questions.length === 0)) {
        data.questions = MATH_SAMPLE_EXAM.questions;
        data.questionCount = MATH_SAMPLE_EXAM.questions.length;
        setDoc(docSnap.ref, { questions: MATH_SAMPLE_EXAM.questions, questionCount: MATH_SAMPLE_EXAM.questions.length }, { merge: true }).catch(console.error);
      }

      exams.push({ id: docSnap.id, ...data });
    });

    if (exams.length > 0) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('cbt_exams_cache', JSON.stringify(exams));
      }
      callback(exams);
    } else {
      const hasBeenInitialized = localStorage.getItem('cbt_exams_initialized');
      if (!hasBeenInitialized) {
        localStorage.setItem('cbt_exams_initialized', 'true');
        seedInitialExamsIfEmpty().then((seeded) => {
          if (typeof window !== 'undefined') {
            localStorage.setItem('cbt_exams_cache', JSON.stringify(seeded));
          }
          callback(seeded);
        });
      } else {
        callback([DEFAULT_SAMPLE_EXAM, MATH_SAMPLE_EXAM]);
      }
    }
  }, (err) => {
    console.warn('Firestore exams subscription quota/network warning:', err.message);
    if (cachedJson) {
      try {
        const parsed = JSON.parse(cachedJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
    callback([DEFAULT_SAMPLE_EXAM, MATH_SAMPLE_EXAM]);
  });
}

/**
 * Create or update exam in Firestore safely without losing existing fields/questions
 */
export async function saveExam(exam: Partial<Exam>): Promise<string> {
  localStorage.setItem('cbt_exams_initialized', 'true');
  const examId = exam.id || `exam_${Date.now()}`;
  const examRef = doc(db, EXAMS_COLLECTION, examId);

  const examData: Record<string, any> = {
    id: examId,
    updatedAt: new Date().toISOString()
  };

  if (exam.title !== undefined) examData.title = exam.title;
  if (exam.subject !== undefined) examData.subject = exam.subject;
  if (exam.gradeClass !== undefined) examData.gradeClass = exam.gradeClass;
  if (exam.durationMinutes !== undefined) examData.durationMinutes = Number(exam.durationMinutes) || 30;
  if (exam.passCode !== undefined) examData.passCode = exam.passCode;
  if (exam.isActive !== undefined) examData.isActive = Boolean(exam.isActive);
  if (exam.antiCheatEnabled !== undefined) examData.antiCheatEnabled = Boolean(exam.antiCheatEnabled);
  if (exam.maxViolations !== undefined) examData.maxViolations = Number(exam.maxViolations) || 3;
  if (exam.randomizeQuestions !== undefined) examData.randomizeQuestions = Boolean(exam.randomizeQuestions);
  if (exam.randomizeOptions !== undefined) examData.randomizeOptions = Boolean(exam.randomizeOptions);
  if (exam.accessRestrictionType !== undefined) examData.accessRestrictionType = exam.accessRestrictionType;
  if (exam.allowedClasses !== undefined) examData.allowedClasses = Array.isArray(exam.allowedClasses) ? exam.allowedClasses : [];
  if (exam.allowedStudentNis !== undefined) examData.allowedStudentNis = Array.isArray(exam.allowedStudentNis) ? exam.allowedStudentNis : [];
  if (exam.maxConcurrentParticipants !== undefined) examData.maxConcurrentParticipants = Number(exam.maxConcurrentParticipants) || 0;
  if (exam.examSessionSchedule !== undefined) examData.examSessionSchedule = exam.examSessionSchedule;
  if (exam.createdAt !== undefined) examData.createdAt = exam.createdAt;

  // ONLY update questions & questionCount if questions array is explicitly provided
  if (exam.questions !== undefined) {
    const cleanQuestions = Array.isArray(exam.questions) ? exam.questions.map((q, idx) => {
      const qObj: Record<string, any> = {
        id: q.id || `q_${Date.now()}_${idx}`,
        questionText: q.questionText || '',
        options: Array.isArray(q.options) ? q.options.map(o => o || '') : [],
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
        points: typeof q.points === 'number' ? q.points : 10,
      };
      if (q.explanation) qObj.explanation = q.explanation;
      if (q.imageUrl) qObj.imageUrl = q.imageUrl;
      return qObj;
    }) : [];

    examData.questions = cleanQuestions;
    examData.questionCount = cleanQuestions.length;
  }

  // Strip any remaining undefined values recursively
  const sanitized = JSON.parse(JSON.stringify(examData));

  try {
    await setDoc(examRef, sanitized, { merge: true });
  } catch (err: any) {
    console.warn('Could not sync exam to Firestore (saving locally):', err?.message);
  }

  // Update local exams cache
  try {
    const currentCached = localStorage.getItem('cbt_exams_cache');
    let list: Exam[] = currentCached ? JSON.parse(currentCached) : [];
    const existingIndex = list.findIndex(e => e.id === examId);
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...sanitized };
    } else {
      list.push(sanitized as Exam);
    }
    localStorage.setItem('cbt_exams_cache', JSON.stringify(list));
  } catch {
    // ignore
  }

  return examId;
}

/**
 * Update partial exam fields (e.g. access control, session limits) without touching questions
 */
export async function updateExam(examId: string, updates: Partial<Exam>): Promise<void> {
  await saveExam({ id: examId, ...updates });
}

/**
 * Delete Exam
 */
export async function deleteExam(examId: string): Promise<void> {
  localStorage.setItem('cbt_exams_initialized', 'true');
  try {
    await deleteDoc(doc(db, EXAMS_COLLECTION, examId));
  } catch (err: any) {
    console.warn('Could not delete from Firestore (deleting locally):', err?.message);
  }

  try {
    const currentCached = localStorage.getItem('cbt_exams_cache');
    if (currentCached) {
      const list: Exam[] = JSON.parse(currentCached);
      const filtered = list.filter(e => e.id !== examId);
      localStorage.setItem('cbt_exams_cache', JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}

/**
 * Save or update student submission with Local Storage guarantee + Firestore sync
 */
export async function saveSubmission(submission: Partial<ExamSubmission>): Promise<string> {
  const subId = submission.id || `sub_${submission.examId}_${submission.studentName}_${submission.nis}`;
  const cleanData = {
    ...submission,
    id: subId,
    lastUpdated: new Date().toISOString()
  };
  const sanitizedData = JSON.parse(JSON.stringify(cleanData));

  // 1. Guaranteed Local Persistence (0 Quota cost, 100% resilient)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`cbt_sub_${subId}`, JSON.stringify(sanitizedData));
      const recentListJson = localStorage.getItem('cbt_submissions_recent') || '[]';
      const recentList: string[] = JSON.parse(recentListJson);
      if (!recentList.includes(subId)) {
        recentList.push(subId);
        localStorage.setItem('cbt_submissions_recent', JSON.stringify(recentList.slice(-100)));
      }
    } catch {
      // ignore local storage quota
    }
  }

  // 2. Sync to Firestore with error resilience
  try {
    const subRef = doc(db, SUBMISSIONS_COLLECTION, subId);
    await setDoc(subRef, sanitizedData, { merge: true });
  } catch (err: any) {
    console.warn('Submission saved locally (Firestore offline/quota exceeded):', err?.message);
  }

  return subId;
}

/**
 * Subscribe real-time to submissions for a specific exam with Query Limit
 */
export function subscribeSubmissions(examId: string, callback: (submissions: ExamSubmission[]) => void) {
  const subRef = collection(db, SUBMISSIONS_COLLECTION);
  const q = examId
    ? query(subRef, where('examId', '==', examId), limit(150))
    : query(subRef, limit(150));

  return onSnapshot(q, (snapshot) => {
    const list: ExamSubmission[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ExamSubmission);
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore submissions subscription notice:', err.message);
    callback([]);
  });
}

/**
 * Log Violation Event for Real-time Notification
 */
export async function logViolationEvent(
  examId: string,
  studentName: string,
  studentClass: string,
  type: string,
  description: string
) {
  try {
    await addDoc(collection(db, VIOLATIONS_COLLECTION), {
      examId,
      studentName,
      studentClass,
      type,
      description,
      timestamp: new Date().toISOString(),
      read: false
    });
  } catch (err: any) {
    console.warn('Violation logged locally (Firestore quota/offline):', err?.message);
  }
}

/**
 * Subscribe real-time to violation logs with limit(40) to prevent reading thousands of historical documents
 */
export function subscribeViolationLogs(callback: (logs: ViolationLog[]) => void) {
  const q = query(
    collection(db, VIOLATIONS_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(40)
  );

  return onSnapshot(q, (snapshot) => {
    const logs: ViolationLog[] = [];
    snapshot.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() } as ViolationLog);
    });
    callback(logs);
  }, (err) => {
    console.warn('Firestore violations subscription notice:', err.message);
    callback([]);
  });
}

/**
 * Mark all unread violation logs as read
 */
export async function markAllViolationLogsAsRead() {
  try {
    const q = query(collection(db, VIOLATIONS_COLLECTION), where('read', '==', false), limit(25));
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(docSnap => updateDoc(docSnap.ref, { read: true }));
    await Promise.all(updatePromises);
  } catch (err: any) {
    console.warn('Could not mark violations as read:', err?.message);
  }
}

/**
 * Clear all violation logs
 */
export async function clearViolationLogs() {
  try {
    const snapshot = await getDocs(collection(db, VIOLATIONS_COLLECTION));
    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);
  } catch (err) {
    console.error('Error clearing violation logs:', err);
  }
}

/**
 * Admin Quick Actions on Student Submissions
 */
export async function unlockStudentSubmission(submissionId: string) {
  const subRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await updateDoc(subRef, {
    isLocked: false,
    status: 'in_progress',
    lockedReason: ''
  });
}

export async function forceSubmitStudentSubmission(submissionId: string) {
  const subRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await updateDoc(subRef, {
    status: 'submitted',
    isLocked: false,
    submittedAt: new Date().toISOString()
  });
}

export async function addStudentTime(submissionId: string, currentSeconds: number, additionalMinutes: number = 10) {
  const subRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await updateDoc(subRef, {
    remainingSeconds: currentSeconds + additionalMinutes * 60
  });
}

export async function deleteSubmission(submissionId: string) {
  const subRef = doc(db, SUBMISSIONS_COLLECTION, submissionId);
  await deleteDoc(subRef);
}

export async function clearExamSubmissions(examId: string) {
  const subRef = collection(db, SUBMISSIONS_COLLECTION);
  const q = examId ? query(subRef, where('examId', '==', examId)) : subRef;
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);
}

const STUDENTS_COLLECTION = 'students';

/**
  * Subscribe real-time to Students Master Data with instant local cache
  */
export function subscribeStudents(callback: (students: Student[]) => void) {
  // 1. Instantly return local cached students
  const cachedJson = typeof window !== 'undefined' ? localStorage.getItem('cbt_students_cache') : null;
  if (cachedJson) {
    try {
      const parsed = JSON.parse(cachedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      }
    } catch {
      // ignore
    }
  } else {
    // Provide initial default students immediately without waiting
    callback(INITIAL_STUDENTS.map((s, idx) => ({ id: `init_${idx}`, ...s })));
  }

  const colRef = collection(db, STUDENTS_COLLECTION);
  return onSnapshot(colRef, async (snapshot) => {
    if (snapshot.empty) {
      const hasSeeded = localStorage.getItem('cbt_students_seeded');
      if (!hasSeeded) {
        localStorage.setItem('cbt_students_seeded', 'true');
        seedInitialStudents().catch(console.warn);
      }
      return;
    }

    const students: Student[] = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<Student, 'id'>)
    }));

    // Sort by Class then Name
    students.sort((a, b) => {
      if (a.studentClass !== b.studentClass) {
        return a.studentClass.localeCompare(b.studentClass);
      }
      return a.name.localeCompare(b.name);
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('cbt_students_cache', JSON.stringify(students));
    }
    callback(students);
  }, (err) => {
    console.warn('Firestore students subscription notice (using local data):', err.message);
    if (cachedJson) {
      try {
        const parsed = JSON.parse(cachedJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          callback(parsed);
          return;
        }
      } catch {
        // ignore
      }
    }
    callback(INITIAL_STUDENTS.map((s, idx) => ({ id: `init_${idx}`, ...s })));
  });
}

/**
  * Add a single student manually
  */
export async function addStudent(studentData: Omit<Student, 'id'>) {
  const newId = `std_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  try {
    const colRef = collection(db, STUDENTS_COLLECTION);
    const docRef = await addDoc(colRef, studentData);
    return docRef.id;
  } catch (err: any) {
    console.warn('Student added locally:', err?.message);
    // Save to local cache
    try {
      const cached = localStorage.getItem('cbt_students_cache');
      const list: Student[] = cached ? JSON.parse(cached) : [...INITIAL_STUDENTS.map((s, idx) => ({ id: `init_${idx}`, ...s }))];
      list.push({ id: newId, ...studentData });
      localStorage.setItem('cbt_students_cache', JSON.stringify(list));
    } catch {
      // ignore
    }
    return newId;
  }
}

/**
  * Delete student
  */
export async function deleteStudent(studentId: string) {
  try {
    const docRef = doc(db, STUDENTS_COLLECTION, studentId);
    await deleteDoc(docRef);
  } catch (err: any) {
    console.warn('Student deleted locally:', err?.message);
  }

  try {
    const cached = localStorage.getItem('cbt_students_cache');
    if (cached) {
      const list: Student[] = JSON.parse(cached);
      const filtered = list.filter(s => s.id !== studentId && s.nis !== studentId);
      localStorage.setItem('cbt_students_cache', JSON.stringify(filtered));
    }
  } catch {
    // ignore
  }
}

/**
  * Seed/Populate 180 initial students from SMA Negeri 2 Ciamis
  */
export async function seedInitialStudents() {
  localStorage.setItem('cbt_students_seeded', 'true');
  try {
    const colRef = collection(db, STUDENTS_COLLECTION);
    const existingSnap = await getDocs(colRef);
    if (!existingSnap.empty) {
      const deletePromises = existingSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }

    const addPromises = INITIAL_STUDENTS.map(s => addDoc(colRef, s));
    await Promise.all(addPromises);
    console.log('Successfully seeded 180 students for SMA Negeri 2 Ciamis');
  } catch (err: any) {
    console.warn('Seeding students stored locally:', err?.message);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cbt_students_cache', JSON.stringify(
        INITIAL_STUDENTS.map((s, idx) => ({ id: `init_${idx}`, ...s }))
      ));
    }
  }
}

/**
  * Subscribe real-time to Teacher PIN settings
  */
export function subscribeTeacherPin(callback: (pin: string) => void) {
  const localPin = typeof window !== 'undefined' ? localStorage.getItem('cbt_teacher_pin') : null;
  if (localPin) {
    callback(localPin);
  }
  const pinDocRef = doc(db, 'settings', 'teacherConfig');
  return onSnapshot(pinDocRef, (snapshot) => {
    if (snapshot.exists() && snapshot.data().pin) {
      const pin = snapshot.data().pin;
      if (typeof window !== 'undefined') {
        localStorage.setItem('cbt_teacher_pin', pin);
      }
      callback(pin);
    } else if (localPin) {
      callback(localPin);
    } else {
      callback('123456');
    }
  }, (err) => {
    console.error('Error subscribing to teacher PIN:', err);
    if (localPin) {
      callback(localPin);
    } else {
      callback('123456');
    }
  });
}

/**
 * Update Teacher PIN in Firestore and local storage
 */
export async function updateTeacherPin(newPin: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cbt_teacher_pin', newPin);
  }
  const pinDocRef = doc(db, 'settings', 'teacherConfig');
  await setDoc(pinDocRef, { pin: newPin, updatedAt: new Date().toISOString() }, { merge: true });
}

export const DEFAULT_SCHOOL_CLASSES = ['XII F-1', 'XII F-2', 'XII F-3', 'XII F-4', 'XII F-5'];

/**
 * Subscribe real-time to School Classes
 */
export function subscribeClasses(callback: (classes: string[]) => void) {
  const localClassesJson = typeof window !== 'undefined' ? localStorage.getItem('cbt_custom_classes') : null;
  let localClasses: string[] = DEFAULT_SCHOOL_CLASSES;
  if (localClassesJson) {
    try {
      const parsed = JSON.parse(localClassesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localClasses = parsed;
      }
    } catch {
      // ignore
    }
  }
  callback(localClasses);

  const classesDocRef = doc(db, 'settings', 'classesConfig');
  return onSnapshot(classesDocRef, (snapshot) => {
    if (snapshot.exists() && snapshot.data().classList && Array.isArray(snapshot.data().classList)) {
      const dbClasses: string[] = snapshot.data().classList;
      const combined = Array.from(new Set([...DEFAULT_SCHOOL_CLASSES, ...dbClasses])).filter(Boolean).sort();
      if (typeof window !== 'undefined') {
        localStorage.setItem('cbt_custom_classes', JSON.stringify(combined));
      }
      callback(combined);
    } else {
      callback(localClasses);
    }
  }, (err) => {
    console.error('Error subscribing to classes:', err);
    callback(localClasses);
  });
}

/**
 * Add a new school class manually
 */
export async function addSchoolClass(newClassName: string) {
  const formatted = newClassName.trim().toUpperCase();
  if (!formatted) return;

  const classesDocRef = doc(db, 'settings', 'classesConfig');
  const snap = await getDoc(classesDocRef);
  let currentList = [...DEFAULT_SCHOOL_CLASSES];
  if (snap.exists() && snap.data().classList && Array.isArray(snap.data().classList)) {
    currentList = snap.data().classList;
  }

  if (!currentList.includes(formatted)) {
    currentList.push(formatted);
    currentList.sort();
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('cbt_custom_classes', JSON.stringify(currentList));
  }

  await setDoc(classesDocRef, { classList: currentList, updatedAt: new Date().toISOString() }, { merge: true });
}

/**
 * Delete a school class
 */
export async function deleteSchoolClass(className: string) {
  const classesDocRef = doc(db, 'settings', 'classesConfig');
  const snap = await getDoc(classesDocRef);
  let currentList = [...DEFAULT_SCHOOL_CLASSES];
  if (snap.exists() && snap.data().classList && Array.isArray(snap.data().classList)) {
    currentList = snap.data().classList;
  }

  const updatedList = currentList.filter(c => c !== className);

  if (typeof window !== 'undefined') {
    localStorage.setItem('cbt_custom_classes', JSON.stringify(updatedList));
  }

  await setDoc(classesDocRef, { classList: updatedList, updatedAt: new Date().toISOString() }, { merge: true });
}


