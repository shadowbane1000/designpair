package graph

import (
	"testing"

	"github.com/shadowbane1000/designpair/internal/model"
)

func hasPattern(patterns []DetectedPattern, name string) bool {
	for _, p := range patterns {
		if p.Name == name {
			return true
		}
	}
	return false
}

func getPattern(patterns []DetectedPattern, name string) *DetectedPattern {
	for i := range patterns {
		if patterns[i].Name == name {
			return &patterns[i]
		}
	}
	return nil
}

func TestDetectPatterns_EmptyGraph(t *testing.T) {
	g := model.GraphState{}
	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if len(patterns) != 0 {
		t.Errorf("expected no patterns for empty graph, got %v", patterns)
	}
}

func TestDetectPatterns_CQRS(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "ws", Type: "service", Name: "Write Service"},
			{ID: "rs", Type: "service", Name: "Read Service"},
			{ID: "db", Type: "databaseSql", Name: "Primary DB"},
			{ID: "cache", Type: "cache", Name: "Read Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "ws", Target: "db", Label: "SQL", Protocol: "sql"},
			{ID: "e2", Source: "rs", Target: "cache", Label: "TCP", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "CQRS") {
		t.Errorf("expected CQRS pattern, got %v", patterns)
	}

	p := getPattern(patterns, "CQRS")
	if len(p.Evidence) < 2 {
		t.Errorf("expected at least 2 evidence items, got %d", len(p.Evidence))
	}
}

func TestDetectPatterns_CQRS_NegativeSameService(t *testing.T) {
	// Same service writes to DB and reads from cache — not CQRS
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s", Type: "service", Name: "API"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
			{ID: "cache", Type: "cache", Name: "Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s", Target: "db", Protocol: "sql"},
			{ID: "e2", Source: "s", Target: "cache", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "CQRS") {
		t.Error("should not detect CQRS when same service handles both read and write")
	}
}

func TestDetectPatterns_CQRS_NegativeNoReadStore(t *testing.T) {
	// Two services both writing to databases — no read store
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "db1", Type: "databaseSql", Name: "DB1"},
			{ID: "db2", Type: "databaseSql", Name: "DB2"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db1"},
			{ID: "e2", Source: "s2", Target: "db2"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "CQRS") {
		t.Error("should not detect CQRS without a read store (cache)")
	}
}

func TestDetectPatterns_EventSourcing(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "svc", Type: "service", Name: "Order Service"},
			{ID: "bus", Type: "eventBus", Name: "Event Bus"},
			{ID: "proj1", Type: "service", Name: "Projection A"},
			{ID: "proj2", Type: "service", Name: "Projection B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "svc", Target: "bus", Protocol: "pubsub", SyncAsync: "async"},
			{ID: "e2", Source: "bus", Target: "proj1", Protocol: "pubsub", SyncAsync: "async"},
			{ID: "e3", Source: "bus", Target: "proj2", Protocol: "pubsub", SyncAsync: "async"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Event Sourcing") {
		t.Errorf("expected Event Sourcing pattern, got %v", patterns)
	}
}

func TestDetectPatterns_EventSourcing_NegativeSingleConsumer(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "svc", Type: "service", Name: "Producer"},
			{ID: "bus", Type: "eventBus", Name: "Bus"},
			{ID: "c1", Type: "service", Name: "Consumer"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "svc", Target: "bus"},
			{ID: "e2", Source: "bus", Target: "c1"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Event Sourcing") {
		t.Error("should not detect Event Sourcing with only 1 consumer")
	}
}

func TestDetectPatterns_Saga(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Order Service"},
			{ID: "q1", Type: "messageQueue", Name: "Order Queue"},
			{ID: "s2", Type: "service", Name: "Payment Service"},
			{ID: "q2", Type: "messageQueue", Name: "Payment Queue"},
			{ID: "s3", Type: "service", Name: "Inventory Service"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "q1", Protocol: "async", SyncAsync: "async"},
			{ID: "e2", Source: "q1", Target: "s2"},
			{ID: "e3", Source: "s2", Target: "q2", Protocol: "async", SyncAsync: "async"},
			{ID: "e4", Source: "q2", Target: "s3"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Saga") {
		t.Errorf("expected Saga pattern, got %v", patterns)
	}
}

