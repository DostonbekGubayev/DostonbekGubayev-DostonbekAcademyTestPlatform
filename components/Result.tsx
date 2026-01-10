import React, { useEffect, useState, useMemo } from 'react';
import { QuizResult, Question, TestType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { analyzePerformance } from '../geminiService';
import { GoogleGenAI } from "@google/genai";

interface ResultProps {
    result: QuizResult;
    questions: Question[];
    onRestart: () => void;
}

const Result: React.FC<ResultProps> = ({ result, questions = [], onRestart }) => {
    const [analysis, setAnalysis] = useState<string>('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showCert, setShowCert] = useState(false);
    const [certMessage, setCertMessage] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);

    const isAI = result.testType === TestType.AI;
    const themeBg = isAI ? 'bg-indigo-600' : 'bg-emerald-600';
    const themeText = isAI ? 'text-indigo-600' : 'text-emerald-600';
    const themeButton = isAI ? 'bg-indigo-700' : 'bg-emerald-700';

    const certId = useMemo(() => {
        return `DA-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }, []);

    const percentage = Math.round((result.score / result.totalQuestions) * 100);

    useEffect(() => {
        if (result) {
            setIsAnalyzing(true);
            analyzePerformance(result)
                .then(res => {
                    setAnalysis(res);
                    setIsAnalyzing(false);
                })
                .catch(() => {
                    setAnalysis("Bilim yo'lida charchamang! Siz munosib natija ko'rsata oldingiz.");
                    setIsAnalyzing(false);
                });
        }
    }, [result]);

    const toggleCertificate = async () => {
        setShowCert(true);
        if (!certMessage) {
            setIsGenerating(true);
            try {
                // @ts-ignore
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: `Dostonbek Academy sertifikati uchun MAXIMAL 7 ta so'zdan iborat juda qisqa tabrik yozing. Ism: ${result.userName}. Fan: ${result.category}. Faqat o'zbek tilida.`
                });
                setCertMessage(response.text?.trim() || "Muvaffaqiyatli yakunladingiz!");
            } catch (e) {
                setCertMessage("Bilim olishda muvaffaqiyatlar tilaymiz!");
            } finally {
                setIsGenerating(false);
            }
        }
    };

    const handleDownloadPdfCert = async () => {
        const element = document.getElementById('cert-print-area');
        if (!element) return;

        setIsDownloading(true);
        const originalStyle = element.getAttribute('style');

        element.style.transform = 'none';
        element.style.margin = '0';
        element.style.left = '0';
        element.style.top = '0';
        element.style.position = 'relative';
        element.style.boxShadow = 'none';

        // @ts-ignore
        const options = {
            margin: 0,
            filename: `Certificate_${result.userName.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                scrollX: 0,
                scrollY: 0,
                x: 0,
                y: 0,
                windowWidth: 1122,
                logging: false
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        try {
            // @ts-ignore
            await html2pdf().set(options).from(element).save();
        } catch (e) {
            console.error("PDF download error:", e);
            alert("PDF yuklashda xatolik yuz berdi.");
        } finally {
            if (originalStyle) {
                element.setAttribute('style', originalStyle);
            }
            setIsDownloading(false);
        }
    };

    const handleDownloadWordReport = () => {
        const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Test Tahlili</title>
      <style>
        body { font-family: 'Arial', sans-serif; padding: 20px; }
        .h1 { font-size: 24pt; color: #1e1b4b; text-align: center; font-weight: bold; margin-bottom: 20px; }
        .stat-box { background: #f8fafc; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .question { margin-top: 25pt; border-bottom: 2px solid #e2e8f0; padding-bottom: 15pt; }
        .correct { color: #059669; font-weight: bold; }
        .wrong { color: #dc2626; font-weight: bold; }
        .explanation { font-size: 10pt; color: #475569; font-style: italic; margin-top: 10px; background: #f1f5f9; padding: 10px; }
      </style></head><body>
      <div class="h1">DOSTONBEK ACADEMY</div>
      <div style="text-align:center; font-size:16pt; margin-bottom:30px;">RASMIY TEST NATIJA HISOBOTI</div>
      <div class="stat-box">
        <p><b>O'quvchi:</b> ${result.userName}</p>
        <p><b>Fan:</b> ${result.category}</p>
        <p><b>Natija:</b> ${result.score} / ${result.totalQuestions} (${percentage}%)</p>
        <p><b>Sana:</b> ${new Date().toLocaleString()}</p>
      </div>
      <p><b>AI Professor Tahlili:</b> ${analysis}</p>
      <hr/>
      <h3>BATAFSIL SAVOLLAR VA IZOHLAR:</h3>
      ${questions.map((q, i) => {
            const ans = result.answers?.find(a => a.questionId === q.id);
            return `
          <div class="question">
            <p><b>${i + 1}. ${q.text}</b></p>
            <p>Sizning javobingiz: <span class="${ans?.isCorrect ? 'correct' : 'wrong'}">${ans?.selectedOption === -1 ? 'Belgilanmagan' : q.options[ans?.selectedOption || 0]}</span></p>
            ${!ans?.isCorrect ? `<p>To'g'ri javob: <span class="correct">${q.options[q.correctAnswerIndex]}</span></p>` : ''}
            <div class="explanation"><b>Professor Izohi:</b> ${q.explanation || 'Izoh mavjud emas.'}</div>
          </div>
        `;
        }).join('')}
      </body></html>
    `;
        const blob = new Blob([header], { type: 'application/msword' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        // @ts-ignore
        link.download = `Tahlil_${result.userName.replace(/\s+/g, '_')}.doc`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const chartData = [
        { name: "To'g'ri", value: result.score, color: '#10b981' },
        { name: "Xato", value: Math.max(0, (result.answeredCount || 0) - result.score), color: '#ef4444' },
        { name: "Bo'sh", value: Math.max(0, result.totalQuestions - (result.answeredCount || 0)), color: '#94a3b8' }
    ].filter(d => d.value > 0);

    return (
        <div className="space-y-10 animate-in pb-32 max-w-6xl mx-auto">
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
                <div className={`absolute top-0 left-0 w-3 h-full ${themeBg}`}></div>
                <div className="text-center md:text-left">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white ${themeBg} mb-4 inline-block shadow-lg`}>Test Natijasi</div>
                    <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">HISOBOT</h2>
                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">{result.category} • {result.subTopic || result.topic}</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className={`w-36 h-36 rounded-full flex flex-col items-center justify-center text-white shadow-2xl border-8 ${percentage >= 70 ? 'bg-emerald-500 border-emerald-50' : 'bg-orange-500 border-orange-50'}`}>
                        <span className="text-4xl font-black">{percentage}%</span>
                        <span className="text-[10px] font-black uppercase opacity-80">Umumiy</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className={`rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden ${isAI ? 'bg-indigo-950' : 'bg-emerald-950'}`}>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-6 flex items-center">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-3 animate-pulse"></span>
                                PROFESSOR TAHLILI
                            </h3>
                            {isAnalyzing ? <p className="text-2xl font-serif italic animate-pulse">AI tahlil tayyorlamoqda...</p> : <p className="text-2xl md:text-3xl font-serif italic text-slate-100 leading-snug">"{analysis}"</p>}
                        </div>
                        <i className="fas fa-graduation-cap absolute -bottom-10 -right-10 text-white opacity-[0.05] text-[15rem]"></i>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest px-4 border-l-4 border-indigo-600 mb-6">SAVOLLAR VA BATAHISIL IZOHLAR</h4>
                        {questions.map((q, i) => {
                            const ans = result.answers?.find(a => a.questionId === q.id);
                            const status = ans?.selectedOption === -1 ? 'unanswered' : ans?.isCorrect ? 'correct' : 'wrong';
                            return (
                                <div key={q.id} className={`p-8 rounded-[2rem] border-2 transition-all shadow-sm ${status === 'correct' ? 'bg-emerald-50 border-emerald-100' : status === 'wrong' ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={`w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center font-black text-sm ${themeText}`}>{i+1}</span>
                                        <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${status === 'correct' ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'}`}>{status === 'correct' ? 'TO\'G\'RI' : 'XATO'}</span>
                                    </div>
                                    <h5 className="font-bold text-xl text-slate-800 mb-6 leading-relaxed">{q.text}</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                                            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Sizning javobingiz</p>
                                            <p className={`font-black text-lg ${status === 'correct' ? 'text-emerald-700' : 'text-red-700'}`}>{ans?.selectedOption === -1 ? 'BELGILANMAGAN' : q.options[ans?.selectedOption || 0]}</p>
                                        </div>
                                        {status !== 'correct' && (
                                            <div className="p-4 bg-white rounded-2xl shadow-sm border border-emerald-100">
                                                <p className="text-[10px] text-emerald-600 font-black uppercase mb-1">To'g'ri javob</p>
                                                <p className="font-black text-lg text-emerald-700">{q.options[q.correctAnswerIndex]}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 bg-white/60 rounded-2xl border border-slate-200 backdrop-blur-sm">
                                        <p className="text-[10px] text-indigo-600 font-black uppercase mb-2 tracking-widest flex items-center"><i className="fas fa-lightbulb mr-2"></i> Professor Izohi</p>
                                        <p className="text-sm text-slate-600 leading-relaxed font-medium italic">{q.explanation || "Ushbu savol uchun tushuntirish mavjud emas."}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-50 sticky top-24">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Natijalar Diagrammasi</h4>
                        <div className="h-[280px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius="70%" outerRadius="95%" dataKey="value" stroke="none">{chartData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-4xl font-black text-slate-900">{percentage}%</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Muvaffaqiyat</span>
                            </div>
                        </div>
                        <div className="mt-8 space-y-3">
                            {chartData.map(d => (
                                <div key={d.name} className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                                        <span className="text-xs font-black text-slate-500 uppercase">{d.name}</span>
                                    </div>
                                    <span className="font-black text-slate-800">{d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full p-6 bg-white/95 backdrop-blur-2xl border-t flex justify-center gap-4 z-[100] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] no-print">
                <button onClick={onRestart} className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-black">MENYU</button>
                <button onClick={handleDownloadWordReport} className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center active:scale-95 transition-all hover:bg-blue-700">
                    <i className="fas fa-file-word mr-3 text-lg"></i> WORD TAHLIL
                </button>
                <button onClick={toggleCertificate} className={`px-12 py-5 ${themeButton} text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center active:scale-95 transition-all hover:opacity-90`}>
                    <i className="fas fa-certificate text-yellow-400 mr-3 text-lg"></i> SERTIFIKAT
                </button>
            </div>

            {showCert && (
                <div className="fixed inset-0 z-[500] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
                    <div className="w-full flex flex-col items-center justify-center min-h-full">

                        <div className="certificate-mobile-container">
                            <div id="cert-print-area" className="relative bg-white border-[12px] border-indigo-950 p-6 text-center shadow-2xl flex flex-col items-center justify-between" style={{ height: '210mm', width: '297mm', minWidth: '297mm', boxSizing: 'border-box', margin: '0 auto', transformOrigin: 'center center' }}>

                                {/* Background Pattern */}
                                <div className="absolute inset-0 pointer-events-none opacity-[0.03] select-none grid grid-cols-4 gap-10 p-10 overflow-hidden">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="text-3xl font-black text-indigo-900 -rotate-45 whitespace-nowrap uppercase tracking-widest">DOSTONBEK ACADEMY</div>
                                    ))}
                                </div>

                                <div className="relative z-10 flex flex-col items-center w-full mt-4">
                                    <div className="w-14 h-14 bg-indigo-950 rounded-2xl flex items-center justify-center text-white text-3xl font-black mb-2 shadow-xl border-4 border-white">D</div>
                                    <h1 className="text-4xl font-black text-indigo-950 uppercase tracking-tighter mb-1">SERTIFIKAT</h1>
                                    <div className="h-1 w-40 bg-emerald-500 mb-1"></div>
                                    <p className="text-emerald-600 font-black tracking-[0.4em] text-[9px] uppercase">Dostonbek Academy Online Ta'lim Platformasi</p>
                                </div>

                                <div className="relative z-10 w-full flex flex-col items-center justify-center flex-grow py-4">
                                    <p className="text-slate-400 font-bold uppercase text-[10px] mb-2 tracking-[0.2em]">Ushbu sertifikat faxr bilan taqdim etiladi:</p>
                                    <h2 className="text-4xl font-black text-slate-900 mb-6 border-b-2 border-slate-100 pb-1 inline-block px-10 italic font-serif">{result.userName}</h2>

                                    <div className="max-w-xl px-8 min-h-[50px] flex items-center justify-center text-center">
                                        <p className="text-lg text-slate-700 italic leading-relaxed font-serif">
                                            {isGenerating ? 'AI tabrik tayyorlanmoqda...' : `"${certMessage}"`}
                                        </p>
                                    </div>
                                </div>

                                <div className="relative z-10 w-full mt-auto pb-4">
                                    <div className="grid grid-cols-3 gap-8 w-full max-w-3xl mx-auto pt-6 border-t border-slate-100">
                                        <div className="text-center">
                                            <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">Muvaffaqiyat</p>
                                            <p className="font-black text-indigo-950 text-xl">{percentage}%</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">Yo'nalish</p>
                                            <p className="font-black text-indigo-950 uppercase text-[11px] truncate max-w-[180px] mx-auto">{result.category}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] text-slate-400 font-black uppercase mb-1 tracking-widest">Sana</p>
                                            <p className="font-black text-indigo-950 text-lg">{new Date(result.date).toLocaleDateString('uz-UZ')}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-end justify-between px-20 mt-6">
                                        <div className="text-center w-52 relative">
                                            <div className="absolute -left-10 -top-6 text-[7px] font-mono text-slate-400 opacity-60">VERIFIED ID: {certId}</div>
                                            <div className="font-serif text-2xl text-indigo-950 mb-1 italic opacity-90" style={{ fontFamily: '"Brush Script MT", cursive', height: '35px' }}>
                                                Dostonbek Gubayev
                                            </div>
                                            <div className="w-full h-px bg-slate-300 mb-2"></div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Akademiya Direktori</p>
                                        </div>

                                        <div className="official-academy-seal-small translate-y-2">
                                            <div className="w-20 h-20 border-[3px] border-double border-indigo-900/30 rounded-full flex items-center justify-center relative bg-white/50 shadow-inner">
                                                <div className="text-[7px] font-black text-indigo-900/40 rotate-12 text-center leading-tight uppercase p-2">
                                                    DOSTONBEK ACADEMY<br/>
                                                </div>
                                                <div className="absolute inset-0 border border-indigo-900/10 rounded-full m-1"></div>
                                            </div>
                                        </div>

                                        <div className="text-center w-52 flex flex-col items-center justify-center opacity-20">
                                            <i className="fas fa-certificate text-3xl text-indigo-950 mb-1"></i>
                                            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Tasdiqlangan Hujjat</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Border Corners */}
                                <div className="absolute top-0 left-0 w-20 h-20 border-t-[6px] border-l-[6px] border-indigo-900/10 rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-20 h-20 border-t-[6px] border-r-[6px] border-indigo-900/10 rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-20 h-20 border-b-[6px] border-l-[6px] border-indigo-900/10 rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-20 h-20 border-b-[6px] border-r-[6px] border-indigo-900/10 rounded-br-lg"></div>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 w-full max-w-md no-print pb-12">
                            <button onClick={() => setShowCert(false)} className="w-full bg-white/10 text-white px-8 py-5 rounded-2xl font-bold hover:bg-white/20 transition-all uppercase text-xs tracking-widest border border-white/20">Yopish</button>
                            <button onClick={handleDownloadPdfCert} disabled={isDownloading} className="w-full bg-white text-indigo-950 px-8 py-5 rounded-2xl font-black shadow-2xl hover:bg-slate-50 transition-all uppercase text-xs tracking-widest flex items-center justify-center space-x-3 active:scale-95">
                                {isDownloading ? (
                                    <><i className="fas fa-spinner animate-spin text-lg"></i><span>YUKLANMOQDA...</span></>
                                ) : (
                                    <><i className="fas fa-file-pdf text-lg"></i><span>PDF YUKLASH</span></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Result;