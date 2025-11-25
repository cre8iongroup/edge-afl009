'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { users as initialUsers } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, pass: string) => void;
  logout: () => void;
  register: (newUser: User) => void;
  switchUser: (userId: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('alpfa-user');
    const storedUsers = localStorage.getItem('alpfa-users');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      localStorage.setItem('alpfa-users', JSON.stringify(initialUsers));
    }
    setLoading(false);
  }, []);

  const login = (email: string, pass: string) => {
    const foundUser = users.find((u) => u.email === email);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('alpfa-user', JSON.stringify(foundUser));
    } else {
      throw new Error('Invalid email or password');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('alpfa-user');
  };
  
  const register = (newUser: User) => {
    const existingUser = users.find(u => u.email === newUser.email);
    if (existingUser) {
      throw new Error('User with this email already exists.');
    }
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('alpfa-users', JSON.stringify(updatedUsers));
  };

  const switchUser = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('alpfa-user', JSON.stringify(foundUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, users, login, logout, register, loading, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
