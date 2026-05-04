import { useEffect, useMemo, useRef, useState } from 'react';

const TARGET_DATE = new Date('2026-05-25T00:00:00+07:00');

type Gift = {
  emoji: string;
  title: string;
  desc: string;
  price: string;
  escape: string;
};

const GIFTS: Gift[] = [
  { emoji: '🏝️', title: 'Du lịch Maldives', desc: '7 ngày 6 đêm resort 5★', price: '~120 triệu', escape: 'Hết phòng rồi em ơi 😅' },
  { emoji: '💎', title: 'Kim cương 2 carat', desc: 'Tiffany & Co. chính hãng', price: '~500 triệu', escape: 'Cửa hàng đang… bảo trì 🔧' },
  { emoji: '🪙', title: 'Vàng SJC 5 cây', desc: 'Tích sản chống lạm phát', price: '~600 triệu', escape: 'Giá vàng đang nhảy múa, đợi xíu 📈' },
  { emoji: '👜', title: 'Hermès Birkin', desc: 'Túi xách limited edition', price: '~1 tỷ', escape: 'Đang chờ ship từ Paris 🚢' },
  { emoji: '👗', title: 'Tủ đồ hiệu', desc: 'Chanel · Dior · Gucci', price: '~300 triệu', escape: 'Stylist đang… đi ăn trưa 🍜' },
  { emoji: '💄', title: 'Mỹ phẩm La Mer', desc: 'Trọn bộ skincare cao cấp', price: '~50 triệu', escape: 'Hết hàng mất rồi 😢' },
  { emoji: '🚗', title: 'Mercedes E300', desc: 'Màu đỏ rực rỡ', price: '~3 tỷ', escape: 'Garage chưa xong xe đâu 🚧' },
  { emoji: '💍', title: 'Trang sức Cartier', desc: 'Vòng Love + nhẫn cưới', price: '~200 triệu', escape: 'Anh đang… đếm lại tiền 💸' },
  { emoji: '📱', title: 'iPhone 17 Pro Max', desc: 'Phiên bản Titan vũ trụ', price: '~45 triệu', escape: 'Apple Store đang lễ 🍎' },
];

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, target.getTime() - now);
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    isOver: diff === 0,
  };
}

