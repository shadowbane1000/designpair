package graph

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/shadowbane1000/designpair/internal/model"
)

// PendingSuggestions holds the pending changes for three-view prompt generation.
type PendingSuggestions struct {
	AddNodes    []PendingNodeAdd
	AddEdges    []PendingEdgeAdd
	DeleteNodes []string // node names
	DeleteEdges []PendingEdgeDelete
	ModifyNodes []PendingNodeModify
	ModifyEdges []PendingEdgeModify
}

type PendingNodeAdd struct {
	Type string
	Name string
}

type PendingEdgeAdd struct {
	Source, Target, Protocol, Direction string
}

type PendingEdgeDelete struct {
	Source, Target, Protocol, Direction string
}

type PendingNodeModify struct {
	Name, NewName string
}

type PendingEdgeModify struct {
	Source, Target, NewProtocol, NewDirection string
}

// HasPending returns true if there are any pending suggestions.
func (p *PendingSuggestions) HasPending() bool {
	return p != nil &&
		(len(p.AddNodes) > 0 || len(p.AddEdges) > 0 ||
			len(p.DeleteNodes) > 0 || len(p.DeleteEdges) > 0 ||
			len(p.ModifyNodes) > 0 || len(p.ModifyEdges) > 0)
}

// BuildPrompt constructs a hybrid prompt: natural language topology summary + JSON appendix.
// Positions are excluded from the summary per constitution Principle II (Graph Semantics Over Pixels).
func BuildPrompt(g model.GraphState, analysis TopologyAnalysis) string {
	return BuildPromptWithPending(g, analysis, nil)
}

