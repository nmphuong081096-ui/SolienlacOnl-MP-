import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Award,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Calendar,
  X,
  Eye,
  EyeOff,
  Settings2,
  TrendingDown,
  TrendingUp,
  Clock,
  Check,
  Pencil,
  Tag,
  Zap
} from 'lucide-react';
import {
  Student,
  ViolationRecord,
  ViolationTemplate,
  CompetitionTransaction,
  calculateEmulationRank,
  EmulationRank,
  QuickViolationNote
} from '../types';
import { studentService } from '../services/studentService';
import { violationService } from '../services/violationService';
import { competitionService, MonthSummary } from '../services/competitionService';

export const ViolationsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [violations, setViolations] = useState<ViolationRecord[]>([]);
  const [templates, setTemplates] = useState<ViolationTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'violations' | 'competition' | 'templates'>('violations');

  // Month selector for Competition tab
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ViolationRecord | null>(null);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ViolationTemplate | null>(null);

  // Form states
  const [recordForm, setRecordForm] = useState({
    studentId: '',
    title: '',
    date: new Date().toISOString().split('T')[0],
    pointsDeducted: 2,
    isPublic: true,
    notes: '',
  });

  const [txForm, setTxForm] = useState({
    studentId: '',
    type: 'plus' as 'plus' | 'minus',
    points: 5,
    content: '',
    createdBy: 'GVCN',
  });

  const [templateForm, setTemplateForm] = useState({
    title: '',
    defaultPoints: 2,
    category: 'Kỷ luật',
    order: 1,
  });

  // Quick infraction notes with points (Ghi chú nhanh các lỗi kèm điểm)
  const [quickNotes, setQuickNotes] = useState<QuickViolationNote[]>([]);
  const [showQuickNoteManage, setShowQuickNoteManage] = useState(false);
  const [newQuickNoteInput, setNewQuickNoteInput] = useState('');
  const [newQuickNotePoints, setNewQuickNotePoints] = useState<number>(2);
  const [editingQuickNoteIdx, setEditingQuickNoteIdx] = useState<number | null>(null);
  const [editingQuickNoteText, setEditingQuickNoteText] = useState('');
  const [editingQuickNotePoints, setEditingQuickNotePoints] = useState<number>(2);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allStudents, allViolations, allTemplates, summary, loadedNotes] = await Promise.all([
        studentService.getAll(),
        violationService.getAll(),
        violationService.getTemplates(),
        competitionService.getMonthlySummary(selectedMonth),
        violationService.getQuickNotes(),
      ]);
      setStudents(allStudents);
      setViolations(allViolations);
      setTemplates(allTemplates);
      setMonthSummary(summary);
      setQuickNotes(loadedNotes);
    } catch (err) {
      console.error('Error loading violations data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuickNote = async () => {
    const text = newQuickNoteInput.trim();
    if (!text) return;
    const pts = Number(newQuickNotePoints) || 1;
    if (quickNotes.some((n) => n.title.toLowerCase() === text.toLowerCase())) {
      setNewQuickNoteInput('');
      return;
    }
    const updated = [...quickNotes, { title: text, points: pts }];
    setQuickNotes(updated);
    setNewQuickNoteInput('');
    setNewQuickNotePoints(2);
    await violationService.saveQuickNotes(updated);
  };

  const handleDeleteQuickNote = async (idxToRemove: number) => {
    const updated = quickNotes.filter((_, idx) => idx !== idxToRemove);
    setQuickNotes(updated);
    if (editingQuickNoteIdx === idxToRemove) {
      setEditingQuickNoteIdx(null);
    }
    await violationService.saveQuickNotes(updated);
  };

  const handleSaveEditQuickNote = async (idx: number) => {
    const trimmed = editingQuickNoteText.trim();
    if (!trimmed) return;
    const pts = Number(editingQuickNotePoints) || 1;
    const updated = [...quickNotes];
    updated[idx] = { title: trimmed, points: pts };
    setQuickNotes(updated);
    setEditingQuickNoteIdx(null);
    setEditingQuickNoteText('');
    setEditingQuickNotePoints(2);
    await violationService.saveQuickNotes(updated);
  };

  const handleApplyQuickNote = (note: QuickViolationNote) => {
    setRecordForm((prev) => ({
      ...prev,
      studentId: prev.studentId || students[0]?.id || '',
      title: note.title,
      pointsDeducted: note.points,
    }));
    setShowAddModal(true);
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const studentMap = new Map(students.map((s) => [s.id, s.fullName]));

  // Violation Handlers
  const handleSaveViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordForm.studentId || !recordForm.title.trim()) return;

    if (editingRecord) {
      await violationService.updateRecord({
        ...editingRecord,
        ...recordForm,
      });
      setEditingRecord(null);
    } else {
      await violationService.addRecord(recordForm);
      setShowAddModal(false);
    }

    setRecordForm({
      studentId: '',
      title: '',
      date: new Date().toISOString().split('T')[0],
      pointsDeducted: 2,
      isPublic: true,
      notes: '',
    });
    await loadData();
  };

  const handleDeleteViolation = async (id: string) => {
    await violationService.deleteRecord(id);
    await loadData();
  };

  const handleApplyTemplate = (tpl: ViolationTemplate) => {
    setRecordForm((prev) => ({
      ...prev,
      title: tpl.title,
      pointsDeducted: tpl.defaultPoints,
    }));
  };

  // Competition Handlers
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.content.trim() || txForm.points <= 0) return;

    await competitionService.addTransaction({
      studentId: txForm.studentId || undefined,
      type: txForm.type,
      points: Number(txForm.points),
      month: selectedMonth,
      content: txForm.content.trim(),
      createdBy: txForm.createdBy || 'GVCN',
    });

    setShowAddTxModal(false);
    setTxForm({
      studentId: '',
      type: 'plus',
      points: 5,
      content: '',
      createdBy: 'GVCN',
    });
    await loadData();
  };

  const handleDeleteTransaction = async (id: string) => {
    await competitionService.deleteTransaction(id);
    await loadData();
  };

  // Template Handlers
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.title.trim()) return;

    if (editingTemplate) {
      await violationService.updateTemplate({
        ...editingTemplate,
        ...templateForm,
      });
      setEditingTemplate(null);
    } else {
      await violationService.addTemplate(templateForm);
      setShowTemplateModal(false);
    }

    setTemplateForm({
      title: '',
      defaultPoints: 2,
      category: 'Kỷ luật',
      order: templates.length + 1,
    });
    await loadData();
  };

  const handleDeleteTemplate = async (id: string) => {
    await violationService.deleteTemplate(id);
    await loadData();
  };

  const getRankBadgeClass = (rank: EmulationRank) => {
    switch (rank) {
      case 'Tốt':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Khá':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Đạt':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Chưa đạt':
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Kỷ luật & Thi đua Lớp</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Ghi nhận vi phạm, gợi ý nhanh linh hoạt và tính điểm thi đua 100 điểm đầu tháng.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('violations')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'violations'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Sổ Vi phạm</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('competition')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'competition'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Thi đua ({selectedMonth})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
              activeTab === 'templates'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Mẫu gợi ý nhanh</span>
          </button>
        </div>
      </div>

      {/* TAB 1: VIOLATIONS */}
      {activeTab === 'violations' && (
        <div className="space-y-4">
          {/* Ghi chú nhanh các lỗi vi phạm */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-900">Ghi chú nhanh các lỗi vi phạm</h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {quickNotes.length} lỗi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Bấm vào lỗi để ghi nhận nhanh cho học sinh, hoặc tùy chỉnh thêm/bớt danh sách lỗi bên dưới.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowQuickNoteManage(!showQuickNoteManage)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center space-x-1.5 ${
                    showQuickNoteManage
                      ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{showQuickNoteManage ? 'Đóng chỉnh sửa' : 'Tùy chỉnh thêm/bớt'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingRecord(null);
                    setRecordForm({
                      studentId: students[0]?.id || '',
                      title: '',
                      date: new Date().toISOString().split('T')[0],
                      pointsDeducted: 2,
                      isPublic: true,
                      notes: '',
                    });
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs sm:text-sm font-semibold hover:bg-rose-700 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ghi nhận vi phạm</span>
                </button>
              </div>
            </div>

            {/* Quick Note Management Form */}
            {showQuickNoteManage && (
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">
                    Thêm lỗi vi phạm mới vào danh sách ghi chú nhanh (kèm điểm trừ):
                  </span>
                  <span className="text-[11px] text-amber-700">
                    Nhấn bút chì để sửa tên lỗi & điểm, nhấn x để xóa lỗi
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newQuickNoteInput}
                    onChange={(e) => setNewQuickNoteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickNote();
                      }
                    }}
                    placeholder="Tên lỗi: Đi xe trong sân trường, Nói chuyện riêng, Quên phù hiệu..."
                    className="flex-1 min-w-[220px] px-3 py-1.5 text-xs bg-white border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex items-center space-x-1 bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs">
                    <span className="text-slate-500 font-medium text-[11px]">Trừ:</span>
                    <input
                      type="number"
                      min="0.5"
                      max="50"
                      step="0.5"
                      value={newQuickNotePoints}
                      onChange={(e) => setNewQuickNotePoints(parseFloat(e.target.value) || 1)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddQuickNote();
                        }
                      }}
                      className="w-12 text-center text-xs font-bold text-rose-600 focus:outline-none"
                    />
                    <span className="text-slate-500 font-medium text-[11px]">điểm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddQuickNote()}
                    disabled={!newQuickNoteInput.trim()}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition flex items-center space-x-1 shrink-0 shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm lỗi</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick Notes Chips List */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickNotes.map((note, idx) => {
                const isEditingThis = editingQuickNoteIdx === idx;

                if (isEditingThis) {
                  return (
                    <div
                      key={idx}
                      className="flex items-center space-x-1.5 bg-amber-50 border border-amber-400 rounded-lg p-1 shadow-2xs"
                    >
                      <input
                        type="text"
                        value={editingQuickNoteText}
                        onChange={(e) => setEditingQuickNoteText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEditQuickNote(idx);
                          } else if (e.key === 'Escape') {
                            setEditingQuickNoteIdx(null);
                          }
                        }}
                        autoFocus
                        className="px-2 py-0.5 text-xs bg-white border border-amber-300 rounded focus:outline-none font-medium text-slate-800"
                      />
                      <div className="flex items-center space-x-0.5 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-[11px]">
                        <span className="text-slate-400 text-[10px]">Trừ</span>
                        <input
                          type="number"
                          min="0.5"
                          max="50"
                          step="0.5"
                          value={editingQuickNotePoints}
                          onChange={(e) => setEditingQuickNotePoints(parseFloat(e.target.value) || 1)}
                          className="w-10 text-center text-xs font-bold text-rose-600 focus:outline-none"
                        />
                        <span className="text-slate-400 text-[10px]">đ</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSaveEditQuickNote(idx)}
                        className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                        title="Lưu thay đổi"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingQuickNoteIdx(null)}
                        className="p-1 text-slate-400 hover:bg-slate-200 rounded"
                        title="Hủy"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="group inline-flex items-center bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-xs transition"
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyQuickNote(note)}
                      className="px-2.5 py-1 text-slate-700 group-hover:text-amber-900 font-medium text-left flex items-center space-x-1.5"
                      title={`Bấm để ghi nhận lỗi này cho học sinh (Trừ ${note.points} điểm)`}
                    >
                      <span>{note.title}</span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-50 border border-rose-200 text-rose-600 font-mono font-bold text-[10px]">
                        -{note.points}đ
                      </span>
                    </button>

                    {showQuickNoteManage && (
                      <div className="flex items-center space-x-0.5 pr-1 border-l border-slate-200 pl-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuickNoteIdx(idx);
                            setEditingQuickNoteText(note.title);
                            setEditingQuickNotePoints(note.points);
                          }}
                          className="p-0.5 text-slate-400 hover:text-indigo-600 rounded"
                          title="Sửa tên lỗi & điểm này"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuickNote(idx)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                          title="Xóa lỗi này"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Ngày</th>
                    <th className="px-4 py-3.5">Học sinh</th>
                    <th className="px-4 py-3.5">Nội dung vi phạm</th>
                    <th className="px-4 py-3.5 text-center">Trừ điểm</th>
                    <th className="px-4 py-3.5 text-center">Hiện Sổ liên lạc</th>
                    <th className="px-4 py-3.5">Ghi chú</th>
                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Chưa có vi phạm nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    violations.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                          {v.date}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {studentMap.get(v.studentId) || 'Học sinh'}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {v.title}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-bold text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            -{v.pointsDeducted} đ
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {v.isPublic ? (
                            <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              <Eye className="w-3 h-3" />
                              <span>Có</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-xs font-medium text-slate-400">
                              <EyeOff className="w-3 h-3" />
                              <span>Ẩn</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {v.notes || '—'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord(v);
                              setRecordForm({
                                studentId: v.studentId,
                                title: v.title,
                                date: v.date,
                                pointsDeducted: v.pointsDeducted,
                                isPublic: v.isPublic,
                                notes: v.notes || '',
                              });
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteViolation(v.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITION / THI ĐUA */}
      {activeTab === 'competition' && (
        <div className="space-y-6">
          {/* Month selector & Score banner */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <label className="text-xs font-bold text-slate-500 uppercase">
                Tháng thi đua:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3.5 py-1.5 text-sm font-semibold border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {monthSummary && (
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <span className="text-xs text-slate-400 block">Điểm khởi điểm</span>
                  <span className="text-lg font-bold text-slate-800">100 đ</span>
                </div>
                <div className="text-center text-emerald-600">
                  <span className="text-xs block">Tổng cộng (+)</span>
                  <span className="text-lg font-bold">+{monthSummary.totalPlus} đ</span>
                </div>
                <div className="text-center text-rose-600">
                  <span className="text-xs block">Tổng trừ (-)</span>
                  <span className="text-lg font-bold">-{monthSummary.totalMinus} đ</span>
                </div>
                <div className="text-center pl-4 border-l border-slate-200">
                  <span className="text-xs text-slate-400 block">Điểm cuối cùng</span>
                  <span className="text-2xl font-black text-indigo-700">
                    {monthSummary.finalScore} đ
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-xs text-slate-400 block">Xếp loại</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${getRankBadgeClass(monthSummary.rank)}`}>
                    {monthSummary.rank}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAddTxModal(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm giao dịch điểm</span>
            </button>
          </div>

          {/* Verification threshold notes */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 flex items-center space-x-4">
            <span className="font-bold text-slate-800 uppercase">Mốc xếp loại chuẩn:</span>
            <span>90–100: <strong className="text-emerald-700">Tốt</strong> (≥90)</span>
            <span>80–89: <strong className="text-blue-700">Khá</strong> (80-89)</span>
            <span>50–79: <strong className="text-amber-700">Đạt</strong> (50-79)</span>
            <span>&lt;50: <strong className="text-rose-700">Chưa đạt</strong> (≤49)</span>
          </div>

          {/* Transactions List */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase text-slate-500">
              Lịch sử giao dịch điểm thi đua tháng {selectedMonth}
            </div>
            <div className="divide-y divide-slate-100">
              {!monthSummary || monthSummary.transactions.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  Chưa có giao dịch cộng/trừ điểm nào trong tháng này. Điểm mặc định giữ nguyên 100 đ.
                </div>
              ) : (
                monthSummary.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                          tx.type === 'plus'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {tx.type === 'plus' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-slate-900">
                          {tx.content}
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tx.studentId ? `Học sinh: ${studentMap.get(tx.studentId)}` : 'Cả lớp'} • Tạo bởi: {tx.createdBy} • {new Date(tx.createdAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span
                        className={`font-mono font-bold text-sm ${
                          tx.type === 'plus' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {tx.type === 'plus' ? `+${tx.points} đ` : `-${tx.points} đ`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Các mẫu này phục vụ chọn nhanh khi ghi nhận vi phạm. Giáo viên có toàn quyền thêm, sửa, xóa, sắp xếp.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({
                  title: '',
                  defaultPoints: 2,
                  category: 'Kỷ luật',
                  order: templates.length + 1,
                });
                setShowTemplateModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mẫu gợi ý</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.length === 0 ? (
              <div className="col-span-full text-center py-10 text-sm text-slate-400">
                Chưa có mẫu gợi ý nào. Nhấn nút "Thêm mẫu gợi ý" để tạo mẫu thường dùng.
              </div>
            ) : (
              templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider block">
                      {tpl.category}
                    </span>
                    <h4 className="font-semibold text-slate-900 text-sm mt-0.5">
                      {tpl.title}
                    </h4>
                    <span className="text-xs text-rose-600 font-bold mt-1 inline-block">
                      Trừ: -{tpl.defaultPoints} đ
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setTemplateForm({
                          title: tpl.title,
                          defaultPoints: tpl.defaultPoints,
                          category: tpl.category,
                          order: tpl.order,
                        });
                        setShowTemplateModal(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Violation Modal */}
      {(showAddModal || editingRecord) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingRecord ? 'Chỉnh sửa vi phạm' : 'Ghi nhận vi phạm mới'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingRecord(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Template Picker */}
            {templates.length > 0 && !editingRecord && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                  Gợi ý nhanh (nhấn để chọn):
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border border-slate-100 rounded-xl bg-slate-50">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl)}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-600 transition"
                    >
                      {tpl.title} (-{tpl.defaultPoints}đ)
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveViolation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Học sinh vi phạm <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={recordForm.studentId}
                  onChange={(e) => setRecordForm({ ...recordForm, studentId: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Nội dung vi phạm <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Chọn nhanh hoặc tự nhập</span>
                </div>
                <input
                  type="text"
                  required
                  value={recordForm.title}
                  onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })}
                  placeholder="Ví dụ: Không làm bài tập về nhà, Sử dụng điện thoại..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                {/* Quick note chips inside modal */}
                {quickNotes.length > 0 && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1">
                      <Zap className="w-3 h-3 text-amber-500" />
                      <span>Chọn nhanh lỗi:</span>
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {quickNotes.map((note, idx) => {
                        const isSelected = recordForm.title === note.title && recordForm.pointsDeducted === note.points;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setRecordForm((prev) => ({
                                ...prev,
                                title: note.title,
                                pointsDeducted: note.points,
                              }))
                            }
                            className={`px-2 py-0.5 text-xs rounded-md border transition flex items-center space-x-1 ${
                              isSelected
                                ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                          >
                            <span>{note.title}</span>
                            <span className="font-mono text-rose-600 font-bold text-[10px]">
                              (-{note.points}đ)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày xảy ra
                  </label>
                  <input
                    type="date"
                    value={recordForm.date}
                    onChange={(e) => setRecordForm({ ...recordForm, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Điểm trừ
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={recordForm.pointsDeducted}
                    onChange={(e) =>
                      setRecordForm({
                        ...recordForm,
                        pointsDeducted: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={recordForm.isPublic}
                    onChange={(e) => setRecordForm({ ...recordForm, isPublic: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-slate-800">
                    Hiển thị trên Sổ liên lạc của Phụ huynh
                  </span>
                </label>
                <p className="text-xs text-slate-400 pl-6">
                  Nếu bỏ chọn, chỉ GVCN mới xem được ghi nhận này.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú chi tiết
                </label>
                <textarea
                  value={recordForm.notes}
                  onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                  placeholder="Ghi chú thêm về biện pháp nhắc nhở..."
                  rows={2}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
                >
                  {editingRecord ? 'Cập nhật' : 'Lưu vi phạm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {showAddTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Thêm Giao dịch Thi đua ({selectedMonth})
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTxModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Loại giao dịch
                  </label>
                  <select
                    value={txForm.type}
                    onChange={(e) =>
                      setTxForm({ ...txForm, type: e.target.value as 'plus' | 'minus' })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="plus">Cộng điểm (+)</option>
                    <option value="minus">Trừ điểm (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Số điểm
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={txForm.points}
                    onChange={(e) =>
                      setTxForm({ ...txForm, points: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nội dung thi đua <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={txForm.content}
                  onChange={(e) => setTxForm({ ...txForm, content: e.target.value })}
                  placeholder="Ví dụ: Đạt giải Nhất báo tường, Vệ sinh lớp sạch sẽ..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Áp dụng cho
                </label>
                <select
                  value={txForm.studentId}
                  onChange={(e) => setTxForm({ ...txForm, studentId: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">Toàn thể lớp học</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      Học sinh: {s.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  Lưu giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Template Modal */}
      {(showTemplateModal || editingTemplate) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingTemplate ? 'Chỉnh sửa mẫu vi phạm' : 'Thêm mẫu vi phạm nhanh'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  setEditingTemplate(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tên vi phạm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  placeholder="Ví dụ: Không thuộc bài, Đi trễ..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Danh mục
                  </label>
                  <input
                    type="text"
                    value={templateForm.category}
                    onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                    placeholder="Kỷ luật, Học tập..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Điểm trừ mặc định
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={templateForm.defaultPoints}
                    onChange={(e) =>
                      setTemplateForm({
                        ...templateForm,
                        defaultPoints: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  {editingTemplate ? 'Cập nhật' : 'Thêm mẫu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
