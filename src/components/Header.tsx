import React from 'react';
import { Menu, School, User, Calendar, Database } from 'lucide-react';
import { ClassInfo } from '../types';
import { isFirestoreActive } from '../services/firebase';

interface HeaderProps {
  classInfo?: ClassInfo;
  settings?: ClassInfo;
  activeStorage?: 'firestore' | 'localStorage';
  onToggleSidebar?: () => void;
  onOpenMobileMenu?: () => void;
  onNavigateToSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  classInfo,
  settings,
  activeStorage,
  onToggleSidebar,
  onOpenMobileMenu,
  onNavigateToSettings,
}) => {
  const current = classInfo || settings || {
    className: '12A1',
    schoolName: 'THPT Chuyên',
    academicYear: '2024 - 2025',
    teacherName: 'Nguyễn Văn Minh',
  };

  const firestoreConnected = activeStorage === 'firestore' || isFirestoreActive();
  const handleMenuClick = onToggleSidebar || onOpenMobileMenu;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Mobile Menu Button & Brand */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleMenuClick}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Mở menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-xs">
                360
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  GVCN 360 MINI
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  Quản lý Lớp học & Sổ liên lạc Điện tử
                </p>
              </div>
            </div>
          </div>

          {/* Class Information Banner */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              {current.schoolName && (
                <div className="flex items-center space-x-1.5 text-slate-700">
                  <School className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold">{current.schoolName}</span>
                </div>
              )}
              {current.className && (
                <div className="flex items-center space-x-1.5 text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg font-bold">
                  <span>Lớp: {current.className}</span>
                </div>
              )}
              {(current.academicYear || current.schoolYear) && (
                <div className="hidden md:flex items-center space-x-1 text-slate-600">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{current.academicYear || current.schoolYear}</span>
                </div>
              )}
              {(current.teacherName || current.homeroomTeacher) && (
                <div className="hidden lg:flex items-center space-x-1 text-slate-600">
                  <User className="w-3.5 h-3.5" />
                  <span>GVCN: {current.teacherName || current.homeroomTeacher}</span>
                </div>
              )}
            </div>

            {/* Storage status badge */}
            <div
              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full border ${
                firestoreConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold'
                  : 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
              }`}
              title={
                firestoreConnected
                  ? 'Đã kết nối Firebase Firestore'
                  : 'Lưu trữ cục bộ bền bỉ (F5 không mất dữ liệu)'
              }
            >
              <Database className="w-3.5 h-3.5" />
              <span>{firestoreConnected ? 'Cloud Firestore' : 'Lưu trữ bền bỉ'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
