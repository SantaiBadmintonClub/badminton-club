const AnnouncementCard = ({ title, body, tag, createdAt, pinned }) => {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">
          {title}
          {pinned && (
            <span className="ml-2 px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">
              Pinned
            </span>
          )}
        </h3>
        <span className="text-xs text-gray-500">
          {createdAt?.toDate?.().toLocaleDateString?.()}
        </span>
      </div>

      <p className="text-gray-700 mb-2">{body}</p>

      {tag && (
        <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
          {tag}
        </span>
      )}
    </div>
  );
};

export default AnnouncementCard;
