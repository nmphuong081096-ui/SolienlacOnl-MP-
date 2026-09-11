import React from 'react';
import {
  GraduationCap,
  CalendarCheck,
  AlertTriangle,
  MessageSquare,
  Bus,
  Home,
  User,
  ShieldCheck,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode
} from 'lucide-react';
import { ParentStudentData } from '../types';

interface ParentStudentPortalProps {
  data: ParentStudentData;
  isPreviewMode?: boolean;
}

export const ParentStudentPortal: React.FC<ParentStudentPortalProps> = ({
  data,
  isPreviewMode = false,
}) => {
  const { student, classInfo, teacherNote, attendance, assessments, violations } = data;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    currentUrl
  )}`;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md mb-2 inline-block">
              Sổ Liên Lạc Điện Tử 360
            </span>
            <h1 className="text-2xl font-black text-slate-900">{student.fullName}</h1>
            <p className="text-sm text-slate-500 mt-1">
              Lớp <strong>{classInfo.className}</strong> • Năm học {classInfo.academicYear} • GVCN: <strong>{classInfo.teacherName}</strong>
            </p>
          </div>

          <div className="flex flex-col items-center p-2 bg-slate-50 rounded-xl border border-slate-100">
            <img
              src={qrCodeUrl}
              alt="Mã QR Sổ liên lạc"
              className="w-20 h-20 rounded-lg"
              loading="lazy"
            />
            <span className="text-[10px] text-slate-400 mt-1 font-mono">Mã QR riêng</span>
          </div>
        </div>

        {/* Student Quick Facts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-4 border-t border-slate-100 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-slate-400 block">Giới tính</span>
            <span className="font-semibold text-slate-800">{student.gender}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-slate-400 block">Ngày sinh</span>
            <span className="font-semibold text-slate-800">{student.dob || '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-slate-400 block">Bán trú</span>
            <span
              className={`font-semibold ${
                student.isBoarding ? 'text-emerald-700' : 'text-slate-500'
              }`}
            >
              {student.isBoarding ? 'CÓ tham gia' : 'Không'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50">
            <span className="text-slate-400 block">Xe bus trường</span>
            <span
              className={`font-semibold ${
                student.usesBus ? 'text-indigo-700' : 'text-slate-500'
              }`}
            >
              {student.usesBus ? 'CÓ đưa đón' : 'Không'}
            </span>
          </div>
        </div>
      </div>

      {/* Teacher Private Note */}
      {teacherNote && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm mb-1.5">
            <MessageSquare className="w-4 h-4 text-amber-700" />
            <span>Lời nhắn riêng từ Giáo viên chủ nhiệm:</span>
          </div>
          <p className="text-sm text-amber-900/90 whitespace-pre-line leading-relaxed pl-6">
            "{teacherNote}"
          </p>
          <span className="text-[11px] text-amber-700 block text-right mt-2 font-medium">
            — {classInfo.teacherName} (SĐT: {classInfo.teacherPhone || 'Chưa cập nhật'})
          </span>
        </div>
      )}

      {/* Attendance Section - Không hiện ngày HS có mặt, chỉ hiện các ngày/buổi vắng hoặc đi trễ */}
      {(() => {
        const absenceRecords = attendance.filter((r) => r.status !== 'present');

        return (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Ghi nhận Nghỉ học & Đi trễ ({absenceRecords.length})
                </h2>
              </div>
            </div>

            {absenceRecords.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center space-x-3 text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs sm:text-sm font-semibold">
                    Học sinh đi học đầy đủ, chuyên cần tốt
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Không có ghi nhận vắng học hoặc đi trễ.
                  </p>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3.5 py-2.5">Ngày</th>
                      <th className="px-3.5 py-2.5 text-center">Buổi</th>
                      <th className="px-3.5 py-2.5 text-center">Trạng thái</th>
                      <th className="px-3.5 py-2.5">Lý do</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {absenceRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5 font-mono font-medium">{r.date}</td>
                        <td className="px-3.5 py-2.5 text-center font-bold">
                          {r.session === 'morning' ? 'Sáng' : 'Chiều'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              r.status === 'excused'
                                ? 'bg-amber-100 text-amber-800'
                                : r.status === 'unexcused'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {r.status === 'excused'
                              ? 'Nghỉ có phép'
                              : r.status === 'unexcused'
                              ? 'Nghỉ không phép'
                              : 'Đi trễ'}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-500">{r.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Assessment Scores Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Điểm Kiểm tra & Đánh giá</h2>
        </div>

        {(() => {
          const batchesWithScores = assessments
            .map((a) => {
              const validScores = Object.entries(a.scores).filter(
                ([, score]) =>
                  score !== null &&
                  score !== undefined &&
                  String(score).trim() !== '' &&
                  String(score) !== '—'
              );
              return { batch: a.batch, validScores };
            })
            .filter((item) => item.validScores.length > 0);

          if (batchesWithScores.length === 0) {
            return (
              <p className="text-sm text-slate-400 text-center py-4">
                Chưa có điểm kiểm tra nào được ghi nhận cho học sinh này.
              </p>
            );
          }

          return (
            <div className="space-y-4">
              {batchesWithScores.map(({ batch, validScores }) => (
                <div
                  key={batch.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{batch.name}</h3>
                      <span className="text-xs text-slate-400">
                        {batch.semester} • Ngày kiểm tra: {batch.date}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold font-mono">
                      {validScores.length} môn có điểm
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {validScores.map(([subject, score]) => (
                      <div
                        key={subject}
                        className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between shadow-2xs"
                      >
                        <span className="text-xs font-semibold text-slate-700">{subject}</span>
                        <span className="text-sm font-mono font-bold text-indigo-600">
                          {score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Violations Section */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-500" />
          <h2 className="text-base font-bold text-slate-900">
            Kỷ luật & Nhắc nhở ({violations.length})
          </h2>
        </div>

        {violations.length === 0 ? (
          <p className="text-sm text-emerald-700 font-medium text-center py-3 bg-emerald-50 rounded-xl">
            Tốt! Học sinh chấp hành tốt nội quy lớp và nhà trường, không có vi phạm.
          </p>
        ) : (
          <div className="space-y-2">
            {violations.map((v) => (
              <div
                key={v.id}
                className="p-3 rounded-xl bg-rose-50/50 border border-rose-100 flex items-center justify-between text-xs"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{v.title}</h4>
                  <span className="text-slate-400">
                    Ngày: {v.date} {v.notes ? `• ${v.notes}` : ''}
                  </span>
                </div>
                <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                  -{v.pointsDeducted} đ
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center text-xs text-slate-400 py-4">
        GVCN 360 MINI • Cổng thông tin tương tác Gia đình - Nhà trường
      </div>
    </div>
  );
};
