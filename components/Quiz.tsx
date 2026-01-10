
import React, { useState, useEffect, useRef } from 'react';
import { Question, QuizResult, TestType } from '../types';

interface QuizProps {
  questions: Question[];
  category: string;
  topic?: string;
  subTopic?: string;
  testType: TestType;
  onComplete: (result: QuizResult) => void;
}

const Quiz: React.FC<QuizProps> = ({ questions, category, topic, subTopic, testType, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [timeLeft, setTimeLeft] = useState(questions.length * 45);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const [cheatAttempts, setCheatAttempts] = useState(0);
  
  const timerRef = useRef<number | null>(null);

  // Ranglar brendga mos ravishda doim yashil (Emerald)
  const themeClass = 'emerald';
  const primaryColor = 'bg-emerald-600';
  const primaryText = 'text-emerald-600';
  const primaryBorder = 'border-emerald-600';
  const primaryBg = 'bg-emerald-50';
  const primaryButton = 'bg-emerald-600 border-emerald-900 hover:bg-emerald-700';

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Test davom etmoqda! Chiqib ketsangiz natijalar saqlanmaydi.';
      return e.returnValue;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTabFocused(false);
        setCheatAttempts(prev => prev + 1);
      }
    };

    const handleBlur = () => {
      setIsTabFocused(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleForceFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleSelect = (optionIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleForceFinish = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const answers = questions.map((q, idx) => ({
      questionId: q.id,
      selectedOption: selectedAnswers[idx],
      isCorrect: selectedAnswers[idx] !== -1 && selectedAnswers[idx] === q.correctAnswerIndex
    }));

    const score = answers.filter(a => a.isCorrect).length;
    const answeredCount = selectedAnswers.filter(a => a !== -1).length;

    onComplete({
      score,
      answeredCount,
      totalQuestions: questions.length,
      timeSpent: (questions.length * 45) - timeLeft,
      answers,
      date: new Date().toISOString(),
      category,
      topic,
      subTopic,
      testType
    });
  };

  const handleContinue = () => {
    setIsTabFocused(true);
  };

  const question = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  if (!question) return (
    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-3xl shadow-xl border border-slate-50">
      <div className={`w-16 h-16 border-4 ${primaryBorder} border-t-transparent rounded-full animate-spin mb-4`}></div>
      <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">Savollar yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-in relative max-w-5xl mx-auto">
      {/* Anti-Cheat Modal */}
      {!isTabFocused && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6 text-center">
          <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl max-w-2xl w-full animate-in zoom-in-95 border-t-8 border-red-500">
             <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-8">
                <i className="fas fa-user-secret text-4xl text-red-600"></i>
             </div>
             <h3 className="text-3xl font-black text-slate-800 mb-4 uppercase">DIQQAT!</h3>
             <p className="text-slate-500 text-lg mb-10 leading-relaxed italic">
               Dostonbek Academy qoidalariga ko'ra test vaqtida boshqa sahifaga o'tish taqiqlanadi. 
               Sahifadan chiqish urinishi: <span className="text-red-600 font-black">{cheatAttempts}</span>
             </p>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={handleContinue} className={`${primaryColor} text-white py-4 rounded-xl font-black shadow-lg hover:opacity-90 transition-all text-lg uppercase tracking-widest`}>DAVOM ETTIRISH</button>
                <button onClick={handleForceFinish} className="bg-red-50 text-red-600 py-4 rounded-xl font-black hover:bg-red-100 transition-all text-lg uppercase tracking-widest">YAKUNLASH</button>
             </div>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-white px-8 py-6 rounded-3xl shadow-xl border border-slate-50 gap-6">
        <div className="flex items-center space-x-6 flex-grow">
          <div className="flex flex-col">
            <span className="text-slate-400 font-black text-xs uppercase tracking-widest leading-none mb-2">SAVOL {currentIndex + 1} / {questions.length}</span>
            <span className={`${primaryText} font-black text-lg truncate max-w-[300px] uppercase tracking-tight`}>{subTopic || topic}</span>
          </div>
          <div className="h-3 flex-grow max-w-xl bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div className={`h-full ${primaryColor} transition-all duration-700 ease-out`} style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="flex items-center space-x-8">
          <div className={`font-mono text-2xl font-black flex items-center ${timeLeft < 60 ? 'text-red-600 animate-pulse' : 'text-slate-800'}`}>
            <i className="far fa-clock mr-3 opacity-40"></i>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <button type="button" onClick={() => setShowConfirm(true)} className="bg-red-600 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-red-700 transition-all uppercase tracking-widest active:scale-95 shadow-md">Yakunlash</button>
        </div>
      </div>

      {/* Main Question Card */}
      <div className={`bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-16 border border-slate-50 relative min-h-[500px] transition-all flex flex-col justify-between ${!isTabFocused ? 'blur-xl grayscale pointer-events-none opacity-50' : ''}`}>
        <div className="space-y-10">
          <div className="flex items-start space-x-6">
             <div className={`w-12 h-12 ${primaryBg} rounded-xl flex items-center justify-center ${primaryText} font-black text-xl flex-shrink-0 border border-emerald-100`}>
               {currentIndex + 1}
             </div>
             <h3 className="text-xl md:text-3xl font-bold text-slate-800 leading-relaxed tracking-tight">
               {question.text}
             </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(idx)}
                className={`group p-6 rounded-2xl text-left transition-all border-2 flex items-center relative overflow-hidden active:scale-[0.98] ${
                  selectedAnswers[currentIndex] === idx 
                    ? `${primaryBorder} ${primaryColor} text-white shadow-lg translate-y-[-2px]` 
                    : 'border-slate-100 bg-slate-50 hover:border-emerald-200 hover:bg-white'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-6 text-base font-black flex-shrink-0 transition-all ${
                  selectedAnswers[currentIndex] === idx ? 'bg-white/20 text-white' : `bg-white ${primaryText} border border-emerald-100 shadow-sm`
                }`}>
                  {String.fromCharCode(65 + idx)}
                </div>
                <span className={`font-bold text-base md:text-lg leading-relaxed ${selectedAnswers[currentIndex] === idx ? 'text-white' : 'text-slate-700'}`}>
                  {option}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 pt-10 border-t border-slate-50 gap-6">
          <button
            type="button"
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className={`flex items-center space-x-3 px-6 py-4 rounded-xl font-black text-sm tracking-widest transition-all ${currentIndex === 0 ? 'text-slate-200 pointer-events-none' : `text-slate-400 hover:${primaryText} hover:${primaryBg}`}`}
          >
            <i className="fas fa-arrow-left"></i>
            <span>OLDINGI</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentIndex === questions.length - 1) {
                setShowConfirm(true);
              } else {
                setCurrentIndex(prev => prev + 1);
              }
            }}
            className={`w-full sm:w-auto ${primaryButton} text-white px-12 py-5 rounded-2xl font-black text-lg tracking-widest transition-all shadow-xl flex items-center justify-center space-x-4 active:scale-95 border-b-4`}
          >
            <span>{currentIndex === questions.length - 1 ? 'YAKUNLASH' : 'KEYINGI'}</span>
            <i className={`fas ${currentIndex === questions.length - 1 ? 'fa-flag-checkered' : 'fa-chevron-right'}`}></i>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl text-center animate-in zoom-in-95 border-t-8 border-emerald-600">
            <h4 className="text-2xl font-black text-slate-800 mb-4 uppercase tracking-tighter">Testni yakunlaysizmi?</h4>
            <p className="text-slate-500 text-base mb-8 italic">Natijalar bazaga saqlanadi. Qolgan vaqt: {Math.floor(timeLeft / 60)} daqiqa.</p>
            <div className="grid grid-cols-1 gap-4">
              <button onClick={handleForceFinish} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-lg hover:bg-emerald-700 transition-all shadow-md uppercase tracking-widest">HA, YAKUNLASH</button>
              <button onClick={() => setShowConfirm(false)} className="w-full bg-slate-100 text-slate-600 py-4 rounded-xl font-black text-lg hover:bg-slate-200 transition-all uppercase tracking-widest">DAVOM ETTIRISH</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
