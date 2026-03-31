/**
 * Reusable confirmation modal — replaces native browser confirm() dialogs.
 * Usage:
 *   <ConfirmModal
 *     title="Delete Member"          // optional, defaults to "Confirm"
 *     message="Are you sure?"
 *     confirmText="Delete"           // optional, defaults to "Confirm"
 *     danger                         // optional — makes confirm button red
 *     onConfirm={() => doAction()}
 *     onCancel={() => setConfirm(null)}
 *   />
 */
export default function ConfirmModal({
  title = "Confirm",
  message,
  confirmText = "Confirm",
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal"
        style={{ maxWidth: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: danger
                ? "rgba(255,91,91,0.12)"
                : "rgba(168,255,87,0.10)",
              fontSize: 24,
            }}
          >
            {danger ? "⚠️" : "❓"}
          </div>
        </div>

        {/* Title */}
        <h2
          className="modal-title"
          style={{ textAlign: "center", marginBottom: 10 }}
        >
          {title}
        </h2>

        {/* Message */}
        <p
          style={{
            color: "var(--text2)",
            fontSize: 14,
            lineHeight: 1.6,
            textAlign: "center",
            marginBottom: 28,
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "center",
          }}
        >
          <button
            className="btn btn-secondary"
            onClick={onCancel}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            style={{ flex: 1 }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
