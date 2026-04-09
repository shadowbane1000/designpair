package graph

import (
	"testing"

	"github.com/shadowbane1000/designpair/internal/model"
)

func TestAnalyze_EmptyGraph(t *testing.T) {
	result := Analyze(model.GraphState{})

	if len(result.EntryPoints) != 0 {
		t.Errorf("expected no entry points, got %v", result.EntryPoints)
	}
	if len(result.LeafNodes) != 0 {
		t.Errorf("expected no leaf nodes, got %v", result.LeafNodes)
	}
	if result.ConnectedComponents != 0 {
		t.Errorf("expected 0 components, got %d", result.ConnectedComponents)
	}
}

func TestAnalyze_LinearChain(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "a", Type: "loadBalancer", Name: "LB"},
			{ID: "b", Type: "service", Name: "API"},
			{ID: "c", Type: "database", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "a", Target: "b", Label: "HTTP"},
			{ID: "e2", Source: "b", Target: "c", Label: "SQL"},
		},
	}

	result := Analyze(g)

	if len(result.EntryPoints) != 1 || result.EntryPoints[0] != "LB" {
		t.Errorf("expected entry point LB, got %v", result.EntryPoints)
	}
	if len(result.LeafNodes) != 1 || result.LeafNodes[0] != "DB" {
		t.Errorf("expected leaf node DB, got %v", result.LeafNodes)
	}
	if result.FanOut["LB"] != 1 {
		t.Errorf("expected LB fan-out 1, got %d", result.FanOut["LB"])
	}
	if result.FanIn["DB"] != 1 {
		t.Errorf("expected DB fan-in 1, got %d", result.FanIn["DB"])
	}
	if result.ConnectedComponents != 1 {
		t.Errorf("expected 1 component, got %d", result.ConnectedComponents)
	}
	if result.EdgeProtocols["HTTP"] != 1 || result.EdgeProtocols["SQL"] != 1 {
		t.Errorf("expected HTTP:1, SQL:1, got %v", result.EdgeProtocols)
	}
}

func TestAnalyze_FanOut(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "lb", Type: "loadBalancer", Name: "LB"},
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "s3", Type: "service", Name: "Service C"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "lb", Target: "s1", Label: "HTTP"},
			{ID: "e2", Source: "lb", Target: "s2", Label: "HTTP"},
			{ID: "e3", Source: "lb", Target: "s3", Label: "HTTP"},
		},
	}

	result := Analyze(g)

	if result.FanOut["LB"] != 3 {
		t.Errorf("expected LB fan-out 3, got %d", result.FanOut["LB"])
	}
}

func TestAnalyze_SharedDatabase(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "s3", Type: "service", Name: "Service C"},
			{ID: "db", Type: "database", Name: "Shared DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db", Label: "SQL"},
			{ID: "e2", Source: "s2", Target: "db", Label: "SQL"},
			{ID: "e3", Source: "s3", Target: "db", Label: "SQL"},
		},
	}

	result := Analyze(g)

	if result.FanIn["Shared DB"] != 3 {
		t.Errorf("expected Shared DB fan-in 3, got %d", result.FanIn["Shared DB"])
	}
}

func TestAnalyze_CycleDetection(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "a", Type: "service", Name: "A"},
			{ID: "b", Type: "service", Name: "B"},
			{ID: "c", Type: "service", Name: "C"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "a", Target: "b"},
			{ID: "e2", Source: "b", Target: "c"},
			{ID: "e3", Source: "c", Target: "a"},
		},
	}

	result := Analyze(g)

	if len(result.Cycles) == 0 {
		t.Error("expected at least one cycle, got none")
	}
}

func TestAnalyze_DisconnectedComponents(t *testing.T) {
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

	result := Analyze(g)

	if result.ConnectedComponents != 2 {
		t.Errorf("expected 2 components, got %d", result.ConnectedComponents)
	}
}

func TestAnalyze_SinglePointOfFailure(t *testing.T) {
	// A → B → C (B is articulation point)
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "a", Type: "service", Name: "A"},
			{ID: "b", Type: "service", Name: "B"},
			{ID: "c", Type: "service", Name: "C"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "a", Target: "b"},
			{ID: "e2", Source: "b", Target: "c"},
		},
	}

	result := Analyze(g)

	found := false
	for _, name := range result.SinglePointsOfFailure {
		if name == "B" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected B as single point of failure, got %v", result.SinglePointsOfFailure)
	}
}

func TestAnalyze_NodesByType(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "S1"},
			{ID: "s2", Type: "service", Name: "S2"},
			{ID: "db", Type: "database", Name: "DB"},
			{ID: "cache", Type: "cache", Name: "Cache"},
		},
	}

	result := Analyze(g)

	if result.NodesByType["service"] != 2 {
		t.Errorf("expected 2 services, got %d", result.NodesByType["service"])
	}
	if result.NodesByType["database"] != 1 {
		t.Errorf("expected 1 database, got %d", result.NodesByType["database"])
	}
}
