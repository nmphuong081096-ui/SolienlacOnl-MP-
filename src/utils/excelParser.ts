import * as XLSX from 'xlsx';
import { Student } from '../types';

// Normalize Vietnamese string: Unicode NFC, trimmed, collapsed whitespace
export function normalizeText(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ');
}

// Compare names ignoring case and minor diacritics issues if needed
export function cleanNameForMatch(name: string): string {
  return normalizeText(name).toLowerCase();
}

// Check if a cell indicates "CÓ" (Yes) for boarding or bus
export function parseBooleanField(value: unknown): boolean {
  if (!value) return false;
  const str = normalizeText(value).toLowerCase();
  const yesTokens = ['x', '✓', 'v', 'có', 'co', 'yes', 'true', '1', 'c'];
  return yesTokens.includes(str);
}

// Parse score: preserve decimal, convert comma to dot, blank -> null
export function parseScoreValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = normalizeText(value);
  if (
    str === '' ||
    str === '—' ||
    str === '-' ||
    str.toLowerCase() === 'vắng' ||
    str.toLowerCase() === 'k' ||
    str.toLowerCase() === 'p'
  ) {
    return null;
  }
  // Replace comma with period
  const normalizedNum = str.replace(',', '.');
  const num = parseFloat(normalizedNum);
  if (isNaN(num)) return null;
  return num;
}

// Normalize Date string to standard Vietnamese format DD/MM/YYYY
export function normalizeDateString(str: string): string {
  if (!str) return '';
  // Strip time portion if present (e.g. "15/04/2008 00:00:00" or "2008-04-15T00:00:00.000Z")
  let cleaned = str.split('T')[0].split(' ')[0].trim();
  cleaned = cleaned.replace(/[\.\-]/g, '/');

  // Case 1: YYYY/MM/DD
  const ymdMatch = cleaned.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Case 2: DD/MM/YYYY or D/M/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    let y = dmyMatch[3];
    if (y.length === 2) {
      y = (parseInt(y, 10) > 30 ? '19' : '20') + y;
    }
    return `${d}/${m}/${y}`;
  }

  // Case 3: 4-digit year only
  if (/^\d{4}$/.test(cleaned)) {
    return cleaned;
  }

  return cleaned;
}

// Robust date parser handling Excel serial numbers, formatted cells, and date strings
export function parseDobValue(value: unknown, cell?: XLSX.CellObject): string {
  if (value === null || value === undefined || value === '') return '';

  // 1. Check formatted cell text from Excel display
  if (cell && cell.w) {
    const w = String(cell.w).trim();
    if (
      /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(w) ||
      /\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}/.test(w)
    ) {
      return normalizeDateString(w);
    }
  }

  // 2. Check if Excel serial date number
  if (typeof value === 'number') {
    if (value > 1000 && value < 70000) {
      try {
        const dateInfo = XLSX.SSF.parse_date_code(value);
        if (dateInfo && dateInfo.y && dateInfo.m && dateInfo.d) {
          const d = String(dateInfo.d).padStart(2, '0');
          const m = String(dateInfo.m).padStart(2, '0');
          const y = String(dateInfo.y);
          return `${d}/${m}/${y}`;
        }
      } catch {
        // Continue fallback
      }
    }
  }

  // 3. Check if Date object
  if (value instanceof Date && !isNaN(value.getTime())) {
    const d = String(value.getUTCDate()).padStart(2, '0');
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const y = String(value.getUTCFullYear());
    return `${d}/${m}/${y}`;
  }

  // 4. Check if string is a numeric serial (e.g. "39554")
  const str = String(value).trim();
  if (/^\d{4,5}$/.test(str)) {
    const num = parseInt(str, 10);
    if (num > 1000 && num < 70000) {
      try {
        const dateInfo = XLSX.SSF.parse_date_code(num);
        if (dateInfo && dateInfo.y && dateInfo.m && dateInfo.d) {
          const d = String(dateInfo.d).padStart(2, '0');
          const m = String(dateInfo.m).padStart(2, '0');
          const y = String(dateInfo.y);
          return `${d}/${m}/${y}`;
        }
      } catch {
        // Continue fallback
      }
    }
  }

  return normalizeDateString(str);
}

