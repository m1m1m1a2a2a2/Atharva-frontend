
import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Workspace } from './components/Workspace';
import { User, ProjectImage } from './types';
import { api } from './components/api';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<ProjectImage[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user session on mount
  useEffect(() => {
    const initializeData = async () => {
      const savedUser = localStorage.getItem('mvp_user');
      const token = localStorage.getItem('mvp_token');

      if (savedUser && token) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          // Fetch projects
          try {
            // We need to ensure api calls use the token. 
            // api.ts reads from localStorage 'mvp_token', so we are good.
            const loadedProjects = await api.getProjects();
            setProjects(loadedProjects);
          } catch (err: any) {
            console.error("Failed to load projects", err);
            if (err.message && (err.message.includes('Unauthorized') || err.message.includes('Token expired'))) {
              // Clear session if token is invalid
              localStorage.removeItem('mvp_user');
              localStorage.removeItem('mvp_token');
              setUser(null);
            }
          }
        } catch (e) {
          console.error('Failed to parse user session', e);
          localStorage.removeItem('mvp_user');
          localStorage.removeItem('mvp_token');
        }
      }
      setLoading(false);
    };

    initializeData();
  }, []);

  const handleLogin = (userData: User, token: string) => {
    setUser(userData);
    localStorage.setItem('mvp_user', JSON.stringify(userData));
    localStorage.setItem('mvp_token', token);

    // Load projects after login
    setLoading(true);
    api.getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleLogout = () => {
    setUser(null);
    setProjects([]);
    localStorage.removeItem('mvp_user');
    localStorage.removeItem('mvp_token');
  };

  const handleAddProject = async (newProjects: ProjectImage[]) => {
    // workspace calls this with an array of new projects from files
    // we need to upload them one by one
    const addedProjects: ProjectImage[] = [];

    for (const p of newProjects) {
      try {
        // The API expects project data. 
        // We should remove the temp ID and let backend handle it? 
        // Or keep it. Backend "Add Project" lambda stores the whole body.
        // Workspace generated a random ID. 
        // We can send it.
        const response = await api.addProject(p);
        // response.project contains the saved project (with _id).
        // We should use that.
        if (response.project) {
          addedProjects.push(response.project);
        }
      } catch (err: any) {
        console.error("Failed to add project", p.name, err);
        if (err.message && (err.message.includes('Unauthorized') || err.message.includes('Token expired'))) {
          handleLogout();
          return;
        }
        alert(`Failed to upload project ${p.name}: ${err.message}`);
      }
    }

    setProjects(prev => [...prev, ...addedProjects]);
  };

  const handleUpdateProject = async (project: ProjectImage) => {
    try {
      const response = await api.updateProject(project);
      // Update local state
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    } catch (err: any) {
      console.error("Failed to update project", err);
      if (err.message && (err.message.includes('Unauthorized') || err.message.includes('Token expired'))) {
        handleLogout();
      }
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await api.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
    } catch (err: any) {
      console.error("Failed to delete project", err);
      if (err.message && (err.message.includes('Unauthorized') || err.message.includes('Token expired'))) {
        handleLogout();
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {!user ? (
        <Auth onLogin={handleLogin} />
      ) : (
        <Workspace
          user={user}
          onLogout={handleLogout}
          projects={projects}
          onAddProject={handleAddProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
        />
      )}
    </div>
  );
};

export default App;
