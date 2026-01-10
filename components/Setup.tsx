
import React, { useState, useEffect } from 'react';
import { QuizConfig, Difficulty, TestType, CenterTest } from '../types';
import { apiService } from '../apiService';
import { SUBJECTS_DATA } from '../data/subjects';

interface SetupProps {
  onStart: (config: QuizConfig) => void;
}

const Setup: React.FC<SetupProps> = ({ onStart }) => {
  const [testType, setTestType] = useState<TestType>(TestType.AI);
  const [centerTests, setCenterTests] = useState<CenterTest[]>([]);
  const [selectedCenterTest, setSelectedCenterTest] = useState<string>('');
  const [isLoadingTests, setIsLoadingTests] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const [category, setCategory] = useState('Ingliz tili');
  const [activeSection, setActiveSection] = useState(SUBJECTS_DATA['Ingliz tili']?.sections[0]?.name || '');
  const [subTopic, setSubTopic] = useState(SUBJECTS_DATA['Ingliz tili']?.sections[0]?.topics[0] || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [count, setCount] = useState(20);

  const loadTests = async () => {
    setIsLoadingTests(true);
    setLoadError(false);
    try {
      const data = await apiService.getCenterTests();
      if (data && Array.isArray(data)) {
        setCenterTests(data);
        if (data.length === 0) setLoadError(false);
      } else {
        setLoadError(true);
      }
    } catch (e) {
      setLoadError(true);
    } finally {
      setIsLoadingTests(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  useEffect(() => {
    if (SUBJECTS_DATA[category] && SUBJECTS_DATA[category].sections.length > 0) {
      const defaultSection = SUBJECTS_DATA[category].sections[0];
      setActiveSection(defaultSection.name);
      setSubTopic(defaultSection.topics[0] || '');
    }
  }, [category]);

  const handleSectionChange = (sectionName: string) => {
    setActiveSection(sectionName);
    const section = SUBJECTS_DATA[category].sections.find(s => s.name === sectionName);
    if (section && section.topics.length > 0) setSubTopic(section.topics[0]);
  };

  const handleStart = () => {
    if (testType === TestType.AI) {
      onStart({
        type: TestType.AI,
        category,
        topic: activeSection,
        subTopic: subTopic,
        difficulty,
        questionCount: count
      });
    } else {
      const test = centerTests.find(t => String(t.id) === String(selectedCenterTest));
      if (test) {
        onStart({
          type: TestType.CENTER,
          category: test.category,
          topic: test.topic,
          subTopic: test.title,
          difficulty: test.difficulty,
          questionCount: Array.isArray(test.questions) ? test.questions.length : 0,
          centerTestId: String(test.id)
        });
      }
    }
  };

  return (
      <div className="space-y-8 animate-in max-w-7xl mx-auto px-1 md:px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
              onClick={() => setTestType(TestType.AI)}
              className={`group p-8 rounded-[2rem] border-4 transition-all text-left relative overflow-hidden active:scale-[0.98] ${testType === TestType.AI ? 'border-emerald-600 bg-emerald-50 shadow-xl' : 'border-white bg-white hover:border-emerald-100 hover:shadow-lg'}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 transition-all ${testType === TestType.AI ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <i className="fas fa-brain"></i>
            </div>
            <h3 className="font-black text-emerald-900 text-xl md:text-2xl tracking-tight">AI Intellektual Test</h3>
            <p className="text-sm text-slate-500 mt-2">Dostonbek Academy AI orqali har safar yangi va noyob savollar generatori.</p>
            {testType === TestType.AI && <div className="absolute top-6 right-6 text-emerald-600 text-xl"><i className="fas fa-circle-check"></i></div>}
          </button>

          <button
              onClick={() => setTestType(TestType.CENTER)}
              className={`group p-8 rounded-[2rem] border-4 transition-all text-left relative overflow-hidden active:scale-[0.98] ${testType === TestType.CENTER ? 'border-emerald-600 bg-emerald-50 shadow-xl' : 'border-white bg-white hover:border-emerald-100 hover:shadow-lg'}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-6 transition-all ${testType === TestType.CENTER ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
              <i className="fas fa-university"></i>
            </div>
            <h3 className="font-black text-emerald-900 text-xl md:text-2xl tracking-tight">Markaz Testlari</h3>
            <p className="text-sm text-slate-500 mt-2">Dostonbek Academy mutaxassislari tomonidan tuzilgan mavzulashtirilgan testlar.</p>
            {testType === TestType.CENTER && <div className="absolute top-6 right-6 text-emerald-600 text-xl"><i className="fas fa-circle-check"></i></div>}
          </button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-12 border border-slate-50">
          {testType === TestType.AI ? (
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-4 space-y-6">
                    <label className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center">
                      <i className="fas fa-book-open mr-3 text-emerald-600"></i> 1. Fan
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(SUBJECTS_DATA).map(cat => (
                          <button
                              key={cat}
                              onClick={() => setCategory(cat)}
                              className={`py-4 px-4 rounded-2xl text-sm font-black border-2 transition-all active:scale-95 ${category === cat ? 'border-emerald-600 bg-emerald-600 text-white shadow-lg' : 'border-slate-50 bg-slate-50 text-slate-500 hover:border-emerald-100'}`}
                          >
                            {cat}
                          </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-6 lg:pl-10 lg:border-l border-slate-100">
                    <div className="space-y-6">
                      <label className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center">
                        <i className="fas fa-layer-group mr-3 text-emerald-600"></i> 2. Yo'nalish va Mavzu
                      </label>

                      <div className="flex flex-wrap gap-2 mb-6">
                        {SUBJECTS_DATA[category]?.sections.map(section => (
                            <button
                                key={section.name}
                                onClick={() => handleSectionChange(section.name)}
                                className={`px-6 py-3 rounded-xl text-sm font-bold border-2 transition-all ${activeSection === section.name ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-100 text-slate-400'}`}
                            >
                              {section.name}
                            </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {SUBJECTS_DATA[category]?.sections.find(s => s.name === activeSection)?.topics.map(topic => (
                            <button
                                key={topic}
                                onClick={() => setSubTopic(topic)}
                                className={`w-full p-5 rounded-2xl text-left text-sm md:text-base font-bold border-2 transition-all flex justify-between items-center group ${subTopic === topic ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-md' : 'border-slate-50 bg-slate-50 text-slate-400 hover:bg-white'}`}
                            >
                              <span>{topic}</span>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${subTopic === topic ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200 text-transparent'}`}>
                                <i className="fas fa-check text-[8px]"></i>
                              </div>
                            </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                      <label className="text-xs font-black text-emerald-900 uppercase tracking-widest">Savollar soni</label>
                      <span className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-black text-sm shadow-md">{count} ta</span>
                    </div>
                    <input type="range" min="5" max="50" step="5" value={count} onChange={e => setCount(Number(e.target.value))} className="w-full h-3 bg-emerald-100 rounded-full appearance-none cursor-pointer accent-emerald-600" />
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <label className="text-xs font-black text-emerald-900 uppercase tracking-widest block mb-6">Qiyinchilik</label>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                      {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map(d => (
                          <button
                              key={d}
                              onClick={() => setDifficulty(d)}
                              className={`flex-1 py-3 rounded-lg text-xs md:text-sm font-black transition-all ${difficulty === d ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300'}`}
                          >
                            {d}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
          ) : (
              <div className="space-y-8 min-h-[400px]">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-xs font-black text-emerald-900 uppercase tracking-widest">Markaz testlari</label>
                  <div className="flex items-center space-x-3">
                    <button onClick={loadTests} className="text-[10px] font-black text-blue-600 uppercase hover:underline">
                      <i className="fas fa-sync-alt mr-1"></i> Yangilash
                    </button>
                    <span className="text-xs font-black text-emerald-600 uppercase">{centerTests.length} ta test ochiq</span>
                  </div>
                </div>
                {isLoadingTests ? (
                    <div className="py-24 text-center">
                      <div className="w-12 h-12 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Testlar yuklanmoqda...</p>
                    </div>
                ) : loadError ? (
                    <div className="py-24 text-center">
                      <i className="fas fa-exclamation-triangle text-red-300 text-5xl mb-4"></i>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4">Server bilan bog'lanishda xatolik.</p>
                      <button onClick={loadTests} className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase">Qayta urinish</button>
                    </div>
                ) : centerTests.length === 0 ? (
                    <div className="py-24 text-center">
                      <i className="fas fa-folder-open text-slate-200 text-5xl mb-4"></i>
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Hozircha testlar mavjud emas.</p>
                      <p className="text-[10px] text-slate-300 mt-2 uppercase">Admin tomonidan testlar qo'shilishini kuting yoki AI testni tanlang.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {centerTests.map(test => {
                        const qCount = Array.isArray(test.questions) ? test.questions.length : 0;
                        return (
                            <button
                                key={test.id}
                                onClick={() => setSelectedCenterTest(String(test.id))}
                                className={`p-6 rounded-2xl border-4 text-left flex flex-col justify-between transition-all active:scale-[0.98] ${String(selectedCenterTest) === String(test.id) ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-50 bg-slate-50 hover:border-emerald-200 hover:bg-white'}`}
                            >
                              <div>
                                <h4 className="font-black text-slate-800 text-base md:text-lg mb-2">{test.title}</h4>
                                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{test.category} • {test.difficulty}</p>
                              </div>
                              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-slate-400 font-black text-[10px] uppercase">{qCount} TA SAVOL</span>
                                <i className={`fas fa-circle-check text-xl ${String(selectedCenterTest) === String(test.id) ? 'text-emerald-500' : 'text-transparent'}`}></i>
                              </div>
                            </button>
                        );
                      })}
                    </div>
                )}
              </div>
          )}

          <button
              onClick={handleStart}
              disabled={(testType === TestType.CENTER && !selectedCenterTest) || (testType === TestType.CENTER && isLoadingTests)}
              className={`w-full mt-12 py-6 rounded-2xl font-black text-xl md:text-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center space-x-4 border-b-4 bg-emerald-600 border-emerald-900 hover:bg-emerald-700 text-white disabled:opacity-40`}
          >
            <span>TESTNI BOSHLASH</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
  );
};

export default Setup;
