
import React, { useState, useMemo } from 'react';
import { ProjectImage, AnnotationLine, AnnotationBox } from '../types';
import { 
  BarChart3, Hash, Ruler, 
  ArrowRightLeft, Download,
  List, Table as TableIcon, Trash2, Edit2
} from 'lucide-react';

interface DataTableProps {
  project: ProjectImage;
  selectedId: string | null;
  onUpdateProject: (project: ProjectImage) => void;
  onDeleteAnnotation: (id: string) => void;
}

type ViewMode = 'list' | 'analytics';

export const DataTable: React.FC<DataTableProps> = ({ 
  project, 
  selectedId, 
  onUpdateProject,
  onDeleteAnnotation
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const selectedAnnotation = useMemo(() => {
    return project.lines.find(l => l.id === selectedId) || project.boxes.find(b => b.id === selectedId);
  }, [project, selectedId]);

  const calculateDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const lineAnalytics = useMemo(() => {
    const groups: Record<string, { count: number; totalLen: number; min: number; max: number }> = {};
    project.lines.forEach(l => {
      const label = l.label || 'Unlabeled';
      const len = calculateDistance(l.points[0], l.points[1]);
      if (!groups[label]) {
        groups[label] = { count: 0, totalLen: 0, min: len, max: len };
      }
      groups[label].count += 1;
      groups[label].totalLen += len;
      groups[label].min = Math.min(groups[label].min, len);
      groups[label].max = Math.max(groups[label].max, len);
    });
    return groups;
  }, [project.lines]);

  const boxAnalytics = useMemo(() => {
    const groups: Record<string, { count: number; totalArea: number }> = {};
    project.boxes.forEach(b => {
      const label = b.label || 'Unlabeled';
      const area = b.width * b.height;
      if (!groups[label]) {
        groups[label] = { count: 0, totalArea: 0 };
      }
      groups[label].count += 1;
      groups[label].totalArea += area;
    });
    return groups;
  }, [project.boxes]);

  const handleRename = (newName: string) => {
    const updatedLines = project.lines.map(l => l.id === selectedId ? { ...l, label: newName } : l);
    const updatedBoxes = project.boxes.map(b => b.id === selectedId ? { ...b, label: newName } : b);
    onUpdateProject({ ...project, lines: updatedLines, boxes: updatedBoxes });
  };

  const exportData = () => {
    const data = {
      imageName: project.name,
      timestamp: new Date().toISOString(),
      measurements: project.lines.map(l => ({
        id: l.id,
        label: l.label,
        distance: calculateDistance(l.points[0], l.points[1]).toFixed(2),
        unit: project.unit
      })),
      objects: project.boxes.map(b => ({
        id: b.id,
        label: b.label,
        area: (b.width * b.height).toFixed(2)
      }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}-analysis.json`;
    a.click();
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-300">
      <div className="p-6 border-b border-slate-800/50 bg-[#0f172a]/20">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-[0.2em]">
            <BarChart3 size={18} className="text-blue-500" />
            Inspection
          </h3>
          <button 
            onClick={exportData}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-blue-400 transition-all border border-transparent hover:border-slate-700"
          >
            <Download size={18} />
          </button>
        </div>

        {selectedAnnotation ? (
          <div className="mb-6 p-5 bg-blue-600 rounded-[1.5rem] shadow-2xl shadow-blue-600/20 border border-blue-500/50 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-blue-100 uppercase tracking-[0.15em]">Active Node</span>
              <button 
                onClick={() => onDeleteAnnotation(selectedAnnotation.id)}
                className="p-1.5 bg-white/10 hover:bg-red-500/20 rounded-lg text-white transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="relative">
              <input 
                type="text"
                value={selectedAnnotation.label || ''}
                onChange={(e) => handleRename(e.target.value)}
                placeholder="Labeling..."
                className="w-full bg-blue-700/50 border border-blue-400/30 rounded-xl py-2.5 px-4 text-sm font-bold text-white placeholder-blue-300 focus:outline-none focus:ring-4 focus:ring-white/10 transition-all"
                autoFocus
              />
              <Edit2 size={14} className="absolute right-4 top-3 text-blue-200" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1.5">
                <Hash size={12} className="text-emerald-500" />
                Entities
              </div>
              <p className="text-2xl font-black text-white tracking-tighter">{project.boxes.length}</p>
            </div>
            <div className="bg-[#0f172a] p-4 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-2 text-slate-500 text-[9px] uppercase font-black tracking-widest mb-1.5">
                <Ruler size={12} className="text-blue-500" />
                Metrics
              </div>
              <p className="text-2xl font-black text-white tracking-tighter">{project.lines.length}</p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex p-1 bg-[#020617] rounded-[1.2rem] border border-slate-800">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <List size={14} /> RAW
          </button>
          <button 
            onClick={() => setViewMode('analytics')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${viewMode === 'analytics' ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <TableIcon size={14} /> GROUPED
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
        {viewMode === 'list' ? (
          <div className="space-y-8">
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                Linear Nodes
                <span className="text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 font-mono">{project.lines.length}</span>
              </h4>
              <div className="space-y-3">
                {project.lines.map((line) => (
                  <div 
                    key={line.id} 
                    className={`group p-4 border rounded-2xl transition-all cursor-pointer ${selectedId === line.id ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/20' : 'bg-[#0f172a]/50 border-slate-800 hover:border-slate-600'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-white truncate uppercase tracking-tight">{line.label || 'Static Segment'}</span>
                      <span className="text-[11px] font-mono font-black text-blue-400">
                        {calculateDistance(line.points[0], line.points[1]).toFixed(1)}px
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[9px] font-bold text-slate-500 uppercase tracking-tighter">
                      <span>X:{Math.round(line.points[0].x)} Y:{Math.round(line.points[0].y)}</span>
                      <ArrowRightLeft size={10} className="text-slate-700" />
                      <span>X:{Math.round(line.points[1].x)} Y:{Math.round(line.points[1].y)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                Spatial Regions
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20 font-mono">{project.boxes.length}</span>
              </h4>
              <div className="space-y-3">
                {project.boxes.map((box) => (
                  <div 
                    key={box.id} 
                    className={`p-4 border rounded-2xl transition-all cursor-pointer ${selectedId === box.id ? 'bg-emerald-600/10 border-emerald-500 ring-1 ring-emerald-500/20' : 'bg-[#0f172a]/50 border-slate-800 hover:border-slate-600'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black text-white uppercase tracking-tight">{box.label || 'Spatial Object'}</span>
                      <span className="text-[11px] font-mono text-emerald-400 font-black">
                        {Math.round(box.width * box.height).toLocaleString()} px²
                      </span>
                    </div>
                    <div className="text-[9px] font-bold text-slate-500 flex items-center gap-4 uppercase">
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div> {Math.round(box.width)}W</div>
                      <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div> {Math.round(box.height)}H</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in duration-500 slide-in-from-right-2">
            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-5">Metric Clusters</h4>
              <div className="overflow-hidden border border-slate-800 rounded-3xl bg-[#0f172a]/30 shadow-2xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#1e293b]/20 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Type</th>
                      <th className="px-5 py-3 font-black text-slate-500 text-center uppercase tracking-widest">Qty</th>
                      <th className="px-5 py-3 font-black text-slate-500 text-right uppercase tracking-widest">Avg px</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {Object.entries(lineAnalytics).map(([label, stats]: [string, any]) => (
                      <tr key={label} className="hover:bg-blue-600/5 transition-colors group">
                        <td className="px-5 py-4 font-black text-white uppercase tracking-tight">{label}</td>
                        <td className="px-5 py-4 text-center text-slate-400 font-mono">{stats.count}</td>
                        <td className="px-5 py-4 text-right font-mono font-black text-blue-400 group-hover:text-blue-300">
                          {(stats.totalLen / stats.count).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                    {Object.keys(lineAnalytics).length === 0 && (
                      <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-600 font-bold uppercase tracking-widest italic opacity-20">Database Empty</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-5">Entity Volume</h4>
              <div className="overflow-hidden border border-slate-800 rounded-3xl bg-[#0f172a]/30 shadow-2xl">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#1e293b]/20 border-b border-slate-800">
                    <tr>
                      <th className="px-5 py-3 font-black text-slate-500 uppercase tracking-widest">Class</th>
                      <th className="px-5 py-3 font-black text-slate-500 text-center uppercase tracking-widest">Qty</th>
                      <th className="px-5 py-3 font-black text-slate-500 text-right uppercase tracking-widest">Area px²</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {Object.entries(boxAnalytics).map(([label, stats]: [string, any]) => (
                      <tr key={label} className="hover:bg-emerald-600/5 transition-colors group">
                        <td className="px-5 py-4 font-black text-white uppercase tracking-tight">{label}</td>
                        <td className="px-5 py-4 text-center text-slate-400 font-mono">{stats.count}</td>
                        <td className="px-5 py-4 text-right font-mono font-black text-emerald-400 group-hover:text-emerald-300">
                          {Math.round(stats.totalArea).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {Object.keys(boxAnalytics).length === 0 && (
                      <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-600 font-bold uppercase tracking-widest italic opacity-20">No active entities</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