export interface ParsedStudentRow {
  order: number;
  fullName: string;
  gender: string;
  dob?: string;
  parentPhone?: string;
  parentName?: string;
  address?: string;
  isBoarding: boolean;
  usesBus: boolean;
  rawRow: Record<string, unknown>;
}

export function parseStudentsFromExcel(fileData: ArrayBuffer): {
  success: boolean;
  headers: string[];
  rows: ParsedStudentRow[];
  error?: string;
} {
  try {
    const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return { success: false, headers: [], rows: [], error: 'File Excel không có sheet nào' };
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rawMatrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawMatrix || rawMatrix.length === 0) {
      return { success: false, headers: [], rows: [], error: 'File Excel trống' };
    }

    // 1. Find header row: search first 15 rows for keywords
    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(15, rawMatrix.length); r++) {
      const row = rawMatrix[r] || [];
      const rowStr = row.map((cell) => normalizeText(cell).toLowerCase()).join(' | ');
      if (
        (rowStr.includes('họ') && (rowStr.includes('tên') || rowStr.includes('ten'))) ||
        rowStr.includes('họ và tên') ||
        rowStr.includes('họ tên') ||
        rowStr.includes('học sinh')
      ) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      headerRowIndex = 0; // fallback to row 0
    }

    const headerRow = (rawMatrix[headerRowIndex] || []).map((h) => normalizeText(h));

    // Identify column indices
    let colFullName = -1;
    let colLastName = -1; // Họ / Họ lót / Họ đệm
    let colFirstName = -1; // Tên
    let colGender = -1;
    let colDob = -1;
    let colPhone = -1;
    let colParentName = -1;
    let colAddress = -1;
    let colBoarding = -1;
    let colBus = -1;

    headerRow.forEach((h, idx) => {
      const low = h.toLowerCase();
      if (
        low.includes('họ và tên') ||
        low.includes('họ tên') ||
        low === 'họ và tên học sinh' ||
        low === 'tên học sinh'
      ) {
        colFullName = idx;
      } else if (low === 'họ' || low === 'họ lót' || low === 'họ đệm' || low.includes('họ và chữ đệm')) {
        colLastName = idx;
      } else if (low === 'tên' || low === 'ten') {
        colFirstName = idx;
      } else if (low.includes('giới tính') || low === 'phái' || low === 'nam/nữ') {
        colGender = idx;
      } else if (low.includes('ngày sinh') || low.includes('năm sinh') || low === 'dob' || low === 'ns') {
        colDob = idx;
      } else if (
        low.includes('điện thoại') ||
        low.includes('sđt') ||
        low.includes('sdt') ||
        low.includes('phone') ||
        low.includes('liên hệ')
      ) {
        colPhone = idx;
      } else if (
        low.includes('phụ huynh') ||
        low.includes('cha mẹ') ||
        low.includes('mẹ') ||
        low.includes('cha')
      ) {
        if (!low.includes('sđt') && !low.includes('điện thoại')) {
          colParentName = idx;
        }
      } else if (low.includes('địa chỉ') || low.includes('nơi ở') || low.includes('thường trú')) {
        colAddress = idx;
      } else if (low.includes('bán trú') || low.includes('ban tru')) {
        colBoarding = idx;
      } else if (
        low.includes('xe bus') ||
        low.includes('xe buýt') ||
        low.includes('đưa đón') ||
        low.includes('bus')
      ) {
        colBus = idx;
      }
    });

    const parsedRows: ParsedStudentRow[] = [];

    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r] || [];
      // Combine name
      let fullName = '';
      if (colFullName >= 0 && row[colFullName]) {
        fullName = normalizeText(row[colFullName]);
      } else if (colLastName >= 0 && colFirstName >= 0) {
        const last = normalizeText(row[colLastName]);
        const first = normalizeText(row[colFirstName]);
        fullName = normalizeText(`${last} ${first}`);
      }

      // If no name found, skip row (could be empty or summary row)
      if (!fullName || fullName.length < 2) continue;

      // Gender
      let gender = 'Nam';
      if (colGender >= 0 && row[colGender]) {
        const g = normalizeText(row[colGender]).toLowerCase();
        if (g === 'nữ' || g === 'nu' || g === 'female' || g === 'f') {
          gender = 'Nữ';
        } else if (g === 'nam' || g === 'male' || g === 'm') {
          gender = 'Nam';
        } else {
          gender = normalizeText(row[colGender]);
        }
      }

      // DOB with robust parser & cell format checking
      let dob = '';
      if (colDob >= 0) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c: colDob })];
        dob = parseDobValue(row[colDob], cell);
      }

      // Phone
      let phone = '';
      if (colPhone >= 0 && row[colPhone]) {
        phone = normalizeText(row[colPhone]).replace(/[^\d+]/g, '');
      }

      // Parent name
      let parentName = '';
      if (colParentName >= 0 && row[colParentName]) {
        parentName = normalizeText(row[colParentName]);
      }

      // Address
      let address = '';
      if (colAddress >= 0 && row[colAddress]) {
        address = normalizeText(row[colAddress]);
      }

      // Boarding / Bus
      const isBoarding = colBoarding >= 0 ? parseBooleanField(row[colBoarding]) : false;
      const usesBus = colBus >= 0 ? parseBooleanField(row[colBus]) : false;

      const rawRowObj: Record<string, unknown> = {};
      headerRow.forEach((h, i) => {
        rawRowObj[h || `Cột ${i + 1}`] = row[i];
      });

      // Maintain exact sequential order as in original file (1, 2, 3...)
      parsedRows.push({
        order: parsedRows.length + 1,
        fullName,
        gender,
        dob,
        parentPhone: phone,
        parentName,
        address,
        isBoarding,
        usesBus,
        rawRow: rawRowObj,
      });
    }

    return {
      success: true,
      headers: headerRow,
      rows: parsedRows,
    };
  } catch (err) {
    return {
      success: false,
      headers: [],
      rows: [],
      error: err instanceof Error ? err.message : 'Lỗi đọc file Excel',
    };
  }
}

