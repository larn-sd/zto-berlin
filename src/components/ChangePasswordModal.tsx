import React, { useState } from 'react';
import { KeyRound, Check, X, ShieldAlert, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { isUserAdmin } from '../types';

interface ChangePasswordModalProps {
  onClose: () => void;
  targetUserId?: string;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, targetUserId }) => {
  const { users, currentUser, changePassword } = useApp();

  const isAdmin = isUserAdmin(currentUser);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    targetUserId || currentUser?.id || users[0]?.id || ''
  );
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const selectedUser = users.find(u => u.id === selectedUserId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmed = newPassword.trim();
    if (!trimmed) {
      setError('ກະລຸນາປ້ອນລະຫັດຜ່ານໃໝ່');
      return;
    }

    if (trimmed.length < 3) {
      setError('ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 3 ຕົວອັກສອນຂຶ້ນໄປ');
      return;
    }

    if (trimmed !== confirmPassword.trim()) {
      setError('ລະຫັດຜ່ານຢືນຢັນບໍ່ກົງກັນ!');
      return;
    }

    const ok = changePassword(selectedUserId, trimmed);
    if (ok) {
      setSuccessMsg(`ປ່ຽນລະຫັດຜ່ານສຳລັບ "${selectedUser?.name || selectedUser?.username}" ສຳເລັດແລ້ວ!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setError('ເກີດຂໍ້ຜິດພາດໃນການປ່ຽນລະຫັດ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">ປ່ຽນລະຫັດຜ່ານ (Change Password)</h3>
              <p className="text-xs text-slate-500">ກຳນົດລະຫັດຜ່ານໃໝ່ສຳລັບການ Login</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* If admin, can choose which user's password to change */}
          {isAdmin ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ເລືອກບັນຊີຜູ້ໃຊ້ທີ່ຕ້ອງການປ່ຽນລະຫັດ:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {isUserAdmin(u) ? '👑 [Admin] ' : '📦 [Staff] '} {u.name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center gap-2 text-slate-700">
              <UserIcon className="w-4 h-4 text-slate-400" />
              <span>ບັນຊີຂອງທ່ານ: <strong>{currentUser?.name}</strong> (@{currentUser?.username})</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ລະຫັດຜ່ານໃໝ່ (New Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ປ້ອນລະຫັດຜ່ານໃໝ່..."
                className="w-full px-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ຢືນຢັນລະຫັດຜ່ານໃໝ່ (Confirm Password)
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="ປ້ອນລະຫັດຜ່ານໃໝ່ອີກຄັ້ງ..."
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ບັນທຶກລະຫັດໃໝ່</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
