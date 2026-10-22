'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  X,
  RotateCw,
  Plus,
  ShoppingBag,
  Flame,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Product } from '../types/customer-order';
import { useCart } from '../context/CartContext';
import { toast } from 'react-hot-toast';

export type RarityTier = 'covert' | 'classified' | 'restricted' | 'milspec';

interface RarityConfig {
  tier: RarityTier;
  label: string;
  colorName: string;
  borderColor: string;
  bgGradient: string;
  glowColor: string;
  badgeBg: string;
  textColor: string;
}

export const RARITY_CONFIGS: Record<RarityTier, RarityConfig> = {
  covert: {
    tier: 'covert',
    label: 'Covert (Cực Phẩm)',
    colorName: 'Vàng Kim',
    borderColor: 'border-yellow-400',
    bgGradient: 'from-yellow-500/20 via-amber-500/10 to-transparent',
    glowColor: 'rgba(250, 204, 21, 0.6)',
    badgeBg: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-extrabold',
    textColor: 'text-yellow-400',
  },
  classified: {
    tier: 'classified',
    label: 'Classified (Thượng Hạng)',
    colorName: 'Hồng Sen',
    borderColor: 'border-pink-500',
    bgGradient: 'from-pink-500/20 via-rose-500/10 to-transparent',
    glowColor: 'rgba(236, 72, 153, 0.5)',
    badgeBg: 'bg-gradient-to-r from-pink-500 to-rose-600 text-white font-bold',
    textColor: 'text-pink-400',
  },
  restricted: {
    tier: 'restricted',
    label: 'Restricted (Đặc Biệt)',
    colorName: 'Tím',
    borderColor: 'border-purple-500',
    bgGradient: 'from-purple-500/20 via-indigo-500/10 to-transparent',
    glowColor: 'rgba(168, 85, 247, 0.5)',
    badgeBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold',
    textColor: 'text-purple-400',
  },
  milspec: {
    tier: 'milspec',
    label: 'Mil-Spec (Tiêu Chuẩn)',
    colorName: 'Xanh Lam',
    borderColor: 'border-blue-500',
    bgGradient: 'from-blue-500/20 via-sky-500/10 to-transparent',
    glowColor: 'rgba(59, 130, 246, 0.4)',
    badgeBg: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold',
    textColor: 'text-blue-400',
  },
};

interface GachaItem {
  uid: string;
  product: Product;
  rarity: RarityConfig;
}

interface DrinkGachaCSGOProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}


export function getDrinkThumbnail(p: Product): string {
  if (p['Hình ảnh'] && p['Hình ảnh'].trim() !== '') return p['Hình ảnh'];
  const name = (p['Tên sản phẩm'] || '').toLowerCase();
  if (name.includes('cà phê') || name.includes('cafe')) {
    return 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&q=80';
  }
  if (name.includes('đào') || name.includes('trái cây') || name.includes('chanh') || name.includes('vải') || name.includes('dâu')) {
    return 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=200&q=80';
  }
  return 'https://images.unsplash.com/photo-1558857563-b37cf5287e07?w=200&q=80';
}

export function getProductPrice(p: Product): number {
  const raw = p['Đơn giá'] ?? (p as unknown as Record<string, unknown>)['Giá bán'] ?? 0;
  return parseInt(String(raw).replace(/[^\d]/g, ''), 10) || 0;
}

// Kiểm tra sản phẩm có hỗ trợ chọn Size (M/L) hay không
export function canProductHaveSize(p: Product): boolean {
  if (!p) return false;
  const cat = (p['Loại sản phẩm'] || '').toLowerCase();
  const unit = (p['Đơn vị tính'] || '').toLowerCase();
  const name = (p['Tên sản phẩm'] || '').toLowerCase();
  
  // Các món ăn vặt, snack, bánh, gói không hỗ trợ tăng size đồ uống
  if (cat.includes('ăn') || cat.includes('snack') || cat.includes('khô') || cat.includes('bánh') || cat.includes('món ăn')) return false;
  if (['gói', 'dĩa', 'đĩa', 'phần', 'cái', 'hũ', 'hộp', 'bịch', 'chai', 'lon'].includes(unit)) return false;
  if (name.includes('hướng dương') || name.includes('chân gà') || name.includes('khô gà') || name.includes('bò khô') || name.includes('heo khô') || name.includes('tiramisu') || name.includes('bánh')) return false;
  return true;
}

