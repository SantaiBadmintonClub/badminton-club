import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase/config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

import AppLayout from "../layouts/AppLayout";

const COLORS = ["#16a34a", "#f97316", "#dc2626"]; // Paid, Partial, Unpaid

const Dashboard = () => {
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
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

  // KPI Calculations
  const kpis = useMemo(() => {
    const totalMembers = members.length;
    const activeMembers = members.filter((m) => m.active).length;

    let monthlyCollection = 0;
    let outstanding = 0;

    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });

    payments.forEach((p) => {
      const member = members.find((m) => m.id === p.memberId);
      if (!member) return;

      const base = Number(member.baseFee || 0);
      const discount = Number(member.discount || 0);
      const net = base * (1 - discount / 100);

      if (p.month === monthName) {
        monthlyCollection += Number(p.amountPaid || 0);
        outstanding += Math.max(0, net - Number(p.amountPaid || 0));
      }
    });

    return { totalMembers, activeMembers, monthlyCollection, outstanding };
  }, [members, payments]);

  // Monthly collection vs target (last 6 months)
  const monthlyChart = useMemo(() => {
    const now = new Date();
    const data = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("default", { month: "short" });

      let collected = 0;
      let target = 0;

      members.forEach((m) => {
        const base = Number(m.baseFee || 0);
        const discount = Number(m.discount || 0);
        const net = base * (1 - discount / 100);
        target += net;
      });

      payments.forEach((p) => {
        if (p.month === d.toLocaleString("default", { month: "long" })) {
          collected += Number(p.amountPaid || 0);
        }
      });

      data.push({ month: monthName, collected, target });
    }

    return data;
  }, [members, payments]);

  // Payment status breakdown for current month
  const statusBreakdown = useMemo(() => {
    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });

    let paid = 0;
    let partial = 0;
    let unpaid = 0;

    members.forEach((m) => {
      const base = Number(m.baseFee || 0);
      const discount = Number(m.discount || 0);
      const net = base * (1 - discount / 100);

      const p = payments.find((x) => x.memberId === m.id && x.month === monthName);

      if (!p) unpaid++;
      else if (p.amountPaid >= net) paid++;
      else if (p.amountPaid > 0) partial++;
      else unpaid++;
    });

    return [
      { name: "Paid", value: paid },
      { name: "Partial", value: partial },
      { name: "Unpaid", value: unpaid },
    ];
  }, [members, payments]);

  // Club balance trend (12 months)
  const balanceTrend = useMemo(() => {
    const now = new Date();
    const data = [];
    let runningBalance = 0;

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("default", { month: "short" });

      let collected = 0;
      payments.forEach((p) => {
        if (p.month === d.toLocaleString("default", { month: "long" })) {
          collected += Number(p.amountPaid || 0);
        }
      });

      runningBalance += collected;
      data.push({ month: monthName, balance: runningBalance });
    }

    return data;
  }, [payments]);

  // Per-member payment status for current month
  const perMemberStatus = useMemo(() => {
    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });

    return members.map((m) => {
      const base = Number(m.baseFee || 0);
      const discount = Number(m.discount || 0);
      const net = base * (1 - discount / 100);

      const p = payments.find((x) => x.memberId === m.id && x.month === monthName);

      let status = "Unpaid";
      if (p) {
        if (p.amountPaid >= net) status = "Paid";
        else if (p.amountPaid > 0) status = "Partial";
      }

      return { name: m.name, status };
    });
  }, [members, payments]);

  // Top unpaid members
  const topUnpaid = useMemo(() => {
    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });

    const list = members.map((m) => {
      const base = Number(m.baseFee || 0);
      const discount = Number(m.discount || 0);
      const net = base * (1 - discount / 100);

      const p = payments.find((x) => x.memberId === m.id && x.month === monthName);
      const balance = p ? net - Number(p.amountPaid || 0) : net;

      return { name: m.name, balance };
    });

    return list
      .filter((x) => x.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }, [members, payments]);

  // Recent payments
  const recentPayments = useMemo(() => payments.slice(0, 10), [payments]);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="text-gray-500">Loading dashboard...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: kpis.totalMembers },
          { label: "Active Members", value: kpis.activeMembers },
          {
            label: "Monthly Collection (RM)",
            value: kpis.monthlyCollection.toFixed(2),
          },
          {
            label: "Outstanding Balance (RM)",
            value: kpis.outstanding.toFixed(2),
          },
        ].map((k) => (
          <div key={k.label} className="bg-white p-4 rounded shadow">
            <div className="text-sm text-gray-600">{k.label}</div>
            <div className="text-2xl font-bold">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Monthly Collection vs Target */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Monthly Collection vs Target</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyChart}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="collected" fill="#3b82f6" />
              <Bar dataKey="target" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Status Breakdown */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Payment Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusBreakdown}
                dataKey="value"
                nameKey="name"
                outerRadius={90}
                label
              >
                {statusBreakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Club Balance Trend */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Club Balance Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={balanceTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="balance" stroke="#10b981" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Per-Member Payment Status */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Per-Member Payment Status</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={perMemberStatus}>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip />
              <Bar
                dataKey="status"
                fill="#3b82f6"
                shape={(props) => {
                  const color =
                    props.payload.status === "Paid"
                      ? "#16a34a"
                      : props.payload.status === "Partial"
                      ? "#f97316"
                      : "#dc2626";
                  return (
                    <rect
                      x={props.x}
                      y={props.y}
                      width={props.width}
                      height={props.height}
                      fill={color}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Top Unpaid Members */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Top Unpaid Members</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-right">Amount Owed (RM)</th>
              </tr>
            </thead>
            <tbody>
              {topUnpaid.map((m) => (
                <tr key={m.name} className="border-b">
                  <td className="py-2">{m.name}</td>
                  <td className="py-2 text-right">{m.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Payments */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3">Recent Payment Activity</h3>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-left">Member</th>
                <th className="py-2 text-left">Month</th>
                <th className="py-2 text-right">Paid (RM)</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => {
                const member = members.find((m) => m.id === p.memberId);
                return (
                  <tr key={p.id} className="border-b">
                    <td className="py-2">{member?.name || "Unknown"}</td>
                    <td className="py-2">{p.month}</td>
                    <td className="py-2 text-right">
                      {p.amountPaid.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
