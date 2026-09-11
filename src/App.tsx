import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { StudentsView } from './components/StudentsView';
import { AttendanceView } from './components/AttendanceView';
import { AssessmentsView } from './components/AssessmentsView';
import { ViolationsView } from './components/ViolationsView';
import { ParentPortalView } from './components/ParentPortalView';
import { SettingsView } from './components/SettingsView';
import { ParentStudentPortal } from './components/ParentStudentPortal';
import { classSettingsService } from './services/classSettingsService';
import { parentPortalService } from './services/parentPortalService';
import { storage } from './services/storage';
import { ClassInfo, ParentStudentData } from './types';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classInfo, setClassInfo] = useState<ClassInfo>({
    className: '12A1',
    academicYear: '2024 - 2025',
    teacherName: 'Nguyễn Văn Minh',
    schoolName: 'THPT Chuyên',
  });
  const [activeStorage, setActiveStorage] = useState<'firestore' | 'localStorage'>('localStorage');

  // Parent Portal via URL Token: ?token=...
  const [parentToken, setParentToken] = useState<string | null>(null);
  const [parentData, setParentData] = useState<ParentStudentData | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);

  // Load class info and storage status
  const refreshClassInfo = async () => {
    try {
      const info = await classSettingsService.getInfo();
      setClassInfo(info);
      setActiveStorage(storage.getActiveDriver());
    } catch (err) {
      console.error('Error loading class info:', err);
    }
  };

  useEffect(() => {
    refreshClassInfo();

    // Check URL parameters for parent token
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setParentToken(token);
      loadParentView(token);
    }
  }, []);

  const loadParentView = async (token: string) => {
    setParentLoading(true);
    setParentError(null);
    try {
      const data = await parentPortalService.getStudentDataByToken(token);
      if (data) {
        setParentData(data);
      } else {
        setParentError('Mã truy cập Sổ liên lạc không hợp lệ hoặc đã hết hạn.');
      }
    } catch (err) {
      console.error('Error loading parent portal:', err);
      setParentError('Không thể kết nối máy chủ sổ liên lạc.');
    } finally {
      setParentLoading(false);
    }
  };

  // If a parent accesses via token, display dedicated, clean Parent View
  if (parentToken) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
        <div className="max-w-2xl mx-auto mb-4">
          <button
            type="button"
            onClick={() => {
              window.location.href = window.location.pathname;
            }}
            className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-800 transition py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Đăng nhập dành cho Giáo viên chủ nhiệm</span>
          </button>
        </div>

        {parentLoading ? (
          <div className="text-center py-20 text-slate-400">
            Đang tải dữ liệu Sổ liên lạc điện tử...
          </div>
        ) : parentError ? (
          <div className="max-w-md mx-auto bg-white p-8 rounded-2xl border border-rose-200 shadow-sm text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Truy cập không thành công</h3>
            <p className="text-xs text-slate-500 mb-6">{parentError}</p>
            <button
              type="button"
              onClick={() => {
                window.location.href = window.location.pathname;
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Về trang chủ
            </button>
          </div>
        ) : parentData ? (
          <ParentStudentPortal data={parentData} />
        ) : null}
      </div>
    );
  }

  // Teacher Main Application View
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <Header
        classInfo={classInfo}
        activeStorage={activeStorage}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setSidebarOpen(false);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isOpenMobile={sidebarOpen}
          onCloseMobile={() => setSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentTab === 'overview' && (
              <OverviewView onNavigate={(tab) => setCurrentTab(tab)} />
            )}
            {currentTab === 'students' && <StudentsView />}
            {currentTab === 'attendance' && <AttendanceView />}
            {currentTab === 'assessments' && <AssessmentsView />}
            {currentTab === 'violations' && <ViolationsView />}
            {(currentTab === 'parent_portal' || currentTab === 'portal') && <ParentPortalView />}
            {currentTab === 'settings' && (
              <SettingsView onSettingsSaved={refreshClassInfo} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
