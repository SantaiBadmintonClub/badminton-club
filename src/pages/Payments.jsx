import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { CSVLink } from "react-csv";
import AppLayout from "../layouts/AppLayout";

const STATUS_COLORS = {
  Paid: "bg-green-100 text-green-800",
  Partial: "bg-orange-100 text-orange-800",
  Unpaid: "bg-red-100 text-red-800",
};

const PAYMENT_METHODS = ["DuitNow", "Bank Transfer", "Cash"];

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterMonth, setFilterMonth] = useState("");
  const [filterMember, setFilterMember] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    memberId: "",
    month: "",
    year: new Date().getFullYear(),
    amountPaid: 0,
    method: "DuitNow",
    reference: "",
    notes: "",
  });

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
      collection(db, "payments"),
      (snap) => {
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  // Derived: payments with computed fields
  const enriched = useMemo(() => {
    return payments.map((p) => {
      const member = members.find((m) => m.id === p.memberId);
      const baseFee = Number(member?.baseFee || 0);
      const discount = Number(member?.discount || 0);
      const netFee = baseFee * (1 - discount / 100);

      const balance = netFee - Number(p.amountPaid || 0);

      let status = "Unpaid";
      if (p.amountPaid >= netFee) status = "Paid";
      else if (p.amountPaid > 0) status = "Partial";

      return {
        ...p,
        memberName: member?.name || "Unknown",
        netFee,
        balance,
        status,
        discount,
      };
    });
  }, [payments, members]);

  // Apply filters
  const filtered = useMemo(() => {
    return enriched.filter((p) => {
      if (filterMonth && p.month !== filterMonth) return false;
      if (filterMember && p.memberId !== filterMember) return false;
      if (filterStatus && p.status !== filterStatus) return false;
      return true;
    });
  }, [enriched, filterMonth, filterMember, filterStatus]);

  // Summary
  const summary = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    let paid = 0;
    let unpaid = 0;

    filtered.forEach((p) => {
      collected += Number(p.amountPaid || 0);
      outstanding += p.balance;
      if (p.status === "Paid") paid++;
      else unpaid++;
    });

    return { collected, outstanding, paid, unpaid };
  }, [filtered]);

  // Save payment
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addDoc(collection(db, "payments"), {
        ...form,
        amountPaid: Number(form.amountPaid),
        createdAt: new Date(),
      });
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save payment:", err);
    } finally {
      setSaving(false);
    }
  };

  // Send reminder
  const sendReminder = async (payment) => {
    try {
      await updateDoc(doc(db, "payments", payment.id), {
        reminderSent: true,
      });
    } catch (err) {
      console.error("Failed to send reminder:", err);
    }
  };

  // CSV export
  const csvData = filtered.map((p) => ({
    date: p.date || "",
    member: p.memberName,
    month: p.month,
    amountDue: p.netFee.toFixed(2),
    amountPaid: p.amountPaid.toFixed(2),
    discount: `${p.discount}%`,
    balance: p.balance.toFixed(2),
    status: p.status,
    notes: p.notes || "",
  }));

  return (
    <AppLayout title="Payments">
        <div className="p-6">
        <h2 className="text-2xl font-semibold mb-4">Payments</h2>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-600 text-sm">Total Collected</div>
            <div className="text-xl font-bold">RM {summary.collected.toFixed(2)}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-600 text-sm">Outstanding</div>
            <div className="text-xl font-bold text-red-600">
                RM {summary.outstanding.toFixed(2)}
            </div>
            </div>
            <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-600 text-sm">Paid Members</div>
            <div className="text-xl font-bold text-green-600">{summary.paid}</div>
            </div>
            <div className="bg-white p-4 rounded shadow">
            <div className="text-gray-600 text-sm">Unpaid Members</div>
            <div className="text-xl font-bold text-red-600">{summary.unpaid}</div>
            </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
            <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="px-3 py-2 border rounded"
            >
            <option value="">All Months</option>
            {[
                "January","February","March","April","May","June",
                "July","August","September","October","November","December",
            ].map((m) => (
                <option key={m} value={m}>{m}</option>
            ))}
            </select>

            <select
            value={filterMember}
            onChange={(e) => setFilterMember(e.target.value)}
            className="px-3 py-2 border rounded"
            >
            <option value="">All Members</option>
            {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            </select>

            <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded"
            >
            <option value="">All Status</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Unpaid">Unpaid</option>
            </select>

            <CSVLink
            data={csvData}
            filename="payments_export.csv"
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
            Export CSV
            </CSVLink>

            <button
            onClick={() => setShowModal(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
            Record Payment
            </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
                <tr>
                {[
                    "Date","Member Name","Month","Amount Due","Amount Paid",
                    "Discount","Balance","Status","Notes","Actions",
                ].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-sm font-medium">
                    {h}
                    </th>
                ))}
                </tr>
            </thead>

            <tbody className="divide-y">
                {loading ? (
                <tr>
                    <td colSpan="10" className="px-4 py-6 text-center text-gray-500">
                    Loading payments...
                    </td>
                </tr>
                ) : filtered.length === 0 ? (
                <tr>
                    <td colSpan="10" className="px-4 py-6 text-center text-gray-500">
                    No payments found.
                    </td>
                </tr>
                ) : (
                filtered.map((p) => (
                    <tr key={p.id}>
                    <td className="px-4 py-3 text-sm">
                        {p.createdAt?.toDate?.().toLocaleDateString?.() || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">{p.memberName}</td>
                    <td className="px-4 py-3 text-sm">{p.month}</td>
                    <td className="px-4 py-3 text-sm">RM {p.netFee.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">RM {p.amountPaid.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{p.discount}%</td>
                    <td className="px-4 py-3 text-sm">RM {p.balance.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                        <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                            STATUS_COLORS[p.status]
                        }`}
                        >
                        {p.status}
                        </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{p.notes}</td>
                    <td className="px-4 py-3 text-sm">
                        <button
                        onClick={() => sendReminder(p)}
                        className="px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-xs"
                        >
                        Send Reminder
                        </button>
                    </td>
                    </tr>
                ))
                )}
            </tbody>
            </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-lg shadow-lg">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-medium">Record Payment</h3>
                <button onClick={() => setShowModal(false)}>✕</button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm mb-1">Member</label>
                  <select
                    required
                    value={form.memberId}
                    onChange={(e) => setForm({ ...form, memberId: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    <option value="">Select member</option>
                    {members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Month</label>
                    <select
                        required
                        value={form.month}
                        onChange={(e) => setForm({ ...form, month: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                    >
                        <option value="">Select month</option>
                        {[
                        "January","February","March","April","May","June",
                        "July","August","September","October","November","December",
                        ].map((m) => (
                        <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Year</label>
                    <input
                        type="number"
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-1">Amount Paid (RM)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.amountPaid}
                    onChange={(e) => setForm({ ...form, amountPaid: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Payment Method</label>
                  <select
                    value={form.method}
                    onChange={(e) => setForm({ ...form, method: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  >
                    {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-1">Reference Number</label>
                  <input
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    {saving ? "Saving..." : "Record Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default Payments;
