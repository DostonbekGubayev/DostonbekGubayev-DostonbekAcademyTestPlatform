
import React, { useState, useEffect } from 'react';
import { QuizConfig, Question, QuizResult, User, TestType } from './types';
import { generateQuizQuestions } from './geminiService';
import { apiService } from './apiService';
import Setup from './components/Setup';
import Quiz from './components/Quiz';
import Result from './components/Result';
import Layout from './components/Layout';
import History from './components/History';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [view, setView] = useState<'setup' | 'quiz' | 'result' | 'loading' | 'history' | 'login' | 'dashboard'>('setup');
  const [user, setUser] = useState<User | null>(null);
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lastResult, setLastResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [pendingConfig, setPendingConfig] = useState<QuizConfig | null>(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const currentUser = apiService.getCurrentUser();
        if (currentUser) setUser(currentUser);
        setView('setup');
      } catch (e) { console.error(e); } finally { setIsInitializing(false); }
    };
    initApp();
  }, []);

  const startQuizProcess = async (quizConfig: QuizConfig) => {
    setConfig(quizConfig);
    setView('loading');
    setError(null);

    try {
      if (quizConfig.type === TestType.AI) {
        const generatedQuestions = await generateQuizQuestions(quizConfig);
        setQuestions(generatedQuestions);
      } else {
        const tests = await apiService.getCenterTests();
        const test = tests.find(t => String(t.id) === String(quizConfig.centerTestId));
        if (!test) throw new Error("Test topilmadi.");
        setQuestions(test.questions);
      }
      setView('quiz');
    } catch (err: any) {
      console.error("Quiz Start Error:", err);
      let errMsg = err.message || "Xatolik yuz berdi.";
      if (errMsg.includes("quota") || errMsg.includes("exhausted")) {
        errMsg = "AI xizmati hozirda band yoki limit to'lgan. Birozdan so'ng urinib ko'ring.";
      }
      setError(errMsg);
      setView('setup');
    }
  };

  const handleStartQuiz = (quizConfig: QuizConfig) => {
    if (!user) {
      setPendingConfig(quizConfig);
      setView('login');
      return;
    }
    startQuizProcess(quizConfig);
  };

  const onLoginSuccess = (u: User) => {
    setUser(u);
    if (pendingConfig) {
      const configToStart = pendingConfig;
      setPendingConfig(null);
      startQuizProcess(configToStart);
    } else {
      setView('setup');
    }
  };

  const handleQuizComplete = (result: QuizResult) => {
    const finalResult: QuizResult = {
      ...result,
      userName: user?.fullName || 'Anonim',
      email: user?.email || '',
      userId: user?.id,
      testType: config?.type || TestType.AI
    };
    setLastResult(finalResult);
    setView('result');
    apiService.saveResult(finalResult);
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Layout user={user} setView={setView} onLogout={() => { apiService.logout(); setUser(null); setView('setup'); }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl flex justify-between items-center shadow-sm animate-in">
            <span className="font-bold text-sm italic">DIQQAT: {error}</span>
            <button onClick={() => setError(null)} className="font-black hover:text-red-900 transition-colors">X</button>
          </div>
        )}

        {view === 'login' && <Login onLogin={onLoginSuccess} />}
        {view === 'setup' && <Setup onStart={handleStartQuiz} />}
        {view === 'history' && <History onBack={() => setView('setup')} />}
        {view === 'dashboard' && user?.role === 'ADMIN' && <Dashboard />}

        {view === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-6"></div>
            <p className="text-emerald-950 font-black tracking-widest text-lg">AKADEMIYA AI SAVOLLARNI TAYYORLAMOQDA...</p>
            <p className="text-slate-400 text-xs mt-2 italic">Bu jarayon bir necha soniya vaqt olishi mumkin</p>
          </div>
        )}

        {view === 'quiz' && config && (
          <Quiz questions={questions} category={config.category} topic={config.topic} subTopic={config.subTopic} testType={config.type} onComplete={handleQuizComplete} />
        )}

        {view === 'result' && lastResult && (
          <Result result={lastResult} questions={questions} onRestart={() => setView('setup')} />
        )}
      </div>
    </Layout>
  );
};

export default App;