// BuildPromptWithPending constructs a three-view prompt when pending suggestions exist.
// View 1: Current Architecture (committed only)
// View 2: Proposed Changes (list of pending operations)
// View 3: Architecture After Approval (merged)
func BuildPromptWithPending(g model.GraphState, analysis TopologyAnalysis, pending *PendingSuggestions) string {
	if len(g.Nodes) == 0 {
		return "The architecture canvas is currently empty. There are no components or connections to analyze. Consider suggesting where the user might start based on common architecture patterns."
	}

	var b strings.Builder

	b.WriteString("## Architecture Overview\n\n")

	// Component summary
	b.WriteString(fmt.Sprintf("The diagram contains %d component(s) and %d connection(s).\n\n", len(g.Nodes), len(g.Edges)))

	// Components by type
	b.WriteString("### Components\n")
	for _, n := range g.Nodes {
		if n.ReplicaCount > 1 {
			b.WriteString(fmt.Sprintf("- **%s** (%s, ×%d replicas)\n", n.Name, n.Type, n.ReplicaCount))
		} else {
			b.WriteString(fmt.Sprintf("- **%s** (%s)\n", n.Name, n.Type))
		}
	}
	b.WriteString("\n")

	// Connections
	if len(g.Edges) > 0 {
		nodeByID := make(map[string]string)
		for _, n := range g.Nodes {
			nodeByID[n.ID] = n.Name
		}

		b.WriteString("### Connections\n")
		for _, e := range g.Edges {
			label := e.Label
			if label == "" {
				label = "→"
			} else {
				label = fmt.Sprintf("→ [%s] →", label)
			}
			b.WriteString(fmt.Sprintf("- %s %s %s\n", nodeByID[e.Source], label, nodeByID[e.Target]))
		}
		b.WriteString("\n")
	}

	// Topology insights
	b.WriteString("### Topology Analysis\n")

	if len(analysis.EntryPoints) > 0 {
		b.WriteString(fmt.Sprintf("- **Entry points** (no incoming connections): %s\n", strings.Join(analysis.EntryPoints, ", ")))
	}
	if len(analysis.LeafNodes) > 0 {
		b.WriteString(fmt.Sprintf("- **Leaf nodes** (no outgoing connections): %s\n", strings.Join(analysis.LeafNodes, ", ")))
	}

	// High fan-in (potential bottlenecks)
	for name, count := range analysis.FanIn {
		if count >= 3 {
			b.WriteString(fmt.Sprintf("- **High fan-in**: %s has %d incoming connections (potential bottleneck)\n", name, count))
		}
	}

	// High fan-out (coupling risk)
	for name, count := range analysis.FanOut {
		if count >= 3 {
			b.WriteString(fmt.Sprintf("- **High fan-out**: %s has %d outgoing connections (coupling risk)\n", name, count))
		}
	}

	// Scaled services
	if len(analysis.ScaledNodes) > 0 {
		scaled := make([]string, 0, len(analysis.ScaledNodes))
		for name, count := range analysis.ScaledNodes {
			scaled = append(scaled, fmt.Sprintf("%s (×%d)", name, count))
		}
		b.WriteString(fmt.Sprintf("- **Scaled services**: %s\n", strings.Join(scaled, ", ")))
	}

	if len(analysis.SinglePointsOfFailure) > 0 {
		b.WriteString(fmt.Sprintf("- **Single points of failure**: %s\n", strings.Join(analysis.SinglePointsOfFailure, ", ")))
	}

	if len(analysis.Cycles) > 0 {
		for _, cycle := range analysis.Cycles {
			b.WriteString(fmt.Sprintf("- **Circular dependency detected**: %s\n", strings.Join(cycle, " → ")))
		}
	}

	if analysis.ConnectedComponents > 1 {
		b.WriteString(fmt.Sprintf("- **Disconnected subgraphs**: %d separate groups of components (possibly missing connections)\n", analysis.ConnectedComponents))
	}

	// Protocol distribution
	if len(analysis.EdgeProtocols) > 0 {
		protocols := make([]string, 0, len(analysis.EdgeProtocols))
		for proto, count := range analysis.EdgeProtocols {
			protocols = append(protocols, fmt.Sprintf("%s (%d)", proto, count))
		}
		b.WriteString(fmt.Sprintf("- **Connection types**: %s\n", strings.Join(protocols, ", ")))
	}

	// Connection analysis
	if len(analysis.ProtocolDistribution) > 0 || analysis.SyncChainDepth > 0 || len(analysis.BidirectionalEdges) > 0 {
		b.WriteString("\n### Connection Analysis\n")

		if analysis.SyncChainDepth >= 3 {
			b.WriteString(fmt.Sprintf("- **Sync chain depth**: %d hops (latency and failure cascade risk)\n", analysis.SyncChainDepth))
		}

		if len(analysis.AsyncBoundaries) > 0 {
			b.WriteString(fmt.Sprintf("- **Async boundaries**: %s\n", strings.Join(analysis.AsyncBoundaries, "; ")))
		}

		if len(analysis.BidirectionalEdges) > 0 {
			b.WriteString(fmt.Sprintf("- **Bidirectional dependencies** (tight coupling): %s\n", strings.Join(analysis.BidirectionalEdges, ", ")))
		}

		if len(analysis.ProtocolDistribution) > 0 {
			protos := make([]string, 0, len(analysis.ProtocolDistribution))
			for proto, count := range analysis.ProtocolDistribution {
				protos = append(protos, fmt.Sprintf("%s (%d)", proto, count))
			}
			b.WriteString(fmt.Sprintf("- **Protocol distribution**: %s\n", strings.Join(protos, ", ")))
		}
	}

	b.WriteString("\n")

	// Three-view: Proposed Changes section
	if pending.HasPending() {
		b.WriteString("### Proposed Changes (Pending Approval)\n")
		for _, n := range pending.AddNodes {
			b.WriteString(fmt.Sprintf("- ADD node: **%s** (%s)\n", n.Name, n.Type))
		}
		for _, name := range pending.DeleteNodes {
			b.WriteString(fmt.Sprintf("- DELETE node: **%s**\n", name))
		}
		for _, m := range pending.ModifyNodes {
			if m.NewName != "" {
				b.WriteString(fmt.Sprintf("- MODIFY node: **%s** → rename to **%s**\n", m.Name, m.NewName))
			}
		}
		for _, e := range pending.AddEdges {
			proto := e.Protocol
			if proto == "" {
				proto = "unspecified"
			}
			b.WriteString(fmt.Sprintf("- ADD edge: %s → %s [%s]\n", e.Source, e.Target, proto))
		}
		for _, e := range pending.DeleteEdges {
			proto := e.Protocol
			if proto == "" {
				proto = "unspecified"
			}
			b.WriteString(fmt.Sprintf("- DELETE edge: %s → %s [%s]\n", e.Source, e.Target, proto))
		}
		for _, e := range pending.ModifyEdges {
			changes := []string{}
			if e.NewProtocol != "" {
				changes = append(changes, fmt.Sprintf("protocol→%s", e.NewProtocol))
			}
			if e.NewDirection != "" {
				changes = append(changes, fmt.Sprintf("direction→%s", e.NewDirection))
			}
			b.WriteString(fmt.Sprintf("- MODIFY edge: %s → %s (%s)\n", e.Source, e.Target, strings.Join(changes, ", ")))
		}
		b.WriteString("\nWhen making further suggestions, build on the proposed changes above. The user has not yet approved or discarded them.\n\n")
	}

	// JSON appendix (without positions)
	type nodeCompact struct {
		ID   string `json:"id"`
		Type string `json:"type"`
		Name string `json:"name"`
	}
	type edgeCompact struct {
		Source string `json:"source"`
		Target string `json:"target"`
		Label  string `json:"label,omitempty"`
	}

	compactNodes := make([]nodeCompact, len(g.Nodes))
	for i, n := range g.Nodes {
		compactNodes[i] = nodeCompact{ID: n.ID, Type: n.Type, Name: n.Name}
	}
	compactEdges := make([]edgeCompact, len(g.Edges))
	for i, e := range g.Edges {
		compactEdges[i] = edgeCompact{Source: nodeByIDLookup(g.Nodes, e.Source), Target: nodeByIDLookup(g.Nodes, e.Target), Label: e.Label}
	}

	jsonData, _ := json.MarshalIndent(struct {
		Nodes []nodeCompact `json:"nodes"`
		Edges []edgeCompact `json:"edges"`
	}{Nodes: compactNodes, Edges: compactEdges}, "", "  ")

	b.WriteString("### Raw Graph Data\n")
	b.WriteString("```json\n")
	b.Write(jsonData)
	b.WriteString("\n```\n")

	return b.String()
}

