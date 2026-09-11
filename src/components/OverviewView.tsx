import React, { useEffect, useState } from 'react';
import {
  Users,
  CalendarCheck,
  Award,
  AlertTriangle,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Student, AttendanceRecord, AssessmentBatch, ViolationRecord, EmulationRank } from '../types';
import { studentService } from '../services/studentService';
import { attendanceService } from '../services/attendanceService';
import { assessmentService } from '../services/assessmentService';
import { violationService } from '../services/violationService';
import { competitionService, MonthSummary } from '../services/competitionService';
import { NavTab } from './Sidebar';

interface OverviewViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [batches, setBatches] = useState<AssessmentBatch[]>([]);
  const [recentViolations, setRecentViolations] = useState<ViolationRecord[]>([]);
  const [emulationSummary, setEmulationSummary] = useState<MonthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.substring(0, 7);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [stdList, allAtt, bList, vList, emu] = await Promise.all([
          studentService.getAll(),
          attendanceService.getAll(),
          assessmentService.getBatches(),
          violationService.getAll(),
          competitionService.getMonthlySummary(currentMonthStr),
        ]);

        setStudents(stdList);
        setTodayAttendance(allAtt.filter((a) => a.date === todayStr));
        setBatches(bList);
        setRecentViolations(vList.slice(0, 5));
        setEmulationSummary(emu);
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [todayStr, currentMonthStr]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Attendance stats for today
  const morningAtt = todayAttendance.filter((a) => a.session === 'morning');
  const afternoonAtt = todayAttendance.filter((a) => a.session === 'afternoon');

  const getSessionStats = (records: AttendanceRecord[]) => {
    const present = records.filter((r) => r.status === 'present').length;
    const excused = records.filter((r) => r.status === 'excused').length;
    const unexcused = records.filter((r) => r.status === 'unexcused').length;
    const late = records.filter((r) => r.status === 'late').length;
    return { present, excused, unexcused, late, totalMarked: records.length };
  };

  const mStats = getSessionStats(morningAtt);
  const aStats = getSessionStats(afternoonAtt);

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
      {/* Top Header & Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tổng quan Lớp học</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Điểm danh ngay</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('assessments')}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xem điểm</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sĩ số */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sĩ số học sinh</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{students.length}</span>
            <span className="text-xs text-indigo-600 font-medium flex items-center">
              Chi tiết <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {students.filter((s) => s.isBoarding).length} bán trú • {students.filter((s) => s.usesBus).length} xe bus
          </p>
        </div>

        {/* Điểm danh sáng */}
        <div
          onClick={() => onNavigate('attendance')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Điểm danh Sáng</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">
              {mStats.totalMarked > 0 ? `${mStats.present}/${students.length || mStats.totalMarked}` : 'Chưa điểm danh'}
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center">
              Vào điểm danh <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {mStats.excused > 0 && <span className="text-amber-600 font-medium">{mStats.excused} có phép • </span>}
            {mStats.unexcused > 0 && <span className="text-rose-600 font-medium">{mStats.unexcused} không phép • </span>}
            {mStats.late > 0 && <span className="text-indigo-600 font-medium">{mStats.late} đi trễ</span>}
            {mStats.excused === 0 && mStats.unexcused === 0 && mStats.late === 0 && 'Chuyên cần đầy đủ'}
          </p>
        </div>

        {/* Thi đua tháng */}
        <div
          onClick={() => onNavigate('settings')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Thi đua {currentMonthStr}</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{emulationSummary?.finalScore ?? 100} đ</span>
            {emulationSummary && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${getRankBadgeClass(emulationSummary.rank)}`}>
                {emulationSummary.rank}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Cộng: +{emulationSummary?.totalPlus || 0} • Trừ: -{emulationSummary?.totalMinus || 0}
          </p>
        </div>

        {/* Vi phạm */}
        <div
          onClick={() => onNavigate('violations')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-300 hover:shadow-md transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Vi phạm ghi nhận</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{recentViolations.length}</span>
            <span className="text-xs text-rose-600 font-medium flex items-center">
              Xem sổ <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {recentViolations.filter((v) => v.isPublic).length} trường hợp thông báo phụ huynh
          </p>
        </div>
      </div>

      {/* Main Grid: Attendance detail & Recent violations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Chi tiết chuyên cần hôm nay</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Xem tất cả
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* Morning */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-800">Buổi Sáng</span>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                  {mStats.totalMarked}/{students.length} đã điểm danh
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-emerald-700">
                  <span>Có mặt:</span>
                  <span className="font-bold">{mStats.present}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Nghỉ có phép:</span>
                  <span className="font-bold">{mStats.excused}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Nghỉ không phép:</span>
                  <span className="font-bold">{mStats.unexcused}</span>
                </div>
                <div className="flex justify-between text-indigo-700">
                  <span>Đi trễ:</span>
                  <span className="font-bold">{mStats.late}</span>
                </div>
              </div>
            </div>

            {/* Afternoon */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-sm text-slate-800">Buổi Chiều</span>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                  {aStats.totalMarked}/{students.length} đã điểm danh
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-emerald-700">
                  <span>Có mặt:</span>
                  <span className="font-bold">{aStats.present}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>Nghỉ có phép:</span>
                  <span className="font-bold">{aStats.excused}</span>
                </div>
                <div className="flex justify-between text-rose-700">
                  <span>Nghỉ không phép:</span>
                  <span className="font-bold">{aStats.unexcused}</span>
                </div>
                <div className="flex justify-between text-indigo-700">
                  <span>Đi trễ:</span>
                  <span className="font-bold">{aStats.late}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Batches */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">Các kỳ kiểm tra gần đây</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('assessments')}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
            >
              Quản lý kỳ thi
            </button>
          </div>

          <div className="mt-4">
            {batches.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Chưa có kỳ kiểm tra nào. Nhấn "Quản lý kỳ thi" để tạo kỳ đầu tiên.
              </div>
            ) : (
              <div className="space-y-2.5">
                {batches.slice(0, 4).map((b) => (
                  <div
                    key={b.id}
                    onClick={() => onNavigate('assessments')}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition cursor-pointer border border-slate-100"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900">{b.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {b.semester} • {b.subjects.length} môn: {b.subjects.join(', ')}
                      </p>
                    </div>
                    <span className="text-xs bg-white text-indigo-600 px-2.5 py-1 rounded-md font-medium border border-slate-200">
                      Chi tiết
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
