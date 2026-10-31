import React, { useState } from 'react';
import { X, BookOpen, Sparkles, ShieldAlert, Award } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'actions' | 'rules' | 'variants' | 'uno'>('basics');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-left shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-black text-white tracking-wide">HOW TO PLAY</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 my-4 border-b border-slate-800 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('basics')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'basics' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Basics
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'actions' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Action Cards
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'rules' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            House Rules
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'variants' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            Game Variants
          </button>
          <button
            onClick={() => setActiveTab('uno')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'uno' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            UNO! & Scoring
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-sm text-slate-300">
          {activeTab === 'basics' && (
            <div className="space-y-3">
              <h4 className="font-bold text-white text-base">Game Objective</h4>
              <p>
                Be the first player to get rid of all the cards in your hand! Match cards by <strong className="text-amber-400">Color</strong>, <strong className="text-cyan-400">Number</strong>, or <strong className="text-purple-400">Symbol</strong>.
              </p>

              {/* The Pungot Rule */}
              <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-2xl space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💀</span>
                  <strong className="text-red-400 text-sm">THE PUNGOT RULE: Last Player with Cards Loses!</strong>
                </div>
                <p className="text-xs text-slate-300">
                  Sa <strong className="text-amber-300">LAHAT NG VARIANTS</strong> (Classic, Uno All Wild, Uno Flip!, at Uno Dare!), ang huling manlalaro na may hawak pa ring baraha ang opisyal na <strong className="text-red-400">TALO (Ang Pungot ng Laban)</strong>!
                </p>
              </div>

              <h4 className="font-bold text-white text-base">On Your Turn</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-300">
                <li>Play a matching card from your hand onto the discard pile.</li>
                <li>If you do not have a playable card, draw 1 card from the Draw pile.</li>
                <li>If the drawn card is playable, you may play it immediately, or pass your turn.</li>
              </ul>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex gap-3 items-center">
                <span className="text-xl font-black text-blue-400">⊘</span>
                <div>
                  <strong className="text-white">Skip:</strong> The next player in turn is skipped and forfeits their turn.
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex gap-3 items-center">
                <span className="text-xl font-black text-green-400">⇄</span>
                <div>
                  <strong className="text-white">Reverse:</strong> Reverses play direction (clockwise / counter-clockwise). In 2-player games, Reverse acts as a Skip!
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex gap-3 items-center">
                <span className="text-xl font-black text-amber-400">+2</span>
                <div>
                  <strong className="text-white">Draw Two:</strong> Next player draws 2 cards and is skipped (or stacks another +2 if stacking rule is enabled).
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex gap-3 items-center">
                <span className="text-xl font-black text-purple-400">★</span>
                <div>
                  <strong className="text-white">Wild:</strong> Can be played anytime! Choose the next active color.
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 flex gap-3 items-center">
                <span className="text-xl font-black text-red-400">+4</span>
                <div>
                  <strong className="text-white">Wild Draw Four:</strong> Choose the next color and the next player must draw 4 cards! (Subject to challenge rules).
                </div>
              </div>
            </div>
          )}

          {activeTab === 'rules' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <strong className="text-amber-400 text-sm block">1. Stacking Rule (Optional)</strong>
                <p>When someone plays +2 or +4, the next player can play their own +2 or +4 to pass the combined penalty to the next player!</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <strong className="text-amber-400 text-sm block">2. Seven-Zero Rule (Optional)</strong>
                <p>Playing a <strong className="text-white">7</strong> allows you to swap hands with any chosen opponent. Playing a <strong className="text-white">0</strong> rotates every player's hand in the direction of play!</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <strong className="text-amber-400 text-sm block">3. Wild Draw Four Challenge (Optional)</strong>
                <p>The victim of a +4 can challenge the player. If the player bluffed (held a matching color), they draw 4 cards! If honest, the challenger draws 6 cards (4 + 2 penalty)!</p>
              </div>
              <div className="p-3 bg-red-950/40 rounded-xl border border-red-500/40 space-y-1">
                <strong className="text-red-400 text-sm block">4. Last Player with Cards Loses (The Pungot Rule)</strong>
                <p>Standard sa lahat ng laro: Ang huling manlalaro na maiiwan na may hawak pa ring baraha ang opisyal na tatanghaling talo ("Pungot")!</p>
              </div>
            </div>
          )}

          {activeTab === 'variants' && (
            <div className="space-y-4 text-xs">
              {/* Universal Loser Rule Banner */}
              <div className="p-3 bg-red-950/60 border-2 border-red-500/50 rounded-2xl text-center space-y-1 shadow-lg">
                <div className="text-[11px] font-black text-red-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <span>💀</span>
                  <span>UNIVERSAL RULE IN ALL VARIANTS</span>
                  <span>💀</span>
                </div>
                <div className="text-sm font-black text-white tracking-wide">
                  "LAST PLAYER WITH CARDS WILL LOSE (THE PUNGOT)!"
                </div>
                <p className="text-[11px] text-slate-300">
                  Sa lahat ng laro (Classic UNO, Uno All Wild, Uno Flip!, at Uno Dare!), ang huling manlalaro na may natitirang baraha ang opisyal na <strong className="text-red-400">TALO (Pungot ng Laban)</strong>.
                </p>
              </div>

              <div className="p-3 bg-gradient-to-r from-purple-950/40 to-slate-950 border border-purple-500/40 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌈</span>
                  <strong className="text-purple-300 text-sm">Uno All Wild</strong>
                </div>
                <p className="text-slate-300">
                  Every single card in the deck is a Wild card! No matching colors or numbers needed—any card can be played on any turn.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-400">
                  <div>• <strong className="text-purple-200">Skip 2:</strong> Skips the next two players.</div>
                  <div>• <strong className="text-purple-200">Targeted Draw 2:</strong> Choose any opponent to draw 2!</div>
                  <div>• <strong className="text-purple-200">Forced Swap:</strong> Swap your entire hand with any chosen player!</div>
                  <div>• <strong className="text-purple-200">Wild Reverse:</strong> Reverses play order.</div>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-r from-cyan-950/40 via-purple-950/30 to-slate-950 border border-cyan-500/40 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔄</span>
                  <strong className="text-cyan-300 text-sm">Uno Flip!</strong>
                </div>
                <p className="text-slate-300">
                  Cards are double-sided with a <strong className="text-amber-300">Light Side</strong> and a <strong className="text-purple-300">Dark Side</strong>. Playing a FLIP card flips the entire table (draw pile, discard pile, and hands)!
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-400">
                  <div>• <strong className="text-cyan-200">Draw 1 (Light):</strong> Next player draws 1 and loses turn.</div>
                  <div>• <strong className="text-pink-300">Draw 5 (Dark):</strong> Next player draws 5 cards!</div>
                  <div>• <strong className="text-purple-300">Skip Everyone (Dark):</strong> Everyone is skipped; you play again!</div>
                  <div>• <strong className="text-teal-300">Wild Draw Color (Dark):</strong> Next player must draw cards until matching your chosen color!</div>
                </div>
              </div>

              <div className="p-3 bg-gradient-to-r from-red-950/40 to-slate-950 border border-red-500/40 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  <strong className="text-red-400 text-sm">Uno Dare!</strong>
                </div>
                <p className="text-slate-300">
                  Dares replace standard penalties! When a Dare card or Wild Dare is played against you, you can either perform the dare to escape penalty, or draw penalty cards.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px] text-slate-400">
                  <div>• <strong className="text-amber-300">Dare (+2 penalty):</strong> Accept the fun challenge or draw 2 cards.</div>
                  <div>• <strong className="text-red-400">Wild Dare (+4 penalty):</strong> Choose color + challenge victim to a dare or draw 4 cards!</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'uno' && (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-1">
                <strong className="text-red-400 text-sm block">Calling UNO!</strong>
                <p>When you have only 1 card left, you MUST press the <strong className="text-white">UNO!</strong> button.</p>
                <p>If you forget and another player catches you by pressing <strong className="text-yellow-400">CATCH UNO</strong> within the penalty window, you must draw 2 penalty cards!</p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <strong className="text-amber-400 text-sm block">Walang Points System (Pure Elimination!)</strong>
                <p>Walang point-based scoring sa UNO Pungot Edition. Ang laro ay purong card elimination:</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li><strong className="text-amber-300">1st Place (Panalo):</strong> Ang unang manlalaro na nakapag-ubos ng baraha.</li>
                  <li><strong className="text-emerald-300">Ligtas (Rank 2, 3...):</strong> Magpapatuloy ang laban ng iba pang manlalaro hanggang maubos din ang kanilang baraha.</li>
                  <li><strong className="text-red-400">Ang Pungot (Talo):</strong> Ang pinakahuling manlalaro na may hawak pa ring baraha ang opisyal na talo ng laban!</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md transition"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
};
