package graph

import (
	"strings"
	"testing"

	"github.com/shadowbane1000/designpair/internal/model"
)

func TestBuildPrompt_EmptyGraph(t *testing.T) {
	result := BuildPrompt(model.GraphState{}, Analyze(model.GraphState{}))

	if !strings.Contains(result, "empty") {
		t.Error("expected empty graph prompt to mention 'empty'")
	}
}

func TestBuildPrompt_ReferencesNodeNames(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API Gateway"},
			{ID: "n2", Type: "database", Name: "Users DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Label: "SQL"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "API Gateway") {
		t.Error("expected prompt to reference 'API Gateway' by name")
	}
	if !strings.Contains(result, "Users DB") {
		t.Error("expected prompt to reference 'Users DB' by name")
	}
}

func TestBuildPrompt_ExcludesPositions(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API", Position: model.Position{X: 100, Y: 200}},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if strings.Contains(result, "100") || strings.Contains(result, "200") {
		t.Error("expected prompt to exclude position coordinates")
	}
}

func TestBuildPrompt_ContainsJSONAppendix(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "```json") {
		t.Error("expected prompt to contain JSON appendix")
	}
}

func TestBuildPrompt_IncludesTopologyInsights(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "s3", Type: "service", Name: "Service C"},
			{ID: "db", Type: "database", Name: "Shared DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db"},
			{ID: "e2", Source: "s2", Target: "db"},
			{ID: "e3", Source: "s3", Target: "db"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "fan-in") || !strings.Contains(result, "Shared DB") {
		t.Error("expected prompt to highlight high fan-in for Shared DB")
	}
}

func TestBuildPromptWithPending_ThreeViews(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Label: "SQL", Protocol: "sql"},
		},
	}
	analysis := Analyze(g)
	pending := &PendingSuggestions{
		AddNodes:    []PendingNodeAdd{{Type: "cache", Name: "Redis"}},
		AddEdges:    []PendingEdgeAdd{{Source: "API", Target: "Redis", Protocol: "tcp"}},
		DeleteEdges: []PendingEdgeDelete{{Source: "API", Target: "DB", Protocol: "sql"}},
	}

	prompt := BuildPromptWithPending(g, analysis, pending)

	if !strings.Contains(prompt, "API") || !strings.Contains(prompt, "DB") {
		t.Error("expected committed nodes in prompt")
	}
	if !strings.Contains(prompt, "Proposed Changes") {
		t.Error("expected Proposed Changes section")
	}
	if !strings.Contains(prompt, "ADD node: **Redis**") {
		t.Error("expected pending node addition in proposed changes")
	}
	if !strings.Contains(prompt, "DELETE edge:") {
		t.Error("expected pending edge deletion in proposed changes")
	}
	if !strings.Contains(prompt, "build on the proposed changes") {
		t.Error("expected instruction to build on pending state")
	}
}

func TestBuildAutoAnalyzeUserMessage_WithDelta(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "DB"},
			{ID: "n3", Type: "cache", Name: "Redis"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n3", Protocol: "tcp"},
		},
	}
	analysis := Analyze(g)
	delta := &AutoAnalyzeDelta{
		AddedNodes: []DeltaNode{{Type: "cache", Name: "Redis"}},
		AddedEdges: []DeltaEdge{{Source: "API", Target: "Redis", Protocol: "tcp"}},
	}

	prompt := BuildAutoAnalyzeUserMessage(g, analysis, delta)

	if !strings.Contains(prompt, "Recent Changes") {
		t.Error("expected prompt to contain 'Recent Changes' section")
	}
	if !strings.Contains(prompt, "Redis") {
		t.Error("expected prompt to mention added node 'Redis'")
	}
	if !strings.Contains(prompt, "cache") {
		t.Error("expected prompt to mention node type 'cache'")
	}
	if !strings.Contains(prompt, "API") {
		t.Error("expected prompt to mention edge source 'API'")
	}
	if !strings.Contains(prompt, "comment on these specific changes") {
		t.Error("expected prompt to instruct AI to focus on delta")
	}
}

