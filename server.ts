import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to initialize server-side Gemini client
const getGenAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
};

// API Endpoint: Generate Multiple Choice Questions using Gemini 3.6 Flash
app.post('/api/ai/generate-questions', async (req, res) => {
  try {
    const { subject, gradeClass, topic, count = 5, difficulty = 'Sedang', additionalPrompt = '' } = req.body;

    if (!subject || !topic) {
      return res.status(400).json({ error: 'Mata pelajaran dan topik materi wajib diisi.' });
    }

    const ai = getGenAIClient();

    const systemPrompt = `Anda adalah seorang pakar pembuat soal dan penyusun kurikulum pendidikan di Indonesia.
Buatkan ${count} soal pilihan ganda berkualitas tinggi untuk asesmen siswa.
Detail Permintaan:
- Mata Pelajaran: ${subject}
- Tingkat / Kelas: ${gradeClass || 'Umum'}
- Topik / Materi: ${topic}
- Tingkat Kesulitan: ${difficulty}
${additionalPrompt ? `- Catatan Khusus: ${additionalPrompt}` : ''}

Ketentuan Khusus Soal:
1. Setiap soal WAJIB memiliki persis 5 opsi jawaban (indeks 0=Opsi A, 1=Opsi B, 2=Opsi C, 3=Opsi D, 4=Opsi E).
2. Opsi jawaban harus logis, jelas, dan memuat pengecoh (distractor) yang berkualitas.
3. Sertakan indeks jawaban yang benar (correctAnswer) yaitu angka integer dari 0 sampai 4.
4. Sertakan penjelasan / pembahasan ringkas dan padat (explanation) mengapa jawaban tersebut benar.
5. Tentukan bobot poin per soal (misal: 20 poin per soal untuk 5 soal agar total 100).
6. Bahasa yang digunakan adalah Bahasa Indonesia standar pendidikan.
7. PENULISAN RUMUS, SIMBOL, DAN BENTUK MATEMATIKA / FISIKA / KIMIA:
   - Setiap rumus, persamaan, variabel, pecahan, akar, eksponen, logaritma, matriks, atau bentuk geometri (seperti $\\triangle ABC$, $\\angle A$, $g_1 \\parallel g_2$, $g_1 \\perp g_2$, $30^\\circ$, $\\vec{v}$, $\\alpha$, $\\beta$, $\\pi$, $\\theta$, $\\le$, $\\ge$, $\\neq$, $\\pm$, $\\sqrt{x}$, $\\frac{a}{b}$, $y^2 = 8x$, $2x + y - 3 = 0$) WAJIB dibungkus secara terpisah dengan pembatas $ ... $ untuk inline math atau $$ ... $$ untuk display math.
   - DILARANG MENGGABUNGKAN dua rumus/persamaan berbeda tanpa kata penghubung Bahasa Indonesia (seperti "dan", "yang tegak lurus dengan", "dengan gradien"). Contoh SALAH: "$y^2 = 8x 2x + y = 0$", Contoh BENAR: "$y^2 = 8x$ yang tegak lurus garis $2x + y - 3 = 0$".
   - Seluruh opsi jawaban (A, B, C, D, E) yang berupa angka, variabel, atau persamaan WAJIB dibungkus $ ... $ secara terpisah (contoh: "$x - 2y + 8 = 0$").
8. KEBERSIHAN OPSI JAWABAN:
   - Opsi jawaban hanya boleh memuat teks/rumus jawaban murni.
   - DILARANG KERAS menyertakan kata penutup, watermark, atau label acak seperti "trilogy", "opsi", "jawaban", dsb.`;

    const candidateModels = ['gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
    let response: any = null;
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: `Buatkan ${count} soal pilihan ganda tentang topik "${topic}" untuk mata pelajaran "${subject}" (${gradeClass}) tingkat kesulitan ${difficulty}.`,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              description: 'Daftar soal pilihan ganda',
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING, description: 'Pertanyaan / teks soal' },
                  options: {
                    type: Type.ARRAY,
                    description: 'Array berisi tepat 5 string opsi jawaban (A, B, C, D, E)',
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.INTEGER, description: 'Indeks jawaban benar (0=A, 1=B, 2=C, 3=D, 4=E)' },
                  points: { type: Type.INTEGER, description: 'Poin untuk soal ini' },
                  explanation: { type: Type.STRING, description: 'Pembahasan jawaban' }
                },
                required: ['questionText', 'options', 'correctAnswer', 'points', 'explanation']
              }
            }
          }
        });
        if (response && response.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} error, trying next fallback:`, err?.message || err);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('Gagal mendapatkan respon dari AI model.');
    }

    const jsonText = response.text || '[]';
    const parsedQuestions = JSON.parse(jsonText);

    const sanitizeOption = (text: any): string => {
      if (!text) return '';
      let s = String(text).trim();
      // Remove leading option letters like "A. ", "B) ", "(A) ", "A: "
      s = s.replace(/^[A-Ea-e][\.\)\:\-]\s*/, '');
      // Strip hallucinated words like "trilogy", "trilogies"
      s = s.replace(/\s*\btrilog(?:y|ies)\b\s*/gi, ' ');
      return s.trim();
    };

    const formattedQuestions = parsedQuestions.map((q: any, idx: number) => {
      let rawOpts = Array.isArray(q.options) ? q.options : [];
      let opts = rawOpts.map((opt: any) => sanitizeOption(opt));

      if (opts.length < 5) {
        while (opts.length < 5) {
          opts.push(`Pilihan ${String.fromCharCode(65 + opts.length)}`);
        }
      } else if (opts.length > 5) {
        opts = opts.slice(0, 5);
      }

      const validCorrect = typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 5 
        ? q.correctAnswer 
        : 0;

      let cleanExplanation = String(q.explanation || '')
        .replace(/\s*\btrilog(?:y|ies)\b\s*/gi, ' ')
        .trim();

      let cleanQuestionText = String(q.questionText || `Soal ${idx + 1}`)
        .replace(/\s*\btrilog(?:y|ies)\b\s*/gi, ' ')
        .trim();

      return {
        id: `ai_q_${Date.now()}_${idx + 1}`,
        questionText: cleanQuestionText,
        options: opts,
        correctAnswer: validCorrect,
        points: Number(q.points) || Math.round(100 / count),
        explanation: cleanExplanation
      };
    });

    return res.json({ success: true, questions: formattedQuestions });
  } catch (error: any) {
    console.error('Error generating AI questions:', error);
    return res.status(500).json({ 
      error: error?.message || 'Gagal membuat soal otomatis dengan AI. Pastikan GEMINI_API_KEY terkonfigurasi.' 
    });
  }
});

// Start Express Server with Vite Dev / Static Middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
