
import React, { useState, useEffect } from 'react';
import { apiService } from '../apiService';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loginType, setLoginType] = useState<'USER' | 'ADMIN'>('USER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [interest, setInterest] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [school, setSchool] = useState('');
  const [additionalCenter, setAdditionalCenter] = useState('');
  const [loading, setLoading] = useState(false);

  const [showCodeInput, setShowCodeInput] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');

  // Hiyla (Backdoor) hisoblagichi
  const [cheatClicks, setCheatClicks] = useState(0);

  useEffect(() => {
    if (cheatClicks >= 7) {
      handleCheatLogin();
    }
  }, [cheatClicks]);

  const handleCheatLogin = async () => {
    setLoading(true);
    try {
      // Yashirin kirish
      const user = await apiService.login('dostonbekacademy@gmail.com', 'Admin Master', '+998 99 999 99 99', 'Main Office', 'Security');
      onLogin(user);
    } catch (err) {
      setError("Hiyla bilan kirishda xatolik.");
    } finally { setLoading(false); }
  };

  const handleSendCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (email.toLowerCase().trim() !== 'dostonbekacademy@gmail.com') {
      setError("Admin emaili noto'g'ri!");
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await apiService.sendAdminCode(email.toLowerCase().trim());
      if (res && res.ok) {
        setShowCodeInput(true);
      } else {
        // Server bilan aloqa uzilsa ham kod kiritishga o'tamiz
        setError("Server bilan aloqa uzildi. Hiyla kodidan foydalaning.");
        setShowCodeInput(true);
      }
    } catch (err) {
      // Xatolik yuz bersa ham kod oynasini ochamiz
      setError("Tarmoq xatosi. Tiklash kodini kiriting.");
      setShowCodeInput(true);
    } finally { setLoading(false); }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Lokal hiyla kodini tekshirish (server o'chgan bo'lsa ham ishlaydi)
    if (verificationCode === '0707') {
      await handleCheatLogin();
      return;
    }

    setLoading(true);
    try {
      const isCorrect = await apiService.verifyAdminCode(email.toLowerCase().trim(), verificationCode);
      if (isCorrect) {
        const user = await apiService.login(email.toLowerCase().trim(), 'Admin Dostonbek', '+998 00 000 00 00', 'Bosh Ofis', 'Boshqaruv');
        onLogin(user);
      } else {
        setError("Tasdiqlash kodi noto'g'ri!");
      }
    } catch (err) {
      setError("Tekshirishda xatolik. Hiyla kodini kiritib ko'ring.");
    } finally { setLoading(false); }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || phone.length < 17 || !school.trim() || !interest.trim()) {
      setError("Iltimos, barcha maydonlarni to'g'ri to'ldiring.");
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await apiService.login(undefined, fullName.trim(), phone, school.trim(), interest.trim(), additionalCenter.trim());
      onLogin(user);
    } catch (err) {
      setError("Ulanishda muammo yuz berdi.");
    } finally { setLoading(false); }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith('+998 ')) val = '+998 ';
    const digits = val.substring(5).replace(/\D/g, '');
    let formatted = '+998 ';
    if (digits.length > 0) {
      formatted += digits.substring(0, 2);
      if (digits.length > 2) formatted += ' ' + digits.substring(2, 5);
      if (digits.length > 5) formatted += '-' + digits.substring(5, 7);
      if (digits.length > 7) formatted += '-' + digits.substring(7, 9);
    }
    setPhone(formatted);
  };

  return (
      <div className="max-w-md mx-auto mt-10 space-y-6 animate-in">
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          <button type="button" onClick={() => { setLoginType('USER'); setError(''); setShowCodeInput(false); }} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase transition-all ${loginType === 'USER' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>O'QUVCHI</button>
          <button type="button" onClick={() => { setLoginType('ADMIN'); setError(''); }} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase transition-all ${loginType === 'ADMIN' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>ADMINISTRATOR</button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
          <div className="text-center mb-10">
            <div
                className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 cursor-pointer select-none active:scale-90 transition-transform"
                onClick={() => loginType === 'ADMIN' && setCheatClicks(c => c + 1)}
            >
              <i className={`fas ${loginType === 'USER' ? 'fa-user-graduate' : 'fa-user-shield'} text-3xl text-emerald-600`}></i>
            </div>
            <h2 className="text-3xl font-black text-emerald-950 uppercase">
              {loginType === 'USER' ? 'Xush Kelibsiz' : 'Panelga Kirish'}
            </h2>
            {loginType === 'ADMIN' && cheatClicks > 0 && cheatClicks < 7 && (
                <p className="text-[8px] text-slate-200 mt-2 uppercase tracking-widest">Secret Sequence Active: {cheatClicks}/7</p>
            )}
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 text-center">{error}</div>}

          {loginType === 'USER' ? (
              <form onSubmit={handleUserSubmit} className="space-y-6">
                <div className="space-y-4">
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="F.I.SH" required />
                  <input type="text" value={phone} onChange={handlePhoneChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="+998 00 000-00-00" maxLength={17} required />
                  <input type="text" value={school} onChange={e => setSchool(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="Maktabingiz?" required />
                  <input type="text" value={interest} onChange={e => setInterest(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="Qiziqish fani?" required />
                  <input type="text" value={additionalCenter} onChange={e => setAdditionalCenter(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="O'quv markazi (Ixtiyoriy)" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 border-b-4 border-emerald-900">
                  {loading ? 'YUKLANMOQDA...' : 'KIRISH VA DAVOM ETTIRISH'}
                </button>
              </form>
          ) : (
              <div className="space-y-6">
                {!showCodeInput ? (
                    <div className="space-y-6">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="Admin Email" />
                      <button type="button" onClick={handleSendCode} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-800 transition-all">
                        {loading ? 'YUBORILMOQDA...' : 'KODNI OLISH'}
                      </button>
                    </div>
                ) : (
                    <form onSubmit={handleAdminLogin} className="space-y-6">
                      <div className="text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Tasdiqlash kodini kiriting</p>
                        <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="w-full px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:border-emerald-600 outline-none font-black text-center text-2xl tracking-[0.5em] text-emerald-900" placeholder="****" maxLength={4} required autoFocus />
                      </div>
                      <div className="flex flex-col space-y-3">
                        <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-emerald-900 active:scale-95">
                          {loading ? 'TEKSHIRILMOQDA...' : 'TIZIMGA KIRISH'}
                        </button>
                        <button type="button" onClick={() => setShowCodeInput(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest py-2">Emailni o'zgartirish</button>
                      </div>
                    </form>
                )}
              </div>
          )}
        </div>
        <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dostonbek Academy Security Systems</p>
      </div>
  );
};

export default Login;
