import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Save,
  CheckCheck,
  Filter
} from 'lucide-react';
import { Student, AttendanceRecord, AttendanceSession, AttendanceStatus } from '../types';
import { studentService } from '../services/studentService';
import { attendanceService } from '../services/attendanceService';

export const AttendanceView: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [currentSession, setCurrentSession] = useState<AttendanceSession>('morning');
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');

  // Attendance state for currently selected date & session
  // studentId -> { status, reason }
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; reason: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // History state
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [historyFilterSession, setHistoryFilterSession] = useState<string>('all');
  const [historyFilterStatus, setHistoryFilterStatus] = useState<string>('all');
  const [historySearchName, setHistorySearchName] = useState<string>('');

  // Load students
  useEffect(() => {
    studentService.getAll().then((data) => setStudents(data));
  }, []);

  // Load records for the selected date & session
  const loadDaySessionData = async () => {
    try {
      const records = await attendanceService.getByDateAndSession(
        currentDate,
        currentSession
      );
      const newMap: Record<string, { status: AttendanceStatus; reason: string }> = {};
      records.forEach((r) => {
        newMap[r.studentId] = {
          status: r.status,
          reason: r.reason || '',
        };
      });
      setAttendanceMap(newMap);
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  };

  useEffect(() => {
    loadDaySessionData();
  }, [currentDate, currentSession]);

  // Load all records when entering history tab
  const loadHistoryData = async () => {
    const all = await attendanceService.getAll();
    setAllRecords(all);
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryData();
    }
  }, [activeTab]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status,
        reason: prev[studentId]?.reason || '',
      },
    }));
  };

  const handleReasonChange = (studentId: string, reason: string) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'excused',
        reason,
      },
    }));
  };

  const handleMarkAllPresent = () => {
    const updated = { ...attendanceMap };
    students.forEach((s) => {
      if (!updated[s.id] || updated[s.id].status === 'present') {
        updated[s.id] = { status: 'present', reason: '' };
      }
    });
    setAttendanceMap(updated);
  };

  const handleSaveAttendance = async () => {
    setIsSaving(true);
    try {
      const recordsToSave: AttendanceRecord[] = students.map((s) => {
        const item = attendanceMap[s.id];
        return {
          id: `${s.id}_${currentDate}_${currentSession}`,
          studentId: s.id,
          date: currentDate,
          session: currentSession,
          status: item ? item.status : 'present', // Default to present if not marked
          reason: item?.reason || '',
          recordedAt: new Date().toISOString(),
        };
      });

      await attendanceService.saveBatch(recordsToSave);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save attendance error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // History filtering
  const studentLookup = new Map<string, string>(students.map((s) => [s.id, s.fullName]));
  const filteredHistory = allRecords.filter((r) => {
    if (historyFilterSession !== 'all' && r.session !== historyFilterSession) {
      return false;
    }
    if (historyFilterStatus !== 'all' && r.status !== historyFilterStatus) {
      return false;
    }
    if (historySearchName.trim()) {
      const name = studentLookup.get(r.studentId) || '';
      if (!name.toLowerCase().includes(historySearchName.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Điểm danh Lớp học</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý chuyên cần theo 2 buổi: Sáng & Chiều. Dữ liệu liên thông Sổ liên lạc.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('input')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'input'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Nhập điểm danh</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === 'history'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Lịch sử điểm danh</span>
          </button>
        </div>
      </div>

      {activeTab === 'input' ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Ngày điểm danh
                </label>
                <input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Buổi học
                </label>
                <div className="inline-flex rounded-xl border border-slate-200 p-0.5 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setCurrentSession('morning')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      currentSession === 'morning'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    SÁNG
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentSession('afternoon')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      currentSession === 'afternoon'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    CHIỀU
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition flex items-center space-x-1.5"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Tất cả có mặt</span>
              </button>

              <button
                type="button"
                disabled={isSaving || students.length === 0}
                onClick={handleSaveAttendance}
                className="px-5 py-2 text-xs sm:text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition flex items-center space-x-1.5 shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'LƯU ĐIỂM DANH'}</span>
              </button>
            </div>
          </div>

          {/* Success Notification */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Đã lưu điểm danh buổi {currentSession === 'morning' ? 'Sáng' : 'Chiều'} ngày {currentDate} thành công!</span>
            </div>
          )}

          {/* Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-12">STT</th>
                    <th className="px-4 py-3.5 min-w-[180px]">Họ và tên</th>
                    <th className="px-4 py-3.5 min-w-[320px]">Trạng thái</th>
                    <th className="px-4 py-3.5">Lý do (nếu vắng / trễ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-400">
                        Chưa có học sinh trong danh sách. Vui lòng thêm học sinh ở menu Học sinh trước.
                      </td>
                    </tr>
                  ) : (
                    students.map((s, idx) => {
                      const record = attendanceMap[s.id] || { status: 'present', reason: '' };
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {s.fullName}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {/* Có mặt */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, 'present')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                                  record.status === 'present'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Có mặt</span>
                              </button>

                              {/* Nghỉ có phép */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, 'excused')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                                  record.status === 'excused'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Nghỉ có phép</span>
                              </button>

                              {/* Nghỉ không phép */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, 'unexcused')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                                  record.status === 'unexcused'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Không phép</span>
                              </button>

                              {/* Đi trễ */}
                              <button
                                type="button"
                                onClick={() => handleStatusChange(s.id, 'late')}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                                  record.status === 'late'
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Đi trễ</span>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={record.reason}
                              onChange={(e) => handleReasonChange(s.id, e.target.value)}
                              placeholder={
                                record.status === 'present'
                                  ? 'Bình thường'
                                  : 'Nhập lý do nghỉ / đi trễ...'
                              }
                              className="w-full max-w-sm px-3 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="space-y-4">
          {/* History Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={historySearchName}
                onChange={(e) => setHistorySearchName(e.target.value)}
                placeholder="Tìm theo tên học sinh..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={historyFilterSession}
                onChange={(e) => setHistoryFilterSession(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Tất cả buổi (Sáng & Chiều)</option>
                <option value="morning">Chỉ buổi Sáng</option>
                <option value="afternoon">Chỉ buổi Chiều</option>
              </select>

              <select
                value={historyFilterStatus}
                onChange={(e) => setHistoryFilterStatus(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="excused">Nghỉ có phép</option>
                <option value="unexcused">Nghỉ không phép</option>
                <option value="late">Đi trễ</option>
                <option value="present">Có mặt</option>
              </select>
            </div>
          </div>

          {/* History Records Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Ngày</th>
                    <th className="px-4 py-3.5 text-center">Buổi</th>
                    <th className="px-4 py-3.5">Học sinh</th>
                    <th className="px-4 py-3.5 text-center">Trạng thái</th>
                    <th className="px-4 py-3.5">Lý do</th>
                    <th className="px-4 py-3.5 text-slate-400 text-xs">Ghi nhận lúc</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-400">
                        Chưa có dữ liệu lịch sử phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                          {r.date}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs px-2 py-0.5 rounded font-bold ${
                              r.session === 'morning'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            {r.session === 'morning' ? 'Sáng' : 'Chiều'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {studentLookup.get(r.studentId) || 'Học sinh'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                              r.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'excused'
                                ? 'bg-amber-100 text-amber-800'
                                : r.status === 'unexcused'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {r.status === 'present'
                              ? 'Có mặt'
                              : r.status === 'excused'
                              ? 'Nghỉ có phép'
                              : r.status === 'unexcused'
                              ? 'Nghỉ không phép'
                              : 'Đi trễ'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {r.reason || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                          {new Date(r.recordedAt).toLocaleString('vi-VN')}
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
    </div>
  );
};
