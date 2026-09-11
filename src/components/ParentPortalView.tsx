import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Copy,
  RefreshCw,
  Eye,
  Check,
  Send,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Phone,
  Bus,
  Home,
  AlertTriangle,
  CalendarCheck,
  GraduationCap
} from 'lucide-react';
import { Student, ParentPortalToken, ParentStudentData } from '../types';
import { studentService } from '../services/studentService';
import { parentPortalService } from '../services/parentPortalService';
import { ParentStudentPortal } from './ParentStudentPortal';

export const ParentPortalView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [tokens, setTokens] = useState<Record<string, ParentPortalToken>>({});
  const [loading, setLoading] = useState(true);
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);

  // Preview modal state
  const [previewStudentId, setPreviewStudentId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<ParentStudentData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Note edit state
  const [editingNoteStudentId, setEditingNoteStudentId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Regenerate confirm
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const studentList = await studentService.getAll();
      setStudents(studentList);

      const tokenMap: Record<string, ParentPortalToken> = {};
      for (const s of studentList) {
        const t = await parentPortalService.getOrCreateToken(s.id);
        tokenMap[s.id] = t;
      }
      setTokens(tokenMap);
    } catch (err) {
      console.error('Error loading parent portal tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getPortalUrl = (token: string) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?token=${token}`;
  };

  const handleCopyLink = (studentId: string, token: string) => {
    const url = getPortalUrl(token);
    navigator.clipboard.writeText(url);
    setCopiedStudentId(studentId);
    setTimeout(() => setCopiedStudentId(null), 2500);
  };

  const handleRegenerate = async (studentId: string) => {
    setRegeneratingId(studentId);
    const newToken = await parentPortalService.regenerateToken(studentId);
    setTokens((prev) => ({
      ...prev,
      [studentId]: newToken,
    }));
    setRegeneratingId(null);
  };

  const handleOpenPreview = async (studentId: string) => {
    const token = tokens[studentId]?.token;
    if (!token) return;

    setPreviewStudentId(studentId);
    setPreviewLoading(true);
    const data = await parentPortalService.getStudentDataByToken(token);
    setPreviewData(data);
    setPreviewLoading(false);
  };

  const handleOpenNoteModal = (student: Student) => {
    setEditingNoteStudentId(student.id);
    const currentToken = tokens[student.id];
    setNoteContent(currentToken?.teacherNote || '');
  };

  const handleSaveNote = async () => {
    if (!editingNoteStudentId) return;
    setIsSavingNote(true);
    await parentPortalService.updateTeacherNote(editingNoteStudentId, noteContent);
    setTokens((prev) => {
      const existing = prev[editingNoteStudentId];
      if (!existing) return prev;
      return {
        ...prev,
        [editingNoteStudentId]: {
          ...existing,
          teacherNote: noteContent,
        },
      };
    });
    setIsSavingNote(false);
    setEditingNoteStudentId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Sổ Liên lạc Trực tuyến</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Mỗi học sinh có 1 mã bảo mật độc quyền (Access Token). Không xem chéo, bảo mật thông tin tối đa.
          </p>
        </div>
      </div>

      {/* Security Info Card */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start space-x-3 text-xs text-indigo-900">
        <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block text-sm font-semibold mb-0.5">Cơ chế Bảo mật Phụ huynh:</strong>
          Đường link và mã QR của mỗi học sinh chứa mã Token riêng biệt. Phụ huynh chỉ xem được dữ liệu của con mình (điểm thi các kỳ, ghi nhận vắng học / đi trễ, vi phạm công khai, lời nhắn riêng của GVCN). Nếu cần đổi mã truy cập, hãy nhấn nút <strong>Tạo lại mã</strong> để thu hồi link cũ.
        </div>
      </div>

      {/* Students Table for Links & QR */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">STT</th>
                <th className="px-4 py-3.5 min-w-[180px]">Học sinh</th>
                <th className="px-4 py-3.5">Mã Token</th>
                <th className="px-4 py-3.5">Lời nhắn GVCN</th>
                <th className="px-4 py-3.5 text-right min-w-[280px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Đang tải danh sách mã truy cập...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    Chưa có học sinh nào. Thêm học sinh ở menu Học sinh để tự động tạo sổ liên lạc.
                  </td>
                </tr>
              ) : (
                students.map((s, idx) => {
                  const tokenObj = tokens[s.id];
                  const tokenStr = tokenObj?.token || '...';
                  const isCopied = copiedStudentId === s.id;
                  const hasNote = Boolean(tokenObj?.teacherNote?.trim());

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900 block">
                          {s.fullName}
                        </span>
                        <span className="text-xs text-slate-400">
                          {s.dob || 'Chưa có ngày sinh'} • {s.parentPhone || 'Chưa có SĐT'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        <span className="bg-slate-100 px-2 py-1 rounded-md text-[11px] font-bold">
                          {tokenStr.substring(0, 10)}...
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {hasNote ? (
                          <div className="flex items-center space-x-1 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg max-w-xs truncate">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{tokenObj?.teacherNote}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có lời nhắn</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        {/* Send / Edit Note */}
                        <button
                          type="button"
                          onClick={() => handleOpenNoteModal(s)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition inline-flex items-center space-x-1"
                          title="Gửi lời nhắn riêng"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Lời nhắn</span>
                        </button>

                        {/* Copy Link */}
                        <button
                          type="button"
                          disabled={!tokenObj}
                          onClick={() => handleCopyLink(s.id, tokenStr)}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition inline-flex items-center space-x-1 ${
                            isCopied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã sao chép</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy link</span>
                            </>
                          )}
                        </button>

                        {/* Preview Portal */}
                        <button
                          type="button"
                          disabled={!tokenObj}
                          onClick={() => handleOpenPreview(s.id)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem trước</span>
                        </button>

                        {/* Regenerate */}
                        <button
                          type="button"
                          disabled={regeneratingId === s.id}
                          onClick={() => handleRegenerate(s.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                          title="Tạo lại mã (thu hồi link cũ)"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              regeneratingId === s.id ? 'animate-spin text-indigo-600' : ''
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Note Modal */}
      {editingNoteStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Lời nhắn riêng cho Phụ huynh
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Lời nhắn này chỉ hiển thị trên Sổ liên lạc của riêng học sinh này.
            </p>

            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Nhập lời nhắn, nhận xét tiến bộ hoặc dặn dò phụ huynh..."
              rows={4}
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4"
            />

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingNoteStudentId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSavingNote}
                onClick={handleSaveNote}
                className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
              >
                {isSavingNote ? 'Đang lưu...' : 'Lưu lời nhắn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-100 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto relative">
            <button
              type="button"
              onClick={() => {
                setPreviewStudentId(null);
                setPreviewData(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 bg-white rounded-full shadow-xs transition"
            >
              ✕
            </button>

            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                Chế độ xem trước của Phụ huynh
              </span>
            </div>

            {previewLoading ? (
              <div className="text-center py-16 text-slate-400">
                Đang nạp dữ liệu Sổ liên lạc...
              </div>
            ) : previewData ? (
              <ParentStudentPortal data={previewData} isPreviewMode={true} />
            ) : (
              <div className="text-center py-16 text-rose-500">
                Không tìm thấy dữ liệu học sinh hoặc Token không hợp lệ.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
