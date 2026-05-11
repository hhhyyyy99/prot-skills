import { Settings } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">设置</h2>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Settings size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          应用设置
        </h3>
        <p className="text-gray-500 mb-4">
          配置 Skill 源、存储位置等
        </p>
        <p className="text-sm text-gray-400">
          此功能将在后续版本实现
        </p>
      </div>
    </div>
  );
}