export interface ScoreImportItem {
  excelStudentName: string;
  excelDob?: string;
  matchedStudent: Student | null;
  status: 'KHỚP' | 'CẦN KIỂM TRA' | 'KHÔNG KHỚP' | 'KHÔNG CÓ ĐIỂM';
  statusNote?: string;
  subjectScores: Record<string, number | null>; // subject -> score
}

// Columns that should NOT be treated as score subjects
const NON_SCORE_KEYWORDS = [
  'stt',
  'số thứ tự',
  'sbd',
  'số báo danh',
  'mã hs',
  'mã số',
  'id',
  'họ và tên',
  'họ tên',
  'họ và chữ đệm',
  'họ lót',
  'họ đệm',
  'họ',
  'tên',
  'ngày sinh',
  'năm sinh',
  'dob',
  'giới tính',
  'nam/nữ',
  'phái',
  'lớp',
  'trường',
  'sđt',
  'điện thoại',
  'phụ huynh',
  'địa chỉ',
  'ghi chú',
  'nhận xét',
  'danh hiệu',
  'xếp loại',
  'học lực',
  'hạnh kiểm',
];

export function parseScoresFromExcel(
  fileData: ArrayBuffer,
  existingStudents: Student[],
  targetSubjects?: string[]
): {
  success: boolean;
  detectedSubjects: string[];
  previewItems: ScoreImportItem[];
  missingClassStudents: Student[];
  error?: string;
} {
  try {
    const workbook = XLSX.read(fileData, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        success: false,
        detectedSubjects: [],
        previewItems: [],
        missingClassStudents: [],
        error: 'File không có sheet',
      };
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rawMatrix: unknown[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    if (!rawMatrix || rawMatrix.length === 0) {
      return {
        success: false,
        detectedSubjects: [],
        previewItems: [],
        missingClassStudents: [],
        error: 'File trống',
      };
    }

    // 1. Find Header row
    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(15, rawMatrix.length); r++) {
      const row = rawMatrix[r] || [];
      const rowStr = row.map((cell) => normalizeText(cell).toLowerCase()).join(' | ');
      if (
        (rowStr.includes('họ') && (rowStr.includes('tên') || rowStr.includes('ten'))) ||
        rowStr.includes('họ và tên') ||
        rowStr.includes('họ tên')
      ) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) headerRowIndex = 0;
    const headerRow = (rawMatrix[headerRowIndex] || []).map((h) => normalizeText(h));

    // Identify Name & DOB columns
    let colFullName = -1;
    let colLastName = -1;
    let colFirstName = -1;
    let colDob = -1;

    headerRow.forEach((h, idx) => {
      const low = h.toLowerCase();
      if (low.includes('họ và tên') || low.includes('họ tên') || low === 'tên học sinh') {
        colFullName = idx;
      } else if (low === 'họ' || low === 'họ lót' || low === 'họ đệm') {
        colLastName = idx;
      } else if (low === 'tên' || low === 'ten') {
        colFirstName = idx;
      } else if (low.includes('ngày sinh') || low.includes('năm sinh') || low === 'dob') {
        colDob = idx;
      }
    });

    // 2. AI / Smart Column Scanner: Detect ALL score columns in the sheet
    const subjectColMap: { subject: string; colIdx: number }[] = [];
    const detectedSubjectNames: string[] = [];

    // Scan all columns in header
    headerRow.forEach((h, idx) => {
      if (!h || idx === colFullName || idx === colLastName || idx === colFirstName || idx === colDob) {
        return;
      }

      const low = h.toLowerCase().trim();

      // Check if this column is a non-score metadata column
      const isNonScore = NON_SCORE_KEYWORDS.some(
        (kw) => low === kw || low.startsWith(kw + ' ') || low.endsWith(' ' + kw)
      );

      if (isNonScore) {
        return;
      }

      // Check if column contains scores:
      // A: Matches any target subjects or common school subjects
      // B: OR has numeric score values in the data rows below
      let numericCount = 0;
      let nonEmptyCount = 0;

      for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 50, rawMatrix.length); r++) {
        const val = rawMatrix[r]?.[idx];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          nonEmptyCount++;
          const parsed = parseScoreValue(val);
          if (parsed !== null && parsed >= 0 && parsed <= 10) {
            numericCount++;
          }
        }
      }

      // Target subject match priority
      const isTargetMatch =
        targetSubjects &&
        targetSubjects.some(
          (ts) => low === ts.toLowerCase() || low.includes(ts.toLowerCase())
        );

      // If matched target subjects, OR if data contains numbers, OR header looks like a subject/score header
      const looksLikeScoreHeader =
        low.includes('toán') ||
        low.includes('văn') ||
        low.includes('anh') ||
        low.includes('lý') ||
        low.includes('hóa') ||
        low.includes('sinh') ||
        low.includes('sử') ||
        low.includes('địa') ||
        low.includes('gdcd') ||
        low.includes('tin') ||
        low.includes('công nghệ') ||
        low.includes('điểm') ||
        low.includes('kttk') ||
        low.includes('kttx') ||
        low.includes('gk') ||
        low.includes('ck') ||
        low.includes('đtb');

      if (isTargetMatch || looksLikeScoreHeader || (nonEmptyCount > 0 && numericCount / nonEmptyCount >= 0.3)) {
        // Clean subject name
        const cleanSubjectName = h.replace(/^Điểm\s+/i, '').replace(/^Môn\s+/i, '').trim();
        subjectColMap.push({ subject: cleanSubjectName || h, colIdx: idx });
        detectedSubjectNames.push(cleanSubjectName || h);
      }
    });

    const detectedSubjects = Array.from(new Set(detectedSubjectNames));

    // Map existing students for fast lookup
    const studentCleanMap = new Map<string, Student[]>();
    for (const s of existingStudents) {
      const clean = cleanNameForMatch(s.fullName);
      const arr = studentCleanMap.get(clean) || [];
      arr.push(s);
      studentCleanMap.set(clean, arr);
    }

    const previewItems: ScoreImportItem[] = [];
    const matchedStudentIds = new Set<string>();

    for (let r = headerRowIndex + 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r] || [];
      let studentName = '';
      if (colFullName >= 0 && row[colFullName]) {
        studentName = normalizeText(row[colFullName]);
      } else if (colLastName >= 0 && colFirstName >= 0) {
        studentName = normalizeText(
          `${normalizeText(row[colLastName])} ${normalizeText(row[colFirstName])}`
        );
      }

      if (!studentName || studentName.length < 2) continue;

      let fileDob = '';
      if (colDob >= 0) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c: colDob })];
        fileDob = parseDobValue(row[colDob], cell);
      }

      // Collect scores for all detected subjects
      const scores: Record<string, number | null> = {};
      let hasAnyScore = false;
      for (const sm of subjectColMap) {
        const val = row[sm.colIdx];
        const parsed = parseScoreValue(val);
        scores[sm.subject] = parsed;
        if (parsed !== null) hasAnyScore = true;
      }

      // Match student in class
      const clean = cleanNameForMatch(studentName);
      const candidates = studentCleanMap.get(clean) || [];

      let matchedStudent: Student | null = null;
      let status: 'KHỚP' | 'CẦN KIỂM TRA' | 'KHÔNG KHỚP' | 'KHÔNG CÓ ĐIỂM' = 'KHÔNG KHỚP';
      let statusNote = '';

      if (candidates.length === 1) {
        matchedStudent = candidates[0];
        matchedStudentIds.add(matchedStudent.id);

        if (!hasAnyScore) {
          status = 'KHÔNG CÓ ĐIỂM';
          statusNote = 'Học sinh trong lớp nhưng không có điểm trong file';
        } else if (
          fileDob &&
          matchedStudent.dob &&
          !matchedStudent.dob.includes(fileDob) &&
          !fileDob.includes(matchedStudent.dob)
        ) {
          status = 'CẦN KIỂM TRA';
          statusNote = `Ngày sinh file (${fileDob}) khác ngày sinh hệ thống (${matchedStudent.dob})`;
        } else {
          status = 'KHỚP';
          statusNote = 'Khớp chính xác họ tên trong danh sách lớp';
        }
      } else if (candidates.length > 1) {
        // Multiple students with same name: check DOB
        const matchedByDob = candidates.find(
          (c) => c.dob && fileDob && (c.dob.includes(fileDob) || fileDob.includes(c.dob))
        );
        if (matchedByDob) {
          matchedStudent = matchedByDob;
          matchedStudentIds.add(matchedStudent.id);
          status = 'CẦN KIỂM TRA';
          statusNote = 'Trùng họ tên, đã đối chiếu ngày sinh';
        } else {
          matchedStudent = candidates[0]; // fallback
          status = 'CẦN KIỂM TRA';
          statusNote = `Có ${candidates.length} học sinh trùng họ tên "${studentName}"`;
        }
      } else {
        status = 'KHÔNG KHỚP';
        statusNote = 'KHÔNG THUỘC DANH SÁCH LỚP';
      }

      previewItems.push({
        excelStudentName: studentName,
        excelDob: fileDob,
        matchedStudent,
        status,
        statusNote,
        subjectScores: scores,
      });
    }

    // Find class students that are NOT in the Excel file
    const missingClassStudents = existingStudents.filter((s) => !matchedStudentIds.has(s.id));

    return {
      success: true,
      detectedSubjects,
      previewItems,
      missingClassStudents,
    };
  } catch (err) {
    return {
      success: false,
      detectedSubjects: [],
      previewItems: [],
      missingClassStudents: [],
      error: err instanceof Error ? err.message : 'Lỗi đọc file điểm Excel',
    };
  }
}
