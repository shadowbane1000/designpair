package graph

import "github.com/shadowbane1000/designpair/internal/model"

// TopologyAnalysis contains pre-computed graph properties for prompt construction.
type TopologyAnalysis struct {
	EntryPoints          []string         `json:"entryPoints"`
	LeafNodes            []string         `json:"leafNodes"`
	FanIn                map[string]int   `json:"fanIn"`
	FanOut               map[string]int   `json:"fanOut"`
	SinglePointsOfFailure []string        `json:"singlePointsOfFailure"`
	Cycles               [][]string       `json:"cycles"`
	ConnectedComponents  int              `json:"connectedComponents"`
	EdgeProtocols        map[string]int   `json:"edgeProtocols"`
	NodesByType          map[string]int   `json:"nodesByType"`
}

// Analyze computes topology properties from a graph state.
func Analyze(g model.GraphState) TopologyAnalysis {
	analysis := TopologyAnalysis{
		EntryPoints:          []string{},
		LeafNodes:            []string{},
		FanIn:                make(map[string]int),
		FanOut:               make(map[string]int),
		SinglePointsOfFailure: []string{},
		Cycles:               [][]string{},
		EdgeProtocols:        make(map[string]int),
		NodesByType:          make(map[string]int),
	}

	if len(g.Nodes) == 0 {
		return analysis
	}

	// Build lookup maps
	nodeByID := make(map[string]model.GraphNode)
	for _, n := range g.Nodes {
		nodeByID[n.ID] = n
		analysis.NodesByType[n.Type]++
		analysis.FanIn[n.Name] = 0
		analysis.FanOut[n.Name] = 0
	}

	// Adjacency lists (by ID for graph algorithms, by name for output)
	outEdges := make(map[string][]string) // id -> [target ids]
	inEdges := make(map[string][]string)  // id -> [source ids]

	for _, e := range g.Edges {
		srcName := nodeByID[e.Source].Name
		tgtName := nodeByID[e.Target].Name
		analysis.FanOut[srcName]++
		analysis.FanIn[tgtName]++

		outEdges[e.Source] = append(outEdges[e.Source], e.Target)
		inEdges[e.Target] = append(inEdges[e.Target], e.Source)

		label := e.Label
		if label == "" {
			label = "unlabeled"
		}
		analysis.EdgeProtocols[label]++
	}

	// Entry points (zero in-edges) and leaf nodes (zero out-edges)
	for _, n := range g.Nodes {
		if len(inEdges[n.ID]) == 0 {
			analysis.EntryPoints = append(analysis.EntryPoints, n.Name)
		}
		if len(outEdges[n.ID]) == 0 {
			analysis.LeafNodes = append(analysis.LeafNodes, n.Name)
		}
	}

	// Connected components (undirected)
	analysis.ConnectedComponents = countComponents(g.Nodes, outEdges, inEdges)

	// Single points of failure (articulation points)
	analysis.SinglePointsOfFailure = findArticulationPoints(g.Nodes, outEdges, inEdges, nodeByID)

	// Cycle detection
	analysis.Cycles = findCycles(g.Nodes, outEdges, nodeByID)

	return analysis
}

func countComponents(nodes []model.GraphNode, out, in map[string][]string) int {
	visited := make(map[string]bool)
	count := 0

	for _, n := range nodes {
		if visited[n.ID] {
			continue
		}
		count++
		// BFS undirected
		queue := []string{n.ID}
		visited[n.ID] = true
		for len(queue) > 0 {
			curr := queue[0]
			queue = queue[1:]
			for _, next := range out[curr] {
				if !visited[next] {
					visited[next] = true
					queue = append(queue, next)
				}
			}
			for _, next := range in[curr] {
				if !visited[next] {
					visited[next] = true
					queue = append(queue, next)
				}
			}
		}
	}
	return count
}

func findArticulationPoints(nodes []model.GraphNode, out, in map[string][]string, byID map[string]model.GraphNode) []string {
	if len(nodes) <= 2 {
		return nil
	}

	// For each node, check if removing it increases the number of connected components
	// among the remaining nodes
	baseComponents := countComponents(nodes, out, in)
	var result []string

	for _, candidate := range nodes {
		// Build reduced graph without this node
		reduced := make([]model.GraphNode, 0, len(nodes)-1)
		reducedOut := make(map[string][]string)
		reducedIn := make(map[string][]string)

		for _, n := range nodes {
			if n.ID == candidate.ID {
				continue
			}
			reduced = append(reduced, n)
		}

		for src, targets := range out {
			if src == candidate.ID {
				continue
			}
			for _, tgt := range targets {
				if tgt == candidate.ID {
					continue
				}
				reducedOut[src] = append(reducedOut[src], tgt)
			}
		}
		for tgt, sources := range in {
			if tgt == candidate.ID {
				continue
			}
			for _, src := range sources {
				if src == candidate.ID {
					continue
				}
				reducedIn[tgt] = append(reducedIn[tgt], src)
			}
		}

		if len(reduced) > 0 && countComponents(reduced, reducedOut, reducedIn) > baseComponents {
			result = append(result, candidate.Name)
		}
	}

	return result
}

func findCycles(nodes []model.GraphNode, out map[string][]string, byID map[string]model.GraphNode) [][]string {
	const white, gray, black = 0, 1, 2
	color := make(map[string]int)
	parent := make(map[string]string)
	var cycles [][]string

	for _, n := range nodes {
		color[n.ID] = white
	}

	var dfs func(id string)
	dfs = func(id string) {
		color[id] = gray
		for _, next := range out[id] {
			if color[next] == gray {
				// Found a cycle — trace back
				cycle := []string{byID[next].Name}
				curr := id
				for curr != next {
					cycle = append([]string{byID[curr].Name}, cycle...)
					curr = parent[curr]
				}
				cycles = append(cycles, cycle)
			} else if color[next] == white {
				parent[next] = id
				dfs(next)
			}
		}
		color[id] = black
	}

	for _, n := range nodes {
		if color[n.ID] == white {
			dfs(n.ID)
		}
	}

	return cycles
}
