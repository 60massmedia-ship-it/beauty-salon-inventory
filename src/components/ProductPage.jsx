import React, { useMemo, useState } from 'react';
import { categoryOptions, productTypeOptions, unitOptions } from '../data/constants.js';
import { Button, Card, Field, Modal, SelectInput, TextArea, TextInput } from './ui.jsx';
import { createId, createProduct, formatMoney, getCostStats, getSupplierStats, nowIso, toSafeNumber } from '../lib/inventory.js';

export default function ProductPage({ products, setProducts, setTransactions, costHistory, setCostHistory }) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ทั้งหมด');
  const [typeFilter, setTypeFilter] = useState('ทั้งหมด');
  const [infoEditor, setInfoEditor] = useState(null);
  const [stockEditor, setStockEditor] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [costViewer, setCostViewer] = useState(null);
  const [infoForm, setInfoForm] = useState({});
  const [stockForm, setStockForm] = useState({ stock: 0, minStock: 0 });

  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const search = `${item.name} ${item.sku} ${item.category} ${item.productType} ${item.supplier}`.toLowerCase();
      return search.includes(query.toLowerCase()) &&
        (categoryFilter === 'ทั้งหมด' || item.category === categoryFilter) &&
        (typeFilter === 'ทั้งหมด' || item.productType === typeFilter);
    });
  }, [products, query, categoryFilter, typeFilter]);

  const openInfoEditor = (product) => {
    setInfoEditor(product);
    setInfoForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      productType: product.productType || productTypeOptions[0],
      unit: product.unit,
      cost: product.cost,
      supplier: product.supplier,
      note: product.note,
    });
  };

  const saveInfoEditor = () => {
    if (!infoEditor) return;
    const name = String(infoForm.name || '').trim();
    if (!name) return window.alert('กรุณากรอกชื่อสินค้า');
    const updatedProduct = createProduct({ ...infoEditor, ...infoForm, name, updatedAt: nowIso() });
    setProducts((prev) => prev.map((item) => item.id === infoEditor.id ? updatedProduct : item));
    setTransactions((prev) => [{ id: createId(), productId: updatedProduct.id, productName: updatedProduct.name, type: 'edit', quantity: 0, reason: 'แก้ไขข้อมูลสินค้า', createdAt: nowIso() }, ...prev]);
    setInfoEditor(null);
  };

  const openStockEditor = (product) => {
    setStockEditor(product);
    setStockForm({ stock: product.stock, minStock: product.minStock });
  };

  const saveStockEditor = () => {
    if (!stockEditor) return;
    const oldStock = toSafeNumber(stockEditor.stock);
    const nextStock = Math.max(0, toSafeNumber(stockForm.stock));
    const nextMinStock = Math.max(0, toSafeNumber(stockForm.minStock));
    setProducts((prev) => prev.map((item) => item.id === stockEditor.id ? { ...item, stock: nextStock, minStock: nextMinStock, updatedAt: nowIso() } : item));
    setTransactions((prev) => [{ id: createId(), productId: stockEditor.id, productName: stockEditor.name, type: 'adjust', quantity: Math.abs(nextStock - oldStock), reason: `ปรับจำนวนคงเหลือจาก ${oldStock} เป็น ${nextStock} และตั้งเตือนขั้นต่ำ ${nextMinStock}`, createdAt: nowIso() }, ...prev]);
    setStockEditor(null);
  };

  const confirmDeleteProduct = () => {
    if (!deleteTarget) return;
    setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    setCostHistory((prev) => prev.filter((item) => item.productId !== deleteTarget.id));
    setTransactions((prev) => [{ id: createId(), productId: deleteTarget.id, productName: deleteTarget.name, type: 'delete', quantity: toSafeNumber(deleteTarget.stock), reason: 'ลบสินค้าออกจากระบบ', createdAt: nowIso() }, ...prev]);
    setDeleteTarget(null);
  };

  const renderProductCard = (product) => {
    const records = costHistory.filter((item) => item.productId === product.id);
    const costStats = getCostStats(records);
    const supplierInfo = getSupplierStats(records);
    const latestSupplier = supplierInfo.latestSupplier || product.supplier || '-';
    const lowStock = toSafeNumber(product.stock) <= toSafeNumber(product.minStock);

    return (
      <div key={product.id} className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-neutral-950">{product.name}</h3>
            <p className="mt-1 text-xs text-neutral-400">SKU: {product.sku || '-'}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${lowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{product.stock} {product.unit}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-2xl bg-neutral-50 p-3"><p className="text-neutral-400">หมวดหมู่</p><p className="mt-1 font-black text-neutral-700">{product.category}</p></div>
          <div className="rounded-2xl bg-neutral-50 p-3"><p className="text-neutral-400">ประเภท</p><p className="mt-1 font-black text-neutral-700">{product.productType || '-'}</p></div>
          <div className="rounded-2xl bg-amber-50 p-3 text-amber-800"><p className="text-amber-600">ต้นทุนล่าสุด</p><p className="mt-1 font-black">{formatMoney(costStats.latestCost || product.cost)}</p></div>
          <div className="rounded-2xl bg-blue-50 p-3 text-blue-800"><p className="text-blue-600">ต้นทุนเฉลี่ย</p><p className="mt-1 font-black">{formatMoney(costStats.averageCost || product.cost)}</p></div>
        </div>
        <div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-xs text-neutral-500"><span className="font-black text-neutral-700">ซัพพลายเออร์ล่าสุด:</span> {latestSupplier}<div className="mt-0.5 text-neutral-400">เคยซื้อ {supplierInfo.supplierCount} เจ้า / แจ้งเตือน ≤ {product.minStock}</div></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="rounded-2xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-black text-blue-700" onClick={() => openInfoEditor(product)}>✏️ แก้ไข</button>
          <button type="button" className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-black text-amber-800" onClick={() => openStockEditor(product)}>📦 สต็อค</button>
          <button type="button" className="rounded-2xl border border-purple-200 bg-purple-50 px-3 py-3 text-sm font-black text-purple-700" onClick={() => setCostViewer(product)}>📈 ต้นทุน</button>
          <button type="button" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-black text-red-700" onClick={() => setDeleteTarget(product)}>🗑️ ลบ</button>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-neutral-950">จัดการสินค้าและจำนวนคงเหลือ</h2>
          <p className="text-sm text-neutral-500">ดูจำนวนคงเหลือ ค้นหา แก้ไข ลบ และดูประวัติต้นทุนสินค้า</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <TextInput placeholder="🔎 ค้นหา" value={query} onChange={(event) => setQuery(event.target.value)} />
          <SelectInput value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>ทั้งหมด</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput>
          <SelectInput value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="ทั้งหมด">ทุกประเภท</option>{productTypeOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput>
        </div>
      </div>

      <div className="space-y-3 md:hidden">{filteredProducts.map(renderProductCard)}{filteredProducts.length === 0 ? <div className="rounded-3xl bg-white p-8 text-center text-neutral-500">ไม่พบสินค้า</div> : null}</div>

      <div className="hidden overflow-hidden rounded-2xl border border-neutral-200 bg-white md:block">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="sticky top-0 bg-neutral-100 text-neutral-600"><tr><th className="px-3 py-3">สินค้า</th><th className="px-3 py-3">หมวดหมู่</th><th className="px-3 py-3">ประเภท</th><th className="px-3 py-3">คงเหลือ</th><th className="px-3 py-3">ต้นทุน</th><th className="px-3 py-3">เฉลี่ย</th><th className="px-3 py-3">ซัพพลายเออร์ล่าสุด</th><th className="px-3 py-3 text-right">จัดการ</th></tr></thead>
            <tbody>
              {filteredProducts.map((product) => {
                const records = costHistory.filter((item) => item.productId === product.id);
                const costStats = getCostStats(records);
                const supplierInfo = getSupplierStats(records);
                const latestSupplier = supplierInfo.latestSupplier || product.supplier || '-';
                const lowStock = toSafeNumber(product.stock) <= toSafeNumber(product.minStock);
                return (
                  <tr key={product.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                    <td className="px-3 py-3"><div className="max-w-[190px] truncate font-black text-neutral-950" title={product.name}>{product.name}</div><div className="text-xs text-neutral-400">SKU: {product.sku || '-'}</div></td>
                    <td className="px-3 py-3 text-neutral-600"><div className="max-w-[135px] truncate" title={product.category}>{product.category}</div></td>
                    <td className="px-3 py-3 text-neutral-600"><div className="max-w-[140px] truncate rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-black text-neutral-700">{product.productType || '-'}</div></td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${lowStock ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>{product.stock} {product.unit}</span><div className="mt-1 text-[11px] text-neutral-400">≤ {product.minStock}</div></td>
                    <td className="px-3 py-3 font-black text-neutral-700">{formatMoney(costStats.latestCost || product.cost)}</td>
                    <td className="px-3 py-3 text-neutral-600">{formatMoney(costStats.averageCost || product.cost)}</td>
                    <td className="px-3 py-3 text-neutral-600"><div className="max-w-[130px] truncate font-black text-neutral-700">{latestSupplier}</div><div className="mt-1 text-[11px] text-neutral-400">เคยซื้อ {supplierInfo.supplierCount} เจ้า</div></td>
                    <td className="px-3 py-3 text-right"><div className="flex flex-nowrap justify-end gap-1.5"><button type="button" className="rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-2 text-xs font-black text-blue-700" onClick={() => openInfoEditor(product)}>✏️ แก้ไข</button><button type="button" className="rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-black text-amber-800" onClick={() => openStockEditor(product)}>📦 สต็อค</button><button type="button" className="rounded-xl border border-purple-200 bg-purple-50 px-2.5 py-2 text-xs font-black text-purple-700" onClick={() => setCostViewer(product)}>📈 ต้นทุน</button><button type="button" className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-2 text-xs font-black text-red-700" onClick={() => setDeleteTarget(product)}>🗑️ ลบ</button></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProducts.length === 0 ? <div className="p-10 text-center text-neutral-500">ไม่พบสินค้า</div> : null}
        </div>
      </div>

      {infoEditor ? <Modal title="แก้ไขข้อมูลสินค้า" subtitle="แก้ไขรายละเอียดสินค้าโดยไม่กระทบจำนวนคงเหลือ" onCancel={() => setInfoEditor(null)} onSave={saveInfoEditor} maxWidth="max-w-lg"><div className="grid gap-4 md:grid-cols-2"><Field label="ชื่อสินค้า" className="md:col-span-2"><TextInput value={infoForm.name || ''} onChange={(e) => setInfoForm((prev) => ({ ...prev, name: e.target.value }))} /></Field><Field label="SKU"><TextInput value={infoForm.sku || ''} onChange={(e) => setInfoForm((prev) => ({ ...prev, sku: e.target.value }))} /></Field><Field label="หมวดหมู่"><SelectInput value={infoForm.category} onChange={(e) => setInfoForm((prev) => ({ ...prev, category: e.target.value }))}>{categoryOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field><Field label="ประเภทสินค้า"><SelectInput value={infoForm.productType} onChange={(e) => setInfoForm((prev) => ({ ...prev, productType: e.target.value }))}>{productTypeOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field><Field label="หน่วย"><SelectInput value={infoForm.unit} onChange={(e) => setInfoForm((prev) => ({ ...prev, unit: e.target.value }))}>{unitOptions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field><Field label="ต้นทุนล่าสุด"><TextInput type="number" min="0" value={infoForm.cost || 0} onChange={(e) => setInfoForm((prev) => ({ ...prev, cost: e.target.value }))} /></Field><Field label="ซัพพลายเออร์" className="md:col-span-2"><TextInput value={infoForm.supplier || ''} onChange={(e) => setInfoForm((prev) => ({ ...prev, supplier: e.target.value }))} /></Field><Field label="หมายเหตุ" className="md:col-span-2"><TextArea value={infoForm.note || ''} onChange={(e) => setInfoForm((prev) => ({ ...prev, note: e.target.value }))} /></Field></div></Modal> : null}
      {stockEditor ? <Modal title="แก้ไขจำนวนคงเหลือ" subtitle={stockEditor.name} onCancel={() => setStockEditor(null)} onSave={saveStockEditor} maxWidth="max-w-md"><div className="grid gap-4"><Field label="จำนวนคงเหลือใหม่"><TextInput type="number" min="0" value={stockForm.stock} onChange={(e) => setStockForm((prev) => ({ ...prev, stock: e.target.value }))} /></Field><Field label="แจ้งเตือนขั้นต่ำ"><TextInput type="number" min="0" value={stockForm.minStock} onChange={(e) => setStockForm((prev) => ({ ...prev, minStock: e.target.value }))} /></Field></div></Modal> : null}
      {deleteTarget ? <Modal title="ยืนยันการลบสินค้า" subtitle={`คุณกำลังจะลบ ${deleteTarget.name}`} onCancel={() => setDeleteTarget(null)} onSave={confirmDeleteProduct} saveText="🗑️ ยืนยันลบสินค้า" maxWidth="max-w-md"><div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">การลบนี้จะนำสินค้าและประวัติต้นทุนของสินค้านี้ออกจากระบบ</div></Modal> : null}
      {costViewer ? <CostHistoryModal product={costViewer} costHistory={costHistory} onClose={() => setCostViewer(null)} /> : null}
    </Card>
  );
}

function CostHistoryModal({ product, costHistory, onClose }) {
  const records = costHistory.filter((item) => item.productId === product.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const stats = getCostStats(records);
  return (
    <Modal title="ประวัติต้นทุนสินค้า" subtitle={product.name} onCancel={onClose} hideSave maxWidth="max-w-3xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-neutral-950 p-4 text-white"><p className="text-xs text-neutral-300">ต้นทุนล่าสุด</p><p className="text-xl font-black">{formatMoney(stats.latestCost)}</p></div><div className="rounded-2xl bg-emerald-50 p-4 text-emerald-800"><p className="text-xs">ต้นทุนเฉลี่ย</p><p className="text-xl font-black">{formatMoney(stats.averageCost)}</p></div><div className="rounded-2xl bg-blue-50 p-4 text-blue-800"><p className="text-xs">ต่ำสุด / สูงสุด</p><p className="text-xl font-black">{formatMoney(stats.minCost)} / {formatMoney(stats.maxCost)}</p></div><div className="rounded-2xl bg-amber-50 p-4 text-amber-800"><p className="text-xs">รวมซื้อเข้า</p><p className="text-xl font-black">{formatNumber(stats.totalQty)} {product.unit}</p></div></div>
        <div className="overflow-auto rounded-2xl border border-neutral-200"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-neutral-100 text-neutral-600"><tr><th className="px-4 py-3">วันที่</th><th className="px-4 py-3">จำนวนเข้า</th><th className="px-4 py-3">ต้นทุน/หน่วย</th><th className="px-4 py-3">ซัพพลายเออร์</th><th className="px-4 py-3">เลขที่บิล</th><th className="px-4 py-3">หมายเหตุ</th></tr></thead><tbody>{records.map((record) => <tr key={record.id} className="border-t border-neutral-100"><td className="px-4 py-3">{new Date(record.createdAt).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</td><td className="px-4 py-3">{record.quantity} {product.unit}</td><td className="px-4 py-3 font-black text-neutral-950">{formatMoney(record.unitCost)}</td><td className="px-4 py-3">{record.supplier || '-'}</td><td className="px-4 py-3">{record.invoiceNo || '-'}</td><td className="px-4 py-3">{record.note || '-'}</td></tr>)}</tbody></table>{records.length === 0 ? <div className="p-8 text-center text-neutral-500">ยังไม่มีประวัติต้นทุน</div> : null}</div>
      </div>
    </Modal>
  );
}
