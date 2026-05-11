import { useEffect, useState } from 'react';
import { SkillCard } from '../components/SkillCard';
import { getSkills, toggleSkill, uninstallSkill } from '../api';
import type { Skill } from '../types';

export function MySkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const data = await getSkills();
      setSkills(data);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleSkill(id, enabled);
    } catch (error) {
      console.error('Failed to toggle skill:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个 Skill 吗？')) return;
    
    try {
      await uninstallSkill(id);
      setSkills(skills.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete skill:', error);
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
        <h2 className="text-2xl font-bold text-gray-900">我的 Skills</h2>
        <span className="text-sm text-gray-500">
          共 {skills.length} 个 Skill
        </span>
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          还没有安装任何 Skills
          <br />
          <span className="text-sm">去"发现"页面安装一些吧</span>
        </div>
      ) : (
        <div className="space-y-4">
          {skills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
