
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  setView: (view: any) => void;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, setView, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navigateTo = (view: string) => {
    setView(view);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <nav className="sticky top-0 z-[100] bg-white border-b border-emerald-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Logo */}
              <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigateTo('setup')}>
                <div className="w-10 h-10 bg-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <span className="text-white font-bold text-xl">D</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-black text-emerald-950 leading-none">Dostonbek Academy</h1>
                  <p className="text-[9px] text-emerald-600 font-black tracking-[0.2em] uppercase">Test Platformasi</p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-6">
                <button onClick={() => setView('setup')} className="text-slate-600 hover:text-emerald-700 font-bold transition-colors text-xs uppercase tracking-widest">Test</button>
                <button onClick={() => setView('history')} className="text-slate-600 hover:text-emerald-700 font-bold transition-colors text-xs uppercase tracking-widest">Natijalar</button>
                <button  className="text-slate-600 hover:text-emerald-700 font-bold transition-colors text-xs uppercase tracking-widest"><a href="https://dostonbekacademy.uz/courses">Kurslar</a></button>

                {user?.role === 'ADMIN' && (
                    <button
                        onClick={() => setView('dashboard')}
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center"
                    >
                      <i className="fas fa-shield-halved mr-2"></i> DASHBOARD
                    </button>
                )}

                {user ? (
                    <div className="relative" ref={userMenuRef}>
                      <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 hover:bg-emerald-100 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">{user.fullName.charAt(0)}</div>
                        <span className="text-xs font-bold text-emerald-900">{user.fullName.split(' ')[0]}</span>
                      </button>
                      {isUserMenuOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-emerald-50 py-2 animate-in zoom-in-95">
                            <div className="px-4 py-2 border-b border-slate-50 mb-1">
                              <p className="text-[8px] text-slate-400 font-black uppercase">Foydalanuvchi</p>
                              <p className="text-xs font-bold text-slate-800 truncate">{user.fullName}</p>
                            </div>
                            <button onClick={onLogout} className="w-full text-left px-4 py-2 text-xs text-red-500 font-bold hover:bg-red-50 transition-colors"><i className="fas fa-sign-out-alt mr-2"></i>Chiqish</button>
                          </div>
                      )}
                    </div>
                ) : (
                    <button onClick={() => setView('login')} className="bg-emerald-700 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-800 text-xs shadow-md">KIRISH</button>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <div className="md:hidden flex items-center">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="text-emerald-900 p-2 focus:outline-none transition-transform active:scale-90"
                >
                  <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars-staggered'} text-2xl`}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Panel */}
          {isMenuOpen && (
              <div className="md:hidden bg-white border-t border-emerald-50 px-4 py-6 space-y-4 animate-in slide-in-from-top-2 shadow-2xl">
                <button onClick={() => navigateTo('setup')} className="w-full text-left px-6 py-4 bg-emerald-50/50 rounded-2xl text-emerald-900 font-black text-sm uppercase flex items-center">
                  <i className="fas fa-play-circle mr-3"></i> Test Topshirish
                </button>
                <button onClick={() => navigateTo('history')} className="w-full text-left px-6 py-4 bg-slate-50 rounded-2xl text-slate-600 font-black text-sm uppercase flex items-center">
                  <i className="fas fa-chart-line mr-3"></i> Natijalarim
                </button>

                <button  className="w-full text-left px-6 py-4 bg-slate-50 rounded-2xl text-slate-600 font-black text-sm uppercase flex items-center">
                  <i className="fas fa-chart-line mr-3"></i> <a href="https://dostonbekacademy.uz/courses" target="_blank">Kurslar</a>
                </button>

                {user?.role === 'ADMIN' && (
                    <button onClick={() => navigateTo('dashboard')} className="w-full text-left px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase flex items-center shadow-lg shadow-emerald-100">
                      <i className="fas fa-user-shield mr-3 text-emerald-200"></i> Admin Dashboard
                    </button>
                )}

                <div className="pt-4 border-t border-slate-100">
                  {user ? (
                      <button onClick={onLogout} className="w-full text-left px-6 py-4 text-red-500 font-black text-sm uppercase flex items-center">
                        <i className="fas fa-power-off mr-3"></i> Tizimdan Chiqish
                      </button>
                  ) : (
                      <button onClick={() => navigateTo('login')} className="w-full bg-emerald-700 text-white py-4 rounded-2xl font-black text-sm uppercase shadow-lg shadow-emerald-100">
                        Tizimga Kirish
                      </button>
                  )}
                </div>
              </div>
          )}
        </nav>

        {/* Main Content */}
        <main className="flex-grow">{children}</main>

        {/* Footer Section */}
        <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-emerald-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
              {/* Brand Info */}
              <div className="space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">D</span>
                  </div>
                  <div>
                    <h3 className="text-white font-black text-lg uppercase leading-none tracking-tighter">Dostonbek Academy</h3>
                    <p className="text-emerald-500 text-[9px] font-black uppercase tracking-widest">Intellektual Kelajak</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  Dostonbek Academy — zamonaviy ta'lim va AI texnologiyalari birlashgan maskan. Biz bilan o'z bilimingizni eng yuqori darajaga olib chiqing.
                </p>
                <div className="flex space-x-4">
                  <a href="https://t.me/dostonbekacademy" target="_blank" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-all hover:text-white"><i className="fab fa-telegram-plane text-lg"></i></a>
                  <a href="https://instagram.com/dostonbekacademy/" target="_blank"  className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-all hover:text-white"><i className="fab fa-instagram text-lg"></i></a>
                  <a href="#" className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-all hover:text-white"><i className="fab fa-youtube text-lg"></i></a>
                  <a href="https://facebook.com/dostonbekacademy/" target="_blank"  className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center hover:bg-emerald-600 transition-all hover:text-white"><i className="fab fa-facebook-f text-lg"></i></a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-8 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Havolalar
                </h4>
                <ul className="space-y-4 text-sm font-bold">
                  <li><button onClick={() => navigateTo('setup')} className="hover:text-emerald-400 transition-colors flex items-center"><i className="fas fa-chevron-right text-[10px] mr-3 opacity-50"></i> Bosh sahifa</button></li>
                  <li><button onClick={() => navigateTo('history')} className="hover:text-emerald-400 transition-colors flex items-center"><i className="fas fa-chevron-right text-[10px] mr-3 opacity-50"></i> Reyting jadvali</button></li>
                  <li><button onClick={() => navigateTo('login')} className="hover:text-emerald-400 transition-colors flex items-center"><i className="fas fa-chevron-right text-[10px] mr-3 opacity-50"></i> Shaxsiy kabinet</button></li>
                  <li><a href="https://dostonbekacademy.uz/courses" target="_blank" className="hover:text-emerald-400 transition-colors flex items-center"><i className="fas fa-chevron-right text-[10px] mr-3 opacity-50"></i> Kurslarimiz</a></li>
                  <li><a href="https://dostonbekacademy.uz/#achievements" target="_blank" className="hover:text-emerald-400 transition-colors flex items-center"><i className="fas fa-chevron-right text-[10px] mr-3 opacity-50"></i> Biz haqimizda</a></li>
                </ul>
              </div>

              {/* Contact Info */}
              <div>
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-8 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Kontaktlar
                </h4>
                <ul className="space-y-5">
                  <li className="flex items-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center mr-4 mt-1">
                      <i className="fas fa-phone-alt text-emerald-500"></i>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Telefon raqam</p>
                      <a href="tel:+998932899916" className="text-white font-bold hover:text-emerald-400 transition-colors">+998 (93) 289-99-16</a>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center mr-4 mt-1">
                      <i className="fas fa-envelope text-emerald-500"></i>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Elektron pochta</p>
                      <a href="mailto:dostonbekacademy@gmail.com" className="text-white font-bold hover:text-emerald-400 transition-colors">dostonbekacademy@gmail.com</a>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center mr-4 mt-1">
                      <i className="fas fa-map-marker-alt text-emerald-500"></i>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black">Manzilimiz</p>
                      <p className="text-white font-bold">Jomboy tumani Uztelekom binosi 2-qavati</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Newsletter/Status */}
              <div>
                <h4 className="text-white font-black text-xs uppercase tracking-[0.2em] mb-8 flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2"></span> Platforma Holati
                </h4>
                <div className="bg-slate-800 p-6 rounded-[2rem] border border-slate-700 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <i className="fas fa-bolt text-4xl text-emerald-400"></i>
                  </div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                    <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Tizim Onlayn</span>
                  </div>
                  <p className="text-xs text-slate-400 italic leading-relaxed">
                    "Bilim - kuch, AI esa uning tezlatkichi. Har kuni yangi narsa o'rganishdan to'xtamang! DOSTONBEK ACADEMY sizlar uchun yangilik qilishdan to'xtamaydi"
                  </p>
                  <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-500">Versiya 1.0.4</span>
                    <i className="fas fa-shield-check text-emerald-600"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                © 2026 Dostonbek Academy. Barcha huquqlar himoyalangan.
              </p>
              <div className="flex items-center space-x-6">
                <a href="#" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Maxfiylik siyosati</a>
                <a href="#" className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Foydalanish shartlari</a>
                <div className="h-4 w-px bg-slate-800"></div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Developed by <span className="text-emerald-500">Dostonbek</span>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
  );
};

export default Layout;
