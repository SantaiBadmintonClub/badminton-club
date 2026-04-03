import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import { CSVLink } from "react-csv";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const Reports = () => {
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);

  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toLocaleString("default", { month: "long" })
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [loading, setLoading] = useState(true);

  // Fetch members
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "members"), (snap) => {
      setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Fetch payments
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "payments"), orderBy("createdAt", "desc")),
      (snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Monthly Report
  const monthlyReport = useMemo(() => {
    return members.map((m) => {
      const base = Number(m.baseFee || 0);
      const discount = Number(m.discount || 0);
      const net = base * (1 - discount / 100);

      const p = payments.find(
        (x) =>
          x.memberId === m.id &&
          x.month === selectedMonth &&
          Number(x.year) === Number(selectedYear)
      );

      const paid = p ? Number(p.amountPaid || 0) : 0;
      const balance = net - paid;

      return {
        name: m.name,
        base,
        discount,
        net,
        paid,
        balance,
        status:
          paid >= net ? "Paid" : paid > 0 ? "Partial" : "Unpaid",
      };
    });
  }, [members, payments, selectedMonth, selectedYear]);

  // Annual Summary Grid
  const annualGrid = useMemo(() => {
    return members.map((m) => {
      const row = { name: m.name, months: {} };

      MONTHS.forEach((month) => {
        const p = payments.find(
          (x) =>
            x.memberId === m.id &&
            x.month === month &&
            Number(x.year) === Number(selectedYear)
        );

        const base = Number(m.baseFee || 0);
        const discount = Number(m.discount || 0);
        const net = base * (1 - discount / 100);

        let status = "N/A";
        if (p) {
          if (p.amountPaid >= net) status = "Paid";
          else if (p.amountPaid > 0) status = "Partial";
          else status = "Unpaid";
        }

        row.months[month] = status;
      });

      return row;
    });
  }, [members, payments, selectedYear]);

  // Collection Efficiency
  const collectionEfficiency = useMemo(() => {
    const data = MONTHS.map((month) => {
      let due = 0;
      let collected = 0;

      members.forEach((m) => {
        const base = Number(m.baseFee || 0);
        const discount = Number(m.discount || 0);
        const net = base * (1 - discount / 100);
        due += net;

        const p = payments.find(
          (x) =>
            x.memberId === m.id &&
            x.month === month &&
            Number(x.year) === Number(selectedYear)
        );

        if (p) collected += Number(p.amountPaid || 0);
      });

      const efficiency = due > 0 ? (collected / due) * 100 : 0;

      return {
        month,
        due,
        collected,
        efficiency: efficiency.toFixed(1),
      };
    });

    return data;
  }, [members, payments, selectedYear]);

  // Discount Report
  const discountReport = useMemo(() => {
    return members
      .filter((m) => Number(m.discount) > 0)
      .map((m) => {
        const base = Number(m.baseFee || 0);
        const discount = Number(m.discount || 0);
        const waived = base * (discount / 100);

        return {
          name: m.name,
          discount,
          waived: waived.toFixed(2),
        };
      });
  }, [members]);

  // CSV Export
  const csvMonthly = monthlyReport.map((r) => ({
    name: r.name,
    fee: r.base,
    discount: `${r.discount}%`,
    netFee: r.net,
    paid: r.paid,
    balance: r.balance,
    status: r.status,
  }));

  if (loading) {
    return <div className="p-6 text-gray-500">Loading reports...</div>;
  }

  return (
    <AppLayout title="Reports">
        <div className="p-6 space-y-8">
          <h1 className="text-2xl font-semibold">Reports</h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            {MONTHS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>

          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-3 py-2 border rounded w-28"
          />

          <CSVLink
            data={csvMonthly}
            filename={`monthly_report_${selectedMonth}_${selectedYear}.csv`}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Export Monthly CSV
          </CSVLink>
        </div>

        {/* Monthly Report */}
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">
            Monthly Report — {selectedMonth} {selectedYear}
          </h2>

          <table className="min-w-full text-sm divide-y">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Member",
                  "Fee (RM)",
                  "Discount %",
                  "Net Fee",
                  "Paid",
                  "Balance",
                  "Status",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y">
              {monthlyReport.map((r) => (
                <tr key={r.name}>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className="px-4 py-2">{r.base.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.discount}%</td>
                  <td className="px-4 py-2">{r.net.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.paid.toFixed(2)}</td>
                  <td className="px-4 py-2">{r.balance.toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        r.status === "Paid"
                          ? "bg-green-100 text-green-800"
                          : r.status === "Partial"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Annual Summary Grid */}
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">
            Annual Summary — {selectedYear}
          </h2>

          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left">Member</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2 text-center text-xs">
                    {m.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {annualGrid.map((row) => (
                <tr key={row.name} className="border-t">
                  <td className="px-4 py-2">{row.name}</td>
                  {MONTHS.map((m) => {
                    const status = row.months[m];
                    const color =
                      status === "Paid"
                        ? "bg-green-200"
                        : status === "Partial"
                        ? "bg-orange-200"
                        : status === "Unpaid"
                        ? "bg-red-200"
                        : "bg-gray-200";
                    return (
                      <td
                        key={m}
                        className={`px-2 py-2 text-center ${color}`}
                      ></td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Collection Efficiency */}
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">
            Collection Efficiency — {selectedYear}
          </h2>

          <table className="min-w-full text-sm divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Month</th>
                <th className="px-4 py-2 text-right">Due (RM)</th>
                <th className="px-4 py-2 text-right">Collected (RM)</th>
                <th className="px-4 py-2 text-right">Efficiency %</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {collectionEfficiency.map((c) => (
                <tr key={c.month}>
                  <td className="px-4 py-2">{c.month}</td>
                  <td className="px-4 py-2 text-right">{c.due.toFixed(2)}</td>
                  <td className="px-4 py-2 text-right">
                    {c.collected.toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right">{c.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Discount Report */}
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Discount Report</h2>

          <table className="min-w-full text-sm divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Member</th>
                <th className="px-4 py-2 text-right">Discount %</th>
                <th className="px-4 py-2 text-right">Fee Waived (RM)</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {discountReport.map((d) => (
                <tr key={d.name}>
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2 text-right">{d.discount}%</td>
                  <td className="px-4 py-2 text-right">{d.waived}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Reports;