func TestBuildAutoAnalyzeUserMessage_NilDelta(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}
	analysis := Analyze(g)

	prompt := BuildAutoAnalyzeUserMessage(g, analysis, nil)

	if !strings.Contains(prompt, "first time auto-analyze") {
		t.Error("expected prompt to indicate first-time analysis")
	}
	if !strings.Contains(prompt, "API") {
		t.Error("expected prompt to include architecture overview")
	}
}

func TestBuildAutoAnalyzeUserMessage_WithRemovedNodes(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}
	analysis := Analyze(g)
	delta := &AutoAnalyzeDelta{
		RemovedNodes: []DeltaNode{{Type: "cache", Name: "Redis"}},
		RemovedEdges: []DeltaEdge{{Source: "API", Target: "Redis", Protocol: "tcp"}},
	}

	prompt := BuildAutoAnalyzeUserMessage(g, analysis, delta)

	if !strings.Contains(prompt, "Removed") {
		t.Error("expected prompt to mention removal")
	}
	if !strings.Contains(prompt, "Redis") {
		t.Error("expected prompt to mention removed node")
	}
}

func TestBuildAutoAnalyzeUserMessage_WithModifications(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "Gateway"},
		},
	}
	analysis := Analyze(g)
	delta := &AutoAnalyzeDelta{
		ModifiedNodes: []DeltaModify{{Name: "Gateway", Field: "name", OldValue: "API", NewValue: "Gateway"}},
	}

	prompt := BuildAutoAnalyzeUserMessage(g, analysis, delta)

	if !strings.Contains(prompt, "Modified") {
		t.Error("expected prompt to mention modification")
	}
	if !strings.Contains(prompt, "Gateway") {
		t.Error("expected prompt to mention modified node name")
	}
}

func TestBuildPrompt_IncludesDetectedPatterns(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "ws", Type: "service", Name: "Write Service"},
			{ID: "rs", Type: "service", Name: "Read Service"},
			{ID: "db", Type: "databaseSql", Name: "Primary DB"},
			{ID: "cache", Type: "cache", Name: "Read Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "ws", Target: "db", Protocol: "sql"},
			{ID: "e2", Source: "rs", Target: "cache", Protocol: "tcp"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "Detected Architectural Patterns") {
		t.Error("expected prompt to contain 'Detected Architectural Patterns' section")
	}
	if !strings.Contains(result, "CQRS") {
		t.Error("expected prompt to mention CQRS pattern")
	}
	if !strings.Contains(result, "Write Service") {
		t.Error("expected prompt evidence to reference Write Service")
	}
}

func TestBuildPrompt_NoPatternsSection_WhenNoneDetected(t *testing.T) {
	// Single isolated node — no patterns
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if strings.Contains(result, "Detected Architectural Patterns") {
		t.Error("should not include patterns section when no patterns detected")
	}
}

func TestBuildPromptWithPending_NoPending(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}
	analysis := Analyze(g)

	prompt := BuildPromptWithPending(g, analysis, nil)
	if strings.Contains(prompt, "Proposed Changes") {
		t.Error("should not contain Proposed Changes when no pending suggestions")
	}

	prompt = BuildPromptWithPending(g, analysis, &PendingSuggestions{})
	if strings.Contains(prompt, "Proposed Changes") {
		t.Error("should not contain Proposed Changes when pending is empty")
	}
}

func TestBuildPrompt_IncludesAnnotations(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API", Annotation: "Handles all public REST endpoints"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "Handles all public REST endpoints") {
		t.Error("expected prompt to include annotation text")
	}
}

func TestBuildPrompt_AnnotationInJSON(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API", Annotation: "Main entry point"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, `"annotation": "Main entry point"`) {
		t.Error("expected JSON appendix to include annotation field")
	}
}

func TestBuildPrompt_NoAnnotation_OmittedFromJSON(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if strings.Contains(result, `"annotation"`) {
		t.Error("expected JSON appendix to omit annotation when empty")
	}
}

