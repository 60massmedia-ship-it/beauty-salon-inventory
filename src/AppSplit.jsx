import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import StockPage from './components/StockPage.jsx';
import ProductPage from './components/ProductPage.jsx';
import { Button, Modal } from './components/ui.jsx';
import { STORAGE_KEYS } from './data/constants.js';
import { exportCsv, exportJson } from './lib/export.js';
import {
  createCostRecord,
  formatMoney,
  getCostStats,
  normalizeCostHistory,
  normalizeProducts,
  nowIso,
  sampleCostHistory,
  sampleProducts,
} from './lib/inventory.js';

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function BeautySalonInventoryApp() {
  const [products, setProducts] = useState(() => normalizeProducts(readStorage(STORAGE_KEYS.products, sampleProducts)));
  const [transactions, setTransactions] = useState(() => readStorage(STORAGE_KEYS.transactions, []));
  const [costHistory, setCostHistory] = useState(() => normalizeCostHistory(readStorage(STORAGE_KEYS.costHistory, sampleCostHistory)));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.costHistory, JSON.stringify(costHistory));
  }, [costHistory]);

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'stock', label: '🧾 สต็อค' },
    { id: 'products', label: '📦 สินค้า' },
  ];

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
      ['วันที่', 'สินค้า', 'จำนวนเข้า', 'ต้นทุนต่อหน่วย', 'ซัพพลายเออร์', 'เลขที่บิล', 'หมายเหตุ'],
      ...costHistory.map((item) => [
        new Date(item.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }),
        item.productName,
        item.quantity,
        item.unitCost,
        item.supplier,
        item.invoiceNo,
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#fde68a,_transparent_32%),linear-gradient(135deg,_#fff7ed,_#f5f5f4_45%,_#e7e5e4)] p-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-neutral-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 overflow-hidden rounded-[2rem] bg-neutral-950 p-5 text-white shadow-xl md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs text-neutral-200 md:text-sm">✨ Beauty Salon Inventory System</div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-5xl">ระบบจัดการสต็อคร้านเสริมสวย</h1>
              <p className="mt-4 max-w-2xl text-sm text-neutral-300 md:text-base">Dashboard, บันทึกสต็อค และจัดการสินค้า รองรับ Desktop และ iPhone</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button className="bg-white text-neutral-950 hover:bg-neutral-100" onClick={() => setShowExportMenu(true)}>⬇ Export ข้อมูล</Button>
              <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/20 active:scale-[0.98]">
                ⬆ Import ข้อมูล
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

        <nav className="sticky top-3 z-10 mb-8 hidden rounded-3xl border border-white/70 bg-white/80 p-2 shadow-sm backdrop-blur md:block">
          <div className="grid gap-2 md:grid-cols-3">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-4 py-3 text-sm font-black transition ${activeTab === tab.id ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === 'dashboard' ? <Dashboard products={products} transactions={transactions} costHistory={costHistory} /> : null}
        {activeTab === 'stock' ? <StockPage products={products} setProducts={setProducts} setTransactions={setTransactions} setCostHistory={setCostHistory} /> : null}
        {activeTab === 'products' ? <ProductPage products={products} setProducts={setProducts} setTransactions={setTransactions} costHistory={costHistory} setCostHistory={setCostHistory} /> : null}

        <nav className="fixed inset-x-3 bottom-3 z-40 rounded-[1.7rem] border border-white/70 bg-white/90 p-2 shadow-2xl backdrop-blur md:hidden" style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
          <div className="grid grid-cols-3 gap-2">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-2xl px-2 py-3 text-[11px] font-black transition ${activeTab === tab.id ? 'bg-neutral-950 text-white shadow-sm' : 'text-neutral-500 hover:bg-neutral-100'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </main>
  );
}
