import { useEffect, useState } from 'react';
import { Search, CheckSquare, Square, ArrowRight } from 'lucide-react';
import { getTools, scanLocalSkills, migrateLocalSkill } from '../api';
import type { AITool, LocalSkill } from '../types';

export function MigratePage() {
  const [tools, setTools] = useState<AITool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [skills, setSkills] = useState<LocalSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    loadTools();
  }, []);

  const loadTools = async () => {
    try {
      const data = await getTools();
      setTools(data.filter(t => t.is_detected));
      if (data.length > 0) {
        setSelectedTool(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load tools:', error);
    }
  };

  const handleScan = async () => {
    if (!selectedTool) return;
    
    setLoading(true);
    try {
      const data = await scanLocalSkills(selectedTool);
      setSkills(data);
      setSelectedSkills(new Set());
    } catch (error) {
      console.error('Failed to scan:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (path: string) => {
    const newSet = new Set(selectedSkills);
    if (newSet.has(path)) {
      newSet.delete(path);
    } else {
      newSet.add(path);
    }
    setSelectedSkills(newSet);
  };

  const handleMigrate = async () => {
    if (selectedSkills.size === 0) return;
    
    setMigrating(true);
    try {
      for (const path of selectedSkills) {
        const skill = skills.find(s => s.path === path);
        if (skill) {
          const skillId = skill.name.toLowerCase().replace(/\s+/g, '-');
          await migrateLocalSkill(path, skillId);
        }
      }
      // Refresh list
      await handleScan();
      alert('迁移完成！');
    } catch (error) {
      console.error('Failed to migrate:', error);
      alert('迁移失败，请查看控制台');
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">本地迁移</h2>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <select
            value={selectedTool}
            onChange={(e) => setSelectedTool(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">选择工具</option>
            {tools.map(tool => (
              <option key={tool.id} value={tool.id}>
                {tool.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleScan}
            disabled={!selectedTool || loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Search size={16} />
            {loading ? '扫描中...' : '扫描'}
          </button>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-medium">发现的 Skills ({skills.length})</h3>
            <button
              onClick={handleMigrate}
              disabled={selectedSkills.size === 0 || migrating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <ArrowRight size={16} />
              {migrating ? '迁移中...' : `迁移选中 (${selectedSkills.size})`}
            </button>
          </div>

          <div className="divide-y divide-gray-100">
            {skills.map(skill => (
              <div
                key={skill.path}
                className="p-4 flex items-center gap-4 hover:bg-gray-50"
              >
                <button
                  onClick={() => toggleSelection(skill.path)}
                  className="text-blue-600"
                >
                  {selectedSkills.has(skill.path) ? (
                    <CheckSquare size={20} />
                  ) : (
                    <Square size={20} />
                  )}
                </button>

                <div className="flex-1">
                  <div className="font-medium">{skill.name}</div>
                  <div className="text-sm text-gray-500 font-mono">
                    {skill.path}
                  </div>
                  {skill.is_symlink && (
                    <div className="text-xs text-orange-600 mt-1">
                      软链接 → {skill.target_path}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          选择工具并点击"扫描"发现本地 Skills
        </div>
      )}
    </div>
  );
}
