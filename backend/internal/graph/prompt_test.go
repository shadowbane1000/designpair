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
