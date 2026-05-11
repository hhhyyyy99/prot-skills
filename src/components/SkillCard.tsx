import { useState } from 'react';
import { FolderOpen, Trash2, Power } from 'lucide-react';
import type { Skill } from '../types';

interface SkillCardProps {
  skill: Skill;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

export function SkillCard({ skill, onToggle, onDelete }: SkillCardProps) {
  const [isEnabled, setIsEnabled] = useState(skill.is_enabled);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    onToggle(skill.id, newState);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{skill.name}</h3>
        <p className="text-sm text-gray-500">ID: {skill.id}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
            {skill.source_type}
          </span>
          {skill.metadata?.version && (
            <span className="text-xs text-gray-400">
              v{skill.metadata.version}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className={`p-2 rounded transition-colors ${
            isEnabled
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={isEnabled ? '禁用' : '启用'}
        >
          <Power size={16} />
        </button>

        <button
          className="p-2 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
          title="打开文件夹"
        >
          <FolderOpen size={16} />
        </button>

        <button
          onClick={() => onDelete(skill.id)}
          className="p-2 rounded bg-red-100 text-red-600 hover:bg-red-200"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
