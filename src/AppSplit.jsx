import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import StockPage from './components/StockPage.jsx';
import ProductPage from './components/ProductPage.jsx';
import { Button, Modal } from './components/ui.jsx';
import { STORAGE_KEYS } from './data/constants.js';
import { exportCsv, exportJson } from './lib/export.js';
import {
  getCostStats,
  normalizeCostHistory,
  normalizeProducts,
  nowIso,
  sampleCostHistory,
  sampleProducts,
} from './lib/inventory.js';

const THEME_STORAGE_KEY = 'beauty_salon_inventory_theme_mode';

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function readThemeMode() {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}

function ThemeToggle({ themeMode, onToggle }) {
  const isNight = themeMode === 'night';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isNight}
      aria-label={isNight ? 'Switch to day mode' : 'Switch to night mode'}
      className={`theme-toggle relative inline-flex h-12 w-[104px] shrink-0 items-center rounded-full border p-1.5 transition-all duration-300 ${isNight ? 'is-night border-fuchsia-300/30 bg-slate-950/70' : 'border-white/60 bg-white/20'}`}
    >
      <span className="absolute left-3 text-sm font-black transition-opacity duration-300">☀️</span>
      <span className="absolute right-3 text-sm font-black transition-opacity duration-300">🌙</span>
      <span className={`theme-toggle-thumb relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-base shadow-lg transition-transform duration-300 ${isNight ? 'translate-x-[55px]' : 'translate-x-0'}`}>
        {isNight ? '🌙' : '☀️'}
      </span>
    </button>
  );
}

function HeaderMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 text-white ring-1 ring-white/10 backdrop-blur">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white/65">{label}</p>
      <p className="mt-1 text-lg font-black tracking-[-0.02em]">{value}</p>
    </div>
  );
}

