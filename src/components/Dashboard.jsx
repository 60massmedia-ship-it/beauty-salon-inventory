import React from 'react';
import { Card, SelectInput } from './ui.jsx';
import { formatMoney, formatNumber, getCostStats, getEstimatedUnitCost, getReorderSuggestions } from '../lib/inventory.js';

const thaiMonths = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const chartColors = ['#ec4899', '#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#94a3b8'];

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

function getMonthKey(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function makeMonthKey(year, monthIndex) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey) {
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return '-';
  return `${thaiMonths[month - 1]} ${year + 543}`;
}

function getAvailableYearOptions(transactions) {
  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear]);
  transactions.forEach((item) => {
    if (item.type === 'out') {
      const date = new Date(item.createdAt);
      if (!Number.isNaN(date.getTime())) years.add(date.getFullYear());
    }
  });
  return Array.from(years).sort((a, b) => b - a);
}

function getMonthOptionsForYear(year) {
  return thaiMonths.map((monthName, index) => ({
    monthIndex: index,
    monthName,
    monthKey: makeMonthKey(year, index),
  }));
}

function buildMonthlyUsageReport({ transactions, products, costHistory, selectedMonth }) {
  const outbound = transactions.filter((item) => item.type === 'out' && getMonthKey(item.createdAt) === selectedMonth);

  const productRows = Object.values(outbound.reduce((acc, item) => {
    const product = products.find((p) => p.id === item.productId);
    const key = item.productId || item.productName;
    const unitCost = product ? getEstimatedUnitCost(product, costHistory) : 0;
    const quantity = Number(item.quantity || 0);
    if (!acc[key]) {
      acc[key] = {
        productId: key,
        productName: item.productName || product?.name || 'ไม่ระบุสินค้า',
        category: product?.category || 'ไม่ระบุหมวดหมู่',
        quantity: 0,
        unit: product?.unit || '',
        estimatedCost: 0,
        entries: 0,
      };
    }
    acc[key].quantity += quantity;
    acc[key].estimatedCost += quantity * unitCost;
    acc[key].entries += 1;
    return acc;
  }, {})).sort((a, b) => b.estimatedCost - a.estimatedCost);

  const categoryRows = Object.values(productRows.reduce((acc, item) => {
    const key = item.category || 'ไม่ระบุหมวดหมู่';
    if (!acc[key]) {
      acc[key] = { category: key, quantity: 0, estimatedCost: 0, productCount: 0 };
    }
    acc[key].quantity += item.quantity;
    acc[key].estimatedCost += item.estimatedCost;
    acc[key].productCount += 1;
    return acc;
  }, {})).sort((a, b) => b.estimatedCost - a.estimatedCost);

  const dailyRows = Object.values(outbound.reduce((acc, item) => {
    const date = new Date(item.createdAt);
    const key = date.toISOString().slice(0, 10);
    const product = products.find((p) => p.id === item.productId);
    const unitCost = product ? getEstimatedUnitCost(product, costHistory) : 0;
    const quantity = Number(item.quantity || 0);
    if (!acc[key]) {
      acc[key] = { dateKey: key, entries: 0, quantity: 0, estimatedCost: 0 };
    }
    acc[key].entries += 1;
    acc[key].quantity += quantity;
    acc[key].estimatedCost += quantity * unitCost;
    return acc;
  }, {})).sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const totalQuantity = productRows.reduce((sum, item) => sum + item.quantity, 0);
  const totalCost = productRows.reduce((sum, item) => sum + item.estimatedCost, 0);
  const topProduct = productRows[0] || null;
  const topCategory = categoryRows[0] || null;

  return {
    outbound,
    productRows,
    categoryRows,
    dailyRows,
    totalEntries: outbound.length,
    totalQuantity,
    totalCost,
    topProduct,
    topCategory,
  };
}

