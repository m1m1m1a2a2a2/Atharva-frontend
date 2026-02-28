
import { User } from '../types';

const API_Base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/dev'; // Fallback for dev

export const api = {
  async login(email: string, password: string): Promise<{ user: User, token: string }> {
    const loginUrl = import.meta.env.VITE_LOGIN_URL;
    if (!loginUrl) {
      throw new Error('Login URL not configured');
    }

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    return {
      user: {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
      },
      token: data.token
    };
  },

  async register(email: string, password: string, name: string): Promise<User> {
    const registerUrl = import.meta.env.VITE_REGISTER_URL;
    if (!registerUrl) {
      throw new Error('Registration URL not configured');
    }

    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }

    const data = await response.json();
    return {
      id: data.userId,
      name: name,
      email: email,
    };
  },

  async addProject(project: any): Promise<any> {
    const url = import.meta.env.VITE_ADD_PROJECT_URL;
    if (!url) throw new Error('Add Project URL not configured');

    const token = localStorage.getItem('mvp_token');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(project)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add project');
    }
    return response.json();
  },

  async getProjects(): Promise<any[]> {
    const url = import.meta.env.VITE_GET_PROJECTS_URL;
    if (!url) throw new Error('Get Projects URL not configured');

    const token = localStorage.getItem('mvp_token');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get projects');
    }

    const data = await response.json();
    return data.projects || [];
  },

  async updateProject(project: any): Promise<any> {
    const url = import.meta.env.VITE_UPDATE_PROJECT_URL;
    if (!url) throw new Error('Update Project URL not configured');

    const token = localStorage.getItem('mvp_token');
    const response = await fetch(url, {
      method: 'POST', // or PUT, depending on Lambda
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(project)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update project');
    }
    return response.json();
  },

  async deleteProject(projectId: string): Promise<void> {
    const url = import.meta.env.VITE_DELETE_PROJECT_URL;
    if (!url) throw new Error('Delete Project URL not configured');

    const token = localStorage.getItem('mvp_token');
    const deleteUrl = new URL(url);
    deleteUrl.searchParams.append('id', projectId);

    const response = await fetch(deleteUrl.toString(), {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete project');
    }
  }
};
