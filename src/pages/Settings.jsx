import { useEffect, useState } from "react";
import { db } from "../firebase/config";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import AppLayout from "../layouts/AppLayout";

const Settings = () => {
  const [loading, setLoading] = useState(true);

  // Club Profile
  const [clubName, setClubName] = useState("");
  const [established, setEstablished] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Fee Settings
  const [defaultFee, setDefaultFee] = useState(50);
  const [shuttleCost, setShuttleCost] = useState(0);
  const [courtFee, setCourtFee] = useState(0);

  // Payment Settings
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [duitNow, setDuitNow] = useState("");
  const [qrValue, setQrValue] = useState("");

  // Session Schedule
  const [sessionDays, setSessionDays] = useState([]);
  const [sessionTime, setSessionTime] = useState("");
  const [venue, setVenue] = useState("");

  // Discount Requests
  const [discountRequests, setDiscountRequests] = useState([]);

  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      const ref = doc(db, "clubSettings", "general");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        setClubName(data.clubName || "");
        setEstablished(data.established || "");
        setContactEmail(data.contactEmail || "");
        setLogoUrl(data.logoUrl || "");

        setDefaultFee(data.defaultFee || 50);
        setShuttleCost(data.shuttleCost || 0);
        setCourtFee(data.courtFee || 0);

        setBankName(data.bankName || "");
        setAccountNumber(data.accountNumber || "");
        setDuitNow(data.duitNow || "");
        setQrValue(data.qrValue || "");

        setSessionDays(data.sessionDays || []);
        setSessionTime(data.sessionTime || "");
        setVenue(data.venue || "");
      }

      setLoading(false);
    };

    fetchSettings();
  }, []);

  // Fetch discount requests
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "discountRequests"),
      (snap) => {
        setDiscountRequests(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      }
    );

    return () => unsub();
  }, []);

  // Save settings
  const handleSave = async () => {
    try {
      await setDoc(doc(db, "clubSettings", "general"), {
        clubName,
        established,
        contactEmail,
        logoUrl,
        defaultFee,
        shuttleCost,
        courtFee,
        bankName,
        accountNumber,
        duitNow,
        qrValue,
        sessionDays,
        sessionTime,
        venue,
      });

      toast.success("Settings saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    }
  };

  // Approve / Reject discount request
  const handleDiscountDecision = async (req, approved, percentage = 0) => {
    try {
      const memberRef = doc(db, "members", req.memberId);

      if (approved) {
        await updateDoc(memberRef, { discount: percentage });
      }

      await updateDoc(doc(db, "discountRequests", req.id), {
        status: approved ? "approved" : "rejected",
        approvedPercentage: percentage,
      });

      toast.success(
        approved ? "Discount approved" : "Discount rejected"
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update request");
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-500">Loading settings...</div>;
  }

  return (
    <AppLayout title="Settings">
        <div className="p-6 space-y-10">
            <h1 className="text-2xl font-semibold">Club Settings</h1>

            {/* Club Profile */}
            <section className="bg-white p-6 rounded shadow space-y-4">
                <h2 className="text-lg font-semibold">Club Profile</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    className="border p-2 rounded"
                    placeholder="Club Name"
                    value={clubName}
                    onChange={(e) => setClubName(e.target.value)}
                />

                <input
                    className="border p-2 rounded"
                    placeholder="Established Year"
                    value={established}
                    onChange={(e) => setEstablished(e.target.value)}
                />

                <input
                    className="border p-2 rounded"
                    placeholder="Contact Email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                />

                <input
                    className="border p-2 rounded"
                    placeholder="Logo URL"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                />
                </div>
            </section>

            {/* Fee Settings */}
            <section className="bg-white p-6 rounded shadow space-y-4">
                <h2 className="text-lg font-semibold">Fee Settings</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    type="number"
                    className="border p-2 rounded"
                    placeholder="Default Monthly Fee (RM)"
                    value={defaultFee}
                    onChange={(e) => setDefaultFee(Number(e.target.value))}
                />

                <input
                    type="number"
                    className="border p-2 rounded"
                    placeholder="Shuttlecock Cost (RM)"
                    value={shuttleCost}
                    onChange={(e) => setShuttleCost(Number(e.target.value))}
                />

                <input
                    type="number"
                    className="border p-2 rounded"
                    placeholder="Court Fee (RM)"
                    value={courtFee}
                    onChange={(e) => setCourtFee(Number(e.target.value))}
                />
                </div>
            </section>

            {/* Payment Settings */}
            <section className="bg-white p-6 rounded shadow space-y-4">
                <h2 className="text-lg font-semibold">Payment Settings</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    className="border p-2 rounded"
                    placeholder="Bank Name"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                />

                <input
                    className="border p-2 rounded"
                    placeholder="Account Number"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                />

                <input
                    className="border p-2 rounded"
                    placeholder="DuitNow Number"
                    value={duitNow}
                    onChange={(e) => setDuitNow(e.target.value)}
                />

                <textarea
                    className="border p-2 rounded"
                    placeholder="QR Code Value (text)"
                    value={qrValue}
                    onChange={(e) => setQrValue(e.target.value)}
                />
                </div>
            </section>

            {/* Session Schedule */}
            <section className="bg-white p-6 rounded shadow space-y-4">
                <h2 className="text-lg font-semibold">Session Schedule</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                    className="border p-2 rounded"
                    placeholder="Session Days (e.g. Tue, Thu)"
                    value={sessionDays.join(", ")}
                    onChange={(e) =>
                    setSessionDays(
                        e.target.value.split(",").map((d) => d.trim())
                    )
                    }
                />

                <input
                    className="border p-2 rounded"
                    placeholder="Session Time"
                    value={sessionTime}
                    onChange={(e) => setSessionTime(e.target.value)}
                />

                <input
                    className="border p-2 rounded"
                    placeholder="Venue / Court Name"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                />
                </div>
            </section>

            {/* Discount Requests */}
            <section className="bg-white p-6 rounded shadow space-y-4">
                <h2 className="text-lg font-semibold">Discount Approval</h2>

                {discountRequests.length === 0 ? (
                <p className="text-gray-500">No pending requests.</p>
                ) : (
                <div className="space-y-4">
                    {discountRequests.map((req) => (
                    <div
                        key={req.id}
                        className="border p-4 rounded flex justify-between items-center"
                    >
                        <div>
                        <p className="font-semibold">{req.memberName}</p>
                        <p className="text-sm text-gray-600">
                            Reason: {req.reason}
                        </p>
                        </div>

                        <div className="flex gap-2 items-center">
                        <select
                            className="border p-1 rounded"
                            onChange={(e) =>
                            (req.selectedDiscount = Number(e.target.value))
                            }
                        >
                            <option value="0">0%</option>
                            <option value="10">10%</option>
                            <option value="20">20%</option>
                            <option value="30">30%</option>
                            <option value="50">50%</option>
                        </select>

                        <button
                            onClick={() =>
                            handleDiscountDecision(
                                req,
                                true,
                                req.selectedDiscount || 0
                            )
                            }
                            className="px-3 py-1 bg-green-600 text-white rounded"
                        >
                            Approve
                        </button>

                        <button
                            onClick={() => handleDiscountDecision(req, false)}
                            className="px-3 py-1 bg-red-600 text-white rounded"
                        >
                            Reject
                        </button>
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    Save Changes
                </button>
            </div>
        </div>
    </AppLayout>
  );
};

export default Settings;
