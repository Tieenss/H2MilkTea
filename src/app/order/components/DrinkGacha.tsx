'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Volume2, VolumeX, Sparkles, ShoppingBag, RotateCw, CheckCircle2 } from 'lucide-react';
import type { Product } from '../types/customer-order';
import { useCart } from '../context/CartContext';

export type RarityTier = 'legendary' | 'epic' | 'rare' | 'common';

export interface RarityConfig {
  tier: RarityTier;
  label: string;
  weight: number; // Tỷ lệ xuất hiện (trọng số)
  borderColor: string;
  bgColor: string;
  glowColor: string;
  badgeBg: string;
  textColor: string;
}

export const RARITY_CONFIGS: Record<string, RarityConfig> = {
  legendary: {
    tier: 'legendary',
    label: 'Cực Phẩm (Covert)',
    weight: 5,
    borderColor: 'border-yellow-400',
    bgColor: 'from-amber-600/30 to-yellow-500/10',
    glowColor: 'rgba(250, 204, 21, 0.45)',
    badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black',
    textColor: 'text-yellow-400',
  },
  epic: {
    tier: 'epic',
    label: 'Thượng Hạng (Restricted)',
    weight: 15,
    borderColor: 'border-purple-500',
    bgColor: 'from-purple-600/30 to-fuchsia-500/10',
    glowColor: 'rgba(168, 85, 247, 0.45)',
    badgeBg: 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-bold',
    textColor: 'text-purple-400',
  },
  rare: {
    tier: 'rare',
    label: 'Đặc Biệt (Classified)',
    weight: 30,
    borderColor: 'border-pink-500',
    bgColor: 'from-pink-600/30 to-rose-500/10',
    glowColor: 'rgba(236, 72, 153, 0.45)',
    badgeBg: 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold',
    textColor: 'text-pink-400',
  },
  common: {
    tier: 'common',
    label: 'Phổ Thông (Mil-Spec)',
    weight: 50,
    borderColor: 'border-blue-500',
    bgColor: 'from-blue-600/30 to-cyan-500/10',
    glowColor: 'rgba(59, 130, 246, 0.45)',
    badgeBg: 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold',
    textColor: 'text-blue-400',
  },
};

// Aliases cho tương thích ngược hoàn hảo
RARITY_CONFIGS.covert = RARITY_CONFIGS.legendary;
RARITY_CONFIGS.classified = RARITY_CONFIGS.rare;
RARITY_CONFIGS.restricted = RARITY_CONFIGS.epic;
RARITY_CONFIGS.milspec = RARITY_CONFIGS.common;

export interface GachaItem {
  uid: string;
  product: Product;
  rarity: RarityConfig;
}

export interface DrinkGachaProps {
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

export function DrinkGacha({ isOpen, onClose, products }: DrinkGachaProps) {
  const { addItem } = useCart();
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<GachaItem | null>(null);
  const [reelItems, setReelItems] = useState<GachaItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSize, setSelectedSize] = useState<'M' | 'L'>('M');

