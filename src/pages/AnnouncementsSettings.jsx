import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";

const AnnouncementsSettings = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    body: "",
    tag: "General",
    pinned: false,
  });

  // Fetch announcements
  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      orderBy("pinned", "desc"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: "",
      body: "",
      tag: "General",
      pinned: false,
    });
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      body: a.body,
      tag: a.tag,
      pinned: a.pinned,
    });
    setShowModal(true);
  };

  const saveAnnouncement = async (e) => {
    e.preventDefault();

    if (editingId) {
      await updateDoc(doc(db, "announcements", editingId), {
        ...form,
      });
    } else {
      await addDoc(collection(db, "announcements"), {
        ...form,
        createdAt: serverTimestamp(),
        createdBy: "admin",
      });
    }

    setShowModal(false);
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    await deleteDoc(doc(db, "announcements", id));
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Manage Announcements</h1>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Announcement
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {announcements.map((a) => (
          <div
            key={a.id}
            className="border rounded p-4 bg-white shadow flex justify-between"
          >
            <div>
              <h3 className="font-semibold">
                {a.title}
                {a.pinned && (
                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">
                    Pinned
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600">{a.body}</p>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mt-2 inline-block">
                {a.tag}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => openEdit(a)}
                className="px-3 py-1 bg-indigo-600 text-white rounded"
              >
                Edit
              </button>
              <button
                onClick={() => deleteAnnouncement(a.id)}
                className="px-3 py-1 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 shadow">
            <h2 className="text-lg font-semibold mb-4">
              {editingId ? "Edit Announcement" : "New Announcement"}
            </h2>

            <form onSubmit={saveAnnouncement} className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, title: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Body</label>
                <textarea
                  required
                  value={form.body}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, body: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Tag</label>
                <select
                  value={form.tag}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, tag: e.target.value }))
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option>General</option>
                  <option>Fee Notice</option>
                  <option>Schedule</option>
                  <option>Event</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, pinned: e.target.checked }))
                  }
                />
                <label>Pinned</label>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  {editingId ? "Save Changes" : "Create Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsSettings;
