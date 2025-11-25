export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'client' | 'internal' | 'regular';
};

export type Submission = {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Needs Changes';
  pillar: string;
  format: string;
  audience: string;
  objectives: string[];
  cpe: boolean;
  createdAt: Date;
};
