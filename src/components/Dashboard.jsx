import React from 'react';
import { Card } from './ui.jsx';
import { formatMoney, formatNumber, getCostStats, getEstimatedUnitCost, getReorderSuggestions, isCurrentMonth } from '../lib/inventory.js';

function StatCard({ icon, title, value, subtitle }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-neutral-950 text-xl text-white shadow-sm">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm text-neutral-500">{title}</p>
          <p className="truncate text-2xl font-black tracking-tight text-neutral-950">{value}</p>
          <p className="text-xs text-neutral-400">{subtitle}</p>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard({ products, transactions, costHistory }) {
  const stats = React.useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const lowStock = products.filter((item) => Number(item.stock || 0) <= Number(item.minStock || 0)).length;
    const inventoryValue = products.reduce((sum, item) => sum + Number(item.stock || 0) * getEstimatedUnitCost(item, costHistory), 0);
    return { totalProducts, totalStock, lowStock, inventoryValue };
  }, [products, costHistory]);

  const reorderSuggestions = React.useMemo(() => getReorderSuggestions(products, costHistory), [products, costHistory]);
  const outboundThisMonth = transactions.filter((item) => item.type === 'out' && isCurrentMonth(item.createdAt));
  const outboundCostThisMonth = outboundThisMonth.reduce((sum, item) => {
    const product = products.find((p) => p.id === item.productId);
    return sum + Number(item.quantity || 0) * (product ? getEstimatedUnitCost(product, costHistory) : 0);
  }, 0);

  const productsWithCostStats = products.map((product) => {
    const stats = getCostStats(costHistory.filter((record) => record.productId === product.id));
    const averageCost = stats.averageCost || product.cost || 0;
    const latestCost = stats.latestCost || product.cost || 0;
    return { ...product, averageCost, latestCost, costDiff: latestCost - averageCost };
  });
  const highestLatestCostProducts = [...productsWithCostStats].sort((a, b) => b.latestCost - a.latestCost).slice(0, 5);
  const highCostProducts = [...productsWithCostStats].sort((a, b) => b.averageCost - a.averageCost).slice(0, 5);
  const mostExpensiveLatestProduct = highestLatestCostProducts[0];
  const recentTransactions = transactions.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="📦" title="จำนวนรายการสินค้า" value={stats.totalProducts} subtitle="สินค้าทั้งหมดในระบบ" />
        <StatCard icon="📊" title="จำนวนสต็อครวม" value={stats.totalStock} subtitle="รวมทุกหมวดหมู่" />
        <StatCard icon="⚠️" title="สินค้าใกล้หมด" value={stats.lowStock} subtitle="ควรตรวจสอบและสั่งเพิ่ม" />
        <StatCard icon="💸" title="มูลค่าสินค้าที่ใช้ไปเดือนนี้" value={formatMoney(outboundCostThisMonth)} subtitle="ประมาณการจากรายการเบิกออก" />
      </section>

      {reorderSuggestions.length > 0 ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-black text-red-700">🛒 ของที่ควรซื้อเพิ่มวันนี้</h2>
              <p className="text-sm text-red-600">คำนวณจากจำนวนคงเหลือเทียบกับค่าแจ้งเตือนขั้นต่ำ และประเมินงบจากต้นทุนเฉลี่ย</p>
            </div>
            <div className="w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-red-700 shadow-sm">
              รวมประมาณ {formatMoney(reorderSuggestions.reduce((sum, item) => sum + item.estimatedCost, 0))}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reorderSuggestions.map((product) => (
              <div key={product.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-black text-neutral-950">{product.name}</p>
                    <p className="mt-1 text-xs text-neutral-400">ซัพพลายเออร์ล่าสุด: {product.latestSupplier}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">เหลือ {product.stock}</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-400">แนะนำซื้อ</p><p className="font-black text-neutral-950">{product.suggestQty} {product.unit}</p></div>
                  <div className="rounded-xl bg-amber-50 p-3 text-amber-800"><p className="text-xs">งบประมาณ</p><p className="font-black">{formatMoney(product.estimatedCost)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
          <h2 className="text-xl font-black">✅ วันนี้ยังไม่มีสินค้าใกล้หมด</h2>
          <p className="mt-1 text-sm">สต็อคทุกตัวสูงกว่าระดับแจ้งเตือนขั้นต่ำ</p>
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 md:p-6 xl:col-span-1">
          <h2 className="text-xl font-black text-neutral-950">สินค้าต้นทุนล่าสุดแพงสุด</h2>
          {mostExpensiveLatestProduct ? (
            <div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white">
              <p className="text-sm text-neutral-300">อันดับ 1</p>
              <h3 className="mt-2 text-2xl font-black">{mostExpensiveLatestProduct.name}</h3>
              <p className="mt-3 text-3xl font-black">{formatMoney(mostExpensiveLatestProduct.latestCost)}</p>
            </div>
          ) : null}
        </Card>
        <Card className="p-5 md:p-6 xl:col-span-2">
          <h2 className="text-xl font-black text-neutral-950">Top 5 ต้นทุนล่าสุดต่อหน่วย</h2>
          <div className="mt-5 space-y-3">
            {highestLatestCostProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4">
                <div><p className="font-black text-neutral-950">{product.name}</p><p className="text-xs text-neutral-400">คงเหลือ {product.stock} {product.unit}</p></div>
                <p className="font-black text-neutral-950">{formatMoney(product.latestCost)}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5 md:p-6">
          <h2 className="text-xl font-black text-neutral-950">สินค้าต้นทุนเฉลี่ยสูงสุด</h2>
          <div className="mt-5 space-y-3">
            {highCostProducts.map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4">
                <div><p className="font-black text-neutral-950">{product.name}</p><p className="text-xs text-neutral-400">คงเหลือ {product.stock} {product.unit}</p></div>
                <p className="font-black text-neutral-950">{formatMoney(product.averageCost)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 md:p-6">
          <h2 className="text-xl font-black text-neutral-950">รายการเคลื่อนไหวล่าสุด</h2>
          <div className="mt-5 space-y-3">
            {recentTransactions.length > 0 ? recentTransactions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-neutral-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-black text-neutral-950">{item.productName}</p>{Number(item.quantity) > 0 ? <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{item.type === 'out' ? '-' : '+'}{item.quantity}</span> : null}</div>
                <p className="mt-1 text-sm text-neutral-500">{item.reason}</p>
              </div>
            )) : <div className="rounded-2xl bg-white p-8 text-center text-neutral-500">ยังไม่มีประวัติรายการ</div>}
          </div>
        </Card>
      </section>
    </div>
  );
}
