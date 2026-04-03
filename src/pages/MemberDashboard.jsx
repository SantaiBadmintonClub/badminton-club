import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";

import QRCodeDisplay from "../components/QRCodeDisplay";
import AnnouncementCard from "../components/AnnouncementCard";
import AppLayout from "../layouts/AppLayout";

const MemberDashboard = () => {
  const { currentUser } = useAuth();

  const [member, setMember] = useState(null);
  const [payments, setPayments] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch member profile
  useEffect(() => {
    if (!currentUser) return;

    const fetchMember = async () => {
      const ref = doc(db, "members", currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setMember({ id: snap.id, ...snap.data() });
    };

    fetchMember();
  }, [currentUser]);

  // Fetch payment history
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "payments"),
      where("memberId", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => unsub();
  }, [currentUser]);

  // Fetch announcements (latest 5, pinned first)
  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      orderBy("pinned", "desc"),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  // Compute fee summary
  const feeSummary = useMemo(() => {
    if (!member) return null;

    const base = Number(member.baseFee || 0);
    const discount = Number(member.discount || 0);
    const net = base * (1 - discount / 100);

    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });

    const currentPayment = payments.find((p) => p.month === monthName);

    let status = "Due";
    if (currentPayment) {
      if (currentPayment.amountPaid >= net) status = "Paid";
      else if (currentPayment.amountPaid > 0) status = "Partial";
    }

    return { base, discount, net, status };
  }, [member, payments]);

  // Outstanding balance
  const outstanding = useMemo(() => {
    if (!member) return 0;

    return payments.reduce((sum, p) => {
      const base = Number(member.baseFee || 0);
      const discount = Number(member.discount || 0);
      const net = base * (1 - discount / 100);
      const balance = net - Number(p.amountPaid || 0);
      return sum + (balance > 0 ? balance : 0);
    }, 0);
  }, [payments, member]);

  if (!member || loading) {
    return (
      <div className="p-6 text-gray-500">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <AppLayout title="Member Dashboard">
      <div className="p-6 space-y-6">

        {/* Welcome Banner */}
        <div className="bg-blue-600 text-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold">
            Hello, {member.name}! 🏸
          </h1>
          <p className="text-sm opacity-90 mt-1">
            Welcome to your member dashboard.
          </p>
        </div>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-600">Monthly Fee</h3>
            <p className="text-xl font-bold">RM {feeSummary.base.toFixed(2)}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-600">Discount</h3>
            <p className="text-xl font-bold">{feeSummary.discount}%</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-sm text-gray-600">Net Fee</h3>
            <p className="text-xl font-bold">RM {feeSummary.net.toFixed(2)}</p>
          </div>
        </div>

        {/* Current Month Status */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm text-gray-600">Current Month Status</h3>
          <span
            className={`inline-block mt-1 px-3 py-1 rounded text-sm font-medium ${
              feeSummary.status === "Paid"
                ? "bg-green-100 text-green-800"
                : feeSummary.status === "Partial"
                ? "bg-orange-100 text-orange-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {feeSummary.status}
          </span>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-sm text-gray-600">Outstanding Balance</h3>
          <p
            className={`text-xl font-bold ${
              outstanding > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            RM {outstanding.toFixed(2)}
          </p>
        </div>

        {/* Payment History */}
        <div className="bg-white p-4 rounded shadow overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Payment History</h2>

          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Month",
                  "Amount Due",
                  "Amount Paid",
                  "Balance",
                  "Status",
                  "Date Paid",
                ].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-sm font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y">
              {payments.map((p) => {
                const base = Number(member.baseFee || 0);
                const discount = Number(member.discount || 0);
                const net = base * (1 - discount / 100);
                const balance = net - Number(p.amountPaid || 0);

                let status = "Unpaid";
                if (p.amountPaid >= net) status = "Paid";
                else if (p.amountPaid > 0) status = "Partial";

                return (
                  <tr key={p.id}>
                    <td className="px-4 py-2 text-sm">{p.month}</td>
                    <td className="px-4 py-2 text-sm">RM {net.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">RM {p.amountPaid.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">RM {balance.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          status === "Paid"
                            ? "bg-green-100 text-green-800"
                            : status === "Partial"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm">
                      {p.createdAt?.toDate?.().toLocaleDateString?.() || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* QR Code Section */}
        <div className="mt-6">
          <QRCodeDisplay />
        </div>

        {/* Announcements */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-3">Club Announcements</h2>

          <div className="space-y-3">
            {announcements.length === 0 && (
              <p className="text-gray-500 text-sm">No announcements yet.</p>
            )}

            {announcements.map((a) => (
              <AnnouncementCard
                key={a.id}
                title={a.title}
                body={a.body}
                tag={a.tag}
                pinned={a.pinned}
                createdAt={a.createdAt}
              />
            ))}
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-3">Your Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <p><strong>Name:</strong> {member.name}</p>
            <p><strong>Email:</strong> {member.email}</p>
            <p><strong>Phone:</strong> {member.phone}</p>
            <p><strong>IC/ID:</strong> {member.ic}</p>
            <p><strong>Role:</strong> {member.role}</p>
            <p><strong>Status:</strong> {member.active ? "Active" : "Inactive"}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default MemberDashboard;