export function DrinkGachaCSGO({ isOpen, onClose, products }: DrinkGachaCSGOProps) {
  const { addItem } = useCart();
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<GachaItem | null>(null);
  const [reelItems, setReelItems] = useState<GachaItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSize, setSelectedSize] = useState<'M' | 'L'>('M');

  const reelContainerRef = useRef<HTMLDivElement>(null);
  const reelTrackRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Khởi tạo AudioContext
  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Phát âm thanh tick CS:GO khi ô chạy qua vạch giữa
  const playTickSound = (frequency = 900) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  };

  // Phát âm thanh chiến thắng khi mở ra món
  const playWinSound = (isGold = false) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const notes = isGold ? [523.25, 659.25, 783.99, 1046.5] : [440, 554.37, 659.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = isGold ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);

        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.4);
      });
    } catch {}
  };

  // Phân loại độ hiếm cho các sản phẩm
  const categorizedProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    return products.map((p, idx) => {
      const name = (p['Tên sản phẩm'] || '').toLowerCase();
      const price = getProductPrice(p);

      let tier: RarityTier = 'milspec';
      if (price >= 35000 || name.includes('đặc biệt') || name.includes('special') || idx % 12 === 0) {
        tier = 'covert'; // Cực phẩm
      } else if (price >= 28000 || name.includes('sữa') || name.includes('cheese') || idx % 5 === 0) {
        tier = 'classified'; // Thượng hạng
      } else if (price >= 24000 || name.includes('trà') || idx % 2 === 0) {
        tier = 'restricted'; // Đặc biệt
      } else {
        tier = 'milspec'; // Tiêu chuẩn
      }

      return {
        product: p,
        rarity: RARITY_CONFIGS[tier],
      };
    });
  }, [products]);

  // Tạo dải reel gồm 50 ô đồ uống
  const generateReel = () => {
    if (categorizedProducts.length === 0) return [];
    const items: GachaItem[] = [];
    const count = 50;

    for (let i = 0; i < count; i++) {
      // Xác suất rơi: Mil-Spec 50%, Restricted 30%, Classified 15%, Covert (Gold) 5%
      const rand = Math.random();
      let chosenTier: RarityTier = 'milspec';
      if (rand < 0.06) chosenTier = 'covert';
      else if (rand < 0.22) chosenTier = 'classified';
      else if (rand < 0.55) chosenTier = 'restricted';
      else chosenTier = 'milspec';

      const pool = categorizedProducts.filter((cp) => cp.rarity.tier === chosenTier);
      const chosen =
        pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)]
          : categorizedProducts[Math.floor(Math.random() * categorizedProducts.length)];

      items.push({
        uid: `${chosen.product.IDSP || chosen.product['Tên sản phẩm']}_${i}_${Math.random()}`,
        product: chosen.product,
        rarity: chosen.rarity,
      });
    }

    return items;
  };

  // Khởi tạo reel khi mở modal
  useEffect(() => {
    if (isOpen) {
      const items = generateReel();
      setReelItems(items);
      setWinner(null);
      setIsSpinning(false);
      setSelectedSize('M');

      if (reelTrackRef.current) {
        reelTrackRef.current.style.transition = 'none';
        reelTrackRef.current.style.transform = 'translate3d(0, 0, 0)';
      }
    }
  }, [isOpen]);

  // Thực hiện vòng quay kiểu CS:GO Case Opening
  const handleStartSpin = () => {
    if (isSpinning || reelItems.length < 40) return;

    getAudioContext();
    setIsSpinning(true);
    setWinner(null);

    const CARD_WIDTH = 140; // width (128px) + gap (12px)
    const CARD_CONTENT_WIDTH = 128;
    const WINNING_INDEX = 38; // Ô trúng thưởng cố định ở gần cuối dải 50 ô
    const winningItem = reelItems[WINNING_INDEX];

    // Reset về vị trí ban đầu
    if (reelTrackRef.current && reelContainerRef.current) {
      reelTrackRef.current.style.transition = 'none';
      reelTrackRef.current.style.transform = 'translate3d(0, 0, 0)';

      const containerWidth = reelContainerRef.current.offsetWidth;
      // Vị trí tâm container
      const centerOffset = containerWidth / 2;
      // Tâm của card thứ WINNING_INDEX tính từ mép trái track
      const itemCenter = WINNING_INDEX * CARD_WIDTH + CARD_CONTENT_WIDTH / 2;
      // Random jitter an toàn (-10px đến +10px) tuyệt đối không trỏ lệch khỏi card (128px)
      const randomJitter = (Math.random() - 0.5) * 20;
      const targetTranslate = -(itemCenter - centerOffset + randomJitter);

      // Bắt đầu trượt với hiệu ứng 60FPS+ mượt mà (Cubic-bezier chuẩn CS:GO)
      requestAnimationFrame(() => {
        if (!reelTrackRef.current) return;
        reelTrackRef.current.style.transition = 'transform 4.8s cubic-bezier(0.12, 0.8, 0.33, 1)';
        reelTrackRef.current.style.transform = `translate3d(${targetTranslate}px, 0, 0)`;

        // Mô phỏng âm thanh tick tick giảm tốc dần mà không chặn main thread
        let currentTick = 0;
        const totalTicks = 32;
        const scheduleTick = () => {
          if (currentTick >= totalTicks) return;
          playTickSound(currentTick > 26 ? 600 : 950);
          currentTick++;
          const progress = currentTick / totalTicks;
          const nextDelay = 50 + Math.pow(progress, 3) * 400;
          setTimeout(scheduleTick, nextDelay);
        };
        scheduleTick();
      });

      // Khi vòng quay kết thúc
      setTimeout(() => {
        setIsSpinning(false);
        setWinner(winningItem);
        playWinSound(winningItem.rarity.tier === 'covert');
      }, 5000);
    }
  };

  // Thêm món trúng thưởng vào giỏ hàng
  const handleAddToCart = () => {
    if (!winner) return;

    const hasSize = canProductHaveSize(winner.product);
    addItem(winner.product, {
      size: hasSize ? selectedSize : undefined,
      sugar: hasSize ? '100%' : undefined,
      ice: hasSize ? 'Đá chung' : undefined,
      note: `[🎰 Trúng Gacha CS:GO - Độ hiếm: ${winner.rarity.label}]`,
      quantity: 1,
    });

    const sizeText = hasSize ? ` (Size ${selectedSize})` : '';
    toast.success(`Đã thêm ${winner.product['Tên sản phẩm']}${sizeText} vào giỏ hàng!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-gray-900 via-slate-900 to-gray-950 border border-yellow-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-black/40">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-black shadow-md shadow-yellow-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-white uppercase">
                H2 CS:GO Drink Gacha
              </h2>
              <p className="text-[11px] text-gray-400">
                Không biết hôm nay uống gì? Hãy để định mệnh chọn giúp bạn!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-yellow-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSpinning}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Reel Display Box (Khung CS:GO Băng Chuyền) */}
          <div className="relative rounded-2xl border-2 border-yellow-500/40 bg-gradient-to-b from-gray-950 via-slate-900 to-black p-2 shadow-inner overflow-hidden">
            {/* Center Pointer (Kim chỉ chính giữa) */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 z-30 pointer-events-none flex flex-col justify-between items-center">
              <div className="w-0 h-0 border-x-8 border-x-transparent border-t-[14px] border-t-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.8)]" />
              <div className="w-0.5 h-full bg-gradient-to-b from-yellow-400 via-amber-300 to-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.8)]" />
              <div className="w-0 h-0 border-x-8 border-x-transparent border-b-[14px] border-b-yellow-400 drop-shadow-[0_-2px_8px_rgba(250,204,21,0.8)]" />
            </div>

            {/* Left & Right Shadow Gradient Mask */}
            <div className="absolute top-0 bottom-0 left-0 w-16 bg-gradient-to-r from-gray-950 to-transparent z-20 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-0 w-16 bg-gradient-to-l from-gray-950 to-transparent z-20 pointer-events-none" />

            {/* Reel Container */}
            <div ref={reelContainerRef} className="overflow-hidden py-3 [contain:layout_paint]">
              <div
                ref={reelTrackRef}
                className="flex items-center gap-3 will-change-transform transform-gpu [transform:translate3d(0,0,0)] [backface-visibility:hidden]"
                style={{ width: `${reelItems.length * 140}px` }}
              >
                {reelItems.map((item) => (
                  <div
                    key={item.uid}
                    className={`w-32 h-44 shrink-0 rounded-xl border-2 ${item.rarity.borderColor} bg-gradient-to-b from-gray-900/90 via-slate-800/80 to-gray-950 p-2.5 flex flex-col justify-between shadow-md relative overflow-hidden`}
                  >
                    {/* Bottom rarity color bar */}
                    <div
                      className={`absolute bottom-0 left-0 right-0 h-1.5 ${item.rarity.badgeBg}`}
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-gray-400 truncate max-w-[70px]">
                        {item.rarity.tier.toUpperCase()}
                      </span>
                      {item.rarity.tier === 'covert' && (
                        <Flame className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                      )}
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center my-1 text-center">
                      <div className="w-16 h-16 rounded-lg bg-black/30 border border-gray-700/60 p-1 flex items-center justify-center mb-2 overflow-hidden shadow-inner">
                        {item.product['Hình ảnh'] ? (
                          <img
                            src={item.product['Hình ảnh']}
                            alt={item.product['Tên sản phẩm']}
                            className="w-full h-full object-cover rounded-md"
                          />
                        ) : (
                          <span className="text-2xl">🧋</span>
                        )}
                      </div>
                      <div className="text-[11px] font-bold text-gray-100 line-clamp-2 leading-tight">
                        {item.product['Tên sản phẩm']}
                      </div>
                    </div>

                    <div className="text-center pt-1 border-t border-gray-800">
                      <span className="text-[11px] font-extrabold text-amber-400">
                        {getProductPrice(item.product).toLocaleString()}đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Winner Showcase Card */}
          {winner && (
            <div
              className={`p-5 rounded-2xl border-2 ${winner.rarity.borderColor} bg-gradient-to-r ${winner.rarity.bgGradient} bg-gray-900/90 shadow-2xl animate-in zoom-in-95 duration-300 space-y-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-black/50 border border-gray-700 p-1 shrink-0 overflow-hidden shadow-lg">
                    <img
                        src={getDrinkThumbnail(winner.product)}
                        alt={winner.product['Tên sản phẩm']}
                        className="w-full h-full object-cover rounded-lg"
                      />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${winner.rarity.badgeBg}`}>
                        {winner.rarity.label}
                      </span>
                      {winner.rarity.tier === 'covert' && (
                        <span className="text-xs font-bold text-yellow-400 flex items-center gap-1">
                          <Trophy className="w-3.5 h-3.5" /> SIÊU HIẾM!
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1">
                      {winner.product['Tên sản phẩm']}
                    </h3>
                    <p className="text-xs text-gray-400 line-clamp-1">
                      {winner.product['Mô tả'] || 'Món đồ uống tuyệt hảo dành riêng cho vận may của bạn hôm nay!'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-black text-amber-400">
                    {(canProductHaveSize(winner.product) && selectedSize === 'L'
                      ? getProductPrice(winner.product) + 5000
                      : getProductPrice(winner.product)
                    ).toLocaleString()}
                    đ
                  </div>
                  {canProductHaveSize(winner.product) && (
                    <div className="text-[11px] text-gray-400">
                      {selectedSize === 'M' ? 'Size M (Chuẩn)' : 'Size L (+5.000đ)'}
                    </div>
                  )}
                </div>
              </div>

              {/* Size Selector: Chỉ hiển thị cho đồ uống có hỗ trợ Size */}
              {canProductHaveSize(winner.product) && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-800 text-xs">
                  <span className="text-gray-300 font-medium">Chọn kích cỡ:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSize('M')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        selectedSize === 'M'
                          ? 'bg-yellow-500 text-black shadow-md'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Size M (0đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSize('L')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        selectedSize === 'L'
                          ? 'bg-yellow-500 text-black shadow-md'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Size L (+5.000đ)
                    </button>
                  </div>
                </div>
              )}

              {/* Action Button: Add to Cart */}
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-extrabold text-sm shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <ShoppingBag className="w-4 h-4" />
                Thêm Món Này Vào Giỏ Hàng
              </button>
            </div>
          )}

          {/* Rarity Legend Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
            {(Object.keys(RARITY_CONFIGS) as RarityTier[]).map((key) => {
              const r = RARITY_CONFIGS[key];
              return (
                <div
                  key={key}
                  className="p-2 rounded-lg bg-gray-900/60 border border-gray-800 flex items-center gap-2"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${r.badgeBg}`} />
                  <span className="text-gray-300 truncate">{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-gray-800 bg-black/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSpinning}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            Đóng lại
          </button>

          <button
            type="button"
            onClick={handleStartSpin}
            disabled={isSpinning}
            className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RotateCw className={`w-4 h-4 ${isSpinning ? 'animate-spin' : ''}`} />
            {isSpinning ? 'Đang Mở Hòm...' : winner ? 'Quay Lại Lần Nữa 🎲' : 'Quay Ngay (Miễn Phí) 🎰'}
          </button>
        </div>
      </div>
    </div>
  );
}
