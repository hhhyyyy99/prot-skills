import { useState } from 'react';
import { Power, FolderOpen, CheckCircle, XCircle } from 'lucide-react';
import type { AITool } from '../types';

interface ToolCardProps {
  tool: AITool;
  onToggle: (id: string, enabled: boolean) => void;
}

export function ToolCard({ tool, onToggle }: ToolCardProps) {
  const [isEnabled, setIsEnabled] = useState(tool.is_enabled);

  const handleToggle = () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    onToggle(tool.id, newState);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">
              {tool.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{tool.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              {tool.is_detected ? (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle size={12} />
                  已检测
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <XCircle size={12} />
                  未检测
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className={`p-2 rounded transition-colors ${
            isEnabled
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
          }`}
          title={isEnabled ? '禁用' : '启用'}
        >
          <Power size={18} />
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FolderOpen size={14} />
          <span className="font-mono text-xs truncate">
            {tool.custom_path || tool.config_path}
          </span>
        </div>
      </div>
    </div>
  );
}
