interface ScratchpadPanelProps {
  currentScratchpad: string | null
  history: Array<{
    timestamp: number
    scratchpad: string
    changeType: string
    reason?: string
  }>
}

export function ScratchpadPanel({ currentScratchpad, history }: ScratchpadPanelProps) {
  return (
    <div className="scratchpad-panel">
      <h2>📝 Scratchpad</h2>
      
      <div className="panel-section">
        <h3>Current Scratchpad</h3>
        {currentScratchpad ? (
          <div className="scratchpad-display">
            <pre className="scratchpad-text">{currentScratchpad}</pre>
          </div>
        ) : (
          <p className="no-data">No scratchpad available</p>
        )}
      </div>

      <div className="panel-section">
        <h3>History ({history.length} versions)</h3>
        {history.length === 0 ? (
          <p className="no-data">No history yet</p>
        ) : (
          <div className="scratchpad-history">
            {history.slice().reverse().map((entry, idx) => (
              <div key={idx} className="history-entry">
                <div className="history-entry-header">
                  <span className="history-time">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                  <span className={`history-change-type change-${entry.changeType}`}>
                    {entry.changeType}
                  </span>
                </div>
                {entry.reason && (
                  <div className="history-reason">{entry.reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

