import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Search,
  Filter,
  Eye,
  Info,
  Layers,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Exam, ExamSubmission } from '../types';
import { calculateItemAnalysis, ItemAnalysisResult } from '../lib/itemAnalysis';
import { exportItemAnalysisToExcel, exportItemAnalysisToPdf } from '../lib/exporter';
import { MathText } from './MathText';

interface ItemAnalysisDashboardProps {
  exams: Exam[];
  submissions: ExamSubmission[];
  selectedExamId: string;
  onSelectExamId: (id: string) => void;
}

export const ItemAnalysisDashboard: React.FC<ItemAnalysisDashboardProps> = ({
  exams,
  submissions,
  selectedExamId,
  onSelectExamId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'DIFFICULT' | 'EASY' | 'DISCRIM_BAD' | 'REVISE'>('ALL');
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const selectedExam = useMemo(() => {
    return exams.find(e => e.id === selectedExamId) || exams[0] || null;
  }, [exams, selectedExamId]);

  const examSubmissions = useMemo(() => {
    if (!selectedExam) return [];
    return submissions.filter(s => s.examId === selectedExam.id);
  }, [submissions, selectedExam]);

  const analysis = useMemo(() => {
    if (!selectedExam) return null;
    return calculateItemAnalysis(selectedExam, examSubmissions);
  }, [selectedExam, examSubmissions]);

  const filteredItems = useMemo(() => {
    if (!analysis) return [];
    let list = analysis.items;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(it =>
        it.questionText.toLowerCase().includes(q) ||
        `soal ${it.questionNumber}`.includes(q) ||
        `#${it.questionNumber}`.includes(q)
      );
    }

    if (filterCategory === 'DIFFICULT') {
      list = list.filter(it => it.difficultyCategory === 'Sangat Sukar' || it.difficultyCategory === 'Sukar');
    } else if (filterCategory === 'EASY') {
      list = list.filter(it => it.difficultyCategory === 'Sangat Mudah' || it.difficultyCategory === 'Mudah');
    } else if (filterCategory === 'DISCRIM_BAD') {
      list = list.filter(it => it.discriminationCategory === 'Jelek' || it.discriminationCategory === 'Sangat Jelek');
    } else if (filterCategory === 'REVISE') {
      list = list.filter(it => it.recommendation !== 'Diterima Baik');
    }

    return list;
  }, [analysis, searchQuery, filterCategory]);

  if (!selectedExam || exams.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
        <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-200">Belum Ada Asesmen Terpilih</h3>
        <p className="text-sm mt-1">Silakan buat atau pilih asesmen di Bank Soal terlebih dahulu.</p>
      </div>
    );
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="space-y-6">
      {/* HEADER & EXAM PICKER */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Analisis Butir Soal Psikometri</h2>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-medium">
                  Item Analysis
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluasi komprehensif tingkat kesukaran (P), daya pembeda (D), fungsi distraktor, & estimasi reliabilitas tes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedExam.id}
              onChange={(e) => onSelectExamId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} ({ex.questions?.length || 0} Soal)
                </option>
              ))}
            </select>

            {analysis && analysis.totalSubmissions > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => exportItemAnalysisToExcel(analysis, selectedExam.title)}
                  className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                  title="Unduh format Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Ekspor Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportItemAnalysisToPdf(analysis, selectedExam.title)}
                  className="px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                  title="Unduh format PDF"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>Ekspor PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        {analysis && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Peserta Ujian</span>
              <span className="text-xl font-black text-white mt-1 block">{analysis.totalSubmissions} <span className="text-xs font-normal text-slate-400">Siswa</span></span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Jumlah Soal</span>
              <span className="text-xl font-black text-indigo-400 mt-1 block">{analysis.itemCount} <span className="text-xs font-normal text-slate-400">Butir</span></span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Nilai Rata-rata</span>
              <span className="text-xl font-black text-amber-400 mt-1 block">{analysis.averageScore}</span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Tertinggi / Terendah</span>
              <span className="text-xl font-black text-emerald-400 mt-1 block">{analysis.highestScore} <span className="text-xs font-normal text-slate-400">/ {analysis.lowestScore}</span></span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-xl col-span-2 sm:col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Reliabilitas Tes (KR-20)</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  analysis.reliabilityCategory === 'Sangat Tinggi' || analysis.reliabilityCategory === 'Tinggi'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : analysis.reliabilityCategory === 'Sedang'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}>
                  {analysis.reliabilityCategory}
                </span>
              </div>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-xl font-black text-purple-300">{analysis.reliabilityEstimate.toFixed(2)}</span>
                <span className="text-[11px] text-slate-400">
                  {analysis.reliabilityEstimate >= 0.70 ? '✓ Sangat konsisten & valid' : 'Perlu penyempurnaan daya pembeda'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SUMMARY CHARTS / STATS DISTRIBUTION */}
      {analysis && analysis.totalSubmissions > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* TINGKAT KESUKARAN (P) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
                <span>Distribusi Tingkat Kesukaran (P)</span>
                <span className="text-[10px] text-slate-400 font-normal">P = B / N</span>
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-rose-400 font-bold block">Sangat Sukar</span>
                <span className="text-base font-extrabold text-white mt-1 block">{analysis.difficultySummary.sangatSukar}</span>
                <span className="text-[9px] text-slate-500">&lt; 0.15</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-amber-400 font-bold block">Sukar</span>
                <span className="text-base font-extrabold text-white mt-1 block">{analysis.difficultySummary.sukar}</span>
                <span className="text-[9px] text-slate-500">0.15 - 0.29</span>
              </div>
              <div className="bg-indigo-950/40 border border-indigo-500/30 p-2.5 rounded-xl">
                <span className="text-[10px] text-indigo-300 font-bold block">Sedang (Ideal)</span>
                <span className="text-base font-extrabold text-indigo-200 mt-1 block">{analysis.difficultySummary.sedang}</span>
                <span className="text-[9px] text-slate-400">0.30 - 0.70</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-teal-400 font-bold block">Mudah</span>
                <span className="text-base font-extrabold text-white mt-1 block">{analysis.difficultySummary.mudah}</span>
                <span className="text-[9px] text-slate-500">0.71 - 0.85</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-blue-400 font-bold block">Sangat Mudah</span>
                <span className="text-base font-extrabold text-white mt-1 block">{analysis.difficultySummary.sangatMudah}</span>
                <span className="text-[9px] text-slate-500">&gt; 0.85</span>
              </div>
            </div>
          </div>

          {/* DAYA PEMBEDA (D) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
                <span>Distribusi Daya Pembeda (D)</span>
                <span className="text-[10px] text-slate-400 font-normal">Upper vs Lower 27%</span>
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center text-xs">
              <div className="bg-emerald-950/40 border border-emerald-500/30 p-2.5 rounded-xl">
                <span className="text-[10px] text-emerald-300 font-bold block">Sangat Baik</span>
                <span className="text-base font-extrabold text-emerald-200 mt-1 block">{analysis.discriminationSummary.sangatBaik}</span>
                <span className="text-[9px] text-slate-400">&ge; 0.40</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-teal-400 font-bold block">Baik</span>
                <span className="text-base font-extrabold text-white mt-1 block">{analysis.discriminationSummary.baik}</span>
                <span className="text-[9px] text-slate-500">0.30 - 0.39</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-amber-400 font-bold block">Cukup</span>
                <span className="text-base font-extrabold text-white mt-1 block">{analysis.discriminationSummary.cukup}</span>
                <span className="text-[9px] text-slate-500">0.20 - 0.29</span>
              </div>
              <div className="bg-slate-800/80 border border-slate-700/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-orange-400 font-bold block">Jelek</span>
                <span className="text-base font-extrabold text-white mt-1 block">{analysis.discriminationSummary.jelek}</span>
                <span className="text-[9px] text-slate-500">0.00 - 0.19</span>
              </div>
              <div className="bg-rose-950/40 border border-rose-500/30 p-2.5 rounded-xl">
                <span className="text-[10px] text-rose-300 font-bold block">Negatif</span>
                <span className="text-base font-extrabold text-rose-200 mt-1 block">{analysis.discriminationSummary.sangatJelek}</span>
                <span className="text-[9px] text-rose-400">&lt; 0.00</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH CONTROLS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari teks soal atau nomor butir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterCategory === 'ALL'
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua Butir ({analysis?.items.length || 0})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('DIFFICULT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterCategory === 'DIFFICULT'
                ? 'bg-rose-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Sukar / Sangat Sukar
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('EASY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterCategory === 'EASY'
                ? 'bg-teal-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Mudah / Sangat Mudah
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('DISCRIM_BAD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterCategory === 'DISCRIM_BAD'
                ? 'bg-orange-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Daya Pembeda Jelek (D &lt; 0.20)
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('REVISE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filterCategory === 'REVISE'
                ? 'bg-purple-600 text-white shadow'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Perlu Revisi / Tolak
          </button>
        </div>
      </div>

      {/* ITEMS LIST TABLE & ACCORDIONS */}
      {analysis && analysis.totalSubmissions === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Belum Ada Lembar Jawaban Masuk</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Analisis butir soal (tingkat kesukaran, daya pembeda, dan efektivitas pengecoh) akan dihitung otomatis segera setelah siswa menyelesaikan dan mengumpulkan ujian.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              Tidak ada butir soal yang cocok dengan filter atau pencarian.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isExpanded = expandedQuestionId === item.questionId;

              return (
                <div
                  key={item.questionId}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm transition hover:border-slate-700"
                >
                  {/* SUMMARY ROW (CLICKABLE) */}
                  <div
                    onClick={() => setExpandedQuestionId(isExpanded ? null : item.questionId)}
                    className="p-4 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none"
                  >
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-indigo-400 text-xs flex-shrink-0">
                        #{item.questionNumber}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-200 line-clamp-2">
                          <MathText text={item.questionText} />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                            Kunci: <strong className="text-amber-300">{optionLetters[item.correctAnswer] || item.correctAnswer}</strong>
                          </span>
                          <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                            Bobot: <strong className="text-indigo-300">{item.points} Poin</strong>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Menjawab Benar: <strong className="text-emerald-400">{item.correctCount}</strong> / {analysis.totalSubmissions} Siswa ({Math.round((item.correctCount / analysis.totalSubmissions) * 100)}%)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* METRICS PILLS */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* P-Value */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Kesukaran (P)</span>
                        <div className="flex items-center space-x-1.5 justify-end mt-0.5">
                          <span className="font-extrabold text-sm text-white font-mono">{item.difficultyIndex.toFixed(2)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.difficultyCategory === 'Sedang'
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : item.difficultyCategory === 'Mudah' || item.difficultyCategory === 'Sangat Mudah'
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {item.difficultyCategory}
                          </span>
                        </div>
                      </div>

                      {/* D-Value */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Daya Pembeda (D)</span>
                        <div className="flex items-center space-x-1.5 justify-end mt-0.5">
                          <span className="font-extrabold text-sm text-white font-mono">{item.discriminationIndex.toFixed(2)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.discriminationCategory === 'Sangat Baik' || item.discriminationCategory === 'Baik'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : item.discriminationCategory === 'Cukup'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {item.discriminationCategory}
                          </span>
                        </div>
                      </div>

                      {/* Recommendation Badge */}
                      <div className="text-right min-w-[130px]">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Status Evaluasi</span>
                        <span className={`inline-block text-[11px] px-2.5 py-1 rounded-lg font-extrabold mt-0.5 ${
                          item.recommendation === 'Diterima Baik'
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30'
                            : item.recommendation === 'Diterima dengan Revisi'
                            ? 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-600/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {item.recommendation}
                        </span>
                      </div>

                      <div className="text-slate-500 pl-2">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED DETAILS (DISTRACTOR ANALYSIS + FULL QUESTION) */}
                  {isExpanded && (
                    <div className="border-t border-slate-800 p-5 bg-slate-950/40 space-y-4">
                      {/* FULL QUESTION TEXT & IMAGE */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                        <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Teks Lengkap Butir Soal:</span>
                        <div className="text-slate-200 text-sm font-medium leading-relaxed">
                          <MathText text={item.questionText} />
                        </div>
                        {item.imageUrl && (
                          <div className="mt-2 max-w-sm rounded-lg overflow-hidden border border-slate-800">
                            <img src={item.imageUrl} alt="Ilustrasi Soal" className="w-full h-auto object-contain" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>

                      {/* DISTRACTOR (OPSI PENGECOH) ANALYSIS TABLE */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Analisis Pola Jawaban & Efektivitas Opsi Pengecoh (Distractor)</span>
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            *Pengecoh efektif minimal dipilih &ge; 5% siswa
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {item.distractors.map((d) => (
                            <div
                              key={d.optionIndex}
                              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                                d.isCorrect
                                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                                  : d.isEffective
                                  ? 'bg-slate-900/90 border-slate-700/80 text-slate-200'
                                  : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                              }`}
                            >
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center flex-shrink-0 ${
                                  d.isCorrect
                                    ? 'bg-emerald-600 text-white font-extrabold'
                                    : 'bg-slate-800 text-slate-300'
                                }`}>
                                  {d.optionLabel}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-xs">
                                    <MathText text={d.optionText} />
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center space-x-4 self-end sm:self-auto flex-shrink-0">
                                {/* Percentage bar */}
                                <div className="w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      d.isCorrect ? 'bg-emerald-500' : 'bg-indigo-500'
                                    }`}
                                    style={{ width: `${Math.min(100, Math.max(d.percentage, 2))}%` }}
                                  />
                                </div>

                                <div className="w-20 text-right font-mono">
                                  <strong className="text-white text-xs">{d.percentage}%</strong>
                                  <span className="text-[10px] text-slate-400 block">({d.count} siswa)</span>
                                </div>

                                <div className="w-24 text-right">
                                  {d.isCorrect ? (
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                                      KUNCI BENAR
                                    </span>
                                  ) : d.isEffective ? (
                                    <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-full font-semibold">
                                      ✓ Pengecoh Baik
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-full font-semibold">
                                      ✗ Kurang Efektif
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* RECOMMENDATION NOTE */}
                      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-slate-300">
                        <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white">Rekomendasi Tindak Lanjut:</strong> {item.recommendationNote}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
