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
