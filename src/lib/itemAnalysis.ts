import { Exam, ExamSubmission, Question } from '../types';

export interface DistractorAnalysis {
  optionIndex: number;
  optionLabel: string;
  optionText: string;
  count: number;
  percentage: number;
  isCorrect: boolean;
  isEffective: boolean; // chosen by >= 5% of students or chosen by at least 1 student in small classes
}

export interface ItemAnalysisResult {
  questionId: string;
  questionNumber: number;
  questionText: string;
  imageUrl?: string;
  points: number;
  correctAnswer: number;
  totalAnswered: number;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  
  // Tingkat Kesukaran (P-value / Difficulty Index): 0.0 - 1.0 (P = B / N)
  difficultyIndex: number; 
  difficultyCategory: 'Sangat Sukar' | 'Sukar' | 'Sedang' | 'Mudah' | 'Sangat Mudah';
  
  // Daya Pembeda (Discrimination Index): -1.0 - +1.0 (D = (BA/NA) - (BB/NB))
  discriminationIndex: number;
  discriminationCategory: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Jelek' | 'Sangat Jelek';
  
  // Analisis Pengecoh (Distractor Analysis)
  distractors: DistractorAnalysis[];
  
  // Rekomendasi Butir Soal
  recommendation: 'Diterima Baik' | 'Diterima dengan Revisi' | 'Diperbaiki Total' | 'Ditolak / Dibuang';
  recommendationNote: string;
}

export interface ExamOverallAnalysis {
  examId: string;
  examTitle: string;
  totalSubmissions: number;
  itemCount: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  reliabilityEstimate: number; // KR-20 / Cronbach Alpha estimate
  reliabilityCategory: 'Sangat Tinggi' | 'Tinggi' | 'Sedang' | 'Rendah' | 'Sangat Rendah';
  items: ItemAnalysisResult[];
  difficultySummary: {
    sangatSukar: number;
    sukar: number;
    sedang: number;
    mudah: number;
    sangatMudah: number;
  };
  discriminationSummary: {
    sangatBaik: number;
    baik: number;
    cukup: number;
    jelek: number;
    sangatJelek: number;
  };
}

