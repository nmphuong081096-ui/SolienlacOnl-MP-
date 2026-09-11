import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  FileSpreadsheet,
  Trash2,
  Edit2,
  Search,
  Check,
  AlertCircle,
  X,
  Upload,
  Bus,
  Home
} from 'lucide-react';
import { Student } from '../types';
import { studentService } from '../services/studentService';
import { parseStudentsFromExcel, ParsedStudentRow } from '../utils/excelParser';

export const StudentsView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');

  // Import Excel state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<ParsedStudentRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Nam',
    dob: '',
    parentPhone: '',
    parentName: '',
    address: '',
    isBoarding: false,
    usesBus: false,
    notes: '',
  });

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentService.getAll();
      setStudents(data);
    } catch (err) {
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  // Filter students
  const filteredStudents = students.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.parentPhone && s.parentPhone.includes(searchQuery))
  );

  const resetForm = () => {
    setFormData({
      fullName: '',
      gender: 'Nam',
      dob: '',
      parentPhone: '',
      parentName: '',
      address: '',
      isBoarding: false,
      usesBus: false,
      notes: '',
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      fullName: student.fullName,
      gender: student.gender,
      dob: student.dob || '',
      parentPhone: student.parentPhone || '',
      parentName: student.parentName || '',
      address: student.address || '',
      isBoarding: student.isBoarding,
      usesBus: student.usesBus,
      notes: student.notes || '',
    });
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return;

    if (editingStudent) {
      await studentService.update({
        ...editingStudent,
        ...formData,
      });
      setEditingStudent(null);
    } else {
      await studentService.add(formData);
      setShowAddModal(false);
    }
    resetForm();
    await loadStudents();
  };

  const handleDeleteSingle = async () => {
    if (!deletingStudent) return;
    await studentService.delete(deletingStudent.id);
    setDeletingStudent(null);
    await loadStudents();
  };

  const handleDeleteAll = async () => {
    if (deleteAllConfirmText.trim().toUpperCase() !== 'XOA HET') return;
    await studentService.deleteAll();
    setShowDeleteAllModal(false);
    setDeleteAllConfirmText('');
    await loadStudents();
  };

  // Excel File Upload & Parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError('');
    const reader = new FileReader();

    reader.onload = (evt) => {
      const buffer = evt.target?.result as ArrayBuffer;
      if (!buffer) return;
      const parsed = parseStudentsFromExcel(buffer);
      if (!parsed.success) {
        setImportError(parsed.error || 'Lỗi định dạng file');
        setImportPreview([]);
      } else {
        setImportPreview(parsed.rows);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    try {
      const toImport = importPreview.map((p) => ({
        order: p.order,
        fullName: p.fullName,
        gender: p.gender,
        dob: p.dob || '',
        parentPhone: p.parentPhone || '',
        parentName: p.parentName || '',
        address: p.address || '',
        isBoarding: p.isBoarding,
        usesBus: p.usesBus,
        notes: '',
      }));
      await studentService.importBatch(toImport);
      setShowImportModal(false);
      setImportPreview([]);
      setImportFileName('');
      await loadStudents();
    } catch (err) {
      console.error('Import error:', err);
      setImportError('Đã xảy ra lỗi khi lưu vào cơ sở dữ liệu.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Danh sách Học sinh</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Tổng cộng: <strong className="text-slate-800">{students.length}</strong> học sinh
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm học sinh</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportPreview([]);
              setImportFileName('');
              setImportError('');
              setShowImportModal(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          {students.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDeleteAllConfirmText('');
                setShowDeleteAllModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa toàn bộ</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm học sinh theo tên hoặc số điện thoại..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-center w-12">STT</th>
                <th className="px-4 py-3.5">Họ và tên</th>
                <th className="px-4 py-3.5 text-center">Giới tính</th>
                <th className="px-4 py-3.5">Ngày sinh</th>
                <th className="px-4 py-3.5 text-center">Bán trú</th>
                <th className="px-4 py-3.5 text-center">Xe bus</th>
                <th className="px-4 py-3.5">SĐT Phụ huynh</th>
                <th className="px-4 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Đang tải danh sách học sinh...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    {students.length === 0
                      ? 'Chưa có học sinh nào. Thêm mới hoặc Import từ Excel để bắt đầu.'
                      : 'Không tìm thấy học sinh nào phù hợp với tìm kiếm.'}
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">
                      {s.order !== undefined ? s.order : idx + 1}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {s.fullName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.gender === 'Nam'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {s.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {s.dob || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.isBoarding ? (
                        <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          CÓ
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Không</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.usesBus ? (
                        <span className="inline-flex items-center text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                          CÓ
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Không</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {s.parentPhone ? (
                        <span>
                          {s.parentPhone}
                          {s.parentName && (
                            <span className="text-slate-400 ml-1">({s.parentName})</span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingStudent(s)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Xóa"
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

      {/* Add / Edit Student Modal */}
      {(showAddModal || editingStudent) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStudent ? 'Chỉnh sửa thông tin học sinh' : 'Thêm học sinh mới'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingStudent(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Giới tính
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ngày sinh (DD/MM/YYYY)
                  </label>
                  <input
                    type="text"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    placeholder="15/08/2008"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Số điện thoại PH
                  </label>
                  <input
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Họ tên Phụ huynh
                  </label>
                  <input
                    type="text"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="Nguyễn Văn Ba"
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Địa chỉ
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Quận/Huyện, Tỉnh/TP"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-6 pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isBoarding}
                    onChange={(e) => setFormData({ ...formData, isBoarding: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Học Bán trú</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.usesBus}
                    onChange={(e) => setFormData({ ...formData, usesBus: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-sm font-medium text-slate-700">Đưa đón Xe bus</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ghi chú nội bộ (GVCN)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú sức khỏe, hoàn cảnh gia đình..."
                  rows={2}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition"
                >
                  {editingStudent ? 'Cập nhật' : 'Thêm học sinh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Single Student Confirmation Modal */}
      {deletingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Xác nhận xóa học sinh</h3>
            <p className="text-sm text-slate-500 mb-5">
              Bạn có chắc chắn muốn xóa học sinh <strong>{deletingStudent.fullName}</strong>? Thao tác này không thể hoàn tác.
            </p>
            <div className="flex space-x-2 justify-center">
              <button
                type="button"
                onClick={() => setDeletingStudent(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDeleteSingle}
                className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 text-center mb-1">
              CẢNH BÁO: Xóa toàn bộ học sinh
            </h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              Thao tác này sẽ xóa toàn bộ <strong>{students.length}</strong> học sinh trong lớp. Sau khi F5 reload trang danh sách sẽ thực sự trống.
            </p>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 mb-4">
              Vui lòng nhập cụm từ <strong>XOA HET</strong> vào ô bên dưới để xác nhận:
            </div>
            <input
              type="text"
              value={deleteAllConfirmText}
              onChange={(e) => setDeleteAllConfirmText(e.target.value)}
              placeholder="Nhập: XOA HET"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4 text-center font-mono font-bold"
            />
            <div className="flex space-x-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteAllModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteAllConfirmText.trim().toUpperCase() !== 'XOA HET'}
                onClick={handleDeleteAll}
                className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Xác nhận Xóa hết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Import Danh sách Học sinh từ Excel
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động tìm header, hỗ trợ cột Họ và tên hoặc Họ lót + Tên, chuẩn hóa Unicode.
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

            {/* File Upload Area */}
            <div className="mb-4">
              <label className="border-2 border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/20 transition">
                <Upload className="w-8 h-8 text-indigo-500 mb-2" />
                <span className="text-sm font-semibold text-slate-700">
                  {importFileName ? importFileName : 'Chọn hoặc kéo thả file Excel (.xlsx, .xls)'}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Nhận diện Bán trú, Xe bus (X, ✓, Có → CÓ; ô trống → Không)
                </span>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {importError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Preview Area */}
            {importPreview.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase">
                    Xem trước ({importPreview.length} học sinh nhận diện được)
                  </span>
                  <span className="text-xs text-emerald-600 font-medium">
                    Sẵn sàng lưu vào hệ thống
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-y-auto max-h-60">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-center w-8">#</th>
                        <th className="px-3 py-2">Họ và tên</th>
                        <th className="px-3 py-2 text-center">Giới tính</th>
                        <th className="px-3 py-2">Ngày sinh</th>
                        <th className="px-3 py-2 text-center">Bán trú</th>
                        <th className="px-3 py-2 text-center">Xe bus</th>
                        <th className="px-3 py-2">SĐT PH</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importPreview.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center text-slate-400 font-mono">
                            {i + 1}
                          </td>
                          <td className="px-3 py-1.5 font-semibold text-slate-900">
                            {row.fullName}
                          </td>
                          <td className="px-3 py-1.5 text-center">{row.gender}</td>
                          <td className="px-3 py-1.5">{row.dob || '—'}</td>
                          <td className="px-3 py-1.5 text-center">
                            {row.isBoarding ? (
                              <span className="text-emerald-700 font-bold">CÓ</span>
                            ) : (
                              <span className="text-slate-400">Không</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            {row.usesBus ? (
                              <span className="text-indigo-700 font-bold">CÓ</span>
                            ) : (
                              <span className="text-slate-400">Không</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5">{row.parentPhone || '—'}</td>
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
                disabled={importPreview.length === 0 || isImporting}
                onClick={handleConfirmImport}
                className="px-5 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isImporting ? 'Đang lưu...' : 'XÁC NHẬN LƯU'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
