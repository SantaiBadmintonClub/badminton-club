import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  setDoc,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase/config";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import { CSVLink } from "react-csv";
import AppLayout from "../layouts/AppLayout";

const DISCOUNT_OPTIONS = [0, 10, 20, 30, 50];

const ROLE_COLORS = {
  admin: "bg-red-100 text-red-800",
  committee: "bg-yellow-100 text-yellow-800",
  member: "bg-green-100 text-green-800",
};

function RoleBadge({ role }) {
  const cls = ROLE_COLORS[role] || ROLE_COLORS.member;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {role}
    </span>
  );
}

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search + sort
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  // Add/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    ic: "",
    role: "member",
    baseFee: 50,
    discount: 0,
    active: true,
  });

  // Import Members modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [parsedData, setParsedData] = useState(null); // array of rows
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Fetch members in real-time
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "members"),
      (snap) => {
        setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Failed to fetch members:", err);
        setError("Failed to load members.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Derived filtered + sorted list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = members.filter((m) => {
      if (!q) return true;
      return (
        m.name?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q) ||
        m.phone?.toLowerCase().includes(q) ||
        m.ic?.toLowerCase().includes(q)
      );
    });

    const dir = sortDir === "asc" ? 1 : -1;

    list.sort((a, b) => {
      const aVal =
        sortBy === "baseFee"
          ? Number(a.baseFee || 0)
          : sortBy === "discount"
          ? Number(a.discount || 0)
          : sortBy === "status"
          ? a.active
            ? 1
            : 0
          : (a[sortBy] || "").toString().toLowerCase();

      const bVal =
        sortBy === "baseFee"
          ? Number(b.baseFee || 0)
          : sortBy === "discount"
          ? Number(b.discount || 0)
          : sortBy === "status"
          ? b.active
            ? 1
            : 0
          : (b[sortBy] || "").toString().toLowerCase();

      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });

    return list;
  }, [members, search, sortBy, sortDir]);

  // Open modal for new member
  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      ic: "",
      role: "member",
      baseFee: 50,
      discount: 0,
      active: true,
    });
    setShowModal(true);
  };

  // Open modal for edit
  const openEdit = (member) => {
    setEditingId(member.id);
    setForm({
      name: member.name || "",
      email: member.email || "",
      phone: member.phone || "",
      ic: member.ic || "",
      role: member.role || "member",
      baseFee: Number(member.baseFee || 0),
      discount: Number(member.discount || 0),
      active: !!member.active,
    });
    setShowModal(true);
  };

  // Save (create or update)
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        ic: form.ic,
        role: form.role,
        baseFee: Number(form.baseFee),
        discount: Number(form.discount),
        active: !!form.active,
      };

      if (editingId) {
        await updateDoc(doc(db, "members", editingId), payload);
      } else {
        await addDoc(collection(db, "members"), payload);
      }

      setShowModal(false);
    } catch (err) {
      console.error("Save member failed:", err);
      setError("Failed to save member.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive
  const toggleActive = async (member) => {
    try {
      await updateDoc(doc(db, "members", member.id), {
        active: !member.active,
      });
    } catch (err) {
      console.error("Toggle active failed:", err);
      setError("Failed to update status.");
    }
  };

  // Export CSV data
  const csvData = useMemo(() => {
    return filtered.map((m) => {
      const baseFee = Number(m.baseFee || 0);
      const discount = Number(m.discount || 0);
      const netFee = (baseFee * (1 - discount / 100)).toFixed(2);
      return {
        id: m.id,
        name: m.name || "",
        email: m.email || "",
        phone: m.phone || "",
        ic: m.ic || "",
        role: m.role || "member",
        baseFee: baseFee.toFixed(2),
        discount: `${discount}%`,
        netFee,
        active: m.active ? "Active" : "Inactive",
      };
    });
  }, [filtered]);

  // Import Members — CSV upload
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data);
      },
    });
  };

  // Import Members — process
  const startImport = async () => {
    if (!parsedData || parsedData.length === 0) return;

    setImporting(true);
    setError("");
    const results = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      // Expecting columns: name, email, phone, ic, baseFee, discount, role
      const tempPassword = "Badminton@" + String(row.ic || "").slice(-4);

      try {
        const userCred = await createUserWithEmailAndPassword(
          auth,
          row.email,
          tempPassword
        );

        await setDoc(doc(db, "members", userCred.user.uid), {
          name: row.name,
          email: row.email,
          phone: row.phone,
          ic: row.ic,
          baseFee: Number(row.baseFee || 0),
          discount: Number(row.discount || 0),
          role: row.role || "member",
          active: true,
          createdAt: new Date(),
        });

        results.push({
          email: row.email,
          password: tempPassword,
          status: "success",
        });
      } catch (err) {
        console.error("Import member failed:", err);
        results.push({
          email: row.email,
          password: tempPassword,
          status: "failed: " + err.message,
        });
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    // Export results CSV
    const csv = Papa.unparse(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "import_results.csv");

    setImporting(false);
    setShowImportModal(false);
    setParsedData(null);
    setProgress(0);
  };

  return (
    <AppLayout title="Members">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Members</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Import Members
            </button>

            <CSVLink
              data={csvData}
              filename={`members_export_${new Date()
                .toISOString()
                .slice(0, 10)}.csv`}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            >
              Export CSV
            </CSVLink>

            <button
              onClick={openAdd}
              className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Add Member
            </button>
          </div>
        </div>

        {/* Search + sort controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by name, email, phone, IC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border rounded w-72"
          />

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1 border rounded"
            >
              <option value="name">Member Name</option>
              <option value="ic">IC/ID</option>
              <option value="phone">Phone</option>
              <option value="role">Role</option>
              <option value="baseFee">Fee (RM)</option>
              <option value="discount">Discount %</option>
              <option value="status">Status</option>
            </select>

            <button
              onClick={() => setSortDir((s) => (s === "asc" ? "desc" : "asc"))}
              className="px-2 py-1 border rounded"
              title="Toggle sort direction"
            >
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        {/* Table */}
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">
                  Member
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">
                  IC/ID
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">
                  Phone
                </th>
                <th className="px-4 py-2 text-left text-sm font-medium">
                  Role
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium">
                  Fee (RM)
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium">
                  Discount %
                </th>
                <th className="px-4 py-2 text-right text-sm font-medium">
                  Net Fee (RM)
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium">
                  Status
                </th>
                <th className="px-4 py-2 text-center text-sm font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm">
                    Loading members...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm">
                    No members found.
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const baseFee = Number(m.baseFee || 0);
                  const discount = Number(m.discount || 0);
                  const netFee = (baseFee * (1 - discount / 100)).toFixed(2);

                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3 text-sm">{m.name}</td>
                      <td className="px-4 py-3 text-sm">{m.ic}</td>
                      <td className="px-4 py-3 text-sm">{m.phone}</td>
                      <td className="px-4 py-3 text-sm">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {baseFee.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {discount}%
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {netFee}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            m.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {m.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="px-2 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(m)}
                          className={`px-2 py-1 text-sm rounded ${
                            m.active
                              ? "bg-red-500 text-white hover:bg-red-600"
                              : "bg-green-500 text-white hover:bg-green-600"
                          }`}
                        >
                          {m.active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg w-full max-w-xl shadow-lg overflow-auto">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {editingId ? "Edit Member" : "Add Member"}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">IC / ID</label>
                    <input
                      value={form.ic}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, ic: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, role: e.target.value }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="member">Member</option>
                      <option value="committee">Committee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Status</label>
                    <select
                      value={form.active ? "active" : "inactive"}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          active: e.target.value === "active",
                        }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-1">
                      Base monthly fee (RM)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.baseFee}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          baseFee: Number(e.target.value || 0),
                        }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">Discount %</label>
                    <select
                      value={form.discount}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          discount: Number(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border rounded"
                    >
                      {DISCOUNT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}%
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Net fee:{" "}
                    <span className="font-medium">
                      RM{" "}
                      {(
                        Number(form.baseFee || 0) *
                        (1 - Number(form.discount || 0) / 100)
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border rounded"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingId
                        ? "Update Member"
                        : "Create Member"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Members Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  Import Members from CSV
                </h3>
                <button
                  onClick={() => {
                    if (!importing) {
                      setShowImportModal(false);
                      setParsedData(null);
                      setProgress(0);
                    }
                  }}
                  className="text-gray-600 hover:text-gray-800"
                  disabled={importing}
                >
                  ✕
                </button>
              </div>

              {!parsedData && !importing && (
                <div className="space-y-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="border p-2 rounded w-full"
                  />
                  <p className="text-sm text-gray-600">
                    Required columns:{" "}
                    <strong>
                      name, email, phone, ic, baseFee, discount, role
                    </strong>
                  </p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 border rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {parsedData && !importing && (
                <>
                  <div className="max-h-80 overflow-auto border rounded">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(parsedData[0] || {}).map((col) => (
                            <th
                              key={col}
                              className="px-3 py-2 border text-left font-medium"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className="border-b">
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="px-3 py-2 border">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => setParsedData(null)}
                      className="px-4 py-2 border rounded"
                    >
                      Back
                    </button>
                    <button
                      onClick={startImport}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Confirm Import
                    </button>
                  </div>
                </>
              )}

              {importing && (
                <div className="mt-6">
                  <p className="text-sm mb-2">Importing... {progress}%</p>
                  <div className="w-full bg-gray-200 rounded h-4">
                    <div
                      className="bg-blue-600 h-4 rounded"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    A result CSV will be downloaded automatically when
                    completed.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
