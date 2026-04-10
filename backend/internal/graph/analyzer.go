package graph

import "github.com/shadowbane1000/designpair/internal/model"

// TopologyAnalysis contains pre-computed graph properties for prompt construction.
type TopologyAnalysis struct {
	EntryPoints          []string            `json:"entryPoints"`
	LeafNodes            []string            `json:"leafNodes"`
	FanIn                map[string]int      `json:"fanIn"`
	FanOut               map[string]int      `json:"fanOut"`
	SinglePointsOfFailure []string           `json:"singlePointsOfFailure"`
	Cycles               [][]string          `json:"cycles"`
	ConnectedComponents  int                 `json:"connectedComponents"`
	EdgeProtocols        map[string]int      `json:"edgeProtocols"`
	NodesByType          map[string]int      `json:"nodesByType"`
	ScaledNodes          map[string]int      `json:"scaledNodes"`
	SyncChainDepth       int                 `json:"syncChainDepth"`
	AsyncBoundaries      []string            `json:"asyncBoundaries"`
	BidirectionalEdges   []string            `json:"bidirectionalEdges"`
	ProtocolDistribution map[string]int      `json:"protocolDistribution"`
	DetectedPatterns     []DetectedPattern   `json:"detectedPatterns"`
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
		ScaledNodes:          make(map[string]int),
		AsyncBoundaries:      []string{},
		BidirectionalEdges:   []string{},
		ProtocolDistribution: make(map[string]int),
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
		if n.ReplicaCount > 1 {
			analysis.ScaledNodes[n.Name] = n.ReplicaCount
		}
	}

	// Adjacency lists (by ID for graph algorithms, by name for output)
	outEdges := make(map[string][]string) // id -> [target ids]
	inEdges := make(map[string][]string)  // id -> [source ids]

	// Track sync/async per edge for chain analysis
	edgeSyncAsync := make(map[string]string) // "source->target" -> "sync"/"async"

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

		// Protocol distribution
		if e.Protocol != "" {
			analysis.ProtocolDistribution[e.Protocol]++
		}

		// Bidirectional edges
		if e.Direction == "bidirectional" {
			analysis.BidirectionalEdges = append(analysis.BidirectionalEdges,
				srcName+" ↔ "+tgtName)
		}

		// Track sync/async for chain depth
		sa := e.SyncAsync
		if sa == "" {
			sa = "sync"
		}
		edgeSyncAsync[e.Source+"->"+e.Target] = sa
	}

	// Detect async boundaries (edges where a sync node connects to async edge or vice versa)
	// and compute sync chain depth
	analysis.SyncChainDepth = computeSyncChainDepth(g.Nodes, outEdges, edgeSyncAsync)
	analysis.AsyncBoundaries = detectAsyncBoundaries(g.Edges, nodeByID)

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

	// Pattern recognition
	analysis.DetectedPatterns = DetectPatterns(g, analysis)

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

func computeSyncChainDepth(nodes []model.GraphNode, outEdges map[string][]string, edgeSyncAsync map[string]string) int {
	maxDepth := 0
	visited := make(map[string]bool)

	var dfs func(nodeID string, depth int)
	dfs = func(nodeID string, depth int) {
		if depth > maxDepth {
			maxDepth = depth
		}
		visited[nodeID] = true
		for _, next := range outEdges[nodeID] {
			key := nodeID + "->" + next
			if edgeSyncAsync[key] == "sync" && !visited[next] {
				dfs(next, depth+1)
			}
		}
		visited[nodeID] = false
	}

	for _, n := range nodes {
		dfs(n.ID, 0)
	}

	return maxDepth
}

func detectAsyncBoundaries(edges []model.GraphEdge, nodeByID map[string]model.GraphNode) []string {
	var boundaries []string
	for _, e := range edges {
		sa := e.SyncAsync
		if sa == "" {
			sa = "sync"
		}
		if sa == "async" && e.Protocol != "" {
			srcName := nodeByID[e.Source].Name
			tgtName := nodeByID[e.Target].Name
			boundaries = append(boundaries, srcName+" → "+tgtName+" ("+e.Label+")")
		}
	}
	return boundaries
}
