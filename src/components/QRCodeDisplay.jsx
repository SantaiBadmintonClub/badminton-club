import { useEffect, useRef, useState } from "react";
import { db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import QRCode from "react-qr-code";
import html2canvas from "html2canvas";

const QRCodeDisplay = () => {
  const [qrValue, setQrValue] = useState("");
  const [clubName, setClubName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [loading, setLoading] = useState(true);

  const qrRef = useRef(null);

  // Fetch QR code + bank info
  useEffect(() => {
    const fetchQR = async () => {
      try {
        const ref = doc(db, "clubSettings", "payment");
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setQrValue(data.qrValue || "");
          setClubName(data.clubName || "Santai Badminton Club");
          setBankName(data.bankName || "");
          setAccountNumber(data.accountNumber || "");
        }
      } catch (err) {
        console.error("Failed to load QR code:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQR();
  }, []);

  // Download QR as PNG
  const handleDownload = async () => {
    if (!qrRef.current) return;

    const canvas = await html2canvas(qrRef.current, {
      scale: 3,
      backgroundColor: "#ffffff",
    });

    const link = document.createElement("a");
    link.download = "club-payment-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <h2 className="text-lg font-semibold mb-3">Pay Your Fees</h2>
        <p className="text-gray-500">Loading QR code...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow text-center">
      <h2 className="text-lg font-semibold mb-4">Pay Your Fees</h2>

      <div ref={qrRef} className="inline-block p-4 bg-white rounded">
        {qrValue ? (
          <QRCode value={qrValue} size={220} />
        ) : (
          <p className="text-gray-500">QR code not available</p>
        )}

        <div className="mt-4 text-sm text-gray-700">
          <p className="font-semibold">{clubName}</p>
          {bankName && <p>{bankName}</p>}
          {accountNumber && <p>Account: {accountNumber}</p>}
        </div>
      </div>

      <button
        onClick={handleDownload}
        className="mt-5 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Download QR
      </button>
    </div>
  );
};

export default QRCodeDisplay;
