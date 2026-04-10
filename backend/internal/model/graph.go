package model

// GraphState represents the serialized architecture diagram.
type GraphState struct {
	Nodes []GraphNode `json:"nodes"`
	Edges []GraphEdge `json:"edges"`
}

type GraphNode struct {
	ID           string   `json:"id"`
	Type         string   `json:"type"`
	Name         string   `json:"name"`
	Position     Position `json:"position"`
	ReplicaCount int      `json:"replicaCount,omitempty"`
	Annotation   string   `json:"annotation,omitempty"`
}

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type GraphEdge struct {
	ID        string `json:"id"`
	Source    string `json:"source"`
	Target   string `json:"target"`
	Label     string `json:"label"`
	Protocol  string `json:"protocol,omitempty"`
	Direction string `json:"direction,omitempty"`
	SyncAsync string `json:"syncAsync,omitempty"`
}
