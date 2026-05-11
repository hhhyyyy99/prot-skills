import { Package, Folder, Wrench, Search, Settings } from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

const menuItems = [
  { id: 'discovery', label: '发现', icon: Package },
  { id: 'my-skills', label: '我的 Skills', icon: Folder },
  { id: 'tools', label: '工具管理', icon: Wrench },
  { id: 'migrate', label: '本地迁移', icon: Search },
  { id: 'settings', label: '设置', icon: Settings },
];

export function Sidebar({ activePage, onPageChange }: SidebarProps) {
  return (
    <div className="w-48 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold">AI Skills</h1>
        <p className="text-xs text-gray-400">Manager</p>
      </div>
      
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