func TestDetectPatterns_Saga_NegativeTooFewServices(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "q", Type: "messageQueue", Name: "Queue"},
			{ID: "s2", Type: "service", Name: "Service B"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "q", Protocol: "async", SyncAsync: "async"},
			{ID: "e2", Source: "q", Target: "s2"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Saga") {
		t.Error("should not detect Saga with fewer than 3 services")
	}
}

func TestDetectPatterns_FanOut(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "lb", Type: "loadBalancer", Name: "LB"},
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "s3", Type: "service", Name: "Service C"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "lb", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "lb", Target: "s2", Protocol: "http"},
			{ID: "e3", Source: "lb", Target: "s3", Protocol: "http"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Fan-out") {
		t.Errorf("expected Fan-out pattern, got %v", patterns)
	}
}

func TestDetectPatterns_FanOut_NegativeMixedTypes(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s", Type: "service", Name: "API"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
			{ID: "cache", Type: "cache", Name: "Cache"},
			{ID: "q", Type: "messageQueue", Name: "Queue"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s", Target: "db"},
			{ID: "e2", Source: "s", Target: "cache"},
			{ID: "e3", Source: "s", Target: "q"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Fan-out") {
		t.Error("should not detect Fan-out when targets are different types")
	}
}

func TestDetectPatterns_APIGateway(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Web App"},
			{ID: "gw", Type: "apiGateway", Name: "API Gateway"},
			{ID: "s1", Type: "service", Name: "User Service"},
			{ID: "s2", Type: "service", Name: "Order Service"},
		},
		Edges: []model.GraphEdge{
			{ID: "e0", Source: "client", Target: "gw", Protocol: "http"},
			{ID: "e1", Source: "gw", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "gw", Target: "s2", Protocol: "http"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "API Gateway") {
		t.Errorf("expected API Gateway pattern, got %v", patterns)
	}

	p := getPattern(patterns, "API Gateway")
	if len(p.Evidence) < 2 {
		t.Errorf("expected at least 2 evidence items (routes + client), got %d", len(p.Evidence))
	}
}

func TestDetectPatterns_APIGateway_NegativeOneService(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "gw", Type: "apiGateway", Name: "Gateway"},
			{ID: "s1", Type: "service", Name: "Service"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "gw", Target: "s1"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "API Gateway") {
		t.Error("should not detect API Gateway with only 1 downstream service")
	}
}

func TestDetectPatterns_Microservices(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "User Service"},
			{ID: "db1", Type: "databaseSql", Name: "User DB"},
			{ID: "s2", Type: "service", Name: "Order Service"},
			{ID: "db2", Type: "databaseSql", Name: "Order DB"},
			{ID: "s3", Type: "service", Name: "Product Service"},
			{ID: "db3", Type: "databaseNosql", Name: "Product DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db1", Protocol: "sql"},
			{ID: "e2", Source: "s2", Target: "db2", Protocol: "sql"},
			{ID: "e3", Source: "s3", Target: "db3", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Microservices") {
		t.Errorf("expected Microservices pattern, got %v", patterns)
	}

	p := getPattern(patterns, "Microservices")
	if len(p.Evidence) != 3 {
		t.Errorf("expected 3 evidence items, got %d", len(p.Evidence))
	}
}

func TestDetectPatterns_Microservices_NegativeSharedDB(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "s3", Type: "service", Name: "Service C"},
			{ID: "db", Type: "databaseSql", Name: "Shared DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db"},
			{ID: "e2", Source: "s2", Target: "db"},
			{ID: "e3", Source: "s3", Target: "db"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Microservices") {
		t.Error("should not detect Microservices when all services share one database")
	}
}

func TestDetectPatterns_Monolith(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Browser"},
			{ID: "app", Type: "service", Name: "Monolith App"},
			{ID: "db", Type: "databaseSql", Name: "Database"},
			{ID: "cache", Type: "cache", Name: "Cache"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "client", Target: "app", Protocol: "http"},
			{ID: "e2", Source: "app", Target: "db", Protocol: "sql"},
			{ID: "e3", Source: "app", Target: "cache", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "Monolith") {
		t.Errorf("expected Monolith pattern, got %v", patterns)
	}
}

func TestDetectPatterns_Monolith_NegativeMultipleServices(t *testing.T) {
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "s1", Type: "service", Name: "Service A"},
			{ID: "s2", Type: "service", Name: "Service B"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "s1", Target: "db"},
			{ID: "e2", Source: "s2", Target: "db"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if hasPattern(patterns, "Monolith") {
		t.Error("should not detect Monolith when multiple services exist")
	}
}