function buildCategoryChartData(categoryRows) {
  const sorted = [...categoryRows].sort((a, b) => Number(b.estimatedCost || 0) - Number(a.estimatedCost || 0));
  const top = sorted.slice(0, 5).map((item, index) => ({
    ...item,
    color: chartColors[index % chartColors.length],
  }));

  const others = sorted.slice(5).reduce(
    (acc, item) => {
      acc.quantity += Number(item.quantity || 0);
      acc.estimatedCost += Number(item.estimatedCost || 0);
      acc.productCount += Number(item.productCount || 0);
      return acc;
    },
    { category: 'อื่น ๆ', quantity: 0, estimatedCost: 0, productCount: 0 }
  );

  if (others.estimatedCost > 0) {
    top.push({
      ...others,
      color: chartColors[5],
    });
  }

  const total = top.reduce((sum, item) => sum + Number(item.estimatedCost || 0), 0);
  return top.map((item) => ({
    ...item,
    percent: total > 0 ? (Number(item.estimatedCost || 0) / total) * 100 : 0,
  }));
}

function DonutChart({ data, total }) {
  const size = 220;
  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (!data.length || total <= 0) {
    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        </svg>
        <div className="absolute text-center">
          <p className="text-sm font-black text-neutral-500">ยังไม่มีข้อมูล</p>
          <p className="mt-1 text-xs text-neutral-400">ไม่มีการเบิกในเดือนนี้</p>
        </div>
      </div>
    );
  }

  let accumulated = 0;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
        {data.map((item, index) => {
          const fraction = item.percent / 100;
          const dash = fraction * circumference;
          const gap = circumference - dash;
          const dashOffset = -accumulated * circumference;
          accumulated += fraction;
          return (
            <circle
              key={`${item.category}-${index}`}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="absolute text-center">
        <p className="text-xs font-black text-neutral-500">มูลค่ารวม</p>
        <p className="mt-1 text-xl font-black text-neutral-950">{formatMoney(total)}</p>
        <p className="mt-1 text-xs text-neutral-400">{data.length} หมวดหมู่</p>
      </div>
    </div>
  );
}

export default function Dashboard({ products, transactions, costHistory }) {
  const currentDate = React.useMemo(() => new Date(), []);
  const yearOptions = React.useMemo(() => getAvailableYearOptions(transactions), [transactions]);
  const [selectedYear, setSelectedYear] = React.useState(currentDate.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = React.useState(currentDate.getMonth());

  React.useEffect(() => {
    if (!yearOptions.includes(Number(selectedYear))) {
      setSelectedYear(yearOptions[0]);
    }
  }, [yearOptions, selectedYear]);

  const monthOptions = React.useMemo(() => getMonthOptionsForYear(Number(selectedYear)), [selectedYear]);
  const selectedMonth = makeMonthKey(Number(selectedYear), Number(selectedMonthIndex));

  const stats = React.useMemo(() => {
    const totalProducts = products.length;
    const totalStock = products.reduce((sum, item) => sum + Number(item.stock || 0), 0);
    const lowStock = products.filter((item) => Number(item.stock || 0) <= Number(item.minStock || 0)).length;
    const inventoryValue = products.reduce((sum, item) => sum + Number(item.stock || 0) * getEstimatedUnitCost(item, costHistory), 0);
    return { totalProducts, totalStock, lowStock, inventoryValue };
  }, [products, costHistory]);

  const monthlyReport = React.useMemo(() => buildMonthlyUsageReport({ transactions, products, costHistory, selectedMonth }), [transactions, products, costHistory, selectedMonth]);
  const monthlyCategoryChartData = React.useMemo(() => buildCategoryChartData(monthlyReport.categoryRows), [monthlyReport.categoryRows]);
  const reorderSuggestions = React.useMemo(() => getReorderSuggestions(products, costHistory), [products, costHistory]);

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

  const categorySummary = Object.values(products.reduce((acc, product) => {
    const key = product.category || 'อื่น ๆ';
    const unitCost = getEstimatedUnitCost(product, costHistory);
    if (!acc[key]) {
      acc[key] = { category: key, productCount: 0, totalStock: 0, estimatedValue: 0, lowStockCount: 0 };
    }
    acc[key].productCount += 1;
    acc[key].totalStock += Number(product.stock || 0);
    acc[key].estimatedValue += Number(product.stock || 0) * unitCost;
    if (Number(product.stock || 0) <= Number(product.minStock || 0)) acc[key].lowStockCount += 1;
    return acc;
  }, {})).sort((a, b) => b.estimatedValue - a.estimatedValue);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon="📦" title="จำนวนรายการสินค้า" value={stats.totalProducts} subtitle="สินค้าทั้งหมดในระบบ" />
        <StatCard icon="📊" title="จำนวนสต็อครวม" value={formatNumber(stats.totalStock)} subtitle="รวมทุกหมวดหมู่" />
        <StatCard icon="⚠️" title="สินค้าใกล้หมด" value={stats.lowStock} subtitle="ควรตรวจสอบและสั่งเพิ่ม" />
        <StatCard icon="💸" title="มูลค่าสินค้าที่ใช้ไปเดือนที่เลือก" value={formatMoney(monthlyReport.totalCost)} subtitle={getMonthLabel(selectedMonth)} />
      </section>

      <Card className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-neutral-950">📅 สรุปการเบิกสินค้ารายเดือน</h2>
            <p className="mt-1 text-sm text-neutral-500">เลือกเดือนและปีได้ครบ 12 เดือน แม้เดือนนั้นยังไม่มีรายการเบิก ระบบจะแสดงว่าไม่มีข้อมูล</p>
          </div>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <div>
              <p className="mb-1 text-sm font-black text-neutral-700">เดือน</p>
              <SelectInput value={selectedMonthIndex} onChange={(event) => setSelectedMonthIndex(Number(event.target.value))}>
                {monthOptions.map((item) => <option key={item.monthKey} value={item.monthIndex}>{item.monthName}</option>)}
              </SelectInput>
            </div>
            <div>
              <p className="mb-1 text-sm font-black text-neutral-700">ปี</p>
              <SelectInput value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {yearOptions.map((year) => <option key={year} value={year}>{year + 543}</option>)}
              </SelectInput>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-pink-50 p-4 text-pink-800"><p className="text-xs font-black">จำนวนรายการเบิก</p><p className="mt-1 text-2xl font-black">{formatNumber(monthlyReport.totalEntries)}</p></div>
          <div className="rounded-2xl bg-purple-50 p-4 text-purple-800"><p className="text-xs font-black">จำนวนรวมที่ถูกเบิก</p><p className="mt-1 text-2xl font-black">{formatNumber(monthlyReport.totalQuantity)}</p></div>
          <div className="rounded-2xl bg-amber-50 p-4 text-amber-800"><p className="text-xs font-black">มูลค่าใช้ไปโดยประมาณ</p><p className="mt-1 text-2xl font-black">{formatMoney(monthlyReport.totalCost)}</p></div>
          <div className="rounded-2xl bg-blue-50 p-4 text-blue-800"><p className="text-xs font-black">เบิกมากที่สุด</p><p className="mt-1 truncate text-lg font-black">{monthlyReport.topProduct?.productName || '-'}</p><p className="text-xs">{monthlyReport.topProduct ? `${formatNumber(monthlyReport.topProduct.quantity)} ${monthlyReport.topProduct.unit}` : 'ยังไม่มีข้อมูล'}</p></div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div>
            <h3 className="text-base font-black text-neutral-950">รายการสินค้าที่ถูกเบิกในเดือนนี้</h3>
            <div className="mt-3 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <div className="max-h-[420px] overflow-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="sticky top-0 bg-neutral-100 text-neutral-600">
                    <tr><th className="px-4 py-3">สินค้า</th><th className="px-4 py-3">หมวดหมู่</th><th className="px-4 py-3">จำนวนเบิก</th><th className="px-4 py-3">จำนวนครั้ง</th><th className="px-4 py-3 text-right">มูลค่าโดยประมาณ</th></tr>
                  </thead>
                  <tbody>
                    {monthlyReport.productRows.map((item) => (
                      <tr key={item.productId} className="border-t border-neutral-100">
                        <td className="px-4 py-3 font-black text-neutral-950">{item.productName}</td>
                        <td className="px-4 py-3 text-neutral-600">{item.category}</td>
                        <td className="px-4 py-3 font-black text-neutral-700">{formatNumber(item.quantity)} {item.unit}</td>
                        <td className="px-4 py-3 text-neutral-600">{formatNumber(item.entries)} ครั้ง</td>
                        <td className="px-4 py-3 text-right font-black text-neutral-950">{formatMoney(item.estimatedCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {monthlyReport.productRows.length === 0 ? <div className="p-8 text-center text-neutral-500">เดือนนี้ยังไม่มีรายการเบิกออก</div> : null}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-black text-neutral-950">สรุปตามหมวดหมู่ของเดือนที่เลือก</h3>
              <div className="mt-3 rounded-3xl border border-neutral-200 bg-white p-4 md:p-5">
                <div className="grid gap-6 lg:items-center">
                  <div className="flex justify-center">
                    <DonutChart data={monthlyCategoryChartData} total={monthlyReport.totalCost} />
                  </div>
                  <div className="space-y-3">
                    {monthlyCategoryChartData.length > 0 ? monthlyCategoryChartData.map((item, index) => (
                      <div key={`${item.category}-${index}`} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                              <p className="truncate font-black text-neutral-950">{item.category}</p>
                            </div>
                            <p className="mt-1 text-xs text-neutral-400">{formatNumber(item.productCount)} รายการ / {formatNumber(item.quantity)} ชิ้น</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-black text-neutral-950">{formatMoney(item.estimatedCost)}</p>
                            <p className="text-xs font-black text-neutral-500">{item.percent.toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    )) : <div className="rounded-2xl bg-neutral-50 p-6 text-center text-neutral-500">ยังไม่มีข้อมูลหมวดหมู่</div>}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-base font-black text-neutral-950">สรุปรายวันในเดือนที่เลือก</h3>
              <div className="mt-3 space-y-3">
                {monthlyReport.dailyRows.slice(0, 8).map((item) => (
                  <div key={item.dateKey} className="rounded-2xl border border-neutral-100 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="font-black text-neutral-950">{new Date(item.dateKey).toLocaleDateString('th-TH', { dateStyle: 'medium' })}</p><p className="text-xs text-neutral-400">{formatNumber(item.entries)} รายการ / {formatNumber(item.quantity)} ชิ้น</p></div>
                      <p className="font-black text-neutral-950">{formatMoney(item.estimatedCost)}</p>
                    </div>
                  </div>
                ))}
                {monthlyReport.dailyRows.length === 0 ? <div className="rounded-2xl bg-white p-6 text-center text-neutral-500">ยังไม่มีข้อมูลรายวัน</div> : null}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {reorderSuggestions.length > 0 ? (
        <section className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div><h2 className="text-xl font-black text-red-700">🛒 ของที่ควรซื้อเพิ่มวันนี้</h2><p className="text-sm text-red-600">คำนวณจากจำนวนคงเหลือเทียบกับค่าแจ้งเตือนขั้นต่ำ และประเมินงบจากต้นทุนเฉลี่ย</p></div>
            <div className="w-fit rounded-full bg-white px-4 py-2 text-sm font-black text-red-700 shadow-sm">รวมประมาณ {formatMoney(reorderSuggestions.reduce((sum, item) => sum + item.estimatedCost, 0))}</div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {reorderSuggestions.map((product) => (
              <div key={product.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-black text-neutral-950">{product.name}</p><p className="mt-1 text-xs text-neutral-400">ซัพพลายเออร์ล่าสุด: {product.latestSupplier}</p></div><span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">เหลือ {product.stock}</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-neutral-50 p-3"><p className="text-xs text-neutral-400">แนะนำซื้อ</p><p className="font-black text-neutral-950">{product.suggestQty} {product.unit}</p></div><div className="rounded-xl bg-amber-50 p-3 text-amber-800"><p className="text-xs">งบประมาณ</p><p className="font-black">{formatMoney(product.estimatedCost)}</p></div></div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800"><h2 className="text-xl font-black">✅ วันนี้ยังไม่มีสินค้าใกล้หมด</h2><p className="mt-1 text-sm">สต็อคทุกตัวสูงกว่าระดับแจ้งเตือนขั้นต่ำ</p></section>
      )}

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5 md:p-6">
          <h2 className="text-xl font-black text-neutral-950">สรุปตามหมวดหมู่ของสต็อคปัจจุบัน</h2>
          <p className="mt-1 text-sm text-neutral-500">ดูจำนวนสินค้า มูลค่าสต็อค และรายการใกล้หมดแยกตามหมวด</p>
          <div className="mt-5 space-y-3">
            {categorySummary.map((item) => (
              <div key={item.category} className="rounded-2xl border border-neutral-100 bg-white p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="font-black text-neutral-950">{item.category}</p><p className="text-xs text-neutral-400">{item.productCount} รายการ / รวม {formatNumber(item.totalStock)} ชิ้น</p></div><div className="text-right"><p className="font-black text-neutral-950">{formatMoney(item.estimatedValue)}</p><p className={item.lowStockCount > 0 ? 'text-xs font-black text-red-600' : 'text-xs text-neutral-400'}>ใกล้หมด {item.lowStockCount} รายการ</p></div></div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="text-xl font-black text-neutral-950">รายการเคลื่อนไหวล่าสุด</h2>
          <div className="mt-5 space-y-3">
            {recentTransactions.length > 0 ? recentTransactions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-neutral-100 bg-white p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-neutral-950">{item.productName}</p>{Number(item.quantity) > 0 ? <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black">{item.type === 'out' ? '-' : '+'}{item.quantity}</span> : null}</div><p className="mt-1 text-sm text-neutral-500">{item.reason}</p></div>
            )) : <div className="rounded-2xl bg-white p-8 text-center text-neutral-500">ยังไม่มีประวัติรายการ</div>}
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 md:p-6 xl:col-span-1"><h2 className="text-xl font-black text-neutral-950">สินค้าต้นทุนล่าสุดแพงสุด</h2>{mostExpensiveLatestProduct ? <div className="mt-5 rounded-3xl bg-neutral-950 p-5 text-white"><p className="text-sm text-neutral-300">อันดับ 1</p><h3 className="mt-2 text-2xl font-black">{mostExpensiveLatestProduct.name}</h3><p className="mt-3 text-3xl font-black">{formatMoney(mostExpensiveLatestProduct.latestCost)}</p></div> : null}</Card>
        <Card className="p-5 md:p-6 xl:col-span-2"><h2 className="text-xl font-black text-neutral-950">Top 5 ต้นทุนล่าสุดต่อหน่วย</h2><div className="mt-5 space-y-3">{highestLatestCostProducts.map((product) => <div key={product.id} className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4"><div><p className="font-black text-neutral-950">{product.name}</p><p className="text-xs text-neutral-400">คงเหลือ {product.stock} {product.unit}</p></div><p className="font-black text-neutral-950">{formatMoney(product.latestCost)}</p></div>)}</div></Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-1">
        <Card className="p-5 md:p-6"><h2 className="text-xl font-black text-neutral-950">สินค้าต้นทุนเฉลี่ยสูงสุด</h2><div className="mt-5 space-y-3">{highCostProducts.map((product) => <div key={product.id} className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-white p-4"><div><p className="font-black text-neutral-950">{product.name}</p><p className="text-xs text-neutral-400">คงเหลือ {product.stock} {product.unit}</p></div><p className="font-black text-neutral-950">{formatMoney(product.averageCost)}</p></div>)}</div></Card>
      </section>
    </div>
  );
}
