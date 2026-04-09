package graph

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/shadowbane1000/designpair/internal/model"
)

// BuildPrompt constructs a hybrid prompt: natural language topology summary + JSON appendix.
// Positions are excluded from the summary per constitution Principle II (Graph Semantics Over Pixels).
func BuildPrompt(g model.GraphState, analysis TopologyAnalysis) string {
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

func nodeByIDLookup(nodes []model.GraphNode, id string) string {
	for _, n := range nodes {
		if n.ID == id {
			return n.Name
		}
	}
	return id
}
