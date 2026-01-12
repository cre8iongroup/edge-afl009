export type UserProfile = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'client' | 'internal' | 'regular';
};

export type Submission = {
  id: string;
  userId: string;
  sessionType: 'workshop' | 'reception' | 'info-session';
  title: string;
  description: string;
  status: 'Awaiting Approval' | 'Approved' | 'Rejected' | 'Needs Information';
  pillar: string;
  format: string;
  audience: string;
  objectives: string[];
  cpe: boolean;
  createdAt: Date;
  preferredDate?: Date | string;
  preferredTime?: string;
  presenterName?: string;
  presenterEmail?: string;
  presenterPocName?: string;
  presenterPocEmail?: string;
  presenterBio?: string;
  presenterHeadshot?: string;
};

    