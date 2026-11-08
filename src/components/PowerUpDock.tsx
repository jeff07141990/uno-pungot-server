import React, { useState } from 'react';
import { Sparkles, Shield, AlertTriangle, Layers, X } from 'lucide-react';
import {
  Card,
  CardColor,
  CardType,
  PlayerWallet,
  PowerUpId,
  PowerUpItem,
  PublicGameState,
} from '../engine/types';
import { CardView } from './CardView';
import { DEFAULT_CATALOG } from './Modals/ShopModal';

interface PowerUpDockProps {
  gameState: PublicGameState;
  currentUserId: string;
  wallet: PlayerWallet | null;
  catalog: Record<PowerUpId, PowerUpItem> | null;
  onUsePowerUp: (
    powerUpId: PowerUpId,
    targetPlayerId?: string,
    chosenColor?: CardColor
  ) => void;
  onOpenShop: () => void;
}

export const PowerUpDock: React.FC<PowerUpDockProps> = ({
  gameState,
  currentUserId,
  wallet,
  catalog,
  onUsePowerUp,
  onOpenShop,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const inventory = wallet?.inventory || ({} as Record<PowerUpId, number>);
  const matchUses = gameState.matchPowerUpUses?.[currentUserId] || 0;
  const remainingUses = Math.max(0, 2 - matchUses);

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isYourTurn = activePlayer?.id === currentUserId;
  const hasPendingPenalty = gameState.pendingDrawPenalty > 0;

  const handleSelectPowerUpCard = (powerUpId: PowerUpId) => {
    setIsExpanded(false);
    onUsePowerUp(powerUpId);
  };

  const effectiveCatalog: Record<PowerUpId, PowerUpItem> = {
    ...DEFAULT_CATALOG,
    ...(catalog || {}),
  };

  const availableItems = Object.values(effectiveCatalog).filter(
    (item) => (inventory[item.id] || 0) > 0
  );

  return (
    <>
      {/* Inline Power-Ups Button */}
      <div className="relative flex flex-col items-end gap-1 select-none pointer-events-auto">
        {/* Expanded Tray */}
        {isExpanded && (
          <div className="absolute top-full right-0 mt-1 bg-[#120826]/95 border-2 border-amber-400 rounded-3xl p-3.5 shadow-2xl backdrop-blur-xl max-w-[340px] sm:max-w-[380px] w-[320px] animate-fadeIn flex flex-col gap-2.5 z-50">
            <div className="flex items-center justify-between border-b border-purple-800/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wider">
                  Power-Up Inventory
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-purple-950/80 text-amber-300 border border-amber-400/40">
                  {remainingUses}/2 Uses Left
                </span>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {availableItems.length === 0 ? (
              <div className="text-center py-5 text-xs text-slate-300 space-y-2.5">
                <p>Wala kang available na Power-Ups sa imbentaryo.</p>
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onOpenShop();
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg cursor-pointer hover:scale-105 transition"
                >
                  Bumili sa Tindahan
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {availableItems.map((item) => {
                  const owned = inventory[item.id] || 0;
                  // Allow adding the power-up card to hand as long as player has remaining uses and inventory
                  const canUseNow = remainingUses > 0;

                  const allWildTypes: Record<string, CardType> = {
                    skip2: 'skip2',
                    targeted_draw2: 'targeted_draw2',
                    forced_swap: 'forced_swap',
                    wild4: 'wild4',
                    draw2: 'draw2',
                    reverse: 'reverse',
                    skip: 'skip',
                    wild: 'wild',
                  };
                  const previewCard: Card = {
                    id: `dock-${item.id}`,
                    color: 'wild',
                    type: allWildTypes[item.id] || ((`power_${item.id}`) as CardType),
                    powerUpId: item.id,
                  };

                  return (
                    <button
                      key={item.id}
                      disabled={!canUseNow}
                      onClick={() => handleSelectPowerUpCard(item.id)}
                      className={`relative flex flex-col items-center justify-between p-2 rounded-2xl border transition-all active:scale-95 ${
                        canUseNow
                          ? 'bg-purple-950/70 hover:bg-purple-900 border-amber-400/90 text-white cursor-pointer shadow-lg hover:scale-105'
                          : 'bg-slate-950/70 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                      title={canUseNow ? `${item.name} - Pindutin para idagdag sa kamay!` : 'Naabot na ang limit ng Power-Ups sa labang ito'}
                    >
                      {/* Mini Card View */}
                      <div className="w-10 h-14 sm:w-12 sm:h-16 flex items-center justify-center my-0.5 pointer-events-none">
                        <CardView card={previewCard} size="xs" isPlayable={false} />
                      </div>

                      <span className="text-[10px] font-black truncate max-w-full text-center mt-1">
                        {item.name}
                      </span>

                      {/* Stock Quantity Badge */}
                      <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow-md border border-white/60">
                        {owned}x
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Compact Power-Up trigger button (sits in header next to exit) */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-9 h-9 sm:w-10 sm:h-10 aspect-square flex items-center justify-center rounded-xl border-2 transition-all active:scale-95 cursor-pointer ${
            hasPendingPenalty
              ? 'bg-rose-600 border-yellow-300 text-white animate-pulse ring-2 ring-rose-400/80'
              : remainingUses > 0 && availableItems.length > 0
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 border-white shadow-[0_0_10px_rgba(250,204,21,0.5)]'
              : 'bg-[#180a32]/90 border-purple-600/70 text-slate-300'
          }`}
          title="Power-Ups"
        >
          <span className="text-lg">
            {hasPendingPenalty ? '🛡️' : '⚡'}
          </span>
        </button>
      </div>
    </>
  );
};
