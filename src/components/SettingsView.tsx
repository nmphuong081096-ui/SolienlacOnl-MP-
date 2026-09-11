import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  Database,
  Building,
  User,
  Phone,
  Mail,
  Calendar,
  Layers,
  Download,
  Upload,
  AlertCircle
} from 'lucide-react';
import { ClassInfo } from '../types';
import { classSettingsService } from '../services/classSettingsService';
import { storage } from '../services/storage';

interface SettingsViewProps {
  onSettingsSaved?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSettingsSaved }) => {
  const [formData, setFormData] = useState<ClassInfo>({
    className: '12A1',
    academicYear: '2024 - 2025',
    teacherName: 'Nguyễn Văn Minh',
    teacherPhone: '0912345678',
    teacherEmail: '',
    schoolName: 'THPT Chuyên',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeStorage, setActiveStorage] = useState<'firestore' | 'localStorage'>('localStorage');

  useEffect(() => {
    classSettingsService.getInfo().then((info) => {
      setFormData(info);
      setLoading(false);
    });
    setActiveStorage(storage.getActiveDriver());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await classSettingsService.updateInfo(formData);
      setSaveSuccess(true);
      if (onSettingsSaved) onSettingsSaved();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  // Export all class data as JSON backup
  const handleExportBackup = async () => {
    const backup = {
      version: 'GVCN_360_MINI_1.0',
      exportedAt: new Date().toISOString(),
      classInfo: await storage.get<ClassInfo>('class_info'),
      students: await storage.get('students'),
      attendance: await storage.get('attendance'),
      assessmentBatches: await storage.get('assessment_batches'),
      assessmentScores: await storage.get('assessment_scores'),
      violations: await storage.get('violations'),
      competitionTransactions: await storage.get('competition_transactions'),
      violationTemplates: await storage.get('violation_templates'),
      parentTokens: await storage.get('parent_portal_tokens'),
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${formData.className}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Cài đặt Thông tin Lớp & Hệ thống</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Quản lý thông tin chung của lớp chủ nhiệm, liên hệ giáo viên và trạng thái đồng bộ dữ liệu.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span>Thông tin lớp học đã được cập nhật thành công!</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>Thông tin Lớp & Trường học</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tên lớp chủ nhiệm <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                placeholder="Ví dụ: 12A1"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Năm học <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="Ví dụ: 2024 - 2025"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Trường học
            </label>
            <input
              type="text"
              value={formData.schoolName || ''}
              onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
              placeholder="Ví dụ: THPT Chuyên..."
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
            <User className="w-5 h-5 text-indigo-600" />
            <span>Thông tin Giáo viên Chủ nhiệm</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Họ và tên GVCN <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.teacherName}
                onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                placeholder="Nguyễn Văn Minh"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                value={formData.teacherPhone || ''}
                onChange={(e) => setFormData({ ...formData, teacherPhone: e.target.value })}
                placeholder="0912345678"
                className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Email công tác
            </label>
            <input
              type="email"
              value={formData.teacherEmail || ''}
              onChange={(e) => setFormData({ ...formData, teacherEmail: e.target.value })}
              placeholder="giaovien@school.edu.vn"
              className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Storage status & Backup */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Database className="w-5 h-5 text-indigo-600" />
            <span>Trạng thái Cơ sở dữ liệu & Sao lưu</span>
          </h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activeStorage === 'firestore' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="text-sm font-bold text-slate-800">
                  {activeStorage === 'firestore'
                    ? 'Cloud Firestore (Database chính)'
                    : 'LocalStorage Browser (Phương án dự phòng)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dữ liệu được lưu trữ trực tiếp, không bị mất sau khi tải lại trang (F5).
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportBackup}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-xs"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Xuất bản sao lưu (JSON)</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition flex items-center space-x-2 shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Đang lưu...' : 'Lưu tất cả thay đổi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
