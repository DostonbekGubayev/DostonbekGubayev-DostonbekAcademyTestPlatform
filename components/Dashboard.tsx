
import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../apiService';
import { generateQuizQuestions } from '../geminiService';
import { CenterTest, Difficulty, QuizResult, Question, User, TestType } from '../types';

// Global libraries accessed from window
declare const mammoth: any;
declare const pdfjsLib: any;
declare const html2pdf: any;
declare const XLSX: any;

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'results' | 'manage' | 'users'>('results');
  const [tests, setTests] = useState<CenterTest[]>([]);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStep, setEditStep] = useState<'selection' | 'config' | 'questions'>('selection');
  const [creationMode, setCreationMode] = useState<'AI' | 'MANUAL' | 'UPLOAD' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [testConfig, setTestConfig] = useState({
    title: '',
    category: 'Ingliz tili',
    topic: '',
    difficulty: Difficulty.MEDIUM,
    questionCount: 15
  });

  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [t, r, u] = await Promise.all([
        apiService.getCenterTests(),
        apiService.getAllResults(),
        apiService.getUsers()
      ]);
      setTests(t || []);
      setResults(r || []);
      setUsers(u || []);
    } catch (e) { console.error("Dashboard Sync Error:", e); }
  };

  const parseRawTextToQuestions = (rawText: string): Question[] => {
    if (!rawText) return [];

    // Standardize line endings and clean up
    const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\t/g, ' ');

    // Split by question markers: digit followed by . or ) or space
    const questionBlocks = text.split(/(?:\n|^)(\d+[\.\)\s]+)/);
    const questions: Question[] = [];

    // Blocks: [header, "1.", "Text...", "2.", "Text..."]
    for (let i = 1; i < questionBlocks.length; i += 2) {
      const qBody = questionBlocks[i + 1] || "";
      if (!qBody.trim()) continue;

      // Split body into question text and options
      // Regex detects A), B., C , etc. globally
      const optionPattern = /([A-Da-d][\.\)\s]+)/g;
      const parts = qBody.split(optionPattern);

      const questionText = parts[0].trim();
      const options: string[] = [];

      // Collect detected options
      for (let j = 1; j < parts.length; j += 2) {
        const optText = parts[j + 1] ? parts[j + 1].trim() : "";
        if (optText) options.push(optText);
      }

      if (questionText && options.length >= 2) {
        questions.push({
          id: Date.now() + Math.random(),
          text: questionText,
          options: options.slice(0, 4),
          correctAnswerIndex: 0,
          explanation: ''
        });
      }
    }

    // Ensure 4 options for each
    return questions.map(q => {
      while (q.options.length < 4) {
        q.options.push(`Variant ${String.fromCharCode(65 + q.options.length)}`);
      }
      return q;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const fileName = file.name;
    const extension = fileName.split('.').pop()?.toLowerCase();

    try {
      const arrayBuffer = await file.arrayBuffer();
      let importedQuestions: Question[] = [];

      if (extension === 'docx') {
        if (typeof mammoth === 'undefined') throw new Error("Mammoth.js kutubxonasi yuklanmagan");
        const result = await mammoth.extractRawText({ arrayBuffer });
        importedQuestions = parseRawTextToQuestions(result.value);
      }
      else if (extension === 'pdf') {
        if (typeof pdfjsLib === 'undefined') throw new Error("PDF.js kutubxonasi yuklanmagan");
        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        let pdfText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pdfText += content.items.map((item: any) => item.str).join(' ') + "\n";
        }
        importedQuestions = parseRawTextToQuestions(pdfText);
      }
      else if (extension === 'xlsx' || extension === 'xls') {
        if (typeof XLSX === 'undefined') throw new Error("XLSX kutubxonasi yuklanmagan");
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 }) as any[];

        importedQuestions = rows.slice(1).map((row, idx) => ({
          id: Date.now() + idx,
          text: row[0]?.toString() || '',
          options: [
            row[1]?.toString() || '',
            row[2]?.toString() || '',
            row[3]?.toString() || '',
            row[4]?.toString() || ''
          ],
          correctAnswerIndex: parseInt(row[5]) || 0,
          explanation: row[6]?.toString() || ''
        })).filter(q => q.text.length > 3);
      }
      else if (extension === 'json') {
        const text = new TextDecoder().decode(arrayBuffer);
        importedQuestions = JSON.parse(text);
      }

      if (importedQuestions.length > 0) {
        setCurrentQuestions(importedQuestions);
        setTestConfig(prev => ({
          ...prev,
          questionCount: importedQuestions.length,
          title: fileName.replace(/\.[^/.]+$/, "")
        }));
        setCreationMode('UPLOAD');
        setEditStep('config');
        setIsEditing(true);
      } else {
        alert("Fayl ichida mos formatdagi savollar topilmadi. Formatni tekshiring (1. Savol... A) Variant...)");
      }

    } catch (err: any) {
      console.error("File Read Error:", err);
      alert("Xatolik: Faylni o'qib bo'lmadi. " + (err.message || ""));
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportUsers = () => {
    if (users.length === 0 || typeof XLSX === 'undefined') return;
    const data = users.map(u => ({
      'F.I.SH': u.fullName,
      'Telefon': u.phone,
      'Maktab': u.school,
      'O\'quv Markazi': u.additionalCenter || '',
      'Qiziqishi': u.interest,
      'Sana': u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "O'quvchilar");
    XLSX.writeFile(wb, `Academy_Users_List.xlsx`);
  };

  const handleExportToPdf = (test: CenterTest) => {
    if (typeof html2pdf === 'undefined') {
      alert("PDF generatsiya kutubxonasi yuklanmagan");
      return;
    }
    const element = document.createElement('div');
    element.style.padding = "30px";
    element.style.fontFamily = "Arial, sans-serif";
    element.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #065f46; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="color: #065f46; font-size: 20px;">DOSTONBEK ACADEMY</h1>
        <h2 style="font-size: 16px; margin: 5px 0;">${test.title}</h2>
        <p style="font-size: 10px; color: #666;">Fan: ${test.category} | Jami: ${test.questions.length} ta savol</p>
      </div>
      ${test.questions.map((q, i) => `
        <div style="margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">
          <p style="font-size: 12px; margin-bottom: 5px;"><b>${i + 1}. ${q.text}</b></p>
          <div style="font-size: 11px; margin-left: 15px;">
            A) ${q.options[0]}<br/>B) ${q.options[1]}<br/>C) ${q.options[2]}<br/>D) ${q.options[3]}
          </div>
        </div>
      `).join('')}
      <div style="margin-top: 20px; font-size: 12px; font-weight: bold;">
        Javoblar: ${test.questions.map((q, i) => `${i + 1}-${String.fromCharCode(65 + q.correctAnswerIndex)}`).join('  ')}
      </div>
    `;
    html2pdf().from(element).set({
      margin: 10,
      filename: `${test.title}_Academy.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
  };

  const handleEditTest = (test: CenterTest) => {
    setEditingId(test.id);
    setTestConfig({
      title: test.title,
      category: test.category,
      topic: test.topic,
      difficulty: test.difficulty,
      questionCount: test.questions.length
    });
    setCurrentQuestions([...test.questions]);
    setCreationMode('MANUAL');
    setEditStep('questions');
    setIsEditing(true);
  };

  const handleDeleteTest = async (id: string) => {
    if (confirm("Ushbu testni butunlay o'chirib tashlamoqchimisiz?")) {
      await apiService.deleteCenterTest(id);
      fetchData();
    }
  };

  const handleConfigSubmit = async () => {
    if (!testConfig.title || !testConfig.topic) {
      alert("Sarlavha va Mavzu majburiy!");
      return;
    }
    if (creationMode === 'AI') {
      setIsProcessing(true);
      try {
        const questions = await generateQuizQuestions({
          type: TestType.AI,
          category: testConfig.category,
          topic: testConfig.topic,
          subTopic: '',
          difficulty: testConfig.difficulty,
          questionCount: testConfig.questionCount
        });
        setCurrentQuestions(questions);
        setEditStep('questions');
      } catch (e: any) { alert(e.message); }
      finally { setIsProcessing(false); }
    } else {
      setEditStep('questions');
    }
  };

  const handleSaveTest = async () => {
    setIsProcessing(true);
    try {
      const payload = { ...testConfig, questions: currentQuestions };
      if (editingId) await apiService.updateCenterTest(editingId, payload);
      else await apiService.saveCenterTest(payload);
      setIsEditing(false);
      setEditingId(null);
      fetchData();
      alert("Test muvaffaqiyatli saqlandi!");
    } catch (e) { alert("Xatolik: Ma'lumotlarni saqlash imkoni bo'lmadi."); }
    finally { setIsProcessing(false); }
  };

  return (
      <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-in">
        {/* Header */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-emerald-50 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Boshqaruv Paneli</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Dostonbek Academy Admin</p>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setActiveTab('results')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'results' ? 'bg-white text-emerald-700 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Natijalar</button>
            <button onClick={() => setActiveTab('users')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'users' ? 'bg-white text-emerald-700 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>O'quvchilar</button>
            <button onClick={() => setActiveTab('manage')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'manage' ? 'bg-white text-emerald-700 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Testlar</button>
          </div>
          <button onClick={() => { setIsEditing(true); setEditStep('selection'); setEditingId(null); setCreationMode(null); }} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-emerald-700 transition-all flex items-center">
            <i className="fas fa-plus-circle mr-2"></i> YANGI TEST
          </button>
        </div>

        {activeTab === 'users' && (
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-50">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Ro'yxatdan o'tganlar ({users.length})</h3>
                <button onClick={handleExportUsers} className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase flex items-center shadow-lg hover:bg-emerald-700 transition-all"><i className="fas fa-file-excel mr-2"></i> EXCEL</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">F.I.SH</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Telefon</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">O'quv Markazi / Maktab</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Sana</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                  {users.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-800">{u.fullName}</td>
                        <td className="px-8 py-5 text-slate-600 text-xs">{u.phone}</td>
                        <td className="px-8 py-5">
                          <p className="text-[10px] font-black text-emerald-700 uppercase">{u.additionalCenter || '---'}</p>
                          <p className="text-[10px] text-slate-400">{u.school}</p>
                        </td>
                        <td className="px-8 py-5 text-slate-400 text-[10px]">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '---'}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {activeTab === 'manage' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map(test => (
                  <div key={test.id} className="p-8 bg-white rounded-[2.5rem] shadow-xl border border-slate-50 flex flex-col justify-between group hover:border-emerald-200 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-lg">{test.category}</span>
                        <span className="text-slate-300 text-[10px] font-black uppercase">{test.difficulty}</span>
                      </div>
                      <h4 className="font-black text-slate-800 text-lg mb-2">{test.title}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{test.questions.length} Savol</p>
                    </div>
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-50">
                      <div className="flex space-x-3">
                        <button onClick={() => handleExportToPdf(test)} className="text-slate-400 hover:text-red-600 transition-all" title="PDF yuklash"><i className="fas fa-file-pdf text-xl"></i></button>
                      </div>
                      <div className="flex space-x-4">
                        <button onClick={() => handleEditTest(test)} className="text-slate-400 hover:text-blue-500 transition-all"><i className="fas fa-edit text-xl"></i></button>
                        <button onClick={() => handleDeleteTest(test.id)} className="text-slate-400 hover:text-red-500 transition-all"><i className="fas fa-trash-alt text-xl"></i></button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
        )}

        {activeTab === 'results' && (
            <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-50">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">O'quvchi</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Fan / Mavzu</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Ball</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Sana</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                  {results.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 font-bold text-slate-800">{r.userName}</td>
                        <td className="px-8 py-5">
                          <p className="text-xs font-bold text-emerald-600 uppercase">{r.category}</p>
                          <p className="text-[10px] text-slate-400">{r.subTopic || r.topic || 'Umumiy'}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-slate-700">{r.score}</span> / <span className="text-slate-400 text-xs">{r.totalQuestions}</span>
                        </td>
                        <td className="px-8 py-5 text-slate-400 text-[10px] text-right">{new Date(r.date || (r as any).created_at).toLocaleDateString()}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
        )}

        {/* Modal - Test Yaratish */}
        {isEditing && (
            <div className="fixed inset-0 z-[300] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-[3rem] max-w-5xl w-full p-10 shadow-2xl relative animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
                <button onClick={() => setIsEditing(false)} className="absolute top-8 right-8 z-50 text-slate-300 hover:text-slate-600 text-2xl transition-all">✕</button>

                <div className="mb-8">
                  <h3 className="text-3xl font-black text-emerald-950 uppercase tracking-tighter">
                    {editingId ? 'Testni Tahrirlash' : 'Yangi Test Qo\'shish'}
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {editStep === 'selection' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 py-6">
                        <button onClick={() => { setCreationMode('AI'); setEditStep('config'); }} className="group p-8 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center space-y-6">
                          <div className="w-16 h-16 bg-emerald-600 text-white rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-xl group-hover:scale-110 transition-transform"><i className="fas fa-brain"></i></div>
                          <div><p className="font-black text-lg uppercase text-slate-800">AI Gen</p><p className="text-slate-400 text-[10px] font-bold mt-2">Gemini 3 Pro</p></div>
                        </button>

                        <button onClick={() => { setCreationMode('MANUAL'); setEditStep('config'); }} className="group p-8 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center space-y-6">
                          <div className="w-16 h-16 bg-slate-800 text-white rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-xl group-hover:scale-110 transition-transform"><i className="fas fa-keyboard"></i></div>
                          <div><p className="font-black text-lg uppercase text-slate-800">Manual</p><p className="text-slate-400 text-[10px] font-bold mt-2">Qo'lda kiritish</p></div>
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="group p-8 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] hover:border-amber-500 hover:bg-amber-50 transition-all text-center space-y-6">
                          <div className="w-16 h-16 bg-amber-600 text-white rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-xl group-hover:scale-110 transition-transform"><i className="fas fa-file-pdf"></i></div>
                          <div><p className="font-black text-lg uppercase text-slate-800">PDF/Word</p><p className="text-slate-400 text-[10px] font-bold mt-2">O'qib olish</p></div>
                        </button>

                        <button onClick={() => fileInputRef.current?.click()} className="group p-8 bg-slate-50 border-4 border-slate-100 rounded-[2.5rem] hover:border-blue-500 hover:bg-blue-50 transition-all text-center space-y-6">
                          <div className="w-16 h-16 bg-blue-600 text-white rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-xl group-hover:scale-110 transition-transform"><i className="fas fa-file-excel"></i></div>
                          <div><p className="font-black text-lg uppercase text-slate-800">Excel</p><p className="text-slate-400 text-[10px] font-bold mt-2">Jadvallar</p></div>
                        </button>
                        <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.docx,.pdf,.json" onChange={handleFileUpload} />
                      </div>
                  )}

                  {editStep === 'config' && (
                      <div className="space-y-6">
                        {isProcessing ? (
                            <div className="py-20 text-center">
                              <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Fayl tahlil qilinmoqda...</p>
                            </div>
                        ) : (
                            <>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Sarlavha</label>
                                  <input type="text" placeholder="Unit 1 Test" className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" value={testConfig.title} onChange={e => setTestConfig({...testConfig, title: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Fan</label>
                                  <select className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" value={testConfig.category} onChange={e => setTestConfig({...testConfig, category: e.target.value})}>
                                    <option>Ingliz tili</option><option>Biologiya</option><option>Matematika</option><option>Kimyo</option><option>Fizika</option><option>Tarix</option>
                                  </select>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Mavzu / Yo'riqnoma</label>
                                <textarea placeholder="AI yoki manual test uchun mavzu mazmunini kiriting..." className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700 h-28" value={testConfig.topic} onChange={e => setTestConfig({...testConfig, topic: e.target.value})}></textarea>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest">Savollar Soni</label>
                                  <input type="number" disabled={creationMode === 'UPLOAD'} className="w-full bg-transparent font-black text-2xl outline-none text-emerald-950" value={testConfig.questionCount} onChange={e => setTestConfig({...testConfig, questionCount: Number(e.target.value)})} />
                                </div>
                                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-3 tracking-widest">Daraja</label>
                                  <select className="w-full bg-transparent font-black text-sm outline-none uppercase text-emerald-950" value={testConfig.difficulty} onChange={e => setTestConfig({...testConfig, difficulty: e.target.value as Difficulty})}>
                                    <option value={Difficulty.EASY}>Oson</option><option value={Difficulty.MEDIUM}>O'rtacha</option><option value={Difficulty.HARD}>Qiyin</option>
                                  </select>
                                </div>
                              </div>
                              <div className="flex space-x-4 pt-6">
                                <button onClick={() => setEditStep('selection')} className="flex-1 py-5 rounded-2xl font-black uppercase text-xs tracking-widest text-slate-400 hover:text-slate-600 transition-all">BEKOR QILISH</button>
                                <button onClick={handleConfigSubmit} className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl border-b-4 border-emerald-900 active:scale-95 transition-all">SAVOLLARNI KO'RISH</button>
                              </div>
                            </>
                        )}
                      </div>
                  )}

                  {editStep === 'questions' && (
                      <div className="space-y-8 py-6">
                        {currentQuestions.map((q, i) => (
                            <div key={i} className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 space-y-6 relative transition-all hover:border-emerald-200">
                              <div className="absolute -top-4 -left-4 w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center font-black shadow-lg">{i + 1}</div>
                              <div className="space-y-4"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Savol matni</label><input type="text" className="w-full px-6 py-4 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-800" value={q.text} onChange={e => { const n = [...currentQuestions]; n[i].text = e.target.value; setCurrentQuestions(n); }} /></div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{q.options.map((opt, optIdx) => (
                                  <div key={optIdx} className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Variant {String.fromCharCode(65+optIdx)}</label><input type="text" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-600" value={opt} onChange={e => { const n = [...currentQuestions]; n[i].options[optIdx] = e.target.value; setCurrentQuestions(n); }} /></div>
                              ))}</div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">To'g'ri javob</label><select className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl font-black uppercase text-xs cursor-pointer" value={q.correctAnswerIndex} onChange={e => { const n = [...currentQuestions]; n[i].correctAnswerIndex = parseInt(e.target.value); setCurrentQuestions(n); }}><option value={0}>A variant</option><option value={1}>B variant</option><option value={2}>C variant</option><option value={3}>D variant</option></select></div>
                                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Tushuntirish</label><input type="text" className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-500" value={q.explanation} onChange={e => { const n = [...currentQuestions]; n[i].explanation = e.target.value; setCurrentQuestions(n); }} /></div>
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>

                {editStep === 'questions' && (
                    <div className="p-10 pt-6 border-t border-slate-50 bg-white flex space-x-4">
                      <button onClick={() => setEditStep('config')} className="flex-1 py-5 rounded-2xl font-black uppercase text-xs text-slate-400 hover:text-slate-600 transition-all">ORTGA</button>
                      <button onClick={handleSaveTest} disabled={isProcessing} className="flex-[2] bg-emerald-600 text-white py-6 rounded-2xl font-black uppercase text-sm tracking-widest shadow-2xl border-b-4 border-emerald-900 active:scale-95 transition-all">
                        {isProcessing ? "SAQLANMOQDA..." : "HAMMASINI SAQLASH"}
                      </button>
                    </div>
                )}
              </div>
            </div>
        )}
      </div>
  );
};

export default Dashboard;
