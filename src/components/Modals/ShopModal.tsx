import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Coins,
  Shield,
  Layers,
  ArrowRight,
  Plus,
  Play,
  Edit2,
  Upload,
  Image,
  RotateCcw,
  Sliders,
  Zap,
  User,
  Crown,
  Package,
  Home,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardType, PlayerWallet, PowerUpId, PowerUpItem } from '../../engine/types';
import { CardView } from '../CardView';
import { economyService } from '../../services/economyService';
import { getCustomCardSkins, saveCustomCardSkin, removeCustomCardSkin } from '../../utils/cardSkins';

interface ShopModalProps {
  isOpen: boolean;
  wallet: PlayerWallet | null;
  catalog: Record<PowerUpId, PowerUpItem> | null;
  playerName?: string;
  playerAvatar?: string;
  onBuyItem: (powerUpId: PowerUpId, quantity?: number) => Promise<void>;
  onClose: () => void;
  onOpenMissions?: () => void;
}

export const DEFAULT_CATALOG: Record<PowerUpId, PowerUpItem> = {
  shield: {
    id: 'shield',
    name: 'Shield Protection',
    description: 'Block the next attack!',
    price: 100,
    icon: '🛡️',
    badge: 'Defense',
    enabled: true,
  },
  extra_turn: {
    id: 'extra_turn',
    name: 'Extra Turn',
    description: 'Play one more turn!',
    price: 250,
    icon: '⚡',
    badge: 'Special',
    enabled: true,
  },
  swap: {
    id: 'swap',
    name: 'Card Swap',
    description: 'Swap hands with another player!',
    price: 150,
    icon: '🔄',
    badge: 'Tactical',
    enabled: true,
  },
  color: {
    id: 'color',
    name: 'Color Changer',
    description: 'Change the color anytime!',
    price: 120,
    icon: '🎨',
    badge: 'Control',
    enabled: true,
  },
  reverse: {
    id: 'reverse',
    name: 'Reverse Master',
    description: 'Reverse the turn!',
    price: 100,
    icon: '🔁',
    badge: 'Control',
    enabled: true,
  },
  peek: {
    id: 'peek',
    name: 'Peek Card',
    description: 'View a player\'s card!',
    price: 80,
    icon: '👁️',
    badge: 'Scout',
    enabled: true,
  },
  booster: {
    id: 'booster',
    name: 'Coin Booster',
    description: 'Earn extra coins!',
    price: 200,
    icon: '💰',
    badge: 'Reward',
    enabled: true,
  },
  reflect: {
    id: 'reflect',
    name: 'Attack Reflect',
    description: 'Send the attack back!',
    price: 180,
    icon: '🪞',
    badge: 'Defense',
    enabled: true,
  },
};