func TestDetectPatterns_MultiplePatterns(t *testing.T) {
	// API Gateway + Microservices
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Web App"},
			{ID: "gw", Type: "apiGateway", Name: "API Gateway"},
			{ID: "s1", Type: "service", Name: "User Service"},
			{ID: "db1", Type: "databaseSql", Name: "User DB"},
			{ID: "s2", Type: "service", Name: "Order Service"},
			{ID: "db2", Type: "databaseSql", Name: "Order DB"},
			{ID: "s3", Type: "service", Name: "Product Service"},
			{ID: "db3", Type: "databaseNosql", Name: "Product DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e0", Source: "client", Target: "gw", Protocol: "http"},
			{ID: "e1", Source: "gw", Target: "s1", Protocol: "http"},
			{ID: "e2", Source: "gw", Target: "s2", Protocol: "http"},
			{ID: "e3", Source: "gw", Target: "s3", Protocol: "http"},
			{ID: "e4", Source: "s1", Target: "db1", Protocol: "sql"},
			{ID: "e5", Source: "s2", Target: "db2", Protocol: "sql"},
			{ID: "e6", Source: "s3", Target: "db3", Protocol: "tcp"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	if !hasPattern(patterns, "API Gateway") {
		t.Error("expected API Gateway pattern in multi-pattern graph")
	}
	if !hasPattern(patterns, "Microservices") {
		t.Error("expected Microservices pattern in multi-pattern graph")
	}
	if !hasPattern(patterns, "Fan-out") {
		t.Error("expected Fan-out pattern in multi-pattern graph (gateway fans out to 3 services)")
	}
}

func TestDetectPatterns_NoFalsePositivesLinearChain(t *testing.T) {
	// Simple linear: LB -> API -> DB should not trigger complex patterns
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "lb", Type: "loadBalancer", Name: "LB"},
			{ID: "api", Type: "service", Name: "API"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "lb", Target: "api", Protocol: "http"},
			{ID: "e2", Source: "api", Target: "db", Protocol: "sql"},
		},
	}

	analysis := Analyze(g)
	patterns := DetectPatterns(g, analysis)

	for _, p := range patterns {
		switch p.Name {
		case "CQRS", "Event Sourcing", "Saga", "Fan-out", "Microservices":
			t.Errorf("unexpected pattern %q for simple linear chain", p.Name)
		}
	}
}

func TestDetectPatterns_IntegratedViaAnalyze(t *testing.T) {
	// Verify patterns are accessible via Analyze()
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "client", Type: "webClient", Name: "Browser"},
			{ID: "app", Type: "service", Name: "App"},
			{ID: "db", Type: "databaseSql", Name: "DB"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "client", Target: "app"},
			{ID: "e2", Source: "app", Target: "db"},
		},
	}

	analysis := Analyze(g)

	if analysis.DetectedPatterns == nil {
		t.Error("expected DetectedPatterns to be populated by Analyze()")
	}
	if !hasPattern(analysis.DetectedPatterns, "Monolith") {
		t.Errorf("expected Monolith from Analyze(), got %v", analysis.DetectedPatterns)
	}
}

func TestDetectPatterns_ServerlessCounts(t *testing.T) {
	// Serverless functions should count as services for pattern detection
	g := model.GraphState{
		Nodes: []model.GraphNode{
			{ID: "f1", Type: "serverlessFunction", Name: "Auth Lambda"},
			{ID: "f2", Type: "serverlessFunction", Name: "Order Lambda"},
			{ID: "f3", Type: "serverlessFunction", Name: "Payment Lambda"},
			{ID: "db1", Type: "databaseNosql", Name: "Auth Store"},
			{ID: "db2", Type: "databaseNosql", Name: "Order Store"},
			{ID: "db3", Type: "databaseNosql", Name: "Payment Store"},
		},
		Edges: []model.GraphEdge{
			{ID: "e1", Source: "f1", Target: "db1"},
			{ID: "e2", Source: "f2", Target: "db2"},
			{ID: "e3", Source: "f3", Target: "db3"},
		},
	}

	analysis := Analyze(g)

	if !hasPattern(analysis.DetectedPatterns, "Microservices") {
		t.Error("expected Microservices pattern with serverless functions having dedicated stores")
	}
}
