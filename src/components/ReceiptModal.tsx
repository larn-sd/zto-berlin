import React, { useState } from 'react';
import { X, Printer, CheckCircle, ShieldCheck, Download, Calendar, Save } from 'lucide-react';
import { CheckoutBill } from '../types';
import { useApp } from '../context/AppContext';

interface ReceiptModalProps {
  bill: CheckoutBill;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ bill, onClose }) => {
  const { updateBill } = useApp();
  
  // Extract initial date (e.g. "2026-10-17")
  const initialDate = bill.date || (bill.timestamp && bill.timestamp.includes(' ') ? bill.timestamp.split(' ')[0] : new Date().toISOString().split('T')[0]);
  const initialTime = bill.timestamp && bill.timestamp.includes(' ') ? bill.timestamp.split(' ')[1] : new Date().toTimeString().slice(0, 8);

  const [printDate, setPrintDate] = useState(initialDate);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handlePrint = () => {
    // If date was changed, auto-save to database as well
    if (printDate !== bill.date) {
      updateBill(bill.id, {
        date: printDate,
        timestamp: `${printDate} ${initialTime}`
      });
    }
    window.print();
  };

  const handleSaveDate = () => {
    updateBill(bill.id, {
      date: printDate,
      timestamp: `${printDate} ${initialTime}`
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const formatKip = (val: number) => {
    return new Intl.NumberFormat('lo-LA').format(val) + ' ₭';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">ໃບບິນຮັບເງິນ ແລະ ມອບພັດສະດຸ</h3>
              <p className="text-slate-500 text-xs font-mono">{bill.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ພິມໃບບິນ</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Selector Bar for Reprinting Backdated Bills */}
        <div className="px-6 py-3 bg-indigo-50/80 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="font-bold text-indigo-950">ເລືອກວັນທີພິມໃສ່ບິນ:</span>
            <input
              type="date"
              value={printDate}
              onChange={(e) => setPrintDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {printDate !== bill.date && (
              <button
                onClick={handleSaveDate}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition flex items-center gap-1 text-[11px]"
              >
                <Save className="w-3 h-3" />
                <span>{savedSuccess ? '✓ ບັນທຶກແລ້ວ' : 'ບັນທຶກວັນທີນີ້'}</span>
              </button>
            )}
            <span className="text-[10px] text-indigo-600">
              * ປ່ຽນວັນທີຍ້ອນຫຼັງໄດ້ຫາກລືມສະແກນ
            </span>
          </div>
        </div>

        {/* Modal Printable Receipt Content */}
        <div className="p-6 overflow-y-auto max-h-[72vh]">
          <div 
            id="printable-receipt"
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-inner font-sans text-xs text-slate-800 space-y-4 max-w-sm mx-auto"
          >
            {/* Store Branding */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                ZTO Berlin
              </h2>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                ສາຂາ ໜອງບົວທອງ (Berlin)
              </p>
              <p className="text-[11px] text-slate-500">
                ບໍລິການຮັບ-ສົ່ງພັດສະດຸດ່ວນ • ໂທ: 020 55123456 / 020 99876543
              </p>
              <div className="mt-2 text-xs font-mono font-bold text-slate-700 bg-slate-100 py-1 rounded">
                ເລກບິນ: {bill.id}
              </div>
            </div>

            {/* Bill Meta */}
            <div className="text-[11px] space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>ວັນທີ-ເວລາ:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {printDate} {initialTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ລູກຄ້າ:</span>
                <span className="font-bold text-slate-900">{bill.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span>ເບີໂທລະສັບ:</span>
                <span className="font-mono text-slate-800">{bill.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span>ພະນັກງານອອກບິນ:</span>
                <span className="text-slate-800">{bill.cashierName}</span>
              </div>
            </div>

            {/* Items List */}
            <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2">
              <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider mb-1 flex justify-between">
                <span>ລາຍການພັດສະດຸ ({bill.parcels?.length || bill.parcelIds.length} ຊິ້ນ)</span>
                <span>ລາຄາ</span>
              </div>
              {bill.parcels && bill.parcels.length > 0 ? (
                bill.parcels.map((p, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px]">
                    <div className="pr-2">
                      <div className="font-mono font-semibold text-slate-800">{p.parcelCode}</div>
                      <div className="text-[10px] text-slate-500">{p.shippingCode}</div>
                    </div>
                    <div className="font-bold text-slate-900 whitespace-nowrap">
                      {formatKip(p.customerPrice)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 text-center py-1">
                  ພັດສະດຸ {bill.parcelIds.join(', ')}
                </div>
              )}
            </div>

            {/* Total Section */}
            <div className="space-y-1 text-xs">
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1">
                <span>ຍອດລວມທີ່ຕ້ອງຊໍາລະ:</span>
                <span className="text-indigo-700">{formatKip(bill.totalCustomerPrice)}</span>
              </div>

              {/* Payment Details */}
              <div className="pt-2 text-[11px] text-slate-600 space-y-1">
                <div className="flex justify-between">
                  <span>ວິທີການຊໍາລະ:</span>
                  <span className="font-bold text-slate-900">
                    {bill.paymentMethod === 'cash' ? '💵 ເງິນສົດ' : `📱 ໂອນເງິນ (${bill.transferBank || 'ທະນາຄານ'})`}
                  </span>
                </div>

                {bill.paymentMethod === 'cash' && bill.cashReceived !== undefined && (
                  <>
                    <div className="flex justify-between">
                      <span>ເງິນສົດທີ່ຮັບ:</span>
                      <span>{formatKip(bill.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>ເງິນທອນ:</span>
                      <span>{formatKip(bill.cashChange || 0)}</span>
                    </div>
                  </>
                )}

                {bill.paymentMethod === 'transfer' && bill.transferRef && (
                  <div className="flex justify-between">
                    <span>ເລກອ້າງອີງໂອນ (Ref):</span>
                    <span className="font-mono font-bold text-indigo-700">{bill.transferRef}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Transfer Slip Proof (Anti-Theft Audit) */}
            {bill.transferProofUrl && (
              <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-indigo-900 mb-1.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ຫຼັກຖານການໂອນເງິນ (Transfer Slip Attached):</span>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <img
                    src={bill.transferProofUrl}
                    alt="Transfer Proof Slip"
                    className="w-full max-h-48 object-contain bg-slate-100"
                  />
                </div>
              </div>
            )}

            {/* Barcode representation */}
            <div className="text-center pt-2">
              <div className="inline-block px-4 py-1.5 bg-slate-950 text-white font-mono tracking-widest text-xs rounded">
                * {bill.id} *
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                ຂອບໃຈທີ່ໃຊ້ບໍລິການ • ກະລຸນາກວດສອບເຄື່ອງກ່ອນອອກຈາກຮ້ານ
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition"
          >
            ປິດໜ້າຕ່າງ
          </button>
        </div>
      </div>
    </div>
  );
};
