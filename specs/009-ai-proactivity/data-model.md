# Data Model: AI Proactivity

## Frontend Types

### GraphDelta

Represents the difference between two graph snapshots.

```typescript
interface GraphDelta {
  addedNodes: { id: string; type: string; name: string }[]
  removedNodes: { id: string; type: string; name: string }[]
  addedEdges: { id: string; source: string; target: string; protocol?: string }[]
  removedEdges: { id: string; source: string; target: string; protocol?: string }[]
  modifiedNodes: { id: string; field: string; oldValue: string; newValue: string }[]
  modifiedEdges: { id: string; field: string; oldValue: string; newValue: string }[]
}
```

### AutoAnalyzeState

Internal state tracked by the `useAutoAnalyze` hook.

```typescript
interface AutoAnalyzeState {
  enabled: boolean                    // Toggle state (default: false)
  lastAnalyzedSnapshot: GraphState | null  // Snapshot at time of last analysis
  pendingTimer: number | null         // Debounce timer ID
  status: 'idle' | 'pending' | 'analyzing'  // Current state machine position
}
```

## Backend Types

### AutoAnalyzePayload (WebSocket message)

```go
type AutoAnalyzePayload struct {
    GraphState model.GraphState `json:"graphState"`
    Delta      *GraphDelta      `json:"delta,omitempty"`
}

type GraphDelta struct {
    AddedNodes    []DeltaNode     `json:"addedNodes,omitempty"`
    RemovedNodes  []DeltaNode     `json:"removedNodes,omitempty"`
    AddedEdges    []DeltaEdge     `json:"addedEdges,omitempty"`
    RemovedEdges  []DeltaEdge     `json:"removedEdges,omitempty"`
    ModifiedNodes []DeltaModify   `json:"modifiedNodes,omitempty"`
    ModifiedEdges []DeltaModify   `json:"modifiedEdges,omitempty"`
}

type DeltaNode struct {
    Type string `json:"type"`
    Name string `json:"name"`
}

type DeltaEdge struct {
    Source   string `json:"source"`
    Target   string `json:"target"`
    Protocol string `json:"protocol,omitempty"`
}

type DeltaModify struct {
    Name     string `json:"name"`
    Field    string `json:"field"`
    OldValue string `json:"oldValue"`
    NewValue string `json:"newValue"`
}
```

## State Transitions

```
AutoAnalyze State Machine:

  [disabled] --toggle on--> [idle]
  [idle] --structural change--> [pending] (start debounce timer)
  [pending] --more changes--> [pending] (reset timer)
  [pending] --timer expires & not streaming--> [analyzing] (send request)
  [pending] --timer expires & streaming--> [pending] (queue, wait for stream end)
  [pending] --manual message--> [idle] (cancel timer, manual takes priority)
  [pending] --toggle off--> [disabled] (cancel timer)
  [analyzing] --ai_done--> [idle] (update lastAnalyzedSnapshot)
  [analyzing] --error--> [idle]
  [idle/pending/analyzing] --toggle off--> [disabled]
```
