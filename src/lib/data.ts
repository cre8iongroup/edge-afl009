import type { User, Submission } from './types';

export const users: User[] = [
  { id: '1', name: 'Regular User', email: 'user@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', role: 'regular' },
  { id: '2', name: 'Client User', email: 'client@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026705d', role: 'client' },
  { id: '3', name: 'Internal User', email: 'internal@example.com', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d', role: 'internal' },
];

export const submissions: Submission[] = [];

export const templateSubmission = {
  pillar: 'Business Mastery',
  format: 'Workshop',
  audience: 'Mid-Career',
  title: 'Mastering Data-Driven Decision Making',
  description: 'This interactive workshop dives into the practical application of data analysis for strategic business decisions. Participants will work through a real-world business case, using common data tools to extract insights and present their findings. You will leave with a repeatable framework for turning raw data into actionable strategy, preparing you to lead with confidence in a data-centric world. This session is designed for mid-career professionals looking to sharpen their analytical skills and drive measurable impact in their roles.',
  objectives: ['objective-1', 'objective-2', 'objective-6'],
  cpe: true,
};


export const submissionFormConfig = {
  tooltips: {
    title: 'Your title and description should clearly explain what the session covers, what participants will experience, and how the content aligns with your selected pillar.',
    objectives: 'Select up to 3 objectives that your session will help attendees achieve.',
    cpe: 'If you would like your session to be considered for CPE credit, simply indicate your interest. ALPFA will compile and align all required documentation on your behalf. Note: Selecting CPE does not guarantee approval.'
  },
  pillars: [
    { 
      value: 'Business Mastery', 
      label: 'Business Mastery',
      description: 'Understanding industries, business functions, and strategic thinking that enable members to navigate and lead within their field.',
      examples: ['Industry trends + emerging skills', 'Decision-making using data', 'Business cases or problem solving', 'Navigating shifts in technology or markets']
    },
    { 
      value: 'Professional EQ', 
      label: 'Professional EQ',
      description: 'Communication, collaboration, and values-driven leadership that strengthens team performance and interpersonal effectiveness.',
      examples: ['Feedback, communication, and executive presence', 'Navigating conflict or difficult conversations', 'Emotional intelligence in leadership', 'Team dynamics + collaboration']
    },
    { 
      value: 'Xtrapreneurship', 
      label: 'Xtrapreneurship',
      description: 'Creativity, intrapreneurship, and opportunity recognition that spark innovation and value creation inside organizations.',
      examples: ['Innovation frameworks and design thinking', 'Turning Ideas into action', 'Strategic risk taking', 'Career and life design', 'Building influence']
    },
    { 
      value: 'Community Engagement', 
      label: 'Community Engagement',
      description: 'Cultural identity, belonging, mentorship, and service that strengthen community impact and connection.',
      examples: ['Mentorship & sponsorship & collective advancement', 'Building belonging in organizations', 'Community leadership as professional assets', 'Designing culturally responsive engagement models']
    },
    { 
      value: 'Wealth Creation', 
      label: 'Wealth Creation',
      description: 'Financial confidence, literacy, and long-term planning that support economic mobility and generational wealth.',
      examples: ['Compensation + decoding offers', 'Saving, investing, and financial planning', 'Credit, debt, and budgeting strategies', 'Long-term wealth building']
    },
    { 
      value: 'Health & Wellness', 
      label: 'Health & Wellness',
      description: 'Sustainable, holistic wellbeing that supports members’ capacity to thrive professionally and personally.',
      examples: ['Stress management + burnout prevention', 'Energy management', 'Mental and emotional wellness', 'Work–life boundaries']
    },
  ],
  formats: [
    { 
      value: 'Presentation',
      label: 'Presentation',
      description: 'Participants primarily listen. A presenter delivers insights, frameworks, or trends with one brief engagement moment (Q&A, poll, or reflection). Use this when: You are teaching or informing, not practicing.',
      features: 'Content-led'
    },
    { 
      value: 'Interactive Session',
      label: 'Interactive Session',
      description: 'Participants engage throughout, but do not complete structured skill practice. These sessions weave interaction into the content (Q&A, scenario reactions, light role-play, pair discussions). Use this when: you want to balance teaching or informing with light practice.',
      features: 'Exploration, reflection, scenarios'
    },
    { 
      value: 'Workshop',
      label: 'Workshop',
      description: 'Participants do real work during the session. Workshops include guided practice, tool use, small-group problem-solving, or hands-on activities aligned to a specific skill or framework. Use this when: you have hands on practice.',
      features: 'Skill-building, tool use, application'
    },
  ],
  audiences: [
    { 
      value: 'Undergraduate Students',
      label: 'Undergraduate Students',
      description: 'Students pursuing a bachelor’s degree who are preparing for internships, early career roles, or their first professional experiences.'
    },
    { 
      value: 'Graduate Students',
      label: 'Graduate Students',
      description: 'Master’s or MBA candidates preparing for career transitions, higher-level internships, or accelerated pathways into professional roles.'
    },
    { 
      value: 'Early Career',
      label: 'Early Career',
      description: 'Professionals with 0–5 years of experience Professionals building workplace confidence and navigating early promotions'
    },
    { 
      value: 'Mid-Career',
      label: 'Mid-Career',
      description: 'Professionals with 5–15 years of experience who are taking on broader responsibilities, leading teams or projects, and preparing for senior roles.'
    },
    { 
      value: 'Executive Level and above',
      label: 'Executive Level and above',
      description: 'Senior leaders, executives, and high-level functional experts who influence organizational strategy, culture, and business outcomes.'
    },
  ],
  objectives: [
    { id: 'objective-1', label: 'Identify key concepts, trends, or insights related to the topic.' },
    { id: 'objective-2', label: 'Apply a tool, framework, or strategy to a scenario or challenge.' },
    { id: 'objective-3', label: 'Practice a skill through guided activity or discussion.' },
    { id: 'objective-4', label: 'Analyze different approaches to a workplace or community challenge.' },
    { id: 'objective-5', label: 'Evaluate options to determine the most effective action or solution.' },
    { id: 'objective-6', label: 'Develop a clear next step, action plan, or strategy based on the session.' },
  ]
};