export default function BeautySalonInventoryApp() {
  const [products, setProducts] = useState(() => normalizeProducts(readStorage(STORAGE_KEYS.products, sampleProducts)));
  const [transactions, setTransactions] = useState(() => readStorage(STORAGE_KEYS.transactions, []));
  const [costHistory, setCostHistory] = useState(() => normalizeCostHistory(readStorage(STORAGE_KEYS.costHistory, sampleCostHistory)));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [themeMode, setThemeMode] = useState(readThemeMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.costHistory, JSON.stringify(costHistory));
  }, [costHistory]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', helper: 'ภาพรวมร้าน' },
    { id: 'stock', label: 'บันทึกสต็อค', icon: '🧾', helper: 'รับเข้า / เบิกออก' },
    { id: 'products', label: 'จัดการสินค้า', icon: '📦', helper: 'สินค้าและต้นทุน' },
  ];

  const lowStockCount = products.filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0)).length;
  const todayLabel = new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' });

  const exportData = () => {
    exportJson(`beauty-salon-inventory-${new Date().toISOString().slice(0, 10)}.json`, {
      products,
      transactions,
      costHistory,
      exportedAt: nowIso(),
    });
  };

  const exportProductsCsv = () => {
    exportCsv(`beauty-salon-products-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['ชื่อสินค้า', 'รหัสสินค้า', 'หมวดหมู่', 'ประเภทสินค้า', 'คงเหลือ', 'หน่วย', 'แจ้งเตือนขั้นต่ำ', 'ต้นทุนล่าสุด', 'ต้นทุนเฉลี่ย', 'ซัพพลายเออร์', 'หมายเหตุ'],
      ...products.map((product) => {
        const stats = getCostStats(costHistory.filter((record) => record.productId === product.id));
        return [
          product.name,
          product.sku,
          product.category,
          product.productType,
          product.stock,
          product.unit,
          product.minStock,
          stats.latestCost || product.cost,
          stats.averageCost || product.cost,
          product.supplier,
          product.note,
        ];
      }),
    ]);
  };

  const exportTransactionsCsv = () => {
    exportCsv(`beauty-salon-transactions-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['วันที่', 'สินค้า', 'ประเภท', 'จำนวน', 'เหตุผล'],
      ...transactions.map((item) => [
        new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
        item.productName,
        item.type,
        item.quantity,
        item.reason,
      ]),
    ]);
  };

  const exportCostHistoryCsv = () => {
    exportCsv(`beauty-salon-cost-history-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['วันที่', 'สินค้า', 'จำนวนเข้า', 'ต้นทุนต่อหน่วย', 'ซัพพลายเออร์', 'หมายเหตุ'],
      ...costHistory.map((item) => [
        new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
        item.productName,
        item.quantity,
        item.unitCost,
        item.supplier,
        item.note,
      ]),
    ]);
  };

  const handleExportChoice = (fn) => {
    fn();
    setShowExportMenu(false);
  };

  const importData = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!Array.isArray(data.products)) throw new Error('Invalid products');
        setProducts(normalizeProducts(data.products));
        setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
        setCostHistory(normalizeCostHistory(data.costHistory || []));
      } catch {
        window.alert('ไฟล์ไม่ถูกต้อง กรุณาใช้ไฟล์ JSON ที่ Export จากระบบนี้');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <main className={`theme-root theme-${themeMode} min-h-screen p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-neutral-950 md:p-8`}>
      <div className="mx-auto max-w-7xl">
        <header className="relative mb-6 overflow-hidden rounded-[2rem] bg-neutral-950 p-5 text-white shadow-xl md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 left-10 h-32 w-32 rounded-full bg-pink-200/20 blur-xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black text-white/80 ring-1 ring-white/10 md:text-sm">✨ Premium Beauty Salon Inventory</div>
              <h1 className="text-3xl font-black leading-tight tracking-[-0.04em] md:text-5xl">ระบบจัดการสต็อคร้านเสริมสวย</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">ออกแบบสำหรับเจ้าของร้านและพนักงาน ใช้งานง่ายบนมือถือ ดูต้นทุน เบิกสินค้า รับเข้า และเช็คของที่ควรซื้อเพิ่มได้เร็วขึ้น</p>
              <div className="mt-5 grid max-w-2xl gap-3 sm:grid-cols-3">
                <HeaderMetric label="วันนี้" value={todayLabel} />
                <HeaderMetric label="สินค้าในระบบ" value={`${products.length} รายการ`} />
                <HeaderMetric label="ใกล้หมด" value={`${lowStockCount} รายการ`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <ThemeToggle themeMode={themeMode} onToggle={() => setThemeMode((mode) => (mode === 'day' ? 'night' : 'day'))} />
              <Button className="bg-white text-neutral-950 hover:bg-neutral-100" onClick={() => setShowExportMenu(true)}>⬇ Export</Button>
              <label className="premium-button inline-flex min-h-[48px] cursor-pointer items-center justify-center rounded-[1.15rem] bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-white/20 active:scale-[0.98]">
                ⬆ Import
                <input type="file" accept="application/json" onChange={importData} className="hidden" />
              </label>
            </div>
          </div>
        </header>

        {showExportMenu ? (
          <Modal title="Export ข้อมูล" subtitle="เลือกประเภทไฟล์ที่ต้องการดาวน์โหลด" onCancel={() => setShowExportMenu(false)} hideSave maxWidth="max-w-lg">
            <div className="grid gap-3">
              <button type="button" className="rounded-2xl border border-neutral-200 bg-white p-4 text-left hover:bg-neutral-50" onClick={() => handleExportChoice(exportData)}>
                <div className="font-black text-neutral-950">💾 Backup JSON สำหรับ Import กลับ</div>
                <div className="mt-1 text-sm text-neutral-500">สำรองข้อมูลทั้งหมด และใช้ Import กลับเข้าระบบได้</div>
              </button>
              <button type="button" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left hover:bg-emerald-100" onClick={() => handleExportChoice(exportProductsCsv)}>
                <div className="font-black text-emerald-800">📦 รายการสินค้า CSV</div>
                <div className="mt-1 text-sm text-emerald-700">เปิดดูใน Excel / Google Sheets</div>
              </button>
              <button type="button" className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left hover:bg-blue-100" onClick={() => handleExportChoice(exportTransactionsCsv)}>
                <div className="font-black text-blue-800">🧾 ประวัติรายการ CSV</div>
                <div className="mt-1 text-sm text-blue-700">Export ประวัติรับเข้า เบิกออก แก้ไข และลบสินค้า</div>
              </button>
              <button type="button" className="rounded-2xl border border-purple-200 bg-purple-50 p-4 text-left hover:bg-purple-100" onClick={() => handleExportChoice(exportCostHistoryCsv)}>
                <div className="font-black text-purple-800">📈 ประวัติต้นทุน CSV</div>
                <div className="mt-1 text-sm text-purple-700">Export ประวัติต้นทุนแต่ละรอบ</div>
              </button>
            </div>
          </Modal>
        ) : null}

        <nav className="premium-card sticky top-3 z-10 mb-8 hidden rounded-[1.5rem] border p-2 backdrop-blur md:block">
          <div className="grid gap-2 md:grid-cols-3">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-[1.15rem] px-4 py-3 text-left transition ${activeTab === tab.id ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{tab.icon}</span>
                  <span><span className="block text-sm font-black">{tab.label}</span><span className={`block text-[11px] ${activeTab === tab.id ? 'text-white/70' : 'text-neutral-400'}`}>{tab.helper}</span></span>
                </div>
              </button>
            ))}
          </div>
        </nav>

        {activeTab === 'dashboard' ? <Dashboard products={products} transactions={transactions} costHistory={costHistory} /> : null}
        {activeTab === 'stock' ? <StockPage products={products} setProducts={setProducts} transactions={transactions} setTransactions={setTransactions} setCostHistory={setCostHistory} /> : null}
        {activeTab === 'products' ? <ProductPage products={products} setProducts={setProducts} setTransactions={setTransactions} costHistory={costHistory} setCostHistory={setCostHistory} /> : null}

        <nav className="premium-card fixed inset-x-3 bottom-3 z-40 rounded-[1.7rem] border p-2 shadow-2xl backdrop-blur md:hidden" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-2 py-3 text-[11px] font-black transition ${activeTab === tab.id ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-100'}`}>
                <span className="block text-lg leading-none">{tab.icon}</span>
                <span className="mt-1 block">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