export const ShopModal: React.FC<ShopModalProps> = ({
  isOpen,
  wallet,
  catalog,
  playerName = 'PLAYER NAME',
  playerAvatar,
  onBuyItem,
  onClose,
  onOpenMissions,
}) => {
  const [activeCategory, setActiveCategory] = useState<'powerups' | 'skins' | 'avatars' | 'frames' | 'inventory'>('powerups');
  const [selectedPowerUpId, setSelectedPowerUpId] = useState<PowerUpId>('shield');
  const [buyingId, setBuyingId] = useState<PowerUpId | null>(null);
  const [confirmItem, setConfirmItem] = useState<PowerUpItem | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Admin In-Shop Edit Mode
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return sessionStorage.getItem('uno_admin_authed') === 'true';
    } catch {
      return false;
    }
  });
  const [adminEditMode, setAdminEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: PowerUpId; name: string; price: number; description: string } | null>(null);
  const [uploadTargetId, setUploadTargetId] = useState<PowerUpId | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  const scrollSlider = (direction: 'left' | 'right') => {
    if (sliderContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      sliderContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [skins, setSkins] = useState(() => getCustomCardSkins());

  useEffect(() => {
    const handleSkinsUpdate = () => {
      setSkins(getCustomCardSkins());
    };
    window.addEventListener('uno_skins_updated', handleSkinsUpdate);
    return () => window.removeEventListener('uno_skins_updated', handleSkinsUpdate);
  }, []);

  if (!isOpen) return null;

  const currentCoins = wallet?.balance ?? 2500;
  const activeCatalog = catalog && Object.keys(catalog).length > 0 ? catalog : DEFAULT_CATALOG;
  const items = Object.values(activeCatalog);
  const selectedItem = activeCatalog[selectedPowerUpId] || items[0];

  const handlePurchaseItem = async (item: PowerUpItem) => {
    if (currentCoins < item.price) {
      setFeedback({ text: `Kulang ang iyong barya! Kailangan mo ng ₱${item.price}.`, isError: true });
      return;
    }
    setBuyingId(item.id);
    setFeedback(null);
    try {
      await onBuyItem(item.id, 1);
      setFeedback({ text: `Matagumpay na nabili ang ${item.name}! (₱${item.price}) 🎉` });
      setConfirmItem(null);
    } catch (e: any) {
      setFeedback({ text: e.message || 'Nabigo ang pagbili.', isError: true });
    } finally {
      setBuyingId(null);
    }
  };

  const handleTriggerUpload = (id: PowerUpId) => {
    setUploadTargetId(id);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (result) {
        try {
          saveCustomCardSkin(`power_${uploadTargetId}`, result);
          setFeedback({ text: `Matagumpay na na-upload ang PNG icon para sa ${uploadTargetId.toUpperCase()}! 🎨` });
        } catch {}
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveIcon = (id: PowerUpId) => {
    try {
      removeCustomCardSkin(`power_${id}`);
      setFeedback({ text: `Naibalik sa default icon ang ${id.toUpperCase()}.` });
    } catch {}
  };

  const handleSaveItemEdit = async () => {
    if (!editingItem) return;
    try {
      const res = await economyService.adminUpdateItem(editingItem.id, {
        name: editingItem.name.trim(),
        price: Number(editingItem.price),
        description: editingItem.description.trim(),
      });
      if (res.success) {
        setFeedback({ text: `Na-update ang detalye ng ${editingItem.name}! (₱${editingItem.price})` });
        setEditingItem(null);
      } else {
        setFeedback({ text: 'Hindi nai-save ang pagbabago sa server.', isError: true });
      }
    } catch {
      setFeedback({ text: 'Error sa pag-update ng item.', isError: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#140a24] text-white select-none overflow-hidden animate-fadeIn">
      {/* Background Rainbow Gradient Glow matching UNO Store reference */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1e0a3c] via-[#0e041d] to-[#05010a] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-r from-red-600/35 via-yellow-500/30 via-emerald-500/25 via-blue-600/30 to-purple-600/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* TOP HEADER BAR (Transparent / Floating with Official Shop Banner) */}
      <div className="relative z-20 w-full px-4 sm:px-6 pt-1 pb-1 flex items-center justify-between pointer-events-auto">
        {/* Left: Official Shop Banner (Extra Large & Prominent) */}
        <div className="flex items-center gap-3 sm:gap-5 -ml-1 sm:-ml-2">
          <div className="h-20 sm:h-28 md:h-36 lg:h-40 max-w-[420px] sm:max-w-[620px] md:max-w-[750px] flex items-center">
            <img
              src="/shop icon/Shop banner.png"
              alt="UNO Shop Banner"
              className="h-full w-auto object-contain drop-shadow-[0_10px_25px_rgba(250,204,21,0.7)] select-none hover:scale-105 transition-transform duration-200"
            />
          </div>
        </div>

        {/* Right: Coins Balance Counter + Close/Home Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Admin Live Shop Editor Button (Visible only to Admin) */}
          {isAdmin && (
            <button
              onClick={() => setAdminEditMode(!adminEditMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs uppercase shadow transition active:scale-95 cursor-pointer border ${
                adminEditMode
                  ? 'bg-rose-600 text-white border-rose-300 ring-2 ring-rose-400 animate-pulse'
                  : 'bg-purple-900/90 hover:bg-purple-800 text-amber-300 border-amber-400/60'
              }`}
              title="I-edit ang Shop (Presyo & PNG Icons)"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{adminEditMode ? 'Tapusin ang Edit' : 'Admin: Edit Shop'}</span>
            </button>
          )}

          {/* Floating User Money (No Box / Container) */}
          <div className="flex items-center gap-1.5 select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
            <img
              src="/shop_coin_icon.png"
              alt="Coins"
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0 filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform"
            />
            <span className="font-black text-amber-300 text-base sm:text-xl tracking-wider drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {currentCoins.toLocaleString()}
            </span>
            <button
              onClick={() => {
                setFeedback({ text: 'Nakatanggap ka ng +500 Free Coins mula sa Store Event! 🎉' });
              }}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg shop-btn-gold flex items-center justify-center font-black cursor-pointer active:scale-95 shadow ml-1"
              title="Magdagdag ng Barya"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
            </button>
          </div>

          {/* Chunky Blue Close/Home Button */}
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-b from-[#2563eb] to-[#1e3a8a] border-2 border-cyan-400 flex items-center justify-center text-white shadow-[0_4px_0_#0f172a,0_5px_10px_rgba(0,0,0,0.6)] hover:brightness-110 active:translate-y-0.5 cursor-pointer transition"
            title="Isara ang Tindahan"
          >
            <Home className="w-5 h-5 fill-white/20 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Hidden File Input for PNG Power-Up Icons */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className="px-4 sm:px-6 pt-2 z-20">
          <div
            className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 shadow-lg animate-fadeIn ${
              feedback.isError
                ? 'bg-rose-950/90 border-rose-500 text-rose-200'
                : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.isError ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* MAIN BODY: LEFT SIDEBAR TABS + RIGHT STORE CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col md:flex-row overflow-hidden p-3 sm:p-5 gap-4">
        {/* LEFT SIDEBAR NAVIGATION (Excluding daily deals and vip membership as requested) */}
        <div className="w-full md:w-48 lg:w-52 flex md:flex-col gap-2 shrink-0 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
          {/* Power-Ups Tab */}
          <button
            onClick={() => setActiveCategory('powerups')}
            className={`w-full py-3 px-4 flex items-center gap-3 cursor-pointer shrink-0 font-black text-sm tracking-wide ${
              activeCategory === 'powerups'
                ? 'shop-nav-tab-active scale-[1.02]'
                : 'shop-nav-tab-inactive'
            }`}
          >
            {/* Bold black/dark brown lightning icon matching reference */}
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <svg className={`w-5 h-5 ${activeCategory === 'powerups' ? 'text-[#301602]' : 'text-amber-400'}`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 L3 14 L11 14 L10 22 L21 9 L13 9 Z" />
              </svg>
            </div>
            <span className={`text-sm font-black ${activeCategory === 'powerups' ? 'text-[#1a0b02]' : 'text-white'}`}>
              Power-Ups
            </span>
          </button>

          {/* Card Skins Tab */}
          <button
            onClick={() => setActiveCategory('skins')}
            className={`w-full py-3 px-4 flex items-center gap-3 cursor-pointer shrink-0 font-black text-sm tracking-wide ${
              activeCategory === 'skins'
                ? 'shop-nav-tab-active scale-[1.02]'
                : 'shop-nav-tab-inactive'
            }`}
          >
            {/* Fanned 3-Card mini deck icon matching reference */}
            <div className="w-6 h-6 relative flex items-center justify-center shrink-0">
              {/* Yellow card back */}
              <div className="absolute w-3.5 h-5 rounded-xs bg-amber-400 border border-white shadow-xs rotate-[-22deg] -translate-x-1.5" />
              {/* White card middle */}
              <div className="absolute w-3.5 h-5 rounded-xs bg-rose-500 border border-white shadow-xs rotate-[-8deg] -translate-x-0.5" />
              {/* Magenta card front */}
              <div className="absolute w-3.5 h-5 rounded-xs bg-gradient-to-tr from-purple-600 to-pink-500 border border-white shadow-sm rotate-[12deg] translate-x-1 flex items-center justify-center">
                <div className="w-1.5 h-2.5 rounded-full border border-white/60" />
              </div>
            </div>
            <span className={`text-sm font-black ${activeCategory === 'skins' ? 'text-[#1a0b02]' : 'text-white'}`}>
              Card Skins
            </span>
          </button>

          {/* Avatars Tab */}
          <button
            onClick={() => setActiveCategory('avatars')}
            className={`w-full py-3 px-4 flex items-center gap-3 cursor-pointer shrink-0 font-black text-sm tracking-wide ${
              activeCategory === 'avatars'
                ? 'shop-nav-tab-active scale-[1.02]'
                : 'shop-nav-tab-inactive'
            }`}
          >
            {/* White glossy avatar profile bust silhouette matching reference */}
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <svg className={`w-5 h-5 ${activeCategory === 'avatars' ? 'text-[#1a0b02]' : 'text-slate-100'} filter drop-shadow`} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v2h20v-2c0-3.33-6.67-5-10-5z" />
              </svg>
            </div>
            <span className={`text-sm font-black ${activeCategory === 'avatars' ? 'text-[#1a0b02]' : 'text-white'}`}>
              Avatars
            </span>
          </button>

          {/* Frames Tab */}
          <button
            onClick={() => setActiveCategory('frames')}
            className={`w-full py-3 px-4 flex items-center gap-3 cursor-pointer shrink-0 font-black text-sm tracking-wide ${
              activeCategory === 'frames'
                ? 'shop-nav-tab-active scale-[1.02]'
                : 'shop-nav-tab-inactive'
            }`}
          >
            {/* Golden 3D faceted Crown icon matching reference */}
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-400 filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16 L19 16 L21 7 L16 11 L12 4 L8 11 L3 7 Z" />
                <rect x="5" y="17" width="14" height="2.5" rx="1" fill="#facc15" />
                <circle cx="12" cy="4" r="1.2" fill="#fef08a" />
                <circle cx="3" cy="7" r="1" fill="#fef08a" />
                <circle cx="21" cy="7" r="1" fill="#fef08a" />
              </svg>
            </div>
            <span className={`text-sm font-black ${activeCategory === 'frames' ? 'text-[#1a0b02]' : 'text-white'}`}>
              Frames
            </span>
          </button>

          {/* My Inventory Tab */}
          <button
            onClick={() => setActiveCategory('inventory')}
            className={`w-full py-3 px-4 flex items-center gap-3 cursor-pointer shrink-0 font-black text-sm tracking-wide ${
              activeCategory === 'inventory'
                ? 'shop-nav-tab-active scale-[1.02]'
                : 'shop-nav-tab-inactive'
            }`}
          >
            {/* 3D Box / Package icon */}
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <Package className={`w-5 h-5 ${activeCategory === 'inventory' ? 'text-[#1a0b02]' : 'text-slate-100'} filter drop-shadow`} />
            </div>
            <span className={`text-sm font-black ${activeCategory === 'inventory' ? 'text-[#1a0b02]' : 'text-white'}`}>
              My Inventory
            </span>
          </button>
        </div>

        {/* RIGHT SECTION: POWER-UPS SLIDER (Main Box Frame Removed) */}
        <div className="flex-1 flex flex-col overflow-hidden p-1 sm:p-2 relative justify-start -mt-2 sm:-mt-4">
          {/* Header info elevated without heavy box border (Right arrows removed) */}
          <div className="flex items-center justify-between pb-2 mb-1 border-b border-purple-800/30">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-wider uppercase text-amber-400 drop-shadow">
                {activeCategory === 'powerups' && 'POWER-UPS'}
                {activeCategory === 'skins' && 'CARD SKINS'}
                {activeCategory === 'avatars' && 'AVATAR ICONS'}
                {activeCategory === 'frames' && 'AVATAR FRAMES'}
                {activeCategory === 'inventory' && 'MY INVENTORY'}
              </h2>
              <span className="text-xs text-slate-400 hidden sm:inline">
                — Use these special cards to gain an edge in your UNO game!
              </span>
            </div>
          </div>

          {/* CARDS DISPLAY AREA */}
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            {activeCategory === 'powerups' ? (
              /* HORIZONTAL SLIDING CAROUSEL (Slide na lang ang pagpili) */
              <div className="relative w-full group/slider">
                {/* Floating Left Arrow */}
                <button
                  type="button"
                  onClick={() => scrollSlider('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-950/80 border-2 border-amber-400 text-yellow-300 flex items-center justify-center hover:bg-amber-400 hover:text-slate-950 transition-all shadow-[0_0_20px_rgba(250,204,21,0.5)] cursor-pointer active:scale-90 opacity-80 hover:opacity-100"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[3]" />
                </button>

                {/* Floating Right Arrow */}
                <button
                  type="button"
                  onClick={() => scrollSlider('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-slate-950/80 border-2 border-amber-400 text-yellow-300 flex items-center justify-center hover:bg-amber-400 hover:text-slate-950 transition-all shadow-[0_0_20px_rgba(250,204,21,0.5)] cursor-pointer active:scale-90 opacity-80 hover:opacity-100"
                >
                  <ChevronRight className="w-6 h-6 stroke-[3]" />
                </button>

                {/* Horizontal Scroll Track */}
                <div
                  ref={sliderContainerRef}
                  className="flex items-center gap-6 sm:gap-10 overflow-x-auto scroll-smooth py-6 px-12 no-scrollbar"
                  style={{ scrollSnapType: 'x mandatory' }}
                >
                  {items.map((item) => {
                    const isSelected = selectedPowerUpId === item.id;
                    const isProcessing = buyingId === item.id;
                    const customSkin = skins[`power_${item.id}`];

                    const previewCard: Card = {
                      id: `shop-${item.id}`,
                      color: 'wild',
                      type: (`power_${item.id}`) as CardType,
                      powerUpId: item.id,
                    };

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedPowerUpId(item.id)}
                        style={{ scrollSnapAlign: 'center' }}
                        className={`w-48 sm:w-56 md:w-60 shrink-0 flex flex-col items-center text-center justify-between transition-all duration-300 cursor-pointer relative group ${
                          isSelected ? 'scale-105' : 'hover:scale-102 opacity-90 hover:opacity-100'
                        }`}
                      >
                        {/* Dynamic Moving Gradient Glowing Aura Behind Card */}
                        <div className="absolute top-2 inset-x-0 h-44 flex items-center justify-center pointer-events-none overflow-visible z-0">
                          <div className={`w-36 h-40 animated-gradient-aura transition-opacity ${isSelected ? 'opacity-100' : 'opacity-60'}`} />
                          <div className="absolute w-28 h-32 bg-cyan-400/30 blur-xl rounded-full animate-pulse" />
                        </div>

                        {/* Card Visual Display matching reference tilted glossy 3D card (Floating, unclipped) */}
                        <div className="relative my-3 group-hover:scale-105 transition-transform duration-200 drop-shadow-[0_20px_35px_rgba(0,0,0,0.95)] card-float-anim z-10">
                          <CardView card={previewCard} size="xl" isPlayable={false} />

                          {/* Admin PNG Icon Upload Overlay */}
                          {adminEditMode && (
                            <div className="absolute inset-0 bg-black/85 rounded-xl flex flex-col items-center justify-center gap-1.5 p-1 z-20 animate-fadeIn">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTriggerUpload(item.id);
                                }}
                                className="w-full py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-black flex items-center justify-center gap-1"
                                title="Upload Custom PNG"
                              >
                                <Upload className="w-3 h-3" />
                                <span>PNG</span>
                              </button>
                              {customSkin && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveIcon(item.id);
                                  }}
                                  className="w-full py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[9px] font-bold"
                                >
                                  Reset
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem({
                                    id: item.id,
                                    name: item.name,
                                    price: item.price,
                                    description: item.description,
                                  });
                                }}
                                className="w-full py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[9px] font-bold flex items-center justify-center gap-0.5"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                                <span>Edit</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Floating Item Name & Description (No box, unclipped) */}
                        <div className="w-full mt-2 mb-2 z-10">
                          <h3 className="font-black text-white text-base sm:text-lg tracking-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                            {item.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-300 font-semibold line-clamp-2 mt-0.5 drop-shadow min-h-[2.5rem]">
                            {item.description}
                          </p>
                        </div>

                        {/* Floating Price & Buy Button (Clean, no inner card box) */}
                        <div className="w-full flex items-center justify-center gap-3 mt-1 py-1 z-10">
                          <div className="flex items-center gap-1.5 py-0.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                            <img
                              src="/shop_coin_icon.png"
                              alt="Coins"
                              className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 filter drop-shadow-[0_4px_10px_rgba(234,179,8,0.7)]"
                            />
                            <span className="font-black text-yellow-300 text-lg sm:text-2xl tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                              {item.price}
                            </span>
                          </div>

                          <button
                            disabled={isProcessing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePurchaseItem(item);
                            }}
                            className="shop-buy-btn px-5 sm:px-7 py-1.5 sm:py-2 text-xs sm:text-sm tracking-wider active:scale-95 cursor-pointer shadow-lg"
                          >
                            {isProcessing ? '...' : 'Buy'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeCategory === 'inventory' ? (
              /* MY INVENTORY DISPLAY */
              <div className="space-y-4">
                {items.filter((item) => (wallet?.inventory?.[item.id] || 0) > 0).length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-black/30 rounded-2xl border border-purple-900/40 space-y-3">
                    <Package className="w-12 h-12 text-slate-400" />
                    <div>
                      <h3 className="text-base font-black text-white">Walang Laman ang Iyong Imbentaryo</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Pumunta sa tab ng POWER-UPS upang bumili ng mga espesyal na card na magagamit sa laban!
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveCategory('powerups')}
                      className="shop-buy-btn px-4 py-1.5 text-xs font-black cursor-pointer"
                    >
                      Bumili ng Power-Ups
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {items
                      .filter((item) => (wallet?.inventory?.[item.id] || 0) > 0)
                      .map((item) => {
                        const count = wallet?.inventory?.[item.id] || 0;
                        const previewCard: Card = {
                          id: `inv-${item.id}`,
                          color: 'wild',
                          type: (`power_${item.id}`) as CardType,
                          powerUpId: item.id,
                        };

                        return (
                          <div
                            key={item.id}
                            className="p-3.5 sm:p-4 flex flex-col items-center text-center justify-between relative group"
                          >
                            {/* Stock Quantity Badge */}
                            <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-1">
                              <span>Stock:</span>
                              <span>{count}x</span>
                            </div>

                            {/* Card Visual Display */}
                            <div className="relative my-2 drop-shadow-[0_16px_28px_rgba(0,0,0,0.95)] card-float-anim z-10">
                              <CardView card={previewCard} size="xl" isPlayable={false} />
                            </div>

                            {/* Item Name & Short Description */}
                            <div className="w-full mt-1 mb-1.5 z-10">
                              <h3 className="font-black text-white text-base sm:text-lg tracking-normal drop-shadow">
                                {item.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-slate-300 font-semibold line-clamp-2 mt-0.5">
                                {item.description}
                              </p>
                            </div>

                            {/* In-Game Ready Badge */}
                            <div className="w-full pt-2 flex items-center justify-center">
                              <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-0.5 rounded-full">
                                ✓ Handa nang gamitin sa laban
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              /* Other categories placeholder */
              <div className="flex flex-col items-center justify-center h-64 text-center p-6 bg-black/30 rounded-2xl border border-purple-900/40">
                <Sparkles className="w-12 h-12 text-yellow-400 mb-3 animate-pulse" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  Malapit Nang Dumating!
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Ang mga bagong Card Skins, Avatars, at Frames ay maidaragdag sa susunod na update.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM PURCHASE MODAL */}
      {confirmItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="shop-card-panel rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <div className="flex justify-center">
              <CardView
                card={{
                  id: `confirm-${confirmItem.id}`,
                  color: 'wild',
                  type: ('power_' + confirmItem.id) as CardType,
                  powerUpId: confirmItem.id,
                }}
                size="md"
                isPlayable={true}
              />
            </div>

            <div>
              <h3 className="text-xl font-black text-white">Bibilhin mo ba ang Card na ito?</h3>
              <p className="text-sm font-bold text-amber-300 mt-1">{confirmItem.name}</p>
              <p className="text-xs text-slate-300 mt-1">{confirmItem.description}</p>
              <div className="mt-3 text-xs font-black text-white bg-purple-950/90 py-1.5 px-4 rounded-xl inline-block border border-purple-500/50">
                Halaga: <span className="text-amber-400 font-black">₱{confirmItem.price}</span> (Matitira: ₱
                {currentCoins - confirmItem.price})
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setConfirmItem(null)}
                className="py-2.5 px-4 rounded-2xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-slate-300 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                Kanselahin
              </button>
              <button
                disabled={buyingId !== null}
                onClick={() => confirmItem && handlePurchaseItem(confirmItem)}
                className="flex items-center justify-center transition active:scale-95 cursor-pointer hover:brightness-110 disabled:opacity-50"
              >
                <img
                  src="/shop_purchase_btn.png"
                  alt="Purchase"
                  className="h-14 sm:h-16 w-auto object-contain filter drop-shadow-[0_6px_16px_rgba(234,179,8,0.6)] hover:scale-105 transition-transform"
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN EDIT ITEM DETAILS MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="shop-card-panel rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-purple-500/30 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase">
                <Edit2 className="w-4 h-4" />
                <span>I-edit ang Power-Up ({editingItem.id.toUpperCase()})</span>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Pangalan ng Power-Up:
                </label>
                <input
                  type="text"
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-[#1b0d33] border border-purple-500/50 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Presyo sa Barya (₱):
                </label>
                <input
                  type="number"
                  value={editingItem.price}
                  onChange={(e) => setEditingItem({ ...editingItem, price: Number(e.target.value) })}
                  className="w-full bg-[#1b0d33] border border-purple-500/50 rounded-xl px-3 py-2 text-xs font-black text-amber-300 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Deskripsyon / Epekto:
                </label>
                <textarea
                  rows={2}
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  className="w-full bg-[#1b0d33] border border-purple-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none"
                />
              </div>

              {/* PNG Icon Direct Uploader in Edit Modal */}
              <div className="pt-2 border-t border-purple-900/60 flex items-center justify-between gap-2">
                <div>
                  <span className="block text-[11px] font-bold text-slate-300">Custom PNG Icon:</span>
                  <span className="block text-[10px] text-slate-400">
                    {skins[`power_${editingItem.id}`] ? '✓ May naka-upload na custom PNG' : 'Default Emoji/Art gamit'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleTriggerUpload(editingItem.id)}
                    className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white font-black text-xs rounded-xl flex items-center gap-1 shadow cursor-pointer active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload PNG</span>
                  </button>
                  {skins[`power_${editingItem.id}`] && (
                    <button
                      type="button"
                      onClick={() => handleRemoveIcon(editingItem.id)}
                      className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-950/50"
                      title="Reset sa default"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="py-2.5 px-4 rounded-2xl bg-purple-950 hover:bg-purple-900 border border-purple-700 text-slate-300 font-bold text-xs active:scale-95 transition cursor-pointer"
              >
                Kanselahin
              </button>
              <button
                type="button"
                onClick={handleSaveItemEdit}
                className="shop-btn-green py-2.5 px-4 rounded-2xl text-white font-black text-xs uppercase shadow-lg active:scale-95 transition cursor-pointer"
              >
                I-save ang Pagbabago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
