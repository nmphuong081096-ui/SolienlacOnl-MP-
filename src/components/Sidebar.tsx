import React from 'react';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FileSpreadsheet,
  AlertTriangle,
  BookOpen,
  Settings,
  X
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'students'
  | 'attendance'
  | 'assessments'
  | 'violations'
  | 'parent_portal'
  | 'portal'
  | 'settings';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

interface MenuItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  num: number;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'overview', label: 'TỔNG QUAN', icon: LayoutDashboard, num: 1 },
  { id: 'students', label: 'HỌC SINH', icon: Users, num: 2 },
  { id: 'attendance', label: 'ĐIỂM DANH', icon: CalendarCheck, num: 3 },
  { id: 'assessments', label: 'ĐIỂM KIỂM TRA', icon: FileSpreadsheet, num: 4 },
  { id: 'violations', label: 'VI PHẠM', icon: AlertTriangle, num: 5 },
  { id: 'parent_portal', label: 'SỔ LIÊN LẠC', icon: BookOpen, num: 6 },
  { id: 'settings', label: 'CÀI ĐẶT', icon: Settings, num: 7 },
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  isOpen,
  onClose,
}) => {
  const isMobileOpen = Boolean(isOpenMobile ?? isOpen);
  const handleClose = () => {
    if (typeof onCloseMobile === 'function') {
      onCloseMobile();
    }
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 shadow-lg lg:shadow-none">
      {/* Mobile close button header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200">
        <span className="font-bold text-slate-800">MENU ĐIỀU HƯỚNG</span>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentTab === item.id ||
            (item.id === 'parent_portal' && currentTab === 'portal');
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                handleClose();
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-white' : 'text-slate-500'
                }`}
              />
              <span className="flex-1 text-left truncate">{item.label}</span>
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                  isActive
                    ? 'bg-indigo-700 text-indigo-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {item.num}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer Branding */}
      <div className="p-4 border-t border-slate-200 text-xs text-slate-400 text-center">
        GVCN 360 MINI • v1.0
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:block shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile drawer with backdrop */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={handleClose}
          />
          <div className="relative z-10">{content}</div>
        </div>
      )}
    </>
  );
};
