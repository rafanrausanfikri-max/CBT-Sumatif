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
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Exam, ExamSubmission, ViolationLog, Question } from '../types';

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
 * Get all exams real-time
 */
export function subscribeExams(callback: (exams: Exam[]) => void) {
  const examsRef = collection(db, EXAMS_COLLECTION);
  return onSnapshot(examsRef, (snapshot) => {
    const exams: Exam[] = [];
    snapshot.forEach((docSnap) => {
      exams.push({ id: docSnap.id, ...docSnap.data() } as Exam);
    });
    if (exams.length === 0) {
      // Auto seed
      seedInitialExamsIfEmpty().then((seeded) => callback(seeded));
    } else {
      callback(exams);
    }
  }, (err) => {
    console.error('Error subscribing to exams:', err);
    callback([DEFAULT_SAMPLE_EXAM]);
  });
}

/**
 * Create or update exam in Firestore
 */
export async function saveExam(exam: Partial<Exam>): Promise<string> {
  const examId = exam.id || `exam_${Date.now()}`;

  const cleanQuestions = (exam.questions || []).map((q, idx) => {
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
  });

  const examData = {
    id: examId,
    title: exam.title || 'Asesmen Baru',
    subject: exam.subject || 'Mata Pelajaran',
    gradeClass: exam.gradeClass || 'Semua Kelas',
    durationMinutes: Number(exam.durationMinutes) || 30,
    passCode: exam.passCode || '123456',
    isActive: exam.isActive !== undefined ? Boolean(exam.isActive) : true,
    antiCheatEnabled: exam.antiCheatEnabled !== undefined ? Boolean(exam.antiCheatEnabled) : true,
    maxViolations: Number(exam.maxViolations) || 3,
    createdAt: exam.createdAt || new Date().toISOString(),
    questionCount: cleanQuestions.length,
    questions: cleanQuestions
  };

  // Strip any remaining undefined values recursively
  const sanitized = JSON.parse(JSON.stringify(examData));

  await setDoc(doc(db, EXAMS_COLLECTION, examId), sanitized, { merge: true });
  return examId;
}

/**
 * Delete Exam
 */
export async function deleteExam(examId: string): Promise<void> {
  await deleteDoc(doc(db, EXAMS_COLLECTION, examId));
}

/**
 * Save or update student submission
 */
export async function saveSubmission(submission: Partial<ExamSubmission>): Promise<string> {
  const subId = submission.id || `sub_${submission.examId}_${submission.studentName}_${submission.nis}`;
  const subRef = doc(db, SUBMISSIONS_COLLECTION, subId);

  const cleanData = {
    ...submission,
    id: subId,
    lastUpdated: new Date().toISOString()
  };

  const sanitizedData = JSON.parse(JSON.stringify(cleanData));

  await setDoc(subRef, sanitizedData, { merge: true });
  return subId;
}

/**
 * Subscribe real-time to submissions for a specific exam (or all) for live teacher dashboard
 */
export function subscribeSubmissions(examId: string, callback: (submissions: ExamSubmission[]) => void) {
  const subRef = collection(db, SUBMISSIONS_COLLECTION);
  const q = examId ? query(subRef, where('examId', '==', examId)) : subRef;

  return onSnapshot(q, (snapshot) => {
    const list: ExamSubmission[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as ExamSubmission);
    });
    callback(list);
  }, (err) => {
    console.error('Error listening to submissions:', err);
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
  } catch (err) {
    console.error('Error logging violation event:', err);
  }
}

/**
 * Subscribe real-time to violation logs for Admin Toast Notifications
 */
export function subscribeViolationLogs(callback: (logs: ViolationLog[]) => void) {
  const q = query(collection(db, VIOLATIONS_COLLECTION));
  return onSnapshot(q, (snapshot) => {
    const logs: ViolationLog[] = [];
    snapshot.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() } as ViolationLog);
    });
    // Sort by timestamp desc
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(logs);
  }, (err) => {
    console.error('Error subscribing to violation logs:', err);
  });
}

/**
 * Mark all unread violation logs as read
 */
export async function markAllViolationLogsAsRead() {
  try {
    const q = query(collection(db, VIOLATIONS_COLLECTION), where('read', '==', false));
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(docSnap => updateDoc(docSnap.ref, { read: true }));
    await Promise.all(updatePromises);
  } catch (err) {
    console.error('Error marking violation logs as read:', err);
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

import { Student } from '../types';
import { INITIAL_STUDENTS } from '../data/initialStudents';

const STUDENTS_COLLECTION = 'students';

/**
  * Subscribe real-time to Students Master Data
  */
export function subscribeStudents(callback: (students: Student[]) => void) {
  const colRef = collection(db, STUDENTS_COLLECTION);
  return onSnapshot(colRef, async (snapshot) => {
    // If collection is empty, auto-seed initial 180 students from SMA 2 Ciamis
    if (snapshot.empty) {
      callback([]);
      await seedInitialStudents();
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

    callback(students);
  }, (err) => {
    console.error('Error subscribing students:', err);
    callback([]);
  });
}

/**
  * Add a single student manually
  */
export async function addStudent(studentData: Omit<Student, 'id'>) {
  const colRef = collection(db, STUDENTS_COLLECTION);
  const docRef = await addDoc(colRef, studentData);
  return docRef.id;
}

/**
  * Delete student
  */
export async function deleteStudent(studentId: string) {
  const docRef = doc(db, STUDENTS_COLLECTION, studentId);
  await deleteDoc(docRef);
}

/**
  * Seed/Populate 180 initial students from SMA Negeri 2 Ciamis
  */
export async function seedInitialStudents() {
  try {
    const colRef = collection(db, STUDENTS_COLLECTION);
    const existingSnap = await getDocs(colRef);
    if (!existingSnap.empty) {
      // If already has data, clear first if re-seeding
      const deletePromises = existingSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }

    // Add all initial students in batches/promises
    const addPromises = INITIAL_STUDENTS.map(s => addDoc(colRef, s));
    await Promise.all(addPromises);
    console.log('Successfully seeded 180 students for SMA Negeri 2 Ciamis');
  } catch (err) {
    console.error('Error seeding initial students:', err);
    throw err;
  }
}

/**
  * Subscribe real-time to Teacher PIN settings
  */
export function subscribeTeacherPin(callback: (pin: string) => void) {
  const pinDocRef = doc(db, 'settings', 'teacherConfig');
  return onSnapshot(pinDocRef, (snapshot) => {
    if (snapshot.exists() && snapshot.data().pin) {
      callback(snapshot.data().pin);
    } else {
      callback('123456');
    }
  }, (err) => {
    console.error('Error subscribing to teacher PIN:', err);
    callback('123456');
  });
}

/**
  * Update Teacher PIN in Firestore
  */
export async function updateTeacherPin(newPin: string) {
  const pinDocRef = doc(db, 'settings', 'teacherConfig');
  await setDoc(pinDocRef, { pin: newPin, updatedAt: new Date().toISOString() }, { merge: true });
}

