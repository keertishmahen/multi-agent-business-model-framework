/**
 * VersionHistoryTimeline — vertical timeline displaying version history entries
 * with timestamps, descriptions, and "Restore Version" buttons.
 *
 * Props:
 *   entries — array of { timestamp, changeDescription }
 *   onRestore — function(index) called when "Restore" is clicked
 *
 * Validates: Requirements 9.4 (display chronological list of edits with "Restore Version" option)
 */
export default function VersionHistoryTimeline({ entries = [], onRestore }) {
  if (!entries.length) {
    return (
      <p style={{
        fontSize: "0.875rem",
        color: "var(--color-text-muted)",
        textAlign: "center",
        padding: "24px 0",
      }}>
        No history yet
      </p>
    );
  }

  // Most recent entry at the top
  const reversedEntries = [...entries].reverse();

  return (
    <div
      role="list"
      aria-label="Version history timeline"
      style={{ position: "relative", paddingLeft: 20 }}
    >
      {/* Vertical timeline line */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 4,
          top: 5,
          bottom: 5,
          width: 2,
          background: "var(--color-border)",
          borderRadius: 1,
        }}
      />

      {reversedEntries.map((entry, displayIndex) => {
        // Original index in the entries array (for onRestore)
        const originalIndex = entries.length - 1 - displayIndex;
        const isLatest = displayIndex === 0;

        return (
          <div
            key={`${entry.timestamp}-${originalIndex}`}
            role="listitem"
            style={{
              position: "relative",
              paddingLeft: 16,
              paddingBottom: displayIndex === reversedEntries.length - 1 ? 0 : 16,
            }}
          >
            {/* Timeline dot */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: -1,
                top: 4,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: "var(--color-brand)",
              }}
            />

            {/* Timestamp */}
            <time
              dateTime={entry.timestamp}
              style={{
                display: "block",
                fontSize: "0.75rem",
                color: "var(--color-text-muted)",
                marginBottom: 2,
              }}
            >
              {formatTimestamp(entry.timestamp)}
            </time>

            {/* Change description */}
            <p style={{
              fontSize: "0.875rem",
              color: "var(--color-text-primary)",
              lineHeight: 1.5,
              margin: 0,
            }}>
              {entry.changeDescription}
            </p>

            {/* Restore button — hidden for the latest (current) entry */}
            {!isLatest && onRestore && (
              <button
                className="btn-ghost"
                onClick={() => onRestore(originalIndex)}
                style={{
                  marginTop: 6,
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                }}
                aria-label={`Restore version from ${formatTimestamp(entry.timestamp)}`}
              >
                Restore
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Formats an ISO 8601 timestamp into a readable time string (e.g., "2:30 PM")
 */
function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}