  const reelContainerRef = useRef<HTMLDivElement>(null);
  const reelTrackRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
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
      void audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Phát âm thanh tick khi ô chạy qua vạch giữa
  const playTickSound = (frequency = 900) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  };

  // Âm thanh chúc mừng khi dừng quay
  const playWinSound = (isLegendary = false) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = isLegendary ? [523.25, 659.25, 783.99, 1046.50] : [440, 554.37, 659.25];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.35);
      });
    } catch {}
  };

  // Lọc sản phẩm đồ uống hoạt động
  const activeProducts = useMemo(() => {
    return products.filter((p) => (!p['Trạng thái'] || p['Trạng thái'] === 'Hoạt động') && getProductPrice(p) > 0);
  }, [products]);

  // Phân loại độ hiếm cho từng món dựa trên mức giá
  const categorizedProducts = useMemo(() => {
    if (activeProducts.length === 0) return { legendary: [], epic: [], rare: [], common: [] };

    const sorted = [...activeProducts].sort((a, b) => getProductPrice(b) - getProductPrice(a));
    const len = sorted.length;

    const legEnd = Math.max(1, Math.floor(len * 0.15));
    const epicEnd = Math.max(legEnd + 1, Math.floor(len * 0.40));
    const rareEnd = Math.max(epicEnd + 1, Math.floor(len * 0.70));

    return {
      legendary: sorted.slice(0, legEnd),
      epic: sorted.slice(legEnd, epicEnd),
      rare: sorted.slice(epicEnd, rareEnd),
      common: sorted.slice(rareEnd),
    };
  }, [activeProducts]);

  // Chọn ngẫu nhiên độ hiếm theo trọng số
  const pickRandomRarity = (): RarityConfig => {
    const totalWeight = Object.values(RARITY_CONFIGS).reduce((sum, r) => sum + r.weight, 0);
    let rand = Math.random() * totalWeight;

    for (const r of Object.values(RARITY_CONFIGS)) {
      if (rand < r.weight) {
        if (categorizedProducts[r.tier].length > 0) return r;
      }
      rand -= r.weight;
    }
    return RARITY_CONFIGS.common;
  };

  // Tạo một item gacha ngẫu nhiên
  const createRandomItem = (idSuffix: number | string): GachaItem => {
    const rarity = pickRandomRarity();
    const pool = categorizedProducts[rarity.tier].length > 0 ? categorizedProducts[rarity.tier] : activeProducts;
    const product = pool[Math.floor(Math.random() * pool.length)] || activeProducts[0];
    return {
      uid: `${product?.IDSP || 'item'}-${idSuffix}-${Math.random().toString(36).slice(2, 6)}`,
      product,
      rarity,
    };
  };

  // Khởi tạo băng chuyền gacha gồm 70 ô
  const generateNewReel = (targetWinnerItem?: GachaItem): { items: GachaItem[]; targetIndex: number } => {
    const totalCount = 70;
    const targetIndex = 58; // Vị trí kết quả dừng
    const items: GachaItem[] = [];

    for (let i = 0; i < totalCount; i++) {
      if (i === targetIndex && targetWinnerItem) {
        items.push(targetWinnerItem);
      } else {
        items.push(createRandomItem(i));
      }
    }
    return { items, targetIndex };
  };

  // Reset trạng thái ban đầu khi mở modal
  useEffect(() => {
    if (isOpen && activeProducts.length > 0) {
      const { items } = generateNewReel();
      setReelItems(items);
      setWinner(null);
      setIsSpinning(false);
      setSelectedSize('M');

      if (reelTrackRef.current) {
        reelTrackRef.current.style.transition = 'none';
        reelTrackRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
      }
    }
  }, [isOpen, activeProducts]);

  // Thực hiện vòng quay may mắn
  const handleStartSpin = () => {
    if (isSpinning || reelItems.length < 40) return;

    // Reset về 0 không có transition
    if (reelTrackRef.current) {
      reelTrackRef.current.style.transition = 'none';
      reelTrackRef.current.style.transform = 'translate3d(0px, 0px, 0px)';
      void reelTrackRef.current.offsetHeight; // Force reflow
    }

    setWinner(null);
    setIsSpinning(true);

    const winningItem = createRandomItem('WINNER');
    const { items, targetIndex } = generateNewReel(winningItem);
    setReelItems(items);

    setTimeout(() => {
      if (!reelTrackRef.current || !reelContainerRef.current) return;

      const track = reelTrackRef.current;
      const containerWidth = reelContainerRef.current.offsetWidth;
      const cardElements = track.children;
      if (!cardElements || cardElements.length <= targetIndex) return;

      const targetCard = cardElements[targetIndex] as HTMLElement;
      const cardCenterWithinTrack = targetCard.offsetLeft + targetCard.offsetWidth / 2;
      const targetTranslateX = cardCenterWithinTrack - containerWidth / 2;

      // 60FPS+ Hardware accelerated CSS transition
      const spinDurationSec = 6.2;
      track.style.transition = `transform ${spinDurationSec}s cubic-bezier(0.12, 0.82, 0.18, 1)`;
      track.style.transform = `translate3d(-${targetTranslateX}px, 0px, 0px)`;

      // Âm thanh tick chạy mượt mà
      let lastTickIndex = -1;
      let animFrameId: number;
      const startTime = performance.now();

      const checkTick = () => {
        const now = performance.now();
        const elapsed = (now - startTime) / 1000;

        const currentTransform = window.getComputedStyle(track).transform;
        if (currentTransform && currentTransform !== 'none') {
          const matrix = new DOMMatrixReadOnly(currentTransform);
          const currentX = Math.abs(matrix.m41);
          const itemWidth = 148;
          const currentCenterCardIndex = Math.floor((currentX + containerWidth / 2) / itemWidth);

          if (currentCenterCardIndex !== lastTickIndex && currentCenterCardIndex >= 0 && currentCenterCardIndex < items.length) {
            lastTickIndex = currentCenterCardIndex;
            const progress = Math.min(1, elapsed / spinDurationSec);
            const pitch = 950 - progress * 350;
            playTickSound(pitch);
          }
        }

        if (elapsed < spinDurationSec) {
          animFrameId = requestAnimationFrame(checkTick);
        }
      };

      animFrameId = requestAnimationFrame(checkTick);

      setTimeout(() => {
        cancelAnimationFrame(animFrameId);
        setIsSpinning(false);
        setWinner(winningItem);
        playWinSound(winningItem.rarity.tier === 'legendary');
      }, spinDurationSec * 1000 + 80);
    }, 40);
  };

  // Thêm món trúng gacha vào giỏ hàng
  const handleAddToCart = () => {
    if (!winner) return;

    const hasSize = canProductHaveSize(winner.product);

    addItem(winner.product, {
      size: hasSize ? selectedSize : undefined,
      sugar: hasSize ? '100%' : undefined,
      ice: hasSize ? 'Đá chung' : undefined,
      note: `[🎰 Trúng Vòng Quay May Mắn - Độ hiếm: ${winner.rarity.label}]`,
      quantity: 1,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl bg-gradient-to-b from-gray-900 via-slate-900 to-black border border-yellow-500/30 text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-yellow-500/20 text-black">
              <Sparkles className="w-5 h-5 fill-current" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-white uppercase">
                Vòng Quay Đồ Uống May Mắn
              </h2>
              <p className="text-[11px] text-gray-400">
                Không biết hôm nay uống gì? Hãy để vòng quay may mắn chọn giúp bạn!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl text-gray-400 hover:text-yellow-400 hover:bg-white/5 transition-colors"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              aria-label="Chuyển đổi âm thanh"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-gray-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSpinning}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-40"
              aria-label="Đóng vòng quay"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          {/* Reel Display Box (Khung Băng Chuyền May Mắn) */}
          <div className="relative rounded-2xl border-2 border-yellow-500/40 bg-gradient-to-b from-gray-950 via-slate-900 to-black p-2 shadow-inner overflow-hidden">
            {/* Center Pointer (Kim chỉ chính giữa) */}
            <div ref={pointerRef} className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 z-30 pointer-events-none flex flex-col justify-between items-center">
              <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[14px] border-t-yellow-400 drop-shadow-[0_2px_8px_rgba(250,204,21,0.9)]" />
              <div className="w-[2px] h-full bg-gradient-to-b from-yellow-400 via-amber-300 to-yellow-400 opacity-80 shadow-[0_0_8px_#facc15]" />
              <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[14px] border-b-yellow-400 drop-shadow-[0_-2px_8px_rgba(250,204,21,0.9)]" />
            </div>

            {/* Subtle Gradient Shadows on sides */}
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-950 to-transparent z-20 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-950 to-transparent z-20 pointer-events-none" />

            {/* Reel Container */}
            <div ref={reelContainerRef} className="w-full overflow-hidden py-3">
              <div
                ref={reelTrackRef}
                className="flex items-center gap-3 will-change-transform"
                style={{ transform: 'translate3d(0,0,0)' }}
              >
                {reelItems.map((item, idx) => {
                  const r = item.rarity;
                  return (
                    <div
                      key={item.uid || idx}
                      className={`shrink-0 w-32 sm:w-36 rounded-xl border-2 ${r.borderColor} bg-gradient-to-b ${r.bgColor} p-2.5 flex flex-col items-center text-center relative select-none transition-transform shadow-md`}
                      style={{ boxShadow: `0 0 12px ${r.glowColor}` }}
                    >
                      <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full ${r.badgeBg} mb-2`}>
                        {r.label}
                      </span>

                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden mb-2 bg-black/40 border border-white/10 p-1">
                        <img
                          src={getDrinkThumbnail(item.product)}
                          alt={item.product['Tên sản phẩm']}
                          className="w-full h-full object-cover rounded-lg"
                          loading="lazy"
                        />
                      </div>

                      <p className="text-xs font-bold text-gray-100 line-clamp-1 w-full">
                        {item.product['Tên sản phẩm']}
                      </p>
                      <p className={`text-[11px] font-extrabold ${r.textColor} mt-0.5`}>
                        {getProductPrice(item.product).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Winner Reveal Card */}
          {winner && (
            <div className="rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-500/15 via-amber-950/30 to-black p-4 sm:p-5 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 shadow-xl shadow-yellow-500/10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎉</span>
                <span className={`text-xs uppercase px-3 py-1 rounded-full ${winner.rarity.badgeBg} tracking-wider`}>
                  {winner.rarity.label}
                </span>
                <span className="text-xl">🎉</span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-yellow-300">
                Chúc mừng bạn đã quay trúng:
              </h3>
              <p className="text-base sm:text-lg font-extrabold text-white mt-1">
                {winner.product['Tên sản phẩm']}
              </p>
              <p className="text-sm font-semibold text-gray-300 mb-4">
                Giá gốc: {getProductPrice(winner.product).toLocaleString('vi-VN')}đ
              </p>

              {/* Size Selector (Chỉ hiện cho đồ uống cho phép tăng size) */}
              {canProductHaveSize(winner.product) && (
                <div className="w-full max-w-xs mb-4">
                  <p className="text-xs text-gray-400 mb-1.5 font-medium">Chọn kích cỡ ly:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedSize('M')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                        selectedSize === 'M'
                          ? 'bg-yellow-500 text-black shadow-md'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      Size M (Tiêu chuẩn)
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
            {isSpinning ? 'Đang Quay...' : winner ? 'Quay Lại Lần Nữa 🎲' : 'Quay Ngay (Miễn Phí) 🎰'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export các alias tương thích ngược 100%
export { DrinkGacha as DrinkGachaGacha, DrinkGacha as DrinkGachaCSGO };
export default DrinkGacha;
