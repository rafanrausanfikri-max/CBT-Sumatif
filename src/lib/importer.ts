import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { Question } from '../types';
import { compressBase64Image } from './imageUtils';

/**
 * Helper to get child element by local tag name (ignoring XML namespace prefix)
 */
function getChildByLocalName(parent: Element, name: string): Element | null {
  for (let i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];
    const local = child.localName || child.tagName.replace(/.*:/, '');
    if (local.toLowerCase() === name.toLowerCase()) {
      return child;
    }
  }
  return null;
}

/**
 * Convert Office Math Markup Language (OMML) XML tree to LaTeX
 */
function ommlToLatex(element: Element): string {
  let result = '';

  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.nodeValue || '';
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as Element;
    const tagName = el.localName || el.tagName.replace(/^m:/, '');

    switch (tagName.toLowerCase()) {
      case 't': // Math text run
      case 'w:t':
        result += el.textContent || '';
        break;

      case 'r': // Run container
      case 'omathpara':
      case 'omath':
      case 'e': // Base/element container
      case 'num':
      case 'den':
      case 'sup':
      case 'sub':
      case 'lim':
      case 'deg':
      case 'fname':
        result += ommlToLatex(el);
        break;

      case 'f': { // Fraction
        const numEl = getChildByLocalName(el, 'num');
        const denEl = getChildByLocalName(el, 'den');
        const numText = numEl ? ommlToLatex(numEl) : '';
        const denText = denEl ? ommlToLatex(denEl) : '';
        result += `\\frac{${numText}}{${denText}}`;
        break;
      }

      case 'ssup': { // Superscript
        const baseEl = getChildByLocalName(el, 'e');
        const supEl = getChildByLocalName(el, 'sup');
        const baseText = baseEl ? ommlToLatex(baseEl) : '';
        const supText = supEl ? ommlToLatex(supEl) : '';
        result += `{${baseText}}^{${supText}}`;
        break;
      }

      case 'ssub': { // Subscript
        const baseEl = getChildByLocalName(el, 'e');
        const subEl = getChildByLocalName(el, 'sub');
        const baseText = baseEl ? ommlToLatex(baseEl) : '';
        const subText = subEl ? ommlToLatex(subEl) : '';
        result += `{${baseText}}_{${subText}}`;
        break;
      }

      case 'ssubsup': { // Subscript + Superscript
        const baseEl = getChildByLocalName(el, 'e');
        const subEl = getChildByLocalName(el, 'sub');
        const supEl = getChildByLocalName(el, 'sup');
        const baseText = baseEl ? ommlToLatex(baseEl) : '';
        const subText = subEl ? ommlToLatex(subEl) : '';
        const supText = supEl ? ommlToLatex(supEl) : '';
        result += `{${baseText}}_{${subText}}^{${supText}}`;
        break;
      }

      case 'rad': { // Radical / Root
        const degEl = getChildByLocalName(el, 'deg');
        const baseEl = getChildByLocalName(el, 'e');
        const degText = degEl ? ommlToLatex(degEl).trim() : '';
        const baseText = baseEl ? ommlToLatex(baseEl) : '';
        if (degText) {
          result += `\\sqrt[${degText}]{${baseText}}`;
        } else {
          result += `\\sqrt{${baseText}}`;
        }
        break;
      }

      case 'nary': { // Integral / Summation / Product
        const naryPr = getChildByLocalName(el, 'naryPr');
        let symbol = '\\sum';
        if (naryPr) {
          const chr = getChildByLocalName(naryPr, 'chr');
          const val = chr?.getAttribute('m:val') || chr?.getAttribute('val');
          if (val === '∫') symbol = '\\int';
          else if (val === '∬') symbol = '\\iint';
          else if (val === '∭') symbol = '\\iiint';
          else if (val === '∮') symbol = '\\oint';
          else if (val === '∏') symbol = '\\prod';
          else if (val === '∑') symbol = '\\sum';
        }
        const subEl = getChildByLocalName(el, 'sub');
        const supEl = getChildByLocalName(el, 'sup');
        const eEl = getChildByLocalName(el, 'e');
        const subText = subEl ? ommlToLatex(subEl) : '';
        const supText = supEl ? ommlToLatex(supEl) : '';
        const eText = eEl ? ommlToLatex(eEl) : '';

        let limits = '';
        if (subText) limits += `_{${subText}}`;
        if (supText) limits += `^{${supText}}`;
        result += `${symbol}${limits}{${eText}}`;
        break;
      }

      case 'd': { // Delimiter / Brackets
        const dPr = getChildByLocalName(el, 'dPr');
        let begChr = '(';
        let endChr = ')';
        if (dPr) {
          const beg = getChildByLocalName(dPr, 'begChr');
          const end = getChildByLocalName(dPr, 'endChr');
          if (beg) begChr = beg.getAttribute('m:val') || beg.getAttribute('val') || '(';
          if (end) endChr = end.getAttribute('m:val') || end.getAttribute('val') || ')';
        }
        const eEl = getChildByLocalName(el, 'e');
        const eText = eEl ? ommlToLatex(eEl) : '';
        result += `\\left${begChr} ${eText} \\right${endChr}`;
        break;
      }

      case 'func': { // Function e.g. sin, cos, lim
        const fNameEl = getChildByLocalName(el, 'fName');
        const eEl = getChildByLocalName(el, 'e');
        const fNameText = fNameEl ? ommlToLatex(fNameEl) : '';
        const eText = eEl ? ommlToLatex(eEl) : '';
        result += `${fNameText}{${eText}}`;
        break;
      }

      case 'limlow': { // Limit lower e.g. lim_{x -> 0}
        const eEl = getChildByLocalName(el, 'e');
        const limEl = getChildByLocalName(el, 'lim');
        const eText = eEl ? ommlToLatex(eEl) : '';
        const limText = limEl ? ommlToLatex(limEl) : '';
        result += `${eText}_{${limText}}`;
        break;
      }

      case 'm':
      case 'matrix': { // Matrix
        const rows = el.getElementsByTagNameNS('*', 'mr');
        const matrixRows: string[] = [];
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].getElementsByTagNameNS('*', 'e');
          const cellTexts: string[] = [];
          for (let c = 0; c < cells.length; c++) {
            cellTexts.push(ommlToLatex(cells[c]));
          }
          matrixRows.push(cellTexts.join(' & '));
        }
        result += `\\begin{matrix}${matrixRows.join(' \\\\ ')}\\end{matrix}`;
        break;
      }

      case 'acc': { // Accent e.g. hat, bar, vec
        const accPr = getChildByLocalName(el, 'accPr');
        let accCmd = '\\hat';
        if (accPr) {
          const chr = getChildByLocalName(accPr, 'chr');
          const val = chr?.getAttribute('m:val') || chr?.getAttribute('val');
          if (val === '̅' || val === '-') accCmd = '\\bar';
          else if (val === '⃗') accCmd = '\\vec';
          else if (val === '̃') accCmd = '\\tilde';
          else if (val === '̂') accCmd = '\\hat';
        }
        const eEl = getChildByLocalName(el, 'e');
        const eText = eEl ? ommlToLatex(eEl) : '';
        result += `${accCmd}{${eText}}`;
        break;
      }

      default:
        result += ommlToLatex(el);
        break;
    }
  }

  return result;
}