// DeltaNode describes a node in a graph delta.
type DeltaNode struct {
	Type string
	Name string
}

// DeltaEdge describes an edge in a graph delta.
type DeltaEdge struct {
	Source, Target, Protocol string
}

// DeltaModify describes a property change.
type DeltaModify struct {
	Name, Field, OldValue, NewValue string
}

// AutoAnalyzeDelta holds the delta between graph snapshots for auto-analysis.
type AutoAnalyzeDelta struct {
	AddedNodes    []DeltaNode
	RemovedNodes  []DeltaNode
	AddedEdges    []DeltaEdge
	RemovedEdges  []DeltaEdge
	ModifiedNodes []DeltaModify
	ModifiedEdges []DeltaModify
}

// BuildAutoAnalyzeUserMessage constructs the user message for auto-analysis.
// It includes the full architecture overview plus a delta description.
func BuildAutoAnalyzeUserMessage(g model.GraphState, analysis TopologyAnalysis, delta *AutoAnalyzeDelta) string {
	var b strings.Builder

	// Always include the current architecture for context
	architecturePrompt := BuildPrompt(g, analysis)
	b.WriteString(architecturePrompt)

	if delta != nil {
		b.WriteString("\n## Recent Changes\n\n")
		b.WriteString("The user just made the following changes to their architecture:\n\n")

		for _, n := range delta.AddedNodes {
			b.WriteString(fmt.Sprintf("- **Added** component: %s (%s)\n", n.Name, n.Type))
		}
		for _, n := range delta.RemovedNodes {
			b.WriteString(fmt.Sprintf("- **Removed** component: %s (%s)\n", n.Name, n.Type))
		}
		for _, e := range delta.AddedEdges {
			proto := e.Protocol
			if proto == "" {
				proto = "unspecified protocol"
			}
			b.WriteString(fmt.Sprintf("- **Added** connection: %s → %s [%s]\n", e.Source, e.Target, proto))
		}
		for _, e := range delta.RemovedEdges {
			proto := e.Protocol
			if proto == "" {
				proto = "unspecified protocol"
			}
			b.WriteString(fmt.Sprintf("- **Removed** connection: %s → %s [%s]\n", e.Source, e.Target, proto))
		}
		for _, m := range delta.ModifiedNodes {
			b.WriteString(fmt.Sprintf("- **Modified** component %s: %s changed from %q to %q\n", m.Name, m.Field, m.OldValue, m.NewValue))
		}
		for _, m := range delta.ModifiedEdges {
			b.WriteString(fmt.Sprintf("- **Modified** connection %s: %s changed from %q to %q\n", m.Name, m.Field, m.OldValue, m.NewValue))
		}

		b.WriteString("\nPlease comment on these specific changes and their architectural implications.")
	} else {
		b.WriteString("\nThis is the first time auto-analyze is running. Please provide an initial architectural assessment.")
	}

	return b.String()
}

func nodeByIDLookup(nodes []model.GraphNode, id string) string {
	for _, n := range nodes {
		if n.ID == id {
			return n.Name
		}
	}
	return id
}
