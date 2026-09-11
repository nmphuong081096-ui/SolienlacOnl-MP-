import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Check,
  Save,
  Info,
  Sparkles
} from 'lucide-react';
import {
  Student,
  AssessmentBatch,
  AssessmentScore,
  AssessmentImportLog
} from '../types';
import { studentService } from '../services/studentService';
import { assessmentService } from '../services/assessmentService';
import { parseScoresFromExcel, ScoreImportItem, parseScoreValue } from '../utils/excelParser';

const POPULAR_SUBJECTS = [
  'Toán',
  'Ngữ văn',
  'Tiếng Anh',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lý',
  'GDCD',
  'Tin học',
];

export const AssessmentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<AssessmentBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [importLogs, setImportLogs] = useState<AssessmentImportLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateBatchModal, setShowCreateBatchModal] = useState(false);
  const [showDeleteBatchModal, setShowDeleteBatchModal] = useState(false);
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // New batch form state
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchSemester, setNewBatchSemester] = useState('Học kỳ 1');
  const [newBatchSubjects, setNewBatchSubjects] = useState<string[]>([
    'Toán',
    'Ngữ văn',
    'Tiếng Anh',
  ]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [newBatchDate, setNewBatchDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Score cell editing
  // Key: `${studentId}_${subject}` -> string
  const [scoreEditMap, setScoreEditMap] = useState<Record<string, string>>({});
  const [isSavingScores, setIsSavingScores] = useState(false);
  const [saveScoreSuccess, setSaveScoreSuccess] = useState(false);

  // Excel Import state
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewItems, setImportPreviewItems] = useState<ScoreImportItem[]>([]);
  const [detectedSubjects, setDetectedSubjects] = useState<string[]>([]);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importTargetMode, setImportTargetMode] = useState<'new_batch' | 'merge_existing'>('new_batch');
  const [newBatchNameFromImport, setNewBatchNameFromImport] = useState('');
  const [newBatchSemesterFromImport, setNewBatchSemesterFromImport] = useState('Học kỳ 1');
  const [newBatchDateFromImport, setNewBatchDateFromImport] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Load initial data
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [allStudents, allBatches] = await Promise.all([
        studentService.getAll(),
        assessmentService.getBatches(),
      ]);
      setStudents(allStudents);
      setBatches(allBatches);

      if (allBatches.length > 0 && !selectedBatchId) {
        setSelectedBatchId(allBatches[0].id);
      }
    } catch (err) {
      console.error('Error loading assessments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load scores for selected batch
  const loadBatchScores = async (batchId: string) => {
    if (!batchId) return;
    try {
      const [batchScores, logs] = await Promise.all([
        assessmentService.getScoresByBatch(batchId),
        assessmentService.getImportLogs(batchId),
      ]);
      setScores(batchScores);
      setImportLogs(logs);

      // Populate edit map
      const map: Record<string, string> = {};
      batchScores.forEach((s) => {
        const key = `${s.studentId}_${s.subject}`;
        map[key] = s.score !== null ? String(s.score) : '';
      });
      setScoreEditMap(map);
    } catch (err) {
      console.error('Error loading scores for batch:', err);
    }
  };

  useEffect(() => {
    if (selectedBatchId) {
      loadBatchScores(selectedBatchId);
    } else {
      setScores([]);
      setScoreEditMap({});
    }
  }, [selectedBatchId]);

  const currentBatch = batches.find((b) => b.id === selectedBatchId);

  // Create Batch Handlers
  const handleToggleSubject = (sub: string) => {
    if (newBatchSubjects.includes(sub)) {
      setNewBatchSubjects(newBatchSubjects.filter((s) => s !== sub));
    } else {
      setNewBatchSubjects([...newBatchSubjects, sub]);
    }
  };

  const handleAddCustomSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customSubjectInput.trim();
    if (clean && !newBatchSubjects.includes(clean)) {
      setNewBatchSubjects([...newBatchSubjects, clean]);
      setCustomSubjectInput('');
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim() || newBatchSubjects.length === 0) return;

    const created = await assessmentService.createBatch({
      name: newBatchName.trim(),
      semester: newBatchSemester,
      subjects: newBatchSubjects,
      date: newBatchDate,
      notes: '',
    });

    const updatedBatches = await assessmentService.getBatches();
    setBatches(updatedBatches);
    setSelectedBatchId(created.id);
    setShowCreateBatchModal(false);
    setNewBatchName('');
  };

  const handleDeleteBatch = async () => {
    if (!selectedBatchId) return;
    setIsDeletingBatch(true);
    try {
      await assessmentService.deleteBatch(selectedBatchId);
      setShowDeleteBatchModal(false);
      const updated = await assessmentService.getBatches();
      setBatches(updated);
      if (updated.length > 0) {
        setSelectedBatchId(updated[0].id);
        await loadBatchScores(updated[0].id);
      } else {
        setSelectedBatchId('');
        setScores([]);
        setScoreEditMap({});
        setImportLogs([]);
      }
    } catch (err) {
      console.error('Error deleting batch:', err);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleDeleteImportLog = async (logId: string) => {
    try {
      await assessmentService.deleteImportLog(logId);
      if (selectedBatchId) {
        const logs = await assessmentService.getImportLogs(selectedBatchId);
        setImportLogs(logs);
      }
    } catch (err) {
      console.error('Error deleting import log:', err);
    }
  };

  // Score Input Change
  const handleScoreCellChange = (studentId: string, subject: string, val: string) => {
    const key = `${studentId}_${subject}`;
    setScoreEditMap((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  // Save manual scores
  const handleSaveAllScores = async () => {
    if (!currentBatch) return;
    setIsSavingScores(true);
    try {
      const recordsToSave: Omit<AssessmentScore, 'id' | 'updatedAt'>[] = [];

      for (const student of students) {
        for (const subject of currentBatch.subjects) {
          const key = `${student.id}_${subject}`;
          const rawVal = scoreEditMap[key] !== undefined ? scoreEditMap[key].trim() : '';

          let parsedVal: number | null = null;
          if (rawVal !== '' && rawVal !== '—') {
            parsedVal = parseScoreValue(rawVal);
          }

          recordsToSave.push({
            batchId: currentBatch.id,
            studentId: student.id,
            subject,
            score: parsedVal,
            rawScore: parsedVal !== null ? String(parsedVal) : '—',
          });
        }
      }

      await assessmentService.saveScoresBatch(recordsToSave);
      setSaveScoreSuccess(true);
      setTimeout(() => setSaveScoreSuccess(false), 3000);
      await loadBatchScores(currentBatch.id);
    } catch (err) {
      console.error('Error saving scores:', err);
    } finally {
      setIsSavingScores(false);
    }
  };

  // Excel Upload for Scores
  const handleScoreFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ').trim();
    const suggestedBatchName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'Bảng điểm mới';

    setImportFileName(file.name);
    setNewBatchNameFromImport(suggestedBatchName);
    setImportTargetMode('new_batch');
    setImportError('');
    const reader = new FileReader();

    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (!buffer) return;

      const parsed = parseScoresFromExcel(
        buffer,
        students,
        currentBatch ? currentBatch.subjects : []
      );
      if (!parsed.success) {
        setImportError(parsed.error || 'Lỗi đọc file điểm');
        setImportPreviewItems([]);
      } else {
        setImportPreviewItems(parsed.previewItems);
        setDetectedSubjects(parsed.detectedSubjects);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Confirm Excel Score Import
  const handleConfirmScoreImport = async () => {
    if (importPreviewItems.length === 0) return;
    setIsImporting(true);

    try {
      let targetBatchId = '';

      if (importTargetMode === 'new_batch' || !currentBatch) {
        // Create a new separate batch so files never overwrite existing ones!
        const subjects = detectedSubjects.length > 0 ? detectedSubjects : POPULAR_SUBJECTS.slice(0, 3);
        const nameToUse =
          newBatchNameFromImport.trim() ||
          importFileName.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ') ||
          'Kỳ kiểm tra mới';

        const created = await assessmentService.createBatch({
          name: nameToUse,
          semester: newBatchSemesterFromImport,
          subjects: subjects,
          date: newBatchDateFromImport || new Date().toISOString().split('T')[0],
          notes: `Import từ file Excel: ${importFileName}`,
        });
        targetBatchId = created.id;
      } else {
        targetBatchId = currentBatch.id;
        // Merge newly detected subjects into current batch
        const mergedSubjects = Array.from(new Set([...currentBatch.subjects, ...detectedSubjects]));
        if (mergedSubjects.length > currentBatch.subjects.length) {
          await assessmentService.updateBatch({
            ...currentBatch,
            subjects: mergedSubjects,
          });
        }
      }

      let matchedCount = 0;
      let needCheckCount = 0;
      let unmatchedCount = 0;
      let missingCount = 0;

      const scoresToSave: Omit<AssessmentScore, 'id' | 'updatedAt'>[] = [];

      for (const item of importPreviewItems) {
        if (item.status === 'KHỚP') matchedCount++;
        else if (item.status === 'CẦN KIỂM TRA') needCheckCount++;
        else if (item.status === 'KHÔNG KHỚP') unmatchedCount++;
        else if (item.status === 'KHÔNG CÓ ĐIỂM') missingCount++;

        // Only save scores for matched students (in class)
        if (item.matchedStudent) {
          for (const [subject, rawScoreVal] of Object.entries(item.subjectScores)) {
            const numScore = typeof rawScoreVal === 'number' ? rawScoreVal : null;
            scoresToSave.push({
              batchId: targetBatchId,
              studentId: item.matchedStudent.id,
              subject,
              score: numScore,
              rawScore: numScore !== null ? String(numScore) : '—',
            });
          }
        }
      }

      // Commit scores to storage
      if (scoresToSave.length > 0) {
        await assessmentService.saveScoresBatch(scoresToSave);
      }

      // Log import
      await assessmentService.saveImportLog({
        batchId: targetBatchId,
        fileName: importFileName,
        matchedCount,
        needCheckCount,
        unmatchedCount,
        missingCount,
      });

      // Reload batches list and select the target batch
      const updatedBatches = await assessmentService.getBatches();
      setBatches(updatedBatches);
      setSelectedBatchId(targetBatchId);
      await loadBatchScores(targetBatchId);

      setShowImportModal(false);
      setImportPreviewItems([]);
      setImportFileName('');
      setSaveScoreSuccess(true);
      setTimeout(() => setSaveScoreSuccess(false), 4000);
    } catch (err) {
      console.error('Error importing scores:', err);
      setImportError('Lỗi khi lưu điểm vào hệ thống.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Điểm Kiểm tra & Đánh giá</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý điểm số theo từng kỳ kiểm tra, hỗ trợ nhiều môn học, lưu nguyên số thập phân.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCreateBatchModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo kỳ kiểm tra</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportPreviewItems([]);
              setImportFileName('');
              setImportError('');
              setImportTargetMode('new_batch');
              setShowImportModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-xs transition"
          >
            <Upload className="w-4 h-4" />
            <span>Import Điểm Excel</span>
          </button>

          {currentBatch && (
            <>
              <button
                type="button"
                onClick={() => setShowHistoryModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
              >
                <History className="w-4 h-4" />
                <span>Lịch sử import</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteBatchModal(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa bảng điểm này</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Batch Selector Bar */}
      {batches.length > 0 ? (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-500 uppercase">
              Bảng điểm / Kỳ:
            </label>
            <div className="flex items-center space-x-1.5">
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="px-3.5 py-1.5 text-sm font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 text-slate-900"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.semester})
                  </option>
                ))}
              </select>
              {currentBatch && (
                <button
                  type="button"
                  onClick={() => setShowDeleteBatchModal(true)}
                  title="Xóa bảng điểm này"
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-rose-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {currentBatch && (
              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <span>• Ngày: {currentBatch.date}</span>
                <span>• {currentBatch.subjects.length} môn:</span>
                <span className="font-semibold text-slate-700">
                  {currentBatch.subjects.join(', ')}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              disabled={isSavingScores}
              onClick={handleSaveAllScores}
              className="px-4 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center space-x-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingScores ? 'Đang lưu...' : 'LƯU BẢNG ĐIỂM'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center">
          <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">Chưa có bảng điểm nào</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Bạn có thể Tạo kỳ kiểm tra thủ công hoặc bấm Import Điểm Excel để hệ thống tự động tạo bảng điểm từ file Excel.
          </p>
          <div className="flex items-center justify-center space-x-3">
            <button
              type="button"
              onClick={() => setShowCreateBatchModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo kỳ kiểm tra</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setImportPreviewItems([]);
                setImportFileName('');
                setImportError('');
                setImportTargetMode('new_batch');
                setShowImportModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
            >
              <Upload className="w-4 h-4" />
              <span>Import Điểm Excel</span>
            </button>
          </div>
        </div>
      )}

      {/* Success alert */}
      {saveScoreSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Đã lưu bảng điểm thành công! Dữ liệu số thập phân được giữ nguyên.</span>
        </div>
      )}

      {/* Scores Table */}
      {currentBatch && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3.5 text-center w-12 sticky left-0 bg-slate-50 z-10">STT</th>
                  <th className="px-4 py-3.5 min-w-[200px] sticky left-12 bg-slate-50 z-10">Họ và tên</th>
                  {currentBatch.subjects.map((subj) => (
                    <th key={subj} className="px-3 py-3.5 text-center min-w-[100px]">
                      {subj}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + currentBatch.subjects.length}
                      className="text-center py-10 text-slate-400"
                    >
                      Chưa có học sinh trong danh sách. Vui lòng thêm học sinh ở menu Học sinh trước.
                    </td>
                  </tr>
                ) : (
                  students.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-3 py-2 text-center text-slate-400 font-mono text-xs sticky left-0 bg-white">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-900 sticky left-12 bg-white">
                        {s.fullName}
                      </td>
                      {currentBatch.subjects.map((subj) => {
                        const key = `${s.id}_${subj}`;
                        const currentVal = scoreEditMap[key] ?? '';
                        return (
                          <td key={subj} className="px-3 py-2 text-center">
                            <input
                              type="text"
                              value={currentVal}
                              onChange={(e) =>
                                handleScoreCellChange(s.id, subj, e.target.value)
                              }
                              placeholder="—"
                              className="w-16 px-2 py-1 text-center font-mono font-semibold text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50 hover:bg-white transition"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      {showCreateBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Tạo Kỳ kiểm tra Mới</h3>
              <button
                type="button"
                onClick={() => setShowCreateBatchModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên kỳ kiểm tra <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  placeholder="Ví dụ: Khảo sát đầu năm, Giữa kỳ 1..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Học kỳ
                  </label>
                  <select
                    value={newBatchSemester}
                    onChange={(e) => setNewBatchSemester(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Học kỳ 1">Học kỳ 1</option>
                    <option value="Học kỳ 2">Học kỳ 2</option>
                    <option value="Cả năm">Cả năm</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày kiểm tra
                  </label>
                  <input
                    type="date"
                    value={newBatchDate}
                    onChange={(e) => setNewBatchDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Subject Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Các môn kiểm tra ({newBatchSubjects.length} môn đã chọn)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {POPULAR_SUBJECTS.map((sub) => {
                    const isSelected = newBatchSubjects.includes(sub);
                    return (
                      <button
                        type="button"
                        key={sub}
                        onClick={() => handleToggleSubject(sub)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                        {sub}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Subject Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customSubjectInput}
                    onChange={(e) => setCustomSubjectInput(e.target.value)}
                    placeholder="Nhập môn khác..."
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSubject}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                  >
                    + Thêm môn
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateBatchModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={newBatchSubjects.length === 0}
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  Tạo kỳ kiểm tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Batch Modal */}
      {showDeleteBatchModal && currentBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">Xác nhận xóa bảng điểm</h3>
            <p className="text-sm text-slate-600 text-center mb-4 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn bảng điểm <span className="font-bold text-slate-900">"{currentBatch.name}"</span> ({currentBatch.semester})?
              <br />
              <span className="text-rose-600 text-xs mt-1.5 block">
                Toàn bộ dữ liệu điểm của học sinh và lịch sử import của bảng này sẽ bị xóa khỏi hệ thống.
              </span>
            </p>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={() => setShowDeleteBatchModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeletingBatch}
                onClick={handleDeleteBatch}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition flex items-center justify-center space-x-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeletingBatch ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Import Điểm Excel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động quét cột điểm môn, đối chiếu danh sách lớp, lưu chuẩn số thập phân.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target mode selection */}
            <div className="mb-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <label className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Lựa chọn lưu bảng điểm:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    importTargetMode === 'new_batch'
                      ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="importTarget"
                    checked={importTargetMode === 'new_batch'}
                    onChange={() => setImportTargetMode('new_batch')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Tạo bảng điểm mới từ file này (Khuyên dùng)
                    </span>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                      Mỗi file tạo 1 bảng độc lập, không bị gộp chung hoặc ghi đè lên bảng khác.
                    </span>
                  </div>
                </label>

                {currentBatch && (
                  <label
                    className={`flex items-start space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                      importTargetMode === 'merge_existing'
                        ? 'bg-indigo-50/80 border-indigo-300 ring-1 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importTarget"
                      checked={importTargetMode === 'merge_existing'}
                      onChange={() => setImportTargetMode('merge_existing')}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Ghi thêm vào bảng: "{currentBatch.name}"
                      </span>
                      <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                        Cập nhật điểm các môn cho học sinh vào bảng hiện tại.
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {/* If new_batch, configure new batch details */}
              {importTargetMode === 'new_batch' && (
                <div className="pt-2 border-t border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">
                      Tên bảng điểm mới:
                    </label>
                    <input
                      type="text"
                      value={newBatchNameFromImport}
                      onChange={(e) => setNewBatchNameFromImport(e.target.value)}
                      placeholder="Ví dụ: Kiểm tra 15P Toán, Giữa kỳ 1..."
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-0.5">
                      Học kỳ:
                    </label>
                    <select
                      value={newBatchSemesterFromImport}
                      onChange={(e) => setNewBatchSemesterFromImport(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                    >
                      <option value="Học kỳ 1">Học kỳ 1</option>
                      <option value="Học kỳ 2">Học kỳ 2</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Upload Box */}
            <div className="mb-4">
              <label className="border-2 border-dashed border-slate-300 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition">
                <Upload className="w-8 h-8 text-indigo-500 mb-1" />
                <span className="text-sm font-semibold text-slate-700">
                  {importFileName ? importFileName : 'Bấm vào đây để chọn file bảng điểm Excel (.xlsx, .xls)'}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">
                  Hệ thống tự động quét và nhận diện tất cả các cột điểm có trong file
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleScoreFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {importError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Preview Section */}
            {importPreviewItems.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 mb-4">
                {/* AI Detected Columns Banner */}
                {detectedSubjects.length > 0 && (
                  <div className="mb-3 p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-900">
                        <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span>Đã quét thấy {detectedSubjects.length} cột điểm trong file:</span>
                      </div>
                      <span className="text-[11px] text-indigo-600 font-medium">Tự động đồng bộ</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detectedSubjects.map((sub) => (
                        <span
                          key={sub}
                          className="px-2.5 py-0.5 rounded-lg bg-white border border-indigo-200 text-indigo-800 text-xs font-semibold shadow-2xs"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Kết quả phân tích file ({importPreviewItems.length} dòng)
                  </span>
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      KHỚP: {importPreviewItems.filter((i) => i.status === 'KHỚP').length}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                      CẦN KIỂM TRA: {importPreviewItems.filter((i) => i.status === 'CẦN KIỂM TRA').length}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
                      KHÔNG KHỚP: {importPreviewItems.filter((i) => i.status === 'KHÔNG KHỚP').length}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-60">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-center w-8">#</th>
                        <th className="px-3 py-2">Tên trên Excel</th>
                        <th className="px-3 py-2">Học sinh khớp trong lớp</th>
                        <th className="px-3 py-2 text-center">Trạng thái</th>
                        {detectedSubjects.map((s) => (
                          <th key={s} className="px-3 py-2 text-center">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreviewItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5 font-medium text-slate-900">
                            {item.excelStudentName}
                          </td>
                          <td className="px-3 py-1.5">
                            {item.matchedStudent ? (
                              <span className="font-semibold text-slate-800">
                                {item.matchedStudent.fullName}
                              </span>
                            ) : (
                              <span className="text-rose-600 italic">Không thuộc danh sách lớp</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                item.status === 'KHỚP'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'CẦN KIỂM TRA'
                                  ? 'bg-amber-100 text-amber-800'
                                  : item.status === 'KHÔNG CÓ ĐIỂM'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                              title={item.statusNote}
                            >
                              {item.status}
                            </span>
                          </td>
                          {detectedSubjects.map((subj) => {
                            const val = item.subjectScores[subj];
                            return (
                              <td key={subj} className="px-3 py-1.5 text-center font-mono font-semibold">
                                {val !== null && val !== undefined ? val : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={importPreviewItems.length === 0 || isImporting}
                onClick={handleConfirmScoreImport}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>
                  {isImporting
                    ? 'Đang lưu...'
                    : importTargetMode === 'new_batch'
                    ? 'LƯU VÀO BẢNG ĐIỂM MỚI'
                    : 'LƯU CẬP NHẬT'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">Lịch sử Import Bảng điểm</h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {importLogs.length === 0 ? (
                <p className="text-center py-6 text-sm text-slate-400">
                  Chưa có lần import Excel nào cho bảng điểm này.
                </p>
              ) : (
                importLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">{log.fileName}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 font-mono">
                          {new Date(log.importedAt).toLocaleString('vi-VN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteImportLog(log.id)}
                          title="Xóa nhật ký import này"
                          className="text-slate-400 hover:text-rose-600 transition p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 text-slate-600">
                      <span className="text-emerald-700 font-semibold">
                        Khớp: {log.matchedCount}
                      </span>
                      {log.needCheckCount > 0 && (
                        <span className="text-amber-700 font-semibold">
                          Cần ktra: {log.needCheckCount}
                        </span>
                      )}
                      {log.unmatchedCount > 0 && (
                        <span className="text-rose-700 font-semibold">
                          Ngoài lớp: {log.unmatchedCount}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
