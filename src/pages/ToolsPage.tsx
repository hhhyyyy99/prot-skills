import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { ToolCard } from '../components/ToolCard';
import { getTools, detectTools, toggleTool } from '../api';
import type { AITool } from '../types';

export function ToolsPage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await getTools();
      setTools(data);
    } catch (error) {
      console.error('Failed to load tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetect = async () => {
    setLoading(true);
    try {
      const data = await detectTools();
      setTools(data);
    } catch (error) {
      console.error('Failed to detect tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleTool(id, enabled);
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">工具管理</h2>
        <button
          onClick={handleDetect}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw size={16} />
          重新检测
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(tool => (
          <ToolCard
            key={tool.id}
            tool={tool}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
