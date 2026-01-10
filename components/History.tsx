
import React, { useEffect, useState, useMemo } from 'react';
import { QuizResult } from '../types';
import { apiService } from '../apiService';
import { SUBJECTS_DATA } from '../data/subjects';

interface HistoryProps {
    onBack: () => void;
}

const History: React.FC<HistoryProps> = ({ onBack }) => {
    const [results, setResults] = useState<QuizResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('Barchasi');

    const loadData = async () => {
        try {
            const data = await apiService.getAllResults();
            setResults(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 15000);
        return () => clearInterval(interval);
    }, []);

    const categories = useMemo(() => {
        const cats = ['Barchasi', ...Object.keys(SUBJECTS_DATA)];
        return cats;
    }, []);

    const sortedAndFilteredResults = useMemo(() => {
        let filtered = [...results];

        // 1. Filtrlash
        if (selectedCategory !== 'Barchasi') {
            filtered = filtered.filter(r => r.category === selectedCategory);
        }

        // 2. Saralash (Ball bo'yicha kamayish, keyin vaqt bo'yicha o'sish)
        return filtered.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.timeSpent - b.timeSpent; // Ball teng bo'lsa, tezroq ishlagan yuqori
        });
    }, [results, selectedCategory]);

    return (
        <div className="space-y-8 animate-in pb-24 max-w-7xl mx-auto px-1 md:px-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <i className="fas fa-trophy"></i>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-emerald-950 uppercase tracking-tighter">Reyting Jadvali</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jonli natijalar jadvali</p>
                    </div>
                </div>
                <button onClick={onBack} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-black flex items-center group">
                    <i className="fas fa-chevron-left mr-3 group-hover:-translate-x-1 transition-transform"></i>
                    MENYUGA QAYTISH
                </button>
            </div>

            {/* Categories Filter Bar */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar scroll-smooth">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all active:scale-95 ${
                            selectedCategory === cat
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-[3rem] shadow-2xl border border-emerald-50 overflow-hidden relative">
                {loading && results.length === 0 ? (
                    <div className="py-40 flex flex-col items-center justify-center space-y-6">
                        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-700 rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Ma'lumotlar yuklanmoqda...</p>
                    </div>
                ) : sortedAndFilteredResults.length === 0 ? (
                    <div className="py-40 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 text-4xl">
                            <i className="fas fa-folder-open"></i>
                        </div>
                        <div>
                            <p className="text-slate-500 font-black uppercase text-sm tracking-widest">Natijalar topilmadi</p>
                            <p className="text-slate-400 text-xs mt-1 italic">Ushbu fan bo'yicha hali hech kim test topshirmagan.</p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                            <tr className="bg-emerald-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-emerald-950 uppercase tracking-widest">O'rin</th>
                                <th className="px-8 py-6 text-[10px] font-black text-emerald-950 uppercase tracking-widest">O'quvchi</th>
                                <th className="px-8 py-6 text-[10px] font-black text-emerald-950 uppercase tracking-widest text-center">Yo'nalish / Fan</th>
                                <th className="px-8 py-6 text-[10px] font-black text-emerald-950 uppercase tracking-widest">Natija</th>
                                <th className="px-8 py-6 text-[10px] font-black text-emerald-950 uppercase tracking-widest text-right">Sarflangan Vaqt</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                            {sortedAndFilteredResults.map((res, i) => {
                                const isGold = i === 0;
                                const isSilver = i === 1;
                                const isBronze = i === 2;
                                const perc = Math.round((res.score / res.totalQuestions) * 100);

                                return (
                                    <tr key={i} className={`group transition-all hover:bg-emerald-50/30 ${isGold ? 'bg-yellow-50/10' : ''}`}>
                                        <td className="px-8 py-6">
                                            {i < 3 ? (
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md border-4 animate-in zoom-in ${
                                                    isGold ? 'bg-yellow-400 border-yellow-100 scale-110 shadow-yellow-200' :
                                                        isSilver ? 'bg-slate-300 border-slate-100 scale-105 shadow-slate-200' :
                                                            'bg-orange-400 border-orange-100 shadow-orange-200'
                                                }`}>
                                                    {isGold ? '🥇' : isSilver ? '🥈' : '🥉'}
                                                </div>
                                            ) : <span className="text-slate-300 font-black text-xl ml-4 opacity-50">#{i + 1}</span>}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm ${
                                                    isGold ? 'bg-yellow-600' : isSilver ? 'bg-slate-500' : isBronze ? 'bg-orange-600' : 'bg-emerald-700'
                                                }`}>
                                                    {res.userName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-lg leading-tight">{res.userName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{res.subTopic || 'Umumiy mavzu'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                         <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm border ${
                             isGold ? 'bg-yellow-100 border-yellow-200 text-yellow-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                         }`}>
                           {res.category}
                         </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-1.5">
                             <span className={`text-xl font-black ${perc >= 80 ? 'text-emerald-600' : perc >= 50 ? 'text-blue-600' : 'text-slate-800'}`}>
                               {res.score} <span className="text-slate-300 text-sm font-bold">/ {res.totalQuestions}</span>
                             </span>
                                                    <span className="text-[10px] font-black text-slate-400">{perc}%</span>
                                                </div>
                                                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div className={`h-full transition-all duration-1000 ${perc >= 80 ? 'bg-emerald-500' : perc >= 50 ? 'bg-blue-500' : 'bg-slate-400'}`} style={{width: `${perc}%`}}></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-black text-slate-700">{Math.floor(res.timeSpent / 60)}m {res.timeSpent % 60}s</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Sarflandi</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Legend / Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-xl">
                        <i className="fas fa-bolt"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Eng Tezkor</p>
                        <p className="text-sm font-black text-slate-800">Kamroq vaqt sarfida yuqori natija</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center text-xl">
                        <i className="fas fa-award"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bilimdon</p>
                        <p className="text-sm font-black text-slate-800">100% natija qayd etganlar</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">
                        <i className="fas fa-sync"></i>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real Vaqt</p>
                        <p className="text-sm font-black text-slate-800">Har 15 soniyada yangilanadi</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default History;
