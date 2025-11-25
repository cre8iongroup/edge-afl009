'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '@/lib/types';
import { users as initialUsers } from '@/lib/data';

interface AuthContextType {
  user: User | null;
  users: User[];
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  register: (newUser: Omit<User, 'id' | 'avatar' | 'role'> & {password: string}) => void;
  switchUser: (userId: string) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('alpfa-user');
    const storedUsers = localStorage.getItem('alpfa-users');
    
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      const initialUsersWithPasswords = initialUsers.map(u => ({...u, password: 'password'}));
      localStorage.setItem('alpfa-users', JSON.stringify(initialUsersWithPasswords));
      setUsers(initialUsersWithPasswords);
    }
    
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
    const storedUsers = JSON.parse(localStorage.getItem('alpfa-users') || '[]');
    const foundUser = storedUsers.find((u: User & {password: string}) => u.email === email && u.password === pass);
    
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
  
  const register = (newUser: Omit<User, 'id' | 'avatar' | 'role'> & {password: string}) => {
    const storedUsers = JSON.parse(localStorage.getItem('alpfa-users') || '[]');
    const existingUser = storedUsers.find((u: User) => u.email === newUser.email);
    if (existingUser) {
      throw new Error('User with this email already exists.');
    }
    
    const userToSave: User & {password: string} = {
        ...newUser,
        id: Date.now().toString(),
        avatar: `https://i.pravatar.cc/150?u=${newUser.email}`,
        role: 'regular',
    };

    const updatedUsers = [...storedUsers, userToSave];
    setUsers(updatedUsers);
    localStorage.setItem('alpfa-users', JSON.stringify(updatedUsers));
  };

  const switchUser = (userId: string) => {
    const storedUsers = JSON.parse(localStorage.getItem('alpfa-users') || '[]');
    const foundUser = storedUsers.find((u:User) => u.id === userId);
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
