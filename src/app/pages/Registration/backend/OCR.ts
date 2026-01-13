import { createWorker, type Worker, type PSM } from 'tesseract.js';

export interface OCRResult {
  name?: string;
  department?: string;
  batch?: string;
  studentId?: string;
  rawText?: string;
  success: boolean;
  error?: string;
}

/**
 * Convert a File object directly to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      resolve(base64data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract text from an image using Tesseract.js OCR
 */
export async function extractTextFromImage(imageBase64: string): Promise<OCRResult> {
  let worker: Worker | null = null;
  
  try {
    // Create worker for English language
    worker = await createWorker('eng');
    
    // Configure worker for better text recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/-:. &',
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: 6 as unknown as PSM, // Use number 6, cast to PSM type
    });
    
    // Perform OCR on the image
    const { data: { text } } = await worker.recognize(imageBase64);
    
    console.log('Raw OCR Text:', text);
    
    // Parse the extracted text for student information
    return parseMISTStudentInfo(text);
    
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process image',
    };
  } finally {
    // Clean up worker
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Parse MIST ID card specific format
 * Expected format:
 * MILITARY INSTITUTE OF SCIENCE & TECHNOLOGY
 * (other header lines...)
 * ---
 * Student Name
 * Dept - Batch
 * Session : YYYY-YY
 * Roll No : XXXXXXXX
 */
function parseMISTStudentInfo(text: string): OCRResult {
  const result: OCRResult = {
    success: true,
    rawText: text,
  };
  
  // Split text into lines and clean them
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  console.log('OCR Lines:', lines);
  
  // Find key sections
  let studentNameFound = false;
  let deptBatchFound = false;
  let rollNoFound = false;
  
  // Look for patterns in the text
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 1. Look for Student ID (Roll No)
    const rollNoMatch = line.match(/(?:Roll\s*No\.?\s*:?)\s*(\d{5,})/i);
    if (rollNoMatch && rollNoMatch[1]) {
      result.studentId = rollNoMatch[1].trim();
      rollNoFound = true;
      console.log('Found Roll No:', result.studentId);
    }
    
    // 2. Look for Dept - Batch pattern (like "CSE - 23")
    const deptBatchMatch = line.match(/(CSE|EECE|CE|ME|NSE|NAME|EWCE|PME|BME|ARCHI)\s*[-:]\s*(\d{2,4})/i);
    if (deptBatchMatch) {
      result.department = deptBatchMatch[1].toUpperCase().trim();
      let batch = deptBatchMatch[2].trim();
      result.batch = batch;
      deptBatchFound = true;
      console.log('Found Dept/Batch:', result.department, result.batch);
      
      // The line BEFORE dept-batch is likely the student name
      if (i > 0 && lines[i-1]) {
        const potentialName = lines[i-1].trim();
        // Check if this looks like a name (not empty, not university name)
        if (potentialName && 
            !potentialName.toUpperCase().includes('MILITARY') &&
            !potentialName.toUpperCase().includes('INSTITUTE') &&
            !potentialName.toUpperCase().includes('TECHNOLOGY') &&
            !potentialName.toUpperCase().includes('BANGLADESH') &&
            potentialName.length > 2) {
          result.name = potentialName;
          studentNameFound = true;
          console.log('Found Name from line before dept:', result.name);
        }
      }
    }
    
    // 3. Look for Session pattern (can help locate student info)
    const sessionMatch = line.match(/Session\s*:?\s*(\d{4}-\d{2,4})/i);
    if (sessionMatch && !deptBatchFound) {
      // Session found, check the lines around it
      // Name should be 2 lines before session
      if (i >= 2) {
        const nameCandidate = lines[i-2].trim();
        if (nameCandidate && 
            !nameCandidate.toUpperCase().includes('MILITARY') &&
            !nameCandidate.toUpperCase().includes('INSTITUTE')) {
          result.name = nameCandidate;
          studentNameFound = true;
        }
      }
      
      // Dept-Batch should be 1 line before session
      if (i >= 1) {
        const deptBatchCandidate = lines[i-1].trim();
        const deptBatchMatch2 = deptBatchCandidate.match(/(CSE|EECE|CE|ME|NSE|NAME|EWCE|PME|BME|ARCHI)\s*[-:]\s*(\d{2,4})/i);
        if (deptBatchMatch2) {
          result.department = deptBatchMatch2[1].toUpperCase().trim();
          let batch = deptBatchMatch2[2].trim();
          if (batch.length === 2) {
            batch = '20' + batch;
          }
          result.batch = batch;
          deptBatchFound = true;
        }
      }
    }
  }
  
  // Alternative name search if not found yet
  if (!studentNameFound) {
    // Look for a line that looks like a person's name
    for (const line of lines) {
      // Name pattern: starts with capital letter, contains letters and spaces
      const namePattern = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/;
      if (namePattern.test(line) && 
          line.length > 3 && 
          line.length < 50 &&
          !line.includes('INSTITUTE') &&
          !line.includes('TECHNOLOGY') &&
          !line.includes('BANGLADESH') &&
          !line.includes('MILITARY') &&
          !line.includes('SCIENCE')) {
        result.name = line;
        studentNameFound = true;
        break;
      }
    }
  }
  
  // Alternative dept search if not found yet
  if (!deptBatchFound) {
    // Look for department abbreviations anywhere in text
    for (const line of lines) {
      const deptMatch = line.match(/\b(CSE|EECE|CE|ME|NSE|NAME|EWCE|PME|BME|ARCHI)\b/i);
      if (deptMatch) {
        result.department = deptMatch[1].toUpperCase();
        // Try to find batch in the same line
        const batchMatch = line.match(/\b(\d{2,4})\b/);
        if (batchMatch) {
          let batch = batchMatch[1];
          if (batch.length === 2) {
            batch = '20' + batch;
          }
          result.batch = batch;
        }
        deptBatchFound = true;
        break;
      }
    }
  }
  
  // Alternative student ID search if not found yet
  if (!rollNoFound) {
    // Look for any 8-9 digit number (typical MIST student IDs)
    for (const line of lines) {
      const idMatch = line.match(/\b(\d{8,9})\b/);
      if (idMatch) {
        result.studentId = idMatch[1];
        rollNoFound = true;
        break;
      }
    }
  }
  
  console.log('Final parsed result:', result);
  
  return result;
}

