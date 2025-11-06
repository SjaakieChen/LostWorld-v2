import { useState } from 'react'
import type { TimelineEntry } from '../../context/timeline'

interface TimelinePanelProps {
  timeline: TimelineEntry[]
}

export function TimelinePanel({ timeline }: TimelinePanelProps) {
  const [filterTag, setFilterTag] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

  // Get unique tags for filtering (from all tags arrays)
  const allTags = new Set<string>()
  timeline.forEach(entry => {
    entry.tags.forEach(tag => allTags.add(tag))
  })
  const tagPrefixes = Array.from(allTags).sort()

  // Filter timeline entries
  const filteredTimeline = timeline.filter(entry => {
    if (filterTag === 'all') return true
    return entry.tags.includes(filterTag)
  })

  // Sort timeline entries
  const sortedTimeline = [...filteredTimeline].sort((a, b) => {
    if (sortOrder === 'newest') {
      return b.timestamp - a.timestamp // Newest first
    } else {
      return a.timestamp - b.timestamp // Oldest first
    }
  })

  // Group by turn
  const groupedByTurn = sortedTimeline.reduce((acc, entry) => {
    const turn = entry.turn
    if (!acc[turn]) {
      acc[turn] = []
    }
    acc[turn].push(entry)
    return acc
  }, {} as Record<number, TimelineEntry[]>)

  const getTagColor = (tag: string) => {
    if (tag === 'generation' || tag.startsWith('generation')) return 'tag-generation'
    if (tag === 'system' || tag.startsWith('system')) return 'tag-system'
    if (tag.startsWith('npc_')) return 'tag-npc'
    if (tag === 'player_action' || tag.startsWith('player_action')) return 'tag-player'
    if (tag === 'turngoal' || tag.startsWith('turngoal')) return 'tag-turngoal'
    if (tag === 'entityChange' || tag.startsWith('entityChange')) return 'tag-entity-change'
    if (tag === 'locationUpdate') return 'tag-location-update'
    if (tag === 'AttributeUpdate') return 'tag-attribute-update'
    if (tag === 'user') return 'tag-user'
    if (tag === 'chatbot') return 'tag-chatbot'
    return 'tag-default'
  }

  return (
    <div className="timeline-panel">
      <h2>⏱️ Timeline ({timeline.length} entries)</h2>

      <div className="panel-section">
        <div className="timeline-filters">
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Tags</option>
            {tagPrefixes.map(prefix => (
              <option key={prefix} value={prefix}>
                {prefix}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <div className="panel-section">
        <div className="timeline-display">
          {sortedTimeline.length === 0 ? (
            <p className="no-data">No timeline entries matching filters</p>
          ) : (
            <div className="timeline-entries">
              {Object.entries(groupedByTurn)
                .sort(([a], [b]) => sortOrder === 'newest' ? Number(b) - Number(a) : Number(a) - Number(b))
                .map(([turn, entries]) => (
                  <div key={turn} className="timeline-turn-group">
                    <div className="timeline-turn-header">
                      <h3>Turn {turn}</h3>
                      <span className="turn-entry-count">{entries.length} entries</span>
                    </div>
                    {entries.map((entry) => (
                      <div key={entry.id} className="timeline-entry">
                        <div className="timeline-entry-header">
                          <div className="timeline-tags">
                            {entry.tags.map((tag, idx) => (
                              <span key={idx} className={`timeline-tag ${getTagColor(tag)}`}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="timeline-time">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="timeline-text">{entry.text}</div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

