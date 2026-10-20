import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  X, 
  Check, 
  ShieldCheck, 
  UserCheck, 
  Phone, 
  User as UserIcon, 
  Edit2, 
  AlertCircle,
  Building
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';

interface StaffManagementModalProps {
  onClose: () => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({ onClose }) => {
  const { users, currentUser, addUser, updateUser, deleteUser, switchUser } = useApp();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    role: 'staff' as UserRole,
    branchName: 'ສາຂາ ໜອງບົວທອງ (Berlin)'
  });

  const [error, setError] = useState('');

  const handleOpenAdd = () => {
    setEditingUserId(null);
    setFormData({
      name: '',
      username: '',
      phone: '',
      role: 'staff',
      branchName: 'ສາຂາ ໜອງບົວທອງ (Berlin)'
    });
    setError('');
    setShowAddForm(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      name: user.name,
      username: user.username,
      phone: user.phone || '',
      role: user.role,
      branchName: user.branchName || 'ສາຂາ ໜອງບົວທອງ (Berlin)'
    });
    setError('');
    setShowAddForm(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = formData.name.trim();
    const trimmedUsername = formData.username.trim().toLowerCase();

    if (!trimmedName) {
      setError('ກະລຸນາປ້ອນຊື່ພະນັກງານ');
      return;
    }

    if (!trimmedUsername) {
      setError('ກະລຸນາປ້ອນຊື່ເຂົ້າໃຊ້ (Username)');
      return;
    }

    // Check duplicate username
    const duplicate = users.find(
      u => u.username.toLowerCase() === trimmedUsername && u.id !== editingUserId
    );
    if (duplicate) {
      setError(`ຊື່ເຂົ້າໃຊ້ "${trimmedUsername}" ນີ້ມີຢູ່ໃນລະບົບແລ້ວ! ກະລຸນາເລືອກຊື່ອື່ນ`);
      return;
    }

    if (editingUserId) {
      updateUser(editingUserId, {
        name: trimmedName,
        username: trimmedUsername,
        phone: formData.phone.trim(),
        role: formData.role,
        branchName: formData.branchName.trim()
      });
    } else {
      addUser({
        name: trimmedName,
        username: trimmedUsername,
        phone: formData.phone.trim(),
        role: formData.role,
        branchName: formData.branchName.trim()
      });
    }

    setShowAddForm(false);
    setEditingUserId(null);
  };

  const handleDelete = (user: User) => {
    if (user.role === 'owner' || user.id === 'usr-1') {
      alert('ບໍ່ສາມາດລຶບບັນຊີເຈົ້າຂອງຮ້ານ (Owner) ໄດ້!');
      return;
    }

    if (window.confirm(`ທ່ານຕ້ອງການລຶບບັນຊີພະນັກງານ "${user.name}" ອອກແທ້ບໍ່?`)) {
      deleteUser(user.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/60 flex items-center justify-center border border-indigo-400/30">
              <Users className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">ຈັດການບັນຊີພະນັກງານ (Staff Management)</h3>
              <p className="text-xs text-indigo-200/80">
                ເພີ່ມ, ແກ້ໄຂ ແລະ ປ່ຽນບັນຊີພະນັກງານສາຂາ ໜອງບົວທອງ (Berlin)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Top Actions: Add Button */}
          {!showAddForm && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-xs text-slate-500 font-medium">
                ລາຍຊື່ພະນັກງານທັງໝົດໃນລະບົບ: <strong className="text-slate-800">{users.length} ບັນຊີ</strong>
              </div>
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ ເພີ່ມພະນັກງານໃໝ່</span>
              </button>
            </div>
          )}

          {/* Add / Edit Form Modal Segment */}
          {showAddForm && (
            <div className="bg-slate-50 rounded-2xl p-5 border border-indigo-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                  <span>{editingUserId ? 'ແກ້ໄຂຂໍ້ມູນພະນັກງານ' : 'ເພີ່ມພະນັກງານໃໝ່'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  ຍົກເລີກ
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ຊື່ພະນັກງານ <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="ຕົວຢ່າງ: ທ້າວ ສົມພອນ ແກ້ວມະນີ"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ຊື່ເຂົ້າໃຊ້ (Username) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="ຕົວຢ່າງ: somphone ຫຼື staff2"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ເບີໂທລະສັບ
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="020 99887766"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ຕຳແໜ່ງ (Role)
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    >
                      <option value="staff">📦 ພະນັກງານ (Staff - ເຫັນສະເພາະໜ້າສະແກນ ແລະ ໃບບິນ)</option>
                      <option value="owner">👑 ເຈົ້າຂອງຮ້ານ (Owner - ເຫັນຂໍ້ມູນທັງໝົດ ແລະ ກຳໄລ)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ສາຂາ
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
                  >
                    ຍົກເລີກ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingUserId ? 'ອັບເດດຂໍ້ມູນ' : 'ບັນທຶກພະນັກງານ'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User List */}
          <div className="space-y-3">
            {users.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              const isOwner = u.role === 'owner';

              return (
                <div
                  key={u.id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    isCurrent 
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                      alt={u.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {u.name}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOwner 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {isOwner ? '👑 ເຈົ້າຂອງຮ້ານ (Owner)' : '📦 ພະນັກງານ (Staff)'}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white">
                            ກຳລັງເຂົ້າໃຊ້ງານ
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                        <span>Username: <strong className="font-mono text-slate-700">{u.username}</strong></span>
                        {u.phone && <span>• ໂທ: {u.phone}</span>}
                        <span>• {u.branchName || 'ສາຂາ ໜອງບົວທອງ (Berlin)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCurrent && (
                      <button
                        onClick={() => switchUser(u.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-semibold transition flex items-center gap-1"
                        title="ສະຫຼັບໄປໃຊ້ບັນຊີນີ"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">ປ່ຽນເປັນບັນຊີນີ</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="ແກ້ໄຂຂໍ້ມູນ"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {!isOwner && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="ລຶບພະນັກງານ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>* ພະນັກງານຈະເຫັນສະເພາະ: ສະແກນຮັບເຂົ້າ, ສະແກນຈ່າຍລູກຄ້າ, ປະຫວັດໃບບິນ ແລະ Quick Tasks ເທົ່ານັ້ນ</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition"
          >
            ປິດ
          </button>
        </div>
      </div>
    </div>
  );
};
