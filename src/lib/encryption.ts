import CryptoJS from 'crypto-js';

const SECRET_SALT = 'SUMATIF_EXAM_SECURE_SALT_2026_PRO';

/**
 * Encrypts student answers object using AES-256
 */
export function encryptStudentAnswers(answers: Record<string, number>, passKey: string = 'SUMATIF_ENCRYPTION_KEY'): string {
  try {
    const jsonString = JSON.stringify(answers);
    const key = CryptoJS.SHA256(passKey + SECRET_SALT).toString();
    return CryptoJS.AES.encrypt(jsonString, key).toString();
  } catch (error) {
    console.error('Error encrypting answers:', error);
    return '';
  }
}

/**
 * Decrypts AES-256 encrypted answers string back into object
 */
export function decryptStudentAnswers(cipherText: string, passKey: string = 'SUMATIF_ENCRYPTION_KEY'): Record<string, number> {
  try {
    if (!cipherText) return {};
    const key = CryptoJS.SHA256(passKey + SECRET_SALT).toString();
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedData ? JSON.parse(decryptedData) : {};
  } catch (error) {
    console.error('Error decrypting answers:', error);
    return {};
  }
}

/**
 * Generates SHA-256 Checksum for student answer payload verification
 */
export function generatePayloadChecksum(studentName: string, nis: string, answers: Record<string, number>): string {
  const sortedKeys = Object.keys(answers).sort();
  const answerString = sortedKeys.map(k => `${k}:${answers[k]}`).join('|');
  const payload = `${studentName.trim().toLowerCase()}_${nis.trim()}_${answerString}_${SECRET_SALT}`;
  return CryptoJS.SHA256(payload).toString();
}

/**
 * Verifies if payload has been tampered with
 */
export function verifyPayloadChecksum(studentName: string, nis: string, answers: Record<string, number>, checksum: string): boolean {
  const expected = generatePayloadChecksum(studentName, nis, answers);
  return expected === checksum;
}
