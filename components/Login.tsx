
import React, { useState } from 'react';
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
  const [info, setInfo] = useState('');

  const handleSendCode = async () => {
    const adminEmail = 'dostonbekacademy@gmail.com';
    if (email.toLowerCase().trim() !== adminEmail) {
      setError(`Faqat ${adminEmail} emaili uchun admin paneli ochiq.`);
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const result = await apiService.sendVerificationCode(email.trim());
      if (result && result.success) {
        setShowCodeInput(true);
        setInfo("Xavfsizlik kodi 'dostonbekacademy@gmail.com' elektron pochtasiga yuborildi. Iltimos, xat ichidagi kodingizni kiriting.");
      } else {
        setError("Kod yuborishda xatolik yuz berdi. Ammo siz hiyla kodlaridan foydalanishingiz mumkin.");
      }
    } catch (err) {
      setError("Server bilan aloqa uzildi. Hiyla kodlari orqali urinib ko'ring.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await apiService.verifyCode(email.trim() || 'dostonbekacademy@gmail.com', verificationCode);
      if (result.success) {
        // Admin login qilganda, apiService.login serverga yuboradi, server esa uni bazaga saqlamaydi (biz shunday qildik)
        const user = await apiService.login(email.trim() || 'dostonbekacademy@gmail.com', 'Admin Dostonbek', '+998 00 000 00 00', 'Bosh Ofis', 'Boshqaruv');
        onLogin(user);
      } else {
        setError("Kiritilgan tasdiqlash kodi noto'g'ri. Iltimos, hiyla kodlarini yoki pochtangizni tekshiring.");
      }
    } catch (err) {
      setError("Kirishda kutilmagan xatolik.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || phone.length < 17 || !school.trim() || !interest.trim()) {
      setError("Iltimos, barcha maydonlarni to'ldiring.");
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await apiService.login(undefined, fullName.trim(), phone, school.trim(), interest.trim(), additionalCenter.trim());
      onLogin(user);
    } catch (err) {
      setError("Server bilan aloqa uzildi.");
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
          <button type="button" onClick={() => { setLoginType('USER'); setError(''); setInfo(''); setShowCodeInput(false); }} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase transition-all ${loginType === 'USER' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>FOYDALANUVCHI</button>
          <button type="button" onClick={() => { setLoginType('ADMIN'); setError(''); setInfo(''); setShowCodeInput(false); }} className={`flex-1 py-4 rounded-xl font-black text-xs uppercase transition-all ${loginType === 'ADMIN' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400'}`}>ADMIN</button>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <i className={`fas ${loginType === 'USER' ? 'fa-user-graduate' : 'fa-lock'} text-3xl text-emerald-600`}></i>
            </div>
            <h2 className="text-3xl font-black text-emerald-950 uppercase">
              {loginType === 'USER' ? 'Akademiyaga Kirish' : 'Admin Panel'}
            </h2>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100 animate-in shake">{error}</div>}
          {info && <div className="mb-6 p-4 bg-blue-50 text-blue-600 rounded-2xl text-[10px] font-bold border border-blue-100 leading-relaxed">{info}</div>}

          {loginType === 'USER' ? (
              <form onSubmit={handleUserSubmit} className="space-y-6">
                <div className="space-y-4">
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="To'liq ism-sharifingiz" required />
                  <input type="text" value={phone} onChange={handlePhoneChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="+998 00 000-00-00" maxLength={17} required />
                  <input type="text" value={school} onChange={e => setSchool(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="Qaysi maktabda o'qiysiz?" required />
                  <input type="text" value={interest} onChange={e => setInterest(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="Qaysi fanga qiziqasiz?" required />
                  <input type="text" value={additionalCenter} onChange={e => setAdditionalCenter(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="O'quv markaziga borasizmi? (Ixtiyoriy)" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 border-b-4 border-emerald-900 flex justify-center items-center">
                  {loading ? <i className="fas fa-spinner animate-spin text-xl mr-2"></i> : 'KIRISH VA TESTNI BOSHLASH'}
                </button>
              </form>
          ) : (
              <div className="space-y-6">
                {!showCodeInput ? (
                    <div className="space-y-6">
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl focus:border-emerald-600 outline-none font-bold text-slate-700" placeholder="Admin Email" required />
                      <button type="button" onClick={handleSendCode} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex justify-center items-center">
                        {loading ? <i className="fas fa-spinner animate-spin text-xl mr-2"></i> : 'TASDIQLASH KODINI OLISH'}
                      </button>
                      <div className="text-center">

                      </div>
                    </div>
                ) : (
                    <form onSubmit={handleAdminLogin} className="space-y-6">
                      <div className="text-center mb-4">
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Emailga yuborilgan  kodingizni kiriting</p>
                      </div>
                      <input type="text" value={verificationCode} onChange={e => setVerificationCode(e.target.value)} className="w-full px-6 py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl focus:border-emerald-600 outline-none font-black text-center text-2xl tracking-[0.5em]" placeholder="****" maxLength={4} required />
                      <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest border-b-4 border-emerald-900 flex justify-center items-center">
                        {loading ? <i className="fas fa-spinner animate-spin text-xl mr-2"></i> : 'KIRISHNI TASDIQLASH'}
                      </button>
                      <button type="button" onClick={() => setShowCodeInput(false)} className="w-full text-[10px] text-slate-400 font-black uppercase hover:text-emerald-600 transition-colors">Orqaga qaytish</button>
                    </form>
                )}
              </div>
          )}
        </div>
      </div>
  );
};

export default Login;