/**
 * Extract image relationships (rId -> Data URL) from a .docx ZIP container
 */
async function getDocxImageMap(zip: JSZip): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return imageMap;

  try {
    const relsXmlText = await relsFile.async('string');
    const parser = new DOMParser();
    const relsDoc = parser.parseFromString(relsXmlText, 'text/xml');
    const relationships = relsDoc.getElementsByTagName('Relationship');

    for (let i = 0; i < relationships.length; i++) {
      const rel = relationships[i];
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target') || '';
      const type = rel.getAttribute('Type') || '';

      if (id && target && (type.includes('image') || target.toLowerCase().includes('media/'))) {
        let zipPath = target;
        if (!zipPath.startsWith('word/')) {
          zipPath = 'word/' + zipPath.replace(/^\.\//, '').replace(/^\//, '');
        }

        let fileInZip = zip.file(zipPath) || zip.file(target) || zip.file(target.replace(/^\//, ''));
        if (!fileInZip) {
          const fileName = target.split('/').pop();
          if (fileName) {
            fileInZip = zip.file(`word/media/${fileName}`) || zip.file(`media/${fileName}`);
          }
        }

        if (fileInZip) {
          const base64 = await fileInZip.async('base64');
          const ext = target.split('.').pop()?.toLowerCase() || 'png';
          let mime = 'image/png';
          if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
          else if (ext === 'gif') mime = 'image/gif';
          else if (ext === 'svg') mime = 'image/svg+xml';
          else if (ext === 'webp') mime = 'image/webp';

          const rawDataUrl = `data:${mime};base64,${base64}`;
          const compressed = await compressBase64Image(rawDataUrl, 800, 0.75);
          imageMap.set(id, compressed);
        }
      }
    }
  } catch (err) {
    console.warn('Error reading docx image relationships:', err);
  }

  return imageMap;
}

/**
 * Extract text lines from .docx file including equations (OMML) and images using JSZip & DOMParser
 */
async function readDocxLinesWithEquations(file: File): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);
  const docXmlFile = zip.file('word/document.xml');

  if (!docXmlFile) {
    throw new Error('File word/document.xml tidak ditemukan di dalam .docx');
  }

  // Load image relationships map
  const imageMap = await getDocxImageMap(zip);

  const xmlText = await docXmlFile.async('string');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const lines: string[] = [];
  const paragraphs = xmlDoc.getElementsByTagNameNS('*', 'p');

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    let lineText = '';

    // Check for image references in paragraph
    const paragraphImages: string[] = [];
    if (imageMap.size > 0) {
      const allElementsInP = [p, ...Array.from(p.getElementsByTagName('*'))];
      for (const el of allElementsInP) {
        for (let a = 0; a < el.attributes.length; a++) {
          const attrVal = el.attributes[a].value;
          if (imageMap.has(attrVal)) {
            const dataUrl = imageMap.get(attrVal)!;
            if (!paragraphImages.includes(dataUrl)) {
              paragraphImages.push(dataUrl);
            }
          }
        }
      }
    }

    for (let j = 0; j < p.childNodes.length; j++) {
      const child = p.childNodes[j] as Element;
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const localName = (child.localName || child.tagName.replace(/.*:/, '')).toLowerCase();

      if (localName === 'r') {
        // Text run
        const tElems = child.getElementsByTagNameNS('*', 't');
        for (let k = 0; k < tElems.length; k++) {
          lineText += tElems[k].textContent || '';
        }
      } else if (localName === 'omath' || localName === 'omathpara') {
        // OMML Math Equation
        const latex = ommlToLatex(child).trim();
        if (latex) {
          lineText += ` $${latex}$ `;
        }
      } else if (localName === 'hyperlink') {
        const tElems = child.getElementsByTagNameNS('*', 't');
        for (let k = 0; k < tElems.length; k++) {
          lineText += tElems[k].textContent || '';
        }
      }
    }

    let trimmed = lineText.trim();

    // Append images found in this paragraph
    if (paragraphImages.length > 0) {
      const imgTags = paragraphImages.map(imgUrl => `![Gambar](${imgUrl})`).join('\n');
      if (trimmed) {
        trimmed = `${trimmed}\n${imgTags}`;
      } else {
        trimmed = imgTags;
      }
    }

    if (trimmed) {
      lines.push(trimmed);
    }
  }

  return lines;
}

