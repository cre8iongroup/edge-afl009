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
  pillar: 'Professional Development' | 'Leadership Development' | 'Community Engagement' | 'Networking';
  format: 'Workshop' | 'Panel' | 'Keynote' | 'Roundtable';
  audience: 'Students' | 'Professionals' | 'Executives';
  objectives: string;
  cpe: boolean;
  createdAt: Date;
};
