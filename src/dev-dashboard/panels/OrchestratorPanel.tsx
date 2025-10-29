interface OrchestratorPanelProps {
  gameState: any
  operations: Array<any>
}

export function OrchestratorPanel({ gameState, operations }: OrchestratorPanelProps) {
  return (
    <div className="orchestrator-panel">
      <h2>🎮 Orchestrator</h2>
      
      <div className="panel-section">
        <h3>Game State</h3>
        {gameState ? (
          <div className="game-state-info">
            <div className="state-badge state-{gameState.gameState}">
              {gameState.gameState || 'not_started'}
            </div>
            {gameState.generationProgress && (
              <p className="progress-text">{gameState.generationProgress}</p>
            )}
          </div>
        ) : (
          <p className="no-data">No game state data</p>
        )}
      </div>

      <div className="panel-section">
        <h3>Configuration</h3>
        {gameState?.config ? (
          <div className="config-summary">
            <div className="config-item">
              <span className="config-label">Historical Period:</span>
              <span className="config-value">{gameState.config.gameRules?.historicalPeriod || 'N/A'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Genre:</span>
              <span className="config-value">{gameState.config.gameRules?.genre || 'N/A'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Art Style:</span>
              <span className="config-value">{gameState.config.gameRules?.artStyle || 'N/A'}</span>
            </div>
          </div>
        ) : (
          <p className="no-data">No configuration available</p>
        )}
      </div>

      <div className="panel-section">
        <h3>Operations Log ({operations.length})</h3>
        <div className="operations-list">
          {operations.length === 0 ? (
            <p className="no-data">No operations yet</p>
          ) : (
            operations.slice().reverse().map((op: any, idx: number) => (
              <div key={op.operationId || idx} className="operation-item">
                <div className="operation-header">
                  <span className="operation-type">{op.operationType}</span>
                  <span className="operation-time">
                    {new Date(op.timestamp).toLocaleTimeString()}
                  </span>
                  {op.duration && (
                    <span className="operation-duration">{Math.round(op.duration)}ms</span>
                  )}
                  <span className={`operation-status ${op.success ? 'success' : 'error'}`}>
                    {op.success ? '✓' : '✗'}
                  </span>
                </div>
                {op.error && (
                  <div className="operation-error">❌ {op.error}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

