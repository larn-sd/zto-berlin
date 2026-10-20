import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, ShieldAlert, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginView: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [showForgotTip, setShowForgotTip] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setError('ກະລຸນາປ້ອນຊື່ຜູ້ໃຊ້ ແລະ ລະຫັດຜ່ານ');
      return;
    }

    const success = login(trimmedUser, trimmedPass);
    if (!success) {
      setError('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ!');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-[#f3b5ea] via-[#c2d7fc] to-[#a8f2eb] relative select-none">
      <div className="w-full max-w-sm sm:max-w-md mx-auto flex flex-col items-center px-6 py-10">
        
        {/* User Icon Circle - Outline Style matching attached image */}
        <div className="w-20 h-20 rounded-full border-2 border-white/90 flex items-center justify-center mb-4 shadow-xs">
          <UserIcon className="w-10 h-10 text-white stroke-[1.5]" />
        </div>

        {/* Title: User Login */}
        <h1 className="text-3xl sm:text-4xl font-light text-white tracking-wider mb-8 drop-shadow-xs text-center font-sans">
          User Login
        </h1>

        {/* Error notification if wrong credentials */}
        {error && (
          <div className="w-full mb-5 p-3 rounded-xl bg-white/70 backdrop-blur-md border border-rose-300 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Forgot Password Tip Modal/Alert */}
        {showForgotTip && (
          <div className="w-full mb-5 p-3.5 rounded-xl bg-white/85 backdrop-blur-md border border-indigo-200 text-slate-700 text-xs space-y-1 shadow-md">
            <div className="font-bold text-indigo-900 flex items-center justify-between">
              <span>ລືມລະຫັດຜ່ານ? (Forgot Password)</span>
              <button 
                type="button" 
                onClick={() => setShowForgotTip(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-[11px] text-slate-600">
              ກະລຸນາຕິດຕໍ່ <strong>ເຈົ້າຂອງຮ້ານ (larn)</strong> ເພື່ອກວດສອບ ຫຼື ປ່ຽນລະຫັດຜ່ານໃໝ່ໃຫ້ທ່ານ.
            </p>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="w-full space-y-6">
          
          {/* Email / Username Input with Underline Style */}
          <div className="relative border-b-2 border-[#2b5880]/70 focus-within:border-[#1d4161] transition-colors pb-1">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#2b5880] shrink-0 stroke-[2]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Email ID / Username"
                className="w-full bg-transparent text-slate-800 placeholder-[#436e96]/70 text-sm focus:outline-none py-1 font-medium"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Password Input with Underline Style */}
          <div className="relative border-b-2 border-[#2b5880]/70 focus-within:border-[#1d4161] transition-colors pb-1">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-[#2b5880] shrink-0 stroke-[2]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-transparent text-slate-800 placeholder-[#436e96]/70 text-sm focus:outline-none py-1 font-medium tracking-wide"
                required
              />
            </div>
          </div>

          {/* Remember me & Forgot Password Row */}
          <div className="flex items-center justify-between text-xs text-[#2b5880] pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#2b5880] focus:ring-0 border-slate-400 bg-white/70 cursor-pointer"
              />
              <span className="font-medium text-[11px] sm:text-xs">Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => setShowForgotTip(!showForgotTip)}
              className="text-[11px] sm:text-xs italic hover:underline hover:text-[#1d4161] transition"
            >
              Forgot Password?
            </button>
          </div>

          {/* Solid Rectangular LOGIN Button matching uploaded image */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 bg-[#2d5e89] hover:bg-[#224b70] active:scale-[0.99] text-white font-bold tracking-widest text-sm shadow-md transition duration-150 cursor-pointer"
            >
              LOGIN
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-[11px] text-[#2b5880]/80">
          ZTO Berlin • ສາຂາ ໜອງບົວທອງ (Berlin)
        </div>
      </div>
    </div>
  );
};
