import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  Coins,
  History,
  Settings2,
  DollarSign,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Lock,
  Key,
  Sliders,
  Upload,
  Image,
  RotateCcw,
} from 'lucide-react';
import { CoinTransaction, PowerUpId, PowerUpItem } from '../../engine/types';
import { economyService } from '../../services/economyService';
import { getCustomCardSkins, saveCustomCardSkin, removeCustomCardSkin, CustomCardSkinMap } from '../../utils/cardSkins';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshWallet?: () => void;
  onOpenCardStudio?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onRefreshWallet,
  onOpenCardStudio,
}) => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('uno_admin_authed') === 'true';
    } catch {
      return false;
    }
  });
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');

  const [tab, setTab] = useState<'transactions' | 'adjust' | 'catalog' | 'features'>('transactions');
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [catalog, setCatalog] = useState<Record<PowerUpId, PowerUpItem> | null>(null);

  // Form state for Adjust
  const [targetPlayerId, setTargetPlayerId] = useState('');
  const [amount, setAmount] = useState<number>(500);
  const [reason, setReason] = useState('Promotional / Event Bonus');
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Form state for Catalog
  const [editingPrice, setEditingPrice] = useState<{ id: PowerUpId; price: number } | null>(null);
  const [customSkins, setCustomSkins] = useState<CustomCardSkinMap>(() => getCustomCardSkins());

  const handlePowerUpIconUpload = (powerUpId: PowerUpId, file: File) => {
    if (!file.type.startsWith('image/')) {
      setStatusMsg({ text: 'Dapat ay image file (.png, .webp, .jpg) ang i-upload!', isError: true });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        saveCustomCardSkin('power_' + powerUpId, base64);
        setCustomSkins(getCustomCardSkins());
        setStatusMsg({ text: `Na-update ang PNG icon para sa ${powerUpId}!`, isError: false });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetPowerUpIcon = (powerUpId: PowerUpId) => {
    removeCustomCardSkin('power_' + powerUpId);
    setCustomSkins(getCustomCardSkins());
    setStatusMsg({ text: `Nai-reset ang icon sa default para sa ${powerUpId}.`, isError: false });
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const storedPin = localStorage.getItem('uno_admin_pin') || '8888';
    if (pinInput.trim() === storedPin) {
      setIsUnlocked(true);
      try {
        sessionStorage.setItem('uno_admin_authed', 'true');
      } catch {}
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Maling Admin PIN! Access Denied.');
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.trim().length < 4) {
      setStatusMsg({ text: 'Dapat hindi bababa sa 4 digits ang PIN.', isError: true });
      return;
    }
    localStorage.setItem('uno_admin_pin', newPin.trim());
    setStatusMsg({ text: 'Matagumpay na pinalitan ang Admin PIN!' });
    setNewPin('');
  };

  useEffect(() => {
    if (isOpen && isUnlocked) {
      loadData();
    }
  }, [isOpen, isUnlocked]);

  const loadData = async () => {
    const txs = await economyService.getAdminTransactions();
    setTransactions(txs);
    setCatalog(economyService.getCachedCatalog());
  };

  if (!isOpen) return null;

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPlayerId.trim()) {
      setStatusMsg({ text: 'Ilagay ang Player ID.', isError: true });
      return;
    }
    const res = await economyService.adminAdjustBalance(targetPlayerId.trim(), amount, reason);
    if (res.success) {
      setStatusMsg({ text: res.message });
      setTargetPlayerId('');
      loadData();
      onRefreshWallet?.();
    } else {
      setStatusMsg({ text: res.message, isError: true });
    }
  };

  const handleToggleItem = async (id: PowerUpId, currentEnabled: boolean) => {
    const res = await economyService.adminUpdateItem(id, { enabled: !currentEnabled });
    if (res.success) {
      loadData();
    }
  };

  const handleSavePrice = async (id: PowerUpId, price: number) => {
    const res = await economyService.adminUpdateItem(id, { price });
    if (res.success) {
      setEditingPrice(null);
      await loadData();
      setStatusMsg({ text: `Matagumpay na binago ang presyo sa ₱${price}!`, isError: false });
    } else {
      setStatusMsg({ text: 'Hindi na-save ang presyo. Subukan muli.', isError: true });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-red-500/70 rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-[0_0_50px_rgba(239,68,68,0.25)] relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 flex items-center justify-center text-white shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-wide flex items-center gap-2">
                <span>ADMIN CONTROLS & AUDIT</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                  Pangasiwaan
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                Suriin ang mga transaksyon, magbigay ng barya, at pamahalaan ang mga presyo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* If locked, prompt for PIN */}
        {!isUnlocked ? (
          <div className="my-auto py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                ADMIN ACCESS VERIFICATION
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Ilagay ang iyong Admin Secret PIN upang pamahalaan ang mga feature ng app, card customizer, at ekonomiya.
              </p>
            </div>

            <form onSubmit={handleUnlock} className="flex flex-col items-center gap-3 w-full max-w-xs">
              <input
                type="password"
                placeholder="Admin PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-4 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-rose-500 shadow-inner"
              />
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-white font-black text-xs shadow-lg active:scale-95 transition cursor-pointer"
              >
                I-verify & I-unlock
              </button>
            </form>

            {pinError && (
              <span className="text-xs font-bold text-rose-400 animate-fadeIn">
                {pinError}
              </span>
            )}
          </div>
        ) : (
          <>
            {/* Tab Selection */}
            <div className="grid grid-cols-4 gap-1.5 my-3 shrink-0">
              <button
                onClick={() => setTab('transactions')}
                className={`py-2 px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
                  tab === 'transactions'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span className="truncate">Audit</span>
              </button>

              <button
                onClick={() => setTab('adjust')}
                className={`py-2 px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
                  tab === 'adjust'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span className="truncate">Award Barya</span>
              </button>

              <button
                onClick={() => setTab('catalog')}
                className={`py-2 px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
                  tab === 'catalog'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="truncate">Power-Ups</span>
              </button>

              <button
                onClick={() => setTab('features')}
                className={`py-2 px-2 rounded-xl font-black text-[11px] sm:text-xs transition flex items-center justify-center gap-1 cursor-pointer ${
                  tab === 'features'
                    ? 'bg-rose-600 text-white shadow'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="truncate">Features & PIN</span>
              </button>
            </div>

        {/* Feedback message */}
        {statusMsg && (
          <div
            className={`my-2 p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 shrink-0 ${
              statusMsg.isError
                ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                : 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
            }`}
          >
            {statusMsg.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Tab 1: Transaction Audit Ledger */}
        {tab === 'transactions' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                Wala pang naitalang transaksyon.
              </div>
            ) : (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{tx.description}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {tx.playerId.substring(0, 10)}...
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(tx.timestamp).toLocaleString()} • Bagong Balanse: ₱{tx.balanceAfter.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-black text-sm ${
                        tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {tx.amount >= 0 ? `+₱${tx.amount}` : `-₱${Math.abs(tx.amount)}`}
                    </span>
                    <span className="block text-[9px] text-slate-500 uppercase font-bold">
                      {tx.type}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Award Promo Coins */}
        {tab === 'adjust' && (
          <form onSubmit={handleAdjustSubmit} className="flex-1 overflow-y-auto space-y-3.5 pr-1 py-1">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Player ID o Guest UID:
                </label>
                <input
                  type="text"
                  placeholder="Halimbawa: usr_abc123"
                  value={targetPlayerId}
                  onChange={(e) => setTargetPlayerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Halaga ng Barya (+/- ₱):
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-black"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Dahilan / Deskripsyon:
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 text-white font-black text-xs shadow-lg active:scale-95 transition cursor-pointer"
              >
                I-EXECUTE ANG COIN ADJUSTMENT
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Power-Up Catalog Settings */}
        {tab === 'catalog' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-2.5">
            {catalog &&
              Object.values(catalog).map((item) => {
                const customIcon = customSkins['power_' + item.id];
                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden shadow-inner group">
                        {customIcon ? (
                          <img
                            src={customIcon}
                            alt={item.name}
                            className="w-full h-full object-contain p-0.5"
                          />
                        ) : (
                          <span className="text-2xl">{item.icon}</span>
                        )}
                        <label
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-bold cursor-pointer transition"
                          title="Mag-upload ng PNG icon"
                        >
                          <Upload className="w-4 h-4 text-amber-400" />
                          <input
                            type="file"
                            accept="image/png,image/webp,image/jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handlePowerUpIconUpload(item.id, f);
                            }}
                          />
                        </label>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-white">{item.name}</h4>
                          {customIcon && (
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-bold">
                              Custom PNG
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* PNG Upload/Reset buttons */}
                      <label
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition"
                        title="Mag-upload ng Custom PNG"
                      >
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <input
                          type="file"
                          accept="image/png,image/webp,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePowerUpIconUpload(item.id, f);
                          }}
                        />
                      </label>

                      {customIcon && (
                        <button
                          onClick={() => handleResetPowerUpIcon(item.id)}
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition"
                          title="I-reset sa default icon"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {editingPrice?.id === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editingPrice.price}
                            onChange={(e) =>
                              setEditingPrice({ id: item.id, price: Number(e.target.value) })
                            }
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-black"
                          />
                          <button
                            onClick={() => handleSavePrice(item.id, editingPrice.price)}
                            className="px-2 py-1 bg-emerald-600 rounded-lg font-bold text-white text-[10px]"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingPrice({ id: item.id, price: item.price })}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-amber-400 font-black text-xs"
                          title="I-edit ang presyo"
                        >
                          ₱{item.price}
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleItem(item.id, item.enabled)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${
                          item.enabled
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        {item.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* Tab 4: Features & Admin PIN Security */}
        {tab === 'features' && (
          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {/* Admin PIN Configuration */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wide">
                <Key className="w-4 h-4" />
                <span>Baguhin ang Admin Secret PIN</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ang PIN na ito ang gagamitin upang mabuksan ang Admin Panel at ang Card Upload Customizer. Default PIN: <b className="text-amber-300 font-mono">8888</b>.
              </p>

              <form onSubmit={handleChangePin} className="flex items-center gap-2 pt-1 max-w-sm">
                <input
                  type="password"
                  placeholder="Bagong 4+ Digit PIN"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500 font-mono tracking-widest text-center"
                />
                <button
                  type="submit"
                  className="py-1.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-white font-black text-xs shadow cursor-pointer active:scale-95"
                >
                  I-save ang PIN
                </button>
              </form>
            </div>

            {/* Application Features Control */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wide">
                <Sliders className="w-4 h-4" />
                <span>App Feature Toggles (Admin Controlled)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Kontrolin ang mga aktibong tampok ng laro para sa lahat ng manlalaro:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-xs text-white">Custom Card Uploads & Skins</h5>
                    <p className="text-[10px] text-slate-400">Nakatago sa lahat ng ibang manlalaro. Admin lamang ang makakakita at makakapag-upload.</p>
                  </div>
                  {onOpenCardStudio && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCardStudio();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow active:scale-95 transition cursor-pointer whitespace-nowrap"
                    >
                      Buksan ang Card Studio
                    </button>
                  )}
                </div>

                <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-white">Power-Up Store (Tindahan)</h5>
                    <p className="text-[10px] text-slate-400">Pamahalaan ang presyo at availability sa tab na "Power-Ups".</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-black">
                    CONFIGURABLE
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
};