/**
 * Alternative: Enhanced parsing with multiple patterns
 */
export function parseStudentInfoAdvanced(text: string): OCRResult {
  const result: OCRResult = {
    success: true,
    rawText: text,
  };
  
  // Name patterns
  const namePatterns = [
    /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/, // Simple name format
  ];
  
  for (const pattern of namePatterns) {
    const matches = text.match(new RegExp(pattern, 'gm'));
    if (matches) {
      // Filter out false positives (university name, etc.)
      const filtered = matches.filter(name => 
        !name.toUpperCase().includes('MILITARY') &&
        !name.toUpperCase().includes('INSTITUTE') &&
        !name.toUpperCase().includes('TECHNOLOGY') &&
        !name.toUpperCase().includes('BANGLADESH') &&
        name.length > 3 && name.length < 50
      );
      if (filtered.length > 0) {
        result.name = filtered[0].trim();
        break;
      }
    }
  }
  
  // Department patterns
  const deptPatterns = [
    /\b(CSE|EECE|CE|ME|NSE|NAME|EWCE|PME|BME|ARCHI)\b/i,
  ];
  
  for (const pattern of deptPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.department = match[1].toUpperCase();
      break;
    }
  }
  
  // Batch patterns
  const batchPatterns = [
    /(?:Batch|-\s*)(\d{2,4})/i,
    /\b(19|20)\d{2}\b/, // 4-digit years starting with 19 or 20
  ];
  
  for (const pattern of batchPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let batch = match[1];
      if (batch.length === 2) {
        batch = '20' + batch;
      }
      result.batch = batch;
      break;
    }
  }
  
  // Student ID patterns
  const idPatterns = [
    /Roll\s*No\.?\s*:?\s*(\d{8,9})/i,
    /\b\d{8,9}\b/, // 8-9 digit numbers
  ];
  
  for (const pattern of idPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      result.studentId = match[1];
      break;
    }
  }
  
  return result;
}