/**
 * Parse Excel file (.xlsx, .xls, .csv) into Questions
 */
export async function parseExcelQuestions(file: File): Promise<Question[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        const questions: Question[] = [];

        jsonRows.forEach((row, index) => {
          const getVal = (keys: string[]) => {
            for (const k of keys) {
              const matchedKey = Object.keys(row).find(
                rk => rk.trim().toLowerCase() === k.toLowerCase()
              );
              if (matchedKey && row[matchedKey] !== undefined) {
                return String(row[matchedKey]).trim();
              }
            }
            return '';
          };

          const questionText = getVal(['Soal', 'Question', 'Pertanyaan', 'Teks Soal']);
          if (!questionText) return;

          const optA = getVal(['Opsi A', 'Option A', 'A', 'Pilihan A']);
          const optB = getVal(['Opsi B', 'Option B', 'B', 'Pilihan B']);
          const optC = getVal(['Opsi C', 'Option C', 'C', 'Pilihan C']);
          const optD = getVal(['Opsi D', 'Option D', 'D', 'Pilihan D']);
          const optE = getVal(['Opsi E', 'Option E', 'E', 'Pilihan E']);

          const options = [optA, optB, optC, optD, optE].filter(o => o.length > 0);
          if (options.length < 2) return;

          const keyRaw = getVal(['Kunci Jawaban', 'Kunci', 'Answer', 'Jawaban', 'Key']);
          let correctAnswer = 0;
          if (keyRaw) {
            const upperKey = keyRaw.trim().toUpperCase();
            if (upperKey === 'A' || upperKey === '1') correctAnswer = 0;
            else if (upperKey === 'B' || upperKey === '2') correctAnswer = 1;
            else if (upperKey === 'C' || upperKey === '3') correctAnswer = 2;
            else if (upperKey === 'D' || upperKey === '4') correctAnswer = 3;
            else if (upperKey === 'E' || upperKey === '5') correctAnswer = 4;
            else {
              const parsedInt = parseInt(keyRaw);
              if (!isNaN(parsedInt) && parsedInt >= 0 && parsedInt < options.length) {
                correctAnswer = parsedInt;
              }
            }
          }

          const pointsRaw = getVal(['Bobot', 'Poin', 'Points', 'Nilai']);
          const points = pointsRaw ? parseFloat(pointsRaw) || 10 : 10;
          const explanation = getVal(['Pembahasan', 'Explanation', 'Keterangan']);
          const imageUrl = getVal(['Gambar', 'Image', 'Foto', 'URL Gambar', 'ImageUrl']);

          questions.push({
            id: `q_imp_${Date.now()}_${index}`,
            questionText,
            options,
            correctAnswer,
            points,
            explanation,
            imageUrl: imageUrl || undefined
          });
        });

        resolve(questions);
      } catch (err) {
        reject(new Error('Gagal membaca file Excel. Pastikan format file sesuai template.'));
      }
    };
    reader.onerror = () => reject(new Error('Error membaca file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse Word file (.docx) into Questions with full Equation and Image support
 */
export async function parseWordQuestions(file: File): Promise<Question[]> {
  try {
    const lines = await readDocxLinesWithEquations(file);
    if (lines.length > 0) {
      const fullText = lines.join('\n');
      const questions = parseTextToQuestions(fullText);
      if (questions.length > 0) {
        return questions;
      }
    }
  } catch (err) {
    console.warn('Gagal membaca persamaan/gambar docx via JSZip, menggunakan fallback mammoth:', err);
  }

  // Fallback to mammoth convertToHtml with images
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer }, {
      convertImage: mammoth.images.imgElement((image) => {
        return image.read("base64").then((imageBuffer) => {
          return {
            src: `data:${image.contentType};base64,${imageBuffer}`
          };
        });
      })
    });

    const htmlText = result.value;
    if (htmlText.trim()) {
      return parseTextToQuestions(htmlText);
    }
  } catch (mErr) {
    console.warn('Mammoth HTML fallback error:', mErr);
  }

  // Final fallback to raw text
  const arrayBuffer = await file.arrayBuffer();
  const rawResult = await mammoth.extractRawText({ arrayBuffer });
  if (!rawResult.value.trim()) {
    throw new Error('File Word kosong atau tidak dapat dibaca.');
  }

  return parseTextToQuestions(rawResult.value);
}

/**
 * Smart Text Parser for Questions (used for Word or pasted text)
 */
export function parseTextToQuestions(text: string): Question[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const questions: Question[] = [];

  let currentQuestionText = '';
  let currentOptions: string[] = [];
  let currentCorrect = 0;
  let currentExplanation = '';
  let currentPoints = 10;
  let currentImageUrl: string | undefined = undefined;

  const saveCurrentQuestion = () => {
    if (currentQuestionText && currentOptions.length >= 2) {
      questions.push({
        id: `q_word_${Date.now()}_${questions.length}`,
        questionText: currentQuestionText,
        options: [...currentOptions],
        correctAnswer: currentCorrect,
        points: currentPoints,
        explanation: currentExplanation,
        imageUrl: currentImageUrl
      });
    }
    currentQuestionText = '';
    currentOptions = [];
    currentCorrect = 0;
    currentExplanation = '';
    currentPoints = 10;
    currentImageUrl = undefined;
  };

  const optionRegex = /^([A-Ea-e])[\.\)\:]\s*(.+)/;
  const questionNumRegex = /^(\d+)[\.\)]\s*(.+)/;
  const answerKeyRegex = /^(Kunci|Jawaban|Kunci Jawaban|Key)[\:\=]\s*([A-Ea-e1-5])/i;
  const explanationRegex = /^(Pembahasan|Penjelasan|Explanation)[\:\=]\s*(.+)/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract any image URL if line contains an image
    const imgMatch = line.match(/(?:!\[.*?\]\((data:image\/[^\)]+|https?:\/\/[^\)]+)\))|(?:\[IMG:(data:image\/[^\]]+|https?:\/\/[^\]]+)\])|(?:<img\s+[^>]*src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["'][^>]*\/?>)/i);
    if (imgMatch) {
      const foundUrl = imgMatch[1] || imgMatch[2] || imgMatch[3];
      if (foundUrl && !currentImageUrl) {
        currentImageUrl = foundUrl;
      }
    }

    // Check key line
    const keyMatch = line.match(answerKeyRegex);
    if (keyMatch) {
      const char = keyMatch[2].toUpperCase();
      if (char === 'A' || char === '1') currentCorrect = 0;
      else if (char === 'B' || char === '2') currentCorrect = 1;
      else if (char === 'C' || char === '3') currentCorrect = 2;
      else if (char === 'D' || char === '4') currentCorrect = 3;
      else if (char === 'E' || char === '5') currentCorrect = 4;
      continue;
    }

    // Check explanation line
    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      currentExplanation = expMatch[2];
      continue;
    }

    // Check Option line (e.g., A. Opsi 1 or *A. Kunci)
    const isStarredKey = line.startsWith('*');
    const cleanLine = isStarredKey ? line.substring(1).trim() : line;
    const optMatch = cleanLine.match(optionRegex);

    if (optMatch) {
      const letter = optMatch[1].toUpperCase();
      const optionText = optMatch[2].trim();
      const optIndex = currentOptions.length;
      currentOptions.push(optionText);

      if (isStarredKey) {
        currentCorrect = optIndex;
      }
      continue;
    }

    // Check Question number line (e.g. 1. Berapakah...)
    const qMatch = line.match(questionNumRegex);
    if (qMatch) {
      if (currentQuestionText) {
        saveCurrentQuestion();
      }
      currentQuestionText = qMatch[2].trim();
      continue;
    }

    // If we have options, additional lines might be explanation or details
    if (currentOptions.length > 0) {
      if (line.toLowerCase().includes('pembahasan:')) {
        currentExplanation = line.replace(/pembahasan:/i, '').trim();
      }
    } else {
      // Append to question text
      if (currentQuestionText) {
        currentQuestionText += '\n' + line;
      } else {
        currentQuestionText = line;
      }
    }
  }

  // Save last question
  saveCurrentQuestion();

  return questions;
}