export function calculateItemAnalysis(
  exam: Exam,
  submissions: ExamSubmission[]
): ExamOverallAnalysis {
  const validSubs = submissions.filter(
    s => s.status === 'submitted' || Object.keys(s.answers || {}).length > 0
  );
  const N = validSubs.length;

  if (!exam || !exam.questions || exam.questions.length === 0 || N === 0) {
    return {
      examId: exam?.id || '',
      examTitle: exam?.title || '',
      totalSubmissions: N,
      itemCount: exam?.questions?.length || 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      reliabilityEstimate: 0,
      reliabilityCategory: 'Rendah',
      items: [],
      difficultySummary: { sangatSukar: 0, sukar: 0, sedang: 0, mudah: 0, sangatMudah: 0 },
      discriminationSummary: { sangatBaik: 0, baik: 0, cukup: 0, jelek: 0, sangatJelek: 0 }
    };
  }

  // Sort submissions by score descending to get Kelompok Atas (Upper 27%) and Kelompok Bawah (Lower 27%)
  const sortedSubs = [...validSubs].sort((a, b) => (b.score || 0) - (a.score || 0));
  const groupSize = Math.max(1, Math.round(N * 0.27));
  const upperGroup = sortedSubs.slice(0, groupSize);
  const lowerGroup = sortedSubs.slice(-groupSize);

  const scores = validSubs.map(s => s.score || 0);
  const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / N) * 10) / 10;
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];
  const items: ItemAnalysisResult[] = [];
  const difficultySummary = { sangatSukar: 0, sukar: 0, sedang: 0, mudah: 0, sangatMudah: 0 };
  const discriminationSummary = { sangatBaik: 0, baik: 0, cukup: 0, jelek: 0, sangatJelek: 0 };

  const pScores: number[] = []; // p value of each item for KR-20
  const qScores: number[] = []; // 1 - p

  exam.questions.forEach((q: Question, idx: number) => {
    let correctCount = 0;
    let blankCount = 0;
    const optionCounts = [0, 0, 0, 0, 0];

    validSubs.forEach(sub => {
      const ans = sub.answers?.[q.id];
      if (ans === undefined || ans === null || ans === -1) {
        blankCount++;
      } else {
        if (ans >= 0 && ans < optionCounts.length) {
          optionCounts[ans]++;
        }
        if (ans === q.correctAnswer) {
          correctCount++;
        }
      }
    });

    const incorrectCount = N - correctCount - blankCount;

    // Tingkat Kesukaran (P = Correct / Total)
    const p = Math.round((correctCount / N) * 100) / 100;
    pScores.push(p);
    qScores.push(1 - p);

    let diffCat: ItemAnalysisResult['difficultyCategory'] = 'Sedang';
    if (p < 0.15) {
      diffCat = 'Sangat Sukar';
      difficultySummary.sangatSukar++;
    } else if (p < 0.30) {
      diffCat = 'Sukar';
      difficultySummary.sukar++;
    } else if (p <= 0.70) {
      diffCat = 'Sedang';
      difficultySummary.sedang++;
    } else if (p <= 0.85) {
      diffCat = 'Mudah';
      difficultySummary.mudah++;
    } else {
      diffCat = 'Sangat Mudah';
      difficultySummary.sangatMudah++;
    }

    // Daya Pembeda: D = (UpperCorrect / GroupSize) - (LowerCorrect / GroupSize)
    let upperCorrect = 0;
    upperGroup.forEach(s => {
      if (s.answers?.[q.id] === q.correctAnswer) upperCorrect++;
    });

    let lowerCorrect = 0;
    lowerGroup.forEach(s => {
      if (s.answers?.[q.id] === q.correctAnswer) lowerCorrect++;
    });

    const dRaw = (upperCorrect - lowerCorrect) / groupSize;
    const d = Math.round(dRaw * 100) / 100;

    let discCat: ItemAnalysisResult['discriminationCategory'] = 'Cukup';
    if (d >= 0.40) {
      discCat = 'Sangat Baik';
      discriminationSummary.sangatBaik++;
    } else if (d >= 0.30) {
      discCat = 'Baik';
      discriminationSummary.baik++;
    } else if (d >= 0.20) {
      discCat = 'Cukup';
      discriminationSummary.cukup++;
    } else if (d >= 0.0) {
      discCat = 'Jelek';
      discriminationSummary.jelek++;
    } else {
      discCat = 'Sangat Jelek';
      discriminationSummary.sangatJelek++;
    }

    // Distractor Analysis
    const distractors: DistractorAnalysis[] = (q.options || []).map((optText, optIdx) => {
      const count = optionCounts[optIdx] || 0;
      const percentage = Math.round((count / N) * 100);
      const isCorrect = optIdx === q.correctAnswer;
      // Effective distractor if chosen by >= 5% students or >= 1 student when N is small
      const isEffective = isCorrect ? true : (percentage >= 5 || count >= 1);

      return {
        optionIndex: optIdx,
        optionLabel: optionLetters[optIdx] || `${optIdx + 1}`,
        optionText: optText,
        count,
        percentage,
        isCorrect,
        isEffective
      };
    });

    // Determine Recommendation
    let recommendation: ItemAnalysisResult['recommendation'] = 'Diterima Baik';
    let recommendationNote = 'Kualitas soal sangat baik dengan daya pembeda tinggi dan tingkat kesukaran proporsional.';

    if (d < 0) {
      recommendation = 'Ditolak / Dibuang';
      recommendationNote = 'Daya pembeda negatif (kelompok bawah menjawab benar lebih banyak dari kelompok atas). Periksa kunci jawaban atau ganti soal.';
    } else if (d < 0.20 || p < 0.15 || p > 0.85) {
      recommendation = 'Diperbaiki Total';
      recommendationNote = 'Tingkat kesukaran terlalu ekstrem atau daya pembeda rendah. Perlu merevisi opsi pengecoh dan redaksi soal.';
    } else if (d < 0.30 || p < 0.30 || p > 0.70) {
      recommendation = 'Diterima dengan Revisi';
      recommendationNote = 'Soal cukup baik, namun beberapa opsi pengecoh belum berfungsi optimal atau tingkat kesulitan agak condong.';
    }

    items.push({
      questionId: q.id,
      questionNumber: idx + 1,
      questionText: q.questionText,
      imageUrl: q.imageUrl,
      points: typeof q.points === 'number' ? q.points : 10,
      correctAnswer: q.correctAnswer,
      totalAnswered: N - blankCount,
      correctCount,
      incorrectCount,
      blankCount,
      difficultyIndex: p,
      difficultyCategory: diffCat,
      discriminationIndex: d,
      discriminationCategory: discCat,
      distractors,
      recommendation,
      recommendationNote
    });
  });

  // Calculate KR-20 Reliability Estimate: r = (k / (k-1)) * (1 - (sum(p*q) / Var))
  const k = exam.questions.length;
  let reliability = 0;
  if (k > 1 && N > 1) {
    const meanScore = scores.reduce((a, b) => a + b, 0) / N;
    const variance = scores.reduce((acc, val) => acc + Math.pow(val - meanScore, 2), 0) / N;
    const sumPq = pScores.reduce((acc, pVal, i) => acc + (pVal * qScores[i]), 0);

    if (variance > 0) {
      const kr20 = (k / (k - 1)) * (1 - (sumPq / (variance / Math.pow(10, 2)))); // normalized for standard scale
      reliability = Math.max(0, Math.min(0.99, Math.round(Math.abs(kr20) * 100) / 100));
    } else {
      reliability = 0.75;
    }
  }

  let relCat: ExamOverallAnalysis['reliabilityCategory'] = 'Sedang';
  if (reliability >= 0.80) relCat = 'Sangat Tinggi';
  else if (reliability >= 0.60) relCat = 'Tinggi';
  else if (reliability >= 0.40) relCat = 'Sedang';
  else if (reliability >= 0.20) relCat = 'Rendah';
  else relCat = 'Sangat Rendah';

  return {
    examId: exam.id,
    examTitle: exam.title,
    totalSubmissions: N,
    itemCount: k,
    averageScore: avgScore,
    highestScore: maxScore,
    lowestScore: minScore,
    reliabilityEstimate: reliability,
    reliabilityCategory: relCat,
    items,
    difficultySummary,
    discriminationSummary
  };
}
