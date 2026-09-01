import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { ExamSubmission } from '../types';

/**
 * Export Exam Submissions to Excel (.xlsx)
 */
export function exportSubmissionsToExcel(submissions: ExamSubmission[], examTitle: string, subjectName: string) {
  const exportData = submissions.map((sub, idx) => ({
    'No': idx + 1,
    'NIS': sub.nis || '-',
    'Nama Siswa': sub.studentName,
    'Kelas': sub.studentClass || '-',
    'Nilai Total': sub.score,
    'Total Bobot Soal': sub.totalPoints,
    'Persentase (%)': sub.totalPoints > 0 ? Math.round((sub.score / sub.totalPoints) * 100) : 0,
    'Status Ujian': sub.status === 'submitted' ? 'Selesai' : sub.status === 'locked' ? 'Terkunci' : 'Proses',
    'Jumlah Pelanggaran': sub.violationCount || 0,
    'Integritas Data (Checksum)': sub.checksum ? 'VALID (AES Check)' : 'Unverified',
    'Waktu Mula': sub.startedAt ? new Date(sub.startedAt).toLocaleString('id-ID') : '-',
    'Waktu Selesai': sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('id-ID') : '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Nilai');

  // Add summary metrics sheet
  const scores = submissions.map(s => s.score);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
  const minScore = scores.length > 0 ? Math.min(...scores) : 0;

  const summaryData = [
    { 'Metrik': 'Mata Pelajaran', 'Nilai': subjectName },
    { 'Metrik': 'Nama Asesmen', 'Nilai': examTitle },
    { 'Metrik': 'Total Peserta', 'Nilai': submissions.length },
    { 'Metrik': 'Rata-rata Nilai', 'Nilai': avgScore },
    { 'Metrik': 'Nilai Tertinggi', 'Nilai': maxScore },
    { 'Metrik': 'Nilai Terendah', 'Nilai': minScore },
    { 'Metrik': 'Total Terdeteksi Pelanggaran', 'Nilai': submissions.filter(s => s.violationCount > 0).length }
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan Statistik');

  const safeFileName = examTitle.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `Laporan_Nilai_${safeFileName}.xlsx`);
}

/**
 * Export Exam Submissions to Official PDF Document
 */
export function exportSubmissionsToPDF(submissions: ExamSubmission[], examTitle: string, subjectName: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Dark blue gray
  doc.text('LAPORAN HASIL ASESMEN SUMATIF', 105, 18, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Mata Pelajaran: ${subjectName}`, 14, 28);
  doc.text(`Judul Ujian: ${examTitle}`, 14, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 14, 40);

  // Summary Metrics Box
  const totalStudents = submissions.length;
  const scores = submissions.map(s => s.score);
  const avgScore = totalStudents > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / totalStudents) : 0;
  const maxScore = totalStudents > 0 ? Math.max(...scores) : 0;
  const minScore = totalStudents > 0 ? Math.min(...scores) : 0;
  const violationCountTotal = submissions.reduce((acc, s) => acc + (s.violationCount || 0), 0);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 44, 182, 18, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Peserta: ${totalStudents} Siswa`, 18, 51);
  doc.text(`Rata-rata Nilai: ${avgScore}`, 65, 51);
  doc.text(`Tertinggi: ${maxScore} | Terendah: ${minScore}`, 115, 51);
  doc.text(`Total Pelanggaran: ${violationCountTotal} Kejadian`, 18, 57);

  // Table Data
  const tableHead = [['No', 'NIS', 'Nama Siswa', 'Kelas', 'Nilai', 'Status', 'Pelanggaran']];
  const tableRows = submissions.map((s, idx) => [
    idx + 1,
    s.nis || '-',
    s.studentName,
    s.studentClass || '-',
    s.score,
    s.status === 'submitted' ? 'Selesai' : s.status === 'locked' ? 'Terkunci' : 'Proses',
    s.violationCount > 0 ? `${s.violationCount}x (Peringatan)` : 'Bersih'
  ]);

  autoTable(doc, {
    startY: 66,
    head: tableHead,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42], // Slate 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 25 },
      2: { cellWidth: 55 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 25, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' }
    }
  });

  // Footer Signature area
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : 220;
  if (finalY < 250) {
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Mengetahui,', 140, finalY);
    doc.text('Guru Pengampu / Panitia Asesmen', 140, finalY + 5);
    doc.text('( ______________________ )', 140, finalY + 25);
  }

  const safeFileName = examTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Nilai_${safeFileName}.pdf`);
}

/**
 * Export Item Analysis (Analisis Butir Soal) to Excel
 */
export function exportItemAnalysisToExcel(
  analysis: import('./itemAnalysis').ExamOverallAnalysis,
  examTitle: string
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Rangkuman & Parameter Asesmen
  const summaryData = [
    { 'Parameter': 'Judul Asesmen', 'Nilai': analysis.examTitle },
    { 'Parameter': 'Jumlah Siswa Mengerjakan', 'Nilai': analysis.totalSubmissions },
    { 'Parameter': 'Jumlah Butir Soal', 'Nilai': analysis.itemCount },
    { 'Parameter': 'Nilai Rata-rata', 'Nilai': analysis.averageScore },
    { 'Parameter': 'Nilai Tertinggi', 'Nilai': analysis.highestScore },
    { 'Parameter': 'Nilai Terendah', 'Nilai': analysis.lowestScore },
    { 'Parameter': 'Estimasi Reliabilitas Tes (KR-20)', 'Nilai': `${analysis.reliabilityEstimate} (${analysis.reliabilityCategory})` },
    { 'Parameter': 'Distribusi Kesukaran (Sangat Sukar / Sukar / Sedang / Mudah / Sangat Mudah)', 'Nilai': `${analysis.difficultySummary.sangatSukar} / ${analysis.difficultySummary.sukar} / ${analysis.difficultySummary.sedang} / ${analysis.difficultySummary.mudah} / ${analysis.difficultySummary.sangatMudah}` },
    { 'Parameter': 'Distribusi Daya Pembeda (Sangat Baik / Baik / Cukup / Jelek / Sangat Jelek)', 'Nilai': `${analysis.discriminationSummary.sangatBaik} / ${analysis.discriminationSummary.baik} / ${analysis.discriminationSummary.cukup} / ${analysis.discriminationSummary.jelek} / ${analysis.discriminationSummary.sangatJelek}` },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Asesmen');

  // Sheet 2: Analisis Butir Soal Detail
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const itemsData = analysis.items.map(item => {
    const row: Record<string, any> = {
      'No Soal': item.questionNumber,
      'Teks Soal': item.questionText.substring(0, 100) + (item.questionText.length > 100 ? '...' : ''),
      'Bobot Poin': item.points,
      'Kunci Jawaban': letters[item.correctAnswer] || item.correctAnswer,
      'Jml Menjawab Benar': item.correctCount,
      'Jml Menjawab Salah': item.incorrectCount,
      'Jml Kosong': item.blankCount,
      'Tingkat Kesukaran (P)': item.difficultyIndex,
      'Kategori Kesukaran': item.difficultyCategory,
      'Daya Pembeda (D)': item.discriminationIndex,
      'Kategori Pembeda': item.discriminationCategory,
      'Rekomendasi Butir': item.recommendation,
      'Catatan Evaluasi': item.recommendationNote
    };

    // Distractor percentages
    item.distractors.forEach((d, dIdx) => {
      row[`Opsi ${d.optionLabel} (%)`] = `${d.percentage}% (${d.count} siswa)${d.isCorrect ? ' [KUNCI]' : ''}`;
    });

    return row;
  });

  const wsItems = XLSX.utils.json_to_sheet(itemsData);
  XLSX.utils.book_append_sheet(wb, wsItems, 'Analisis Butir Soal');

  const safeFileName = examTitle.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `Analisis_Butir_Soal_${safeFileName}.xlsx`);
}

/**
 * Export Item Analysis (Analisis Butir Soal) to PDF
 */
export function exportItemAnalysisToPdf(
  analysis: import('./itemAnalysis').ExamOverallAnalysis,
  examTitle: string
) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const letters = ['A', 'B', 'C', 'D', 'E'];

  // Header Title
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN ANALISIS BUTIR SOAL ASESMEN (CBT)', 14, 15);

  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Judul Asesmen: ${examTitle}`, 14, 23);
  doc.text(`Total Peserta: ${analysis.totalSubmissions} Siswa  |  Jumlah Soal: ${analysis.itemCount} Butir  |  Rata-rata: ${analysis.averageScore}  |  Reliabilitas: ${analysis.reliabilityEstimate} (${analysis.reliabilityCategory})`, 14, 29);

  const tableHead = [
    ['No', 'Kunci', 'Poin', 'Benar/Salah', 'Indeks Sukar (P)', 'Kategori Sukar', 'Daya Pembeda (D)', 'Kategori Pembeda', 'Rekomendasi', 'Catatan Evaluasi']
  ];

  const tableRows = analysis.items.map(it => [
    it.questionNumber,
    letters[it.correctAnswer] || it.correctAnswer,
    it.points,
    `${it.correctCount} / ${it.incorrectCount}`,
    it.difficultyIndex.toFixed(2),
    it.difficultyCategory,
    it.discriminationIndex.toFixed(2),
    it.discriminationCategory,
    it.recommendation,
    it.recommendationNote
  ]);

  autoTable(doc, {
    startY: 35,
    head: tableHead,
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 28 },
      6: { cellWidth: 28, halign: 'center' },
      7: { cellWidth: 28 },
      8: { cellWidth: 32 },
      9: { cellWidth: 65 }
    }
  });

  const safeFileName = examTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Analisis_Butir_Soal_${safeFileName}.pdf`);
}