/**
 * Generate Excel Template for Teachers
 */
export function downloadExcelTemplate() {
  const data = [
    {
      'No': 1,
      'Soal': 'Berapakah hasil dari 15 + 25?',
      'Opsi A': '30',
      'Opsi B': '35',
      'Opsi C': '40',
      'Opsi D': '45',
      'Opsi E': '50',
      'Kunci Jawaban': 'C',
      'Bobot': 10,
      'Pembahasan': '15 ditambah 25 sama dengan 40.',
      'Gambar': ''
    },
    {
      'No': 2,
      'Soal': 'Jika f(x) = x^2 + 2x - 3, berapakah f(3)?',
      'Opsi A': '12',
      'Opsi B': '15',
      'Opsi C': '18',
      'Opsi D': '20',
      'Opsi E': '24',
      'Kunci Jawaban': 'A',
      'Bobot': 10,
      'Pembahasan': 'f(3) = (3)^2 + 2(3) - 3 = 9 + 6 - 3 = 12.',
      'Gambar': ''
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Soal');
  XLSX.writeFile(workbook, 'Template_Soal_Asesmen_Sumatif.xlsx');
}

/**
 * Generate Word (.docx) Template for Teachers
 */
export async function downloadWordTemplate() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'TEMPLATE SOAL ASESMEN SUMATIF (MICROSOFT WORD .DOCX)',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Petunjuk: ',
                bold: true,
              }),
              new TextRun({
                text: 'Tulis nomor diikuti soal (bisa menyisipkan gambar/foto dan persamaan matematika Word Equation), lalu pilihan A-E. Sertakan \'Kunci: A/B/C/D/E\' dan \'Pembahasan:\' di bawah setiap soal.',
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: '1. Ibu kota negara Republik Indonesia saat ini adalah...',
                bold: true,
              }),
            ],
          }),
          new Paragraph({ text: 'A. Surabaya' }),
          new Paragraph({ text: 'B. Bandung' }),
          new Paragraph({ text: 'C. Jakarta' }),
          new Paragraph({ text: 'D. Medan' }),
          new Paragraph({ text: 'E. Makassar' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Kunci: C', bold: true }),
            ],
          }),
          new Paragraph({ text: 'Pembahasan: Jakarta adalah ibu kota negara Indonesia.' }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: '2. Berapakah hasil turunan pertama dari fungsi f(x) = 3x^2 + 5x - 2?',
                bold: true,
              }),
            ],
          }),
          new Paragraph({ text: 'A. 6x + 5' }),
          new Paragraph({ text: 'B. 3x + 5' }),
          new Paragraph({ text: 'C. 6x - 2' }),
          new Paragraph({ text: 'D. 3x^2 + 5' }),
          new Paragraph({ text: 'E. 6x' }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Kunci: A', bold: true }),
            ],
          }),
          new Paragraph({ text: 'Pembahasan: Turunan dari 3x^2 adalah 6x, dan turunan dari 5x adalah 5.' }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Template_Soal_Word.docx';
  a.click();
  URL.revokeObjectURL(url);
}