func TestBuildPromptWithPending_AllSuggestionTypes(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "DB"},
			{ID: "n3", Type: "cache", Name: "Redis"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Label: "SQL", Protocol: "sql"},
			{ID: "e2", Source: "n1", Target: "n3", Label: "TCP", Protocol: "tcp"},
		},
	}
	analysis := Analyze(g)
	pending := &PendingSuggestions{
		AddNodes:    []PendingNodeAdd{{Type: "messageQueue", Name: "Kafka"}},
		AddEdges:    []PendingEdgeAdd{{Source: "API", Target: "Kafka", Protocol: "pubsub"}},
		DeleteNodes: []string{"Redis"},
		DeleteEdges: []PendingEdgeDelete{{Source: "API", Target: "Redis", Protocol: "tcp"}},
		ModifyNodes: []PendingNodeModify{{Name: "API", NewName: "Gateway"}},
		ModifyEdges: []PendingEdgeModify{{Source: "API", Target: "DB", NewProtocol: "grpc", NewDirection: "bidirectional"}},
	}

	prompt := BuildPromptWithPending(g, analysis, pending)

	if !strings.Contains(prompt, "ADD node: **Kafka** (messageQueue)") {
		t.Error("expected pending node addition for Kafka")
	}
	if !strings.Contains(prompt, "DELETE node: **Redis**") {
		t.Error("expected pending node deletion for Redis")
	}
	if !strings.Contains(prompt, "MODIFY node: **API** → rename to **Gateway**") {
		t.Error("expected pending node modification")
	}
	if !strings.Contains(prompt, "ADD edge: API → Kafka") {
		t.Error("expected pending edge addition")
	}
	if !strings.Contains(prompt, "DELETE edge: API → Redis") {
		t.Error("expected pending edge deletion")
	}
	if !strings.Contains(prompt, "MODIFY edge: API → DB") {
		t.Error("expected pending edge modification")
	}
	if !strings.Contains(prompt, "protocol→grpc") {
		t.Error("expected protocol change in edge modification")
	}
	if !strings.Contains(prompt, "direction→bidirectional") {
		t.Error("expected direction change in edge modification")
	}
}

func TestBuildAutoAnalyzeUserMessage_AllDeltaTypes(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "sql"},
		},
	}
	analysis := Analyze(g)
	delta := &AutoAnalyzeDelta{
		AddedNodes:    []DeltaNode{{Type: "cache", Name: "Redis"}},
		RemovedNodes:  []DeltaNode{{Type: "messageQueue", Name: "OldQueue"}},
		AddedEdges:    []DeltaEdge{{Source: "API", Target: "Redis", Protocol: "tcp"}},
		RemovedEdges:  []DeltaEdge{{Source: "API", Target: "OldQueue", Protocol: ""}},
		ModifiedNodes: []DeltaModify{{Name: "DB", Field: "name", OldValue: "Database", NewValue: "DB"}},
		ModifiedEdges: []DeltaModify{{Name: "API→DB", Field: "protocol", OldValue: "http", NewValue: "sql"}},
	}

	prompt := BuildAutoAnalyzeUserMessage(g, analysis, delta)

	if !strings.Contains(prompt, "**Added** component: Redis (cache)") {
		t.Error("expected added node in delta")
	}
	if !strings.Contains(prompt, "**Removed** component: OldQueue (messageQueue)") {
		t.Error("expected removed node in delta")
	}
	if !strings.Contains(prompt, "**Added** connection: API → Redis [tcp]") {
		t.Error("expected added edge in delta")
	}
	if !strings.Contains(prompt, "**Removed** connection: API → OldQueue [unspecified protocol]") {
		t.Error("expected removed edge with unspecified protocol")
	}
	if !strings.Contains(prompt, "**Modified** component DB:") {
		t.Error("expected modified node in delta")
	}
	if !strings.Contains(prompt, "**Modified** connection API→DB:") {
		t.Error("expected modified edge in delta")
	}
}

