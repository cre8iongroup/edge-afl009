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
  status: 'Waiting for Approval' | 'Approved' | 'Rejected' | 'Needs Information';
  pillar: string;
  format: string;
  audience: string;
  objectives: string[];
  cpe: boolean;
  createdAt: Date;
  presenterName?: string;
  presenterEmail?: string;
  presenterPocName?: string;
  presenterPocEmail?: string;
  presenterBio?: string;
  presenterHeadshot?: string;
};
