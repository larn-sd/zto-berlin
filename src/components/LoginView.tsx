import React, { useState } from 'react';
import { Package, Lock, User, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginView: React.FC = () => {
  const { users, login, switchUser } = useApp();
  const [username, setUsername] = useState('admin');
  const [pin, setPin] = useState('123456');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = login(username, pin);
    if (!success) {
      setError('ຊື່ຜູ້ໃຊ້ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ (ສາມາດໃຊ້ບັນຊີຕົວຢ່າງລຸ່ມນີ້)');
    }
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-5 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800/20">
        {/* Left Side: Branding & Logistics Overview */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-6 shadow-inner border border-white/20">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              ZTO Berlin
            </h1>
            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
              ລະບົບຈັດການພັດສະດຸສາຂາ ໜອງບົວທອງ (Berlin) — ຄວບຄຸມການຮັບ-ສົ່ງພັດສະດຸ, ສະແກນບາໂຄດ, ແລະ ອອກໃບບິນປ້ອງກັນພະນັກງານສໍ້ໂກງ.
            </p>

            <div className="space-y-3 text-xs text-indigo-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>ອັບໂຫລດ Excel ຈາກສາງໃຫຍ່ໄດ້ງ່າຍ</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>ສະແກນຮັບເຄື່ອງ ທຽບລະຫັດອັດຕະໂນມັດ</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>ກວດສອບເຄື່ອງບໍ່ເຫັນ & ສາງໃຫຍ່ລືມສະແກນ</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                <span>ອອກໃບບິນ ພ້ອມແນບສະລິບໂອນປ້ອງກັນເງິນຫາຍ</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-indigo-500/40 text-[11px] text-indigo-200">
            ສາຂາ ໜອງບົວທອງ (Berlin) • ນະຄອນຫຼວງວຽງຈັນ
          </div>
        </div>

        {/* Right Side: Login Form & Demo Selector */}
        <div className="md:col-span-3 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">ເຂົ້າສູ່ລະບົບ (Login)</h2>
            <p className="text-slate-500 text-sm mt-1">
              ກະລຸນາປ້ອນຂໍ້ມູນບັນຊີພະນັກງານ ຫຼື ເຈົ້າຂອງສາຂາ
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ຊື່ຜູ້ໃຊ້ (Username)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  placeholder="admin ຫຼື staff"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                ລະຫັດຜ່ານ (Password / PIN)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>ເຂົ້າສູ່ລະບົບ</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              ຫຼື ເລືອກເຂົ້າສູ່ລະບົບທົດສອບດ່ວນ (One-Click Demo):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleQuickLogin(u.id)}
                  type="button"
                  className="p-3 text-left rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex items-center gap-3 group"
                >
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 group-hover:border-indigo-400"
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate group-hover:text-indigo-600">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {u.role === 'owner' ? '👑 ເຈົ້າຂອງຮ້ານ' : '📦 ພະນັກງານສາຂາ'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