func TestBuildPrompt_CycleInTopology(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "a", Type: "service", Name: "ServiceA"},
			{ID: "b", Type: "service", Name: "ServiceB"},
			{ID: "c", Type: "service", Name: "ServiceC"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "a", Target: "b", Label: "HTTP"},
			{ID: "e2", Source: "b", Target: "c", Label: "gRPC"},
			{ID: "e3", Source: "c", Target: "a", Label: "HTTP"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "Circular dependency") {
		t.Error("expected prompt to mention circular dependency for cycle")
	}
}

func TestBuildPrompt_BidirectionalEdges(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "a", Type: "service", Name: "ServiceA"},
			{ID: "b", Type: "service", Name: "ServiceB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "a", Target: "b", Label: "gRPC", Direction: "bidirectional", Protocol: "grpc"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "Bidirectional") {
		t.Error("expected prompt to highlight bidirectional dependencies")
	}
	if !strings.Contains(result, "ServiceA") || !strings.Contains(result, "ServiceB") {
		t.Error("expected bidirectional edge to reference both service names")
	}
}

func TestBuildPrompt_HighFanOutWarning(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "gw", Type: "apiGateway", Name: "Gateway"},
			{ID: "s1", Type: "service", Name: "S1"},
			{ID: "s2", Type: "service", Name: "S2"},
			{ID: "s3", Type: "service", Name: "S3"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "gw", Target: "s1"},
			{ID: "e2", Source: "gw", Target: "s2"},
			{ID: "e3", Source: "gw", Target: "s3"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "High fan-out") || !strings.Contains(result, "Gateway") {
		t.Error("expected high fan-out warning for Gateway with 3 outgoing connections")
	}
}

func TestBuildPrompt_DisconnectedSubgraphs(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "a", Type: "service", Name: "A"},
			{ID: "b", Type: "service", Name: "B"},
			{ID: "c", Type: "service", Name: "C"},
			{ID: "d", Type: "service", Name: "D"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "a", Target: "b"},
			{ID: "e2", Source: "c", Target: "d"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "Disconnected subgraphs") {
		t.Error("expected prompt to mention disconnected subgraphs")
	}
}

func TestBuildPrompt_SyncChainDepth(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "a", Type: "service", Name: "A"},
			{ID: "b", Type: "service", Name: "B"},
			{ID: "c", Type: "service", Name: "C"},
			{ID: "d", Type: "service", Name: "D"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "a", Target: "b", SyncAsync: "sync"},
			{ID: "e2", Source: "b", Target: "c", SyncAsync: "sync"},
			{ID: "e3", Source: "c", Target: "d", SyncAsync: "sync"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "Sync chain depth") {
		t.Error("expected prompt to mention sync chain depth for 3-hop chain")
	}
}

func TestBuildPrompt_ReplicaCount(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API", ReplicaCount: 3},
			{ID: "n2", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2"},
		},
	}

	result := BuildPrompt(g, Analyze(g))

	if !strings.Contains(result, "3 replicas") {
		t.Error("expected prompt to mention replica count")
	}
	if !strings.Contains(result, "Scaled services") {
		t.Error("expected prompt to mention scaled services")
	}
}

func TestBuildPromptWithPending_EdgeModifyProtocolOnly(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "n1", Type: "service", Name: "API"},
			{ID: "n2", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "n1", Target: "n2", Protocol: "http"},
		},
	}
	analysis := Analyze(g)
	pending := &PendingSuggestions{
		ModifyEdges: []PendingEdgeModify{{Source: "API", Target: "DB", NewProtocol: "grpc"}},
	}

	prompt := BuildPromptWithPending(g, analysis, pending)

	if !strings.Contains(prompt, "protocol→grpc") {
		t.Error("expected protocol modification in pending changes")
	}
	// Should NOT have direction since NewDirection is empty
	if strings.Contains(prompt, "direction→") {
		t.Error("should not include direction when NewDirection is empty")
	}
}