function EscapeCard({ gift, onCatch }: { gift: Gift; onCatch: (msg: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const goneRef = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0, rot: 0 });
  const [gone, setGone] = useState(false);
  const [puff, setPuff] = useState(false);
  const [respawning, setRespawning] = useState(false);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (goneRef.current) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const threshold = 180;
      if (dist >= threshold) return;

      const angle = Math.atan2(dy, dx);
      const force = (threshold - dist) * 1.6;
      const pushX = -Math.cos(angle) * force * 0.5;
      const pushY = -Math.sin(angle) * force * 0.5;

      setOffset(prev => {
        const nx = prev.x + pushX;
        const ny = prev.y + pushY;
        // projected viewport center after applying new offset
        const baseCx = cx - prev.x;
        const baseCy = cy - prev.y;
        const projCx = baseCx + nx;
        const projCy = baseCy + ny;
        const margin = 40;
        const offscreen =
          projCx < -margin ||
          projCx > window.innerWidth + margin ||
          projCy < -margin ||
          projCy > window.innerHeight + margin;
        if (offscreen) {
          goneRef.current = true;
          setGone(true);
          setPuff(true);
          onCatch(gift.escape);
          window.setTimeout(() => setPuff(false), 900);
          window.setTimeout(() => {
            setRespawning(true);
            setOffset({ x: 0, y: 0, rot: 0 });
            goneRef.current = false;
            setGone(false);
            requestAnimationFrame(() =>
              requestAnimationFrame(() => setRespawning(false))
            );
          }, 2800);
        }
        return {
          x: nx,
          y: ny,
          rot: -Math.cos(angle) * 14 + (Math.random() - 0.5) * 10,
        };
      });
    };
    window.addEventListener('mousemove', handler, { passive: true });
    return () => window.removeEventListener('mousemove', handler);
  }, [onCatch, gift.escape]);

  const skipTransform = gone || respawning;

  return (
    <div className="relative">
      <div
        ref={ref}
        onClick={() => !gone && onCatch(gift.escape)}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.rot}deg)`,
          transition: skipTransform
            ? 'opacity 0.35s ease-out'
            : 'transform 0.22s cubic-bezier(.34,1.56,.64,1), opacity 0.3s',
          opacity: gone ? 0 : 1,
          pointerEvents: gone ? 'none' : 'auto',
        }}
        className="group cursor-pointer rounded-2xl bg-white/85 backdrop-blur p-5 shadow-lg ring-1 ring-rose-100 hover:shadow-xl"
      >
        <div className="text-5xl mb-2 transition-transform group-hover:scale-110">{gift.emoji}</div>
        <h3 className="font-semibold text-gray-800">{gift.title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{gift.desc}</p>
        <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
          💸 {gift.price}
        </div>
      </div>

      {puff && (
        <span className="absolute inset-0 flex items-center justify-center text-6xl pointer-events-none animate-puff z-10">
          💨
        </span>
      )}

      {gone && !puff && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/50 backdrop-blur-sm pointer-events-none border-2 border-dashed border-rose-200">
          <div className="text-center">
            <div className="text-3xl mb-1">📦</div>
            <p className="text-[11px] text-gray-500 italic px-2">Đang nhập hàng lại...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Toast({ text }: { text: string }) {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 text-white px-5 py-3 rounded-full shadow-2xl text-sm animate-toast">
      {text}
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 90 }, () => ({
        left: Math.random() * 100,
        delay: Math.random() * 2.5,
        duration: 3 + Math.random() * 3,
        size: 18 + Math.random() * 16,
        emoji: ['🎉', '💖', '🌸', '✨', '💕', '🎀', '💝', '🌷', '🥰', '🎂'][Math.floor(Math.random() * 10)],
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-40">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: '-40px',
            fontSize: `${p.size}px`,
            animation: `bday-fall ${p.duration}s linear ${p.delay}s infinite`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

function FloatingBg() {
  const balloons = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: (i * 7 + Math.random() * 5) % 100,
        delay: Math.random() * 5,
        duration: 8 + Math.random() * 6,
        size: 28 + Math.random() * 22,
        emoji: ['🎈', '🎀', '💝', '🌸', '🌷'][Math.floor(Math.random() * 5)],
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
      {balloons.map((b, i) => (
        <span
          key={i}
          className="absolute opacity-60"
          style={{
            left: `${b.left}%`,
            bottom: '-60px',
            fontSize: `${b.size}px`,
            animation: `bday-rise ${b.duration}s linear ${b.delay}s infinite`,
          }}
        >
          {b.emoji}
        </span>
      ))}
    </div>
  );
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white/80 backdrop-blur rounded-xl px-3 py-2 sm:px-5 sm:py-3 shadow ring-1 ring-rose-100 min-w-[64px] sm:min-w-[80px]">
      <div className="text-2xl sm:text-3xl font-bold text-rose-600 tabular-nums">{String(value).padStart(2, '0')}</div>
      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500">{label}</div>
    </div>
  );
}

function CertificateModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade overflow-y-auto">
      <div className="relative my-auto max-w-lg w-full bg-gradient-to-br from-amber-50 via-rose-50 to-pink-100 rounded-3xl shadow-2xl ring-4 ring-amber-300 p-6 sm:p-8 animate-pop">
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-6xl">🏆</div>
        <div className="text-center mt-6">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-semibold">Chứng nhận chính thức</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-rose-700">
            Vợ Đảm Đang & Tiết Kiệm
          </h2>
          <p className="text-sm text-gray-600 mt-1">— Năm 2026 —</p>

          <div className="mt-5 rounded-2xl bg-gradient-to-br from-rose-500 to-fuchsia-500 text-white p-4 sm:p-5 shadow-lg overflow-hidden">
            <div className="relative rounded-xl overflow-hidden ring-4 ring-white/70 shadow-lg">
              <img
                src="/em-bot.jpg"
                alt="Em Bột — đại sứ Quỹ Bỉm Sữa"
                className="w-full h-64 sm:h-80 object-cover"
              />
              <div className="absolute top-2 left-2 bg-rose-600/90 backdrop-blur text-white text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full shadow">
                📸 Đại sứ Quỹ Bỉm Sữa
              </div>
              <div className="absolute bottom-2 right-2 bg-white/85 text-rose-700 text-xs font-bold px-2.5 py-1 rounded-full shadow">
                em Bột 💖
              </div>
            </div>
            <div className="mt-4 text-left">
              <p className="text-[11px] uppercase tracking-wider opacity-90 font-semibold flex items-center gap-1">
                <span>✅</span> Xác nhận giao dịch
              </p>
              <p className="mt-1 text-[15px] sm:text-base font-semibold leading-snug">
                Chúc mừng phu nhân đã quyên góp thành công toàn bộ ngân sách quà sinh nhật năm nay vào{' '}
                <span className="underline decoration-2 underline-offset-2">Quỹ Bỉm Sữa em Bột</span>!
              </p>
              <p className="mt-2 text-sm italic opacity-95">🍼 Mẹ tiết kiệm, các con no ấm!</p>
            </div>
          </div>

          <div className="my-5 border-t border-dashed border-rose-300"></div>

          <p className="text-gray-700 leading-relaxed text-left text-[15px]">
            Trao tặng cho <span className="font-bold text-rose-700">vợ yêu</span>, người đã chọn món
            quà tuyệt vời nhất: <span className="italic">tiết kiệm tiền cùng chồng</span> 💕
          </p>

          <div className="mt-4 text-left bg-white/70 rounded-2xl p-4 ring-1 ring-rose-200 space-y-2 text-sm">
            <p className="font-semibold text-rose-700">🎁 Phần thưởng kèm theo:</p>
            <ul className="space-y-1.5 text-gray-700">
              <li>❤️ 1 cái ôm thật chặt từ chồng <span className="text-gray-400">(giá trị vĩnh viễn)</span></li>
              <li>💋 1 nụ hôn ngọt ngào <span className="text-gray-400">(kèm má lúm đồng tiền)</span></li>
              <li>🍳 Chồng nấu cơm cả ngày 25/05 <span className="text-gray-400">(chỉ hôm đó thôi nhé)</span></li>
              <li>🧽 Chồng rửa bát + lau nhà <span className="text-gray-400">(lần này thôi đó!)</span></li>
              <li>🎬 1 buổi xem phim chiếu rạp <span className="text-gray-400">(em chọn phim)</span></li>
              <li>💰 Toàn bộ ngân sách đã được chuyển vào Quỹ Bỉm Sữa <span className="text-gray-400">(không hoàn lại)</span></li>
            </ul>
          </div>

          <p className="mt-5 text-xs text-gray-500 italic">
            "Có em là có tất cả. Còn lại để dành mua bỉm sữa cho con 🍼"
          </p>

          <div className="mt-4 flex items-end justify-between text-xs text-gray-600">
            <div>
              <div className="font-semibold">Ngày cấp</div>
              <div>25 / 05 / 2026</div>
            </div>
            <div className="text-right">
              <div className="font-handwriting text-lg text-rose-700 italic">~ Chồng yêu ~</div>
              <div>(đã ký & đóng dấu)</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-semibold py-3 rounded-xl shadow-lg transition"
          >
            Em yêu chồng 💖
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BirthdayWife() {
  const cd = useCountdown(TARGET_DATE);
  const [revealed, setRevealed] = useState(false);
  const [toast, setToast] = useState<string>('');

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-pink-100 to-fuchsia-100">
      <style>{`
        @keyframes bday-fall {
          0% { transform: translateY(-40px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.7; }
        }
        @keyframes bday-rise {
          0% { transform: translateY(0) rotate(-6deg); opacity: 0; }
          10% { opacity: 0.6; }
          100% { transform: translateY(-115vh) rotate(8deg); opacity: 0; }
        }
        @keyframes bday-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.55), 0 25px 50px -12px rgba(244, 63, 94, 0.45); }
          50% { box-shadow: 0 0 0 18px rgba(244, 63, 94, 0), 0 25px 50px -12px rgba(244, 63, 94, 0.45); }
        }
        @keyframes bday-wobble {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
        @keyframes bday-toast {
          0% { transform: translate(-50%, 30px); opacity: 0; }
          15%, 85% { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, 30px); opacity: 0; }
        }
        @keyframes bday-pop {
          0% { transform: scale(0.6) rotate(-4deg); opacity: 0; }
          70% { transform: scale(1.04) rotate(1deg); opacity: 1; }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes bday-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bday-puff {
          0% { transform: scale(0.4); opacity: 0; }
          25% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(2.6); opacity: 0; }
        }
        .animate-puff { animation: bday-puff 0.9s ease-out forwards; }
        .animate-pulse-bday { animation: bday-pulse 1.8s ease-out infinite; }
        .animate-wobble { animation: bday-wobble 3.5s ease-in-out infinite; }
        .animate-toast { animation: bday-toast 2s ease-in-out forwards; }
        .animate-pop { animation: bday-pop 0.5s cubic-bezier(.34,1.56,.64,1) forwards; }
        .animate-fade { animation: bday-fade 0.3s ease-out forwards; }
        .font-handwriting { font-family: 'Brush Script MT', 'Lucida Handwriting', cursive; }
      `}</style>

      <FloatingBg />
      {revealed && <Confetti />}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <header className="text-center">
          <div className="text-5xl sm:text-6xl mb-3 animate-wobble inline-block">🎂</div>
          <h1 className="text-3xl sm:text-5xl font-extrabold bg-gradient-to-r from-rose-600 via-pink-600 to-fuchsia-600 bg-clip-text text-transparent">
            Chúc mừng sinh nhật vợ yêu!
          </h1>
          <p className="mt-3 text-gray-600 text-sm sm:text-base">
            Anh đã chuẩn bị một bất ngờ — em hãy chọn món quà em thích nhất nhé 💕
          </p>

          {!cd.isOver ? (
            <div className="mt-6 flex items-center justify-center gap-2 sm:gap-3">
              <CountdownBox value={cd.days} label="Ngày" />
              <CountdownBox value={cd.hours} label="Giờ" />
              <CountdownBox value={cd.minutes} label="Phút" />
              <CountdownBox value={cd.seconds} label="Giây" />
            </div>
          ) : (
            <div className="mt-6 inline-block bg-rose-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
              🎉 Hôm nay là sinh nhật em! 🎉
            </div>
          )}
        </header>

        <section className="mt-10">
          <p className="text-center text-sm text-gray-500 mb-4">
            👇 Chọn một món quà em thích — anh sẽ tặng em ngay 👇
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
            {GIFTS.map(g => (
              <EscapeCard key={g.title} gift={g} onCatch={msg => setToast(msg)} />
            ))}
          </div>

          <div className="mt-8">
            <button
              onClick={() => setRevealed(true)}
              className="relative w-full rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-7 text-white shadow-2xl ring-4 ring-rose-300 animate-pulse-bday hover:scale-[1.02] active:scale-[0.99] transition text-left"
            >
              <span className="absolute top-3 right-3 bg-white/30 backdrop-blur px-3 py-1 rounded-full text-xs font-semibold">
                ✨ Anh khuyên dùng
              </span>
              <div className="flex items-center gap-5">
                <div className="text-6xl sm:text-7xl">🐷</div>
                <div className="flex-1">
                  <h3 className="text-xl sm:text-2xl font-bold">Tiết kiệm tiền cùng anh</h3>
                  <p className="opacity-95 mt-1 text-sm sm:text-base">
                    Cùng nhau xây tổ ấm hạnh phúc — một xu cũng quý 💕
                  </p>
                  <p className="opacity-85 mt-2 text-xs sm:text-sm italic">
                    (Cái này click được nè em ơi 👀)
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-gray-500">
          Made with 💖 by chồng yêu — chỉ dành riêng cho em
        </footer>
      </div>

      {toast && <Toast text={toast} />}
      {revealed && <CertificateModal onClose={() => setRevealed(false)} />}
    </div>
  );
}
