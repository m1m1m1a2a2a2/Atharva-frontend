
import React, { useState, useRef } from 'react';
import { User, ProjectImage, Tool } from '../types';
import {
  LogOut, Plus, Image as ImageIcon,
  LayoutDashboard,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Edit2
} from 'lucide-react';
import { AnnotationCanvas } from './AnnotationCanvas';
import { DataTable } from './DataTable';

interface WorkspaceProps {
  user: User;
  onLogout: () => void;
  projects: ProjectImage[];
  onAddProject: (projects: ProjectImage[]) => void;
  onUpdateProject: (project: ProjectImage) => void;
  onDeleteProject: (projectId: string) => void;
}



export const Workspace: React.FC<WorkspaceProps> = ({ user, onLogout, projects, onAddProject, onUpdateProject, onDeleteProject }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [draftProject, setDraftProject] = useState<ProjectImage | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync draft project when selection changes
  React.useEffect(() => {
    const selected = projects.find(p => p.id === selectedProjectId);
    setDraftProject(selected ? JSON.parse(JSON.stringify(selected)) : null);
  }, [selectedProjectId, projects]);

  const isDirty = React.useMemo(() => {
    if (!draftProject) return false;
    const original = projects.find(p => p.id === draftProject.id);
    if (!original) return false;
    return JSON.stringify(draftProject) !== JSON.stringify(original);
  }, [draftProject, projects]);

  const handleSave = async () => {
    if (!draftProject || !isDirty) return;
    setIsUpdating(true);
    try {
      await onUpdateProject(draftProject);
    } catch (err) {
      console.error("Failed to save project", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const newProjects: ProjectImage[] = [];
      let loadedCount = 0;

      fileArray.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const newProject: ProjectImage = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            url: event.target?.result as string,
            lines: [],
            boxes: [],
            createdAt: Date.now(),
            scale: 1,
            unit: 'px'
          };

          newProjects.push(newProject);
          loadedCount++;

          if (loadedCount === fileArray.length) {
            setIsAdding(true);
            try {
              await onAddProject(newProjects);
              if (!selectedProjectId && newProjects.length > 0) {
                setSelectedProjectId(newProjects[0].id);
              }
            } finally {
              setIsAdding(false);
            }
          }
        };
        reader.readAsDataURL(file);
      });
      // Clear the input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingIds(prev => new Set(prev).add(id));
    try {
      await onDeleteProject(id);
      if (selectedProjectId === id) {
        const remaining = projects.filter(p => p.id !== id);
        setSelectedProjectId(remaining.length > 0 ? remaining[0].id : null);
      }
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleUpdateCurrentProject = (updated: ProjectImage) => {
    setDraftProject(updated);
  };



  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden text-slate-300">
      {/* Sidebar */}
      <aside className="w-72 bg-[#020617] border-r border-slate-800/50 flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-600/20">
              M
            </div>
            <div>
              <h1 className="font-bold text-white tracking-tight leading-none text-lg">MeasureVision</h1>
              <span className="text-[10px] uppercase font-bold text-blue-500 tracking-widest">Enterprise v2</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600/10 text-white border border-blue-500/20`}>
              <LayoutDashboard size={18} className="text-blue-400" />
              <span className="text-sm font-semibold">Live Workspace</span>
            </div>

            <button
              onClick={triggerFileUpload}
              disabled={isAdding}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition-all font-semibold text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-wait"
            >
              {isAdding ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus size={18} />
              )}
              <span>{isAdding ? 'Uploading...' : 'Import Assets'}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-4">
          <div className="flex items-center justify-between mb-4 px-3">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Queue</h2>
          </div>

          <div className="space-y-1">
            {projects.length === 0 ? (
              <div className="px-4 py-12 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <ImageIcon size={28} className="mx-auto mb-3 text-slate-700" />
                <p className="text-[10px] font-bold text-slate-600 uppercase">Queue is empty</p>
              </div>
            ) : (
              projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setSelectedAnnotationId(null);
                  }}
                  className={`w-full group flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left transition-all ${selectedProjectId === p.id
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 ring-1 ring-blue-500/10'
                    : 'hover:bg-slate-800/30 text-slate-400 hover:text-white border border-transparent'
                    }`}
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-900 flex-shrink-0 overflow-hidden border border-slate-800 group-hover:border-slate-700">
                    <img src={p.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className="truncate flex-1 font-medium">{p.name}</span>
                  {deletingIds.has(p.id) ? (
                    <div className="w-3.5 h-3.5 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin" />
                  ) : (
                    <Trash2
                      size={14}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 transition-all"
                      onClick={(e) => deleteProject(p.id, e)}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="p-4 bg-[#020617] border-t border-slate-800/50">
          <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-2xl border border-slate-800 group transition-all hover:border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-sm uppercase shadow-lg shadow-blue-500/10">
              {user.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate tracking-tight uppercase font-semibold">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-600 hover:text-red-400 transition-all"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0f1e] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative">
        {draftProject ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Project Header / Top Bar */}
            <div className="h-16 border-b border-slate-800 bg-[#020617] flex items-center justify-between px-6 shrink-0 gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="relative group max-w-sm flex-1">
                  <input
                    type="text"
                    value={draftProject.name}
                    onChange={(e) => handleUpdateCurrentProject({ ...draftProject, name: e.target.value })}
                    className="w-full bg-transparent border-none text-sm font-bold text-white focus:outline-none focus:ring-0 truncate hover:bg-slate-800/50 rounded px-2 -ml-2 transition-colors cursor-edit"
                    title="Click to rename"
                  />
                  <Edit2 size={12} className="absolute -right-5 top-1/2 -translate-y-1/2 text-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" />
                </div>
                {isDirty ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                    <AlertCircle size={10} /> Unsaved Changes
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                    <CheckCircle2 size={10} /> Synced
                  </span>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={!isDirty || isUpdating}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all ${isDirty
                  ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
              >
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                <span>Update Database</span>
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 flex flex-col min-w-0">
                <AnnotationCanvas
                  project={draftProject}
                  selectedId={selectedAnnotationId}
                  onSelectId={setSelectedAnnotationId}
                  onUpdateProject={handleUpdateCurrentProject}
                />
              </div>
              <div className="w-80 border-l border-slate-800 bg-[#020617] overflow-y-auto">
                <DataTable
                  project={draftProject}
                  selectedId={selectedAnnotationId}
                  onUpdateProject={handleUpdateCurrentProject}
                  onDeleteAnnotation={(id) => {
                    const updated = {
                      ...draftProject,
                      lines: draftProject.lines.filter(l => l.id !== id),
                      boxes: draftProject.boxes.filter(b => b.id !== id)
                    };
                    handleUpdateCurrentProject(updated);
                    setSelectedAnnotationId(null);
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#020617] relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50 pointer-events-none"></div>
            <div className="w-32 h-32 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mb-8 border border-blue-500/20 text-blue-500 shadow-2xl shadow-blue-500/5">
              <ImageIcon size={64} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-3">Project Hub</h2>
            <p className="text-slate-500 max-w-sm mb-10 text-sm leading-relaxed font-medium">
              Start your high-precision analysis by uploading imagery to the repository. Supported formats: JPG, PNG, WEBP.
            </p>
            <button
              onClick={triggerFileUpload}
              disabled={isAdding}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-blue-600/20 transition-all flex items-center gap-3 active:scale-[0.97] disabled:opacity-50 disabled:cursor-wait"
            >
              {isAdding ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus size={20} />
              )}
              {isAdding ? 'Uploading...' : 'Import Assets'}
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileUpload}
          multiple
        />
      </main>
    </div>
  );
};
