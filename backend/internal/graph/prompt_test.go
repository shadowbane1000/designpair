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
