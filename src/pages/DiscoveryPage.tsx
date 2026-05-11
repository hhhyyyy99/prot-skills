import { Package } from 'lucide-react';

export function DiscoveryPage() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">发现 Skills</h2>
      
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Skill 市场
        </h3>
        <p className="text-gray-500 mb-4">
          从 skills.sh 或 GitHub 仓库发现 Skills
        </p>
        <p className="text-sm text-gray-400">
          此功能将在后续版本实现
        </p>
      </div>
    </div>
  );
}
