import { getAllLLMConfigs } from '../../services/chatbot/llm-registry'
import type { LLMConfig } from '../../services/chatbot/llm-registry'

export function LLMPanel() {
  const llmConfigs = getAllLLMConfigs()

  const formatTags = (tags: string[]): string => {
    if (tags.length === 0) {
      return 'None (TBD)'
    }
    return tags.length > 0 ? tags.join(', ') : 'All timeline tags'
  }

  return (
    <div className="llm-panel">
      <h2>🤖 LLM Services</h2>
      
      <div className="panel-section">
        <p className="no-data" style={{ marginBottom: '1rem' }}>
          Overview of all LLM services in the system and their tag access permissions.
        </p>
        
        <div className="llm-list">
          {llmConfigs.map((llm: LLMConfig) => (
            <div key={llm.id} className="llm-card">
              <div className="llm-header">
                <h3 className="llm-name">{llm.name}</h3>
                <span className="llm-id">{llm.id}</span>
              </div>
              
              <div className="llm-details">
                <div className="llm-detail-item">
                  <span className="llm-detail-label">Model:</span>
                  <span className="llm-detail-value">{llm.model}</span>
                </div>
                
                <div className="llm-detail-item">
                  <span className="llm-detail-label">Purpose:</span>
                  <span className="llm-detail-value">{llm.purpose}</span>
                </div>
                
                <div className="llm-detail-item">
                  <span className="llm-detail-label">Description:</span>
                  <span className="llm-detail-value">{llm.description}</span>
                </div>
                
                <div className="llm-detail-item">
                  <span className="llm-detail-label">Timeline Tags:</span>
                  <span className="llm-detail-value llm-tags">{formatTags(llm.allowedTimelineTags)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

