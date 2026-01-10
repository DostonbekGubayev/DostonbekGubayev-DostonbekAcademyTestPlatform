
export enum Difficulty {
  EASY = 'Oson',
  MEDIUM = 'O\'rtacha',
  HARD = 'Qiyin'
}

export enum TestType {
  AI = 'AI_GENERATED',
  CENTER = 'CENTER_OFFICIAL'
}

export interface User {
  id?: number;
  fullName: string;
  email?: string;
  phone: string;
  school: string; // "center" o'rniga "school"
  additionalCenter?: string; // Yangi ixtiyoriy maydon
  interest: string;
  isLoggedIn: boolean;
  role: 'ADMIN' | 'STUDENT';
  createdAt?: string;
}

export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface CenterTest {
  id: string;
  title: string;
  category: string;
  topic: string;
  questions: Question[];
  createdAt: string;
  difficulty: Difficulty;
  isSyncedServer?: boolean;
}

export interface QuizResult {
  id?: number;
  userId?: number;
  userName?: string;
  email?: string;
  score: number;
  answeredCount: number;
  totalQuestions: number;
  timeSpent: number;
  answers: {
    questionId: number;
    selectedOption: number;
    isCorrect: boolean;
  }[];
  date: string;
  category: string;
  topic?: string;
  subTopic?: string;
  testType: TestType;
}

export interface QuizConfig {
  type: TestType;
  category: string;
  topic: string;
  subTopic: string;
  difficulty: Difficulty;
  questionCount: number;
  centerTestId?: string;
}
