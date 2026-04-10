package graph

import "github.com/shadowbane1000/designpair/internal/model"

// DetectedPattern represents a recognized architectural pattern in the graph.
type DetectedPattern struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Evidence    []string `json:"evidence"`
}

// Node type classification helpers.

func isDataStore(t string) bool {
	switch t {
	case "databaseSql", "databaseNosql", "cache", "objectStorage":
		return true
	}
	return false
}

func isPrimaryDatabase(t string) bool {
	return t == "databaseSql" || t == "databaseNosql"
}

func isReadStore(t string) bool {
	return t == "cache"
}

func isService(t string) bool {
	return t == "service" || t == "serverlessFunction"
}

func isClient(t string) bool {
	switch t {
	case "webClient", "mobileClient", "iotClient", "externalApi":
		return true
	}
	return false
}

func isMessaging(t string) bool {
	return t == "messageQueue" || t == "eventBus" || t == "streamProcessor"
}

func isGateway(t string) bool {
	return t == "apiGateway" || t == "loadBalancer"
}

func isAsyncEdge(e model.GraphEdge) bool {
	if e.SyncAsync == "async" {
		return true
	}
	if e.SyncAsync != "" {
		return false
	}
	// Infer from protocol
	switch e.Protocol {
	case "async", "pubsub", "mqtt":
		return true
	}
	return false
}

// DetectPatterns analyzes the graph for higher-level architectural patterns.
func DetectPatterns(g model.GraphState, analysis TopologyAnalysis) []DetectedPattern {
	if len(g.Nodes) == 0 {
		return nil
	}

	nodeByID := make(map[string]model.GraphNode)
	for _, n := range g.Nodes {
		nodeByID[n.ID] = n
	}

	// Build adjacency
	outEdges := make(map[string][]model.GraphEdge)
	inEdges := make(map[string][]model.GraphEdge)
	for _, e := range g.Edges {
		outEdges[e.Source] = append(outEdges[e.Source], e)
		inEdges[e.Target] = append(inEdges[e.Target], e)
	}

	var patterns []DetectedPattern

	if p := detectCQRS(g.Nodes, nodeByID, outEdges, inEdges); p != nil {
		patterns = append(patterns, *p)
	}
	if p := detectEventSourcing(g.Nodes, nodeByID, outEdges, inEdges); p != nil {
		patterns = append(patterns, *p)
	}
	if p := detectSaga(g.Nodes, nodeByID, outEdges); p != nil {
		patterns = append(patterns, *p)
	}
	if p := detectFanOut(g.Nodes, nodeByID, outEdges); p != nil {
		patterns = append(patterns, *p)
	}
	if p := detectAPIGateway(g.Nodes, nodeByID, outEdges, inEdges); p != nil {
		patterns = append(patterns, *p)
	}
	if p := detectMicroservices(g.Nodes, nodeByID, outEdges); p != nil {
		patterns = append(patterns, *p)
	}
	if p := detectMonolith(g.Nodes, nodeByID, outEdges, inEdges); p != nil {
		patterns = append(patterns, *p)
	}

	return patterns
}

// detectCQRS identifies separate read and write paths.
// Requires: at least one service writing to a primary DB AND a different service
// reading from a cache or separate data store.
func detectCQRS(nodes []model.GraphNode, byID map[string]model.GraphNode, out, in map[string][]model.GraphEdge) *DetectedPattern {
	type pathInfo struct {
		serviceName string
		storeName   string
		storeType   string
	}

	var writePaths, readPaths []pathInfo

	for _, n := range nodes {
		if !isService(n.Type) {
			continue
		}
		for _, e := range out[n.ID] {
			tgt := byID[e.Target]
			if isPrimaryDatabase(tgt.Type) {
				writePaths = append(writePaths, pathInfo{n.Name, tgt.Name, tgt.Type})
			}
			if isReadStore(tgt.Type) {
				readPaths = append(readPaths, pathInfo{n.Name, tgt.Name, tgt.Type})
			}
		}
	}

	if len(writePaths) == 0 || len(readPaths) == 0 {
		return nil
	}

	// Check that at least one write path and one read path go through different services
	for _, w := range writePaths {
		for _, r := range readPaths {
			if w.serviceName != r.serviceName {
				return &DetectedPattern{
					Name:        "CQRS",
					Description: "Separate read and write paths through different services to different data stores",
					Evidence: []string{
						w.serviceName + " writes to " + w.storeName + " (" + w.storeType + ")",
						r.serviceName + " reads from " + r.storeName + " (" + r.storeType + ")",
					},
				}
			}
		}
	}

	return nil
}

// detectEventSourcing identifies event store patterns.
// Requires: a messaging component (eventBus/streamProcessor) with services
// consuming from it rather than reading directly from a primary database.
func detectEventSourcing(nodes []model.GraphNode, byID map[string]model.GraphNode, out, in map[string][]model.GraphEdge) *DetectedPattern {
	for _, n := range nodes {
		if n.Type != "eventBus" && n.Type != "streamProcessor" {
			continue
		}

		// Check: does a service write to this messaging component?
		hasProducer := false
		var producerName string
		for _, e := range in[n.ID] {
			src := byID[e.Source]
			if isService(src.Type) {
				hasProducer = true
				producerName = src.Name
				break
			}
		}

		if !hasProducer {
			continue
		}

		// Check: do services or data stores consume from it?
		consumerCount := 0
		var consumers []string
		for _, e := range out[n.ID] {
			tgt := byID[e.Target]
			if isService(tgt.Type) || isDataStore(tgt.Type) {
				consumerCount++
				consumers = append(consumers, tgt.Name)
			}
		}

		if consumerCount >= 2 {
			evidence := []string{
				producerName + " publishes events to " + n.Name,
			}
			for _, c := range consumers {
				evidence = append(evidence, c+" consumes from "+n.Name)
			}
			return &DetectedPattern{
				Name:        "Event Sourcing",
				Description: "Events published to a central stream with multiple consumers deriving state",
				Evidence:    evidence,
			}
		}
	}

	return nil
}

// detectSaga identifies distributed transactions via messaging.
// Requires: 3+ services connected through async messaging (queues/event buses).
func detectSaga(nodes []model.GraphNode, byID map[string]model.GraphNode, out map[string][]model.GraphEdge) *DetectedPattern {
	// Find services that both send to and receive from messaging components
	servicesInChain := make(map[string]bool)
	var evidence []string

	for _, n := range nodes {
		if !isService(n.Type) {
			continue
		}
		for _, e := range out[n.ID] {
			tgt := byID[e.Target]
			if isMessaging(tgt.Type) && isAsyncEdge(e) {
				servicesInChain[n.Name] = true
				evidence = append(evidence, n.Name+" sends async messages via "+tgt.Name)
			}
		}
	}

	// Also check services receiving from messaging
	for _, n := range nodes {
		if !isMessaging(n.Type) {
			continue
		}
		for _, e := range out[n.ID] {
			tgt := byID[e.Target]
			if isService(tgt.Type) {
				servicesInChain[tgt.Name] = true
			}
		}
	}

	if len(servicesInChain) >= 3 {
		return &DetectedPattern{
			Name:        "Saga",
			Description: "Distributed transaction pattern with 3+ services coordinating through asynchronous messaging",
			Evidence:    evidence,
		}
	}

	return nil
}

// detectFanOut identifies a node distributing work to 3+ same-type targets.
func detectFanOut(nodes []model.GraphNode, byID map[string]model.GraphNode, out map[string][]model.GraphEdge) *DetectedPattern {
	for _, n := range nodes {
		edges := out[n.ID]
		if len(edges) < 3 {
			continue
		}

		// Count targets by type
		targetsByType := make(map[string][]string)
		for _, e := range edges {
			tgt := byID[e.Target]
			targetsByType[tgt.Type] = append(targetsByType[tgt.Type], tgt.Name)
		}

		for tType, targets := range targetsByType {
			if len(targets) >= 3 && isService(tType) {
				return &DetectedPattern{
					Name:        "Fan-out",
					Description: n.Name + " distributes requests to " + itoa(len(targets)) + " downstream services",
					Evidence: []string{
						n.Name + " has " + itoa(len(targets)) + " outgoing connections to services",
					},
				}
			}
		}
	}

	return nil
}

// detectAPIGateway identifies the API gateway pattern.
// Requires: a gateway/LB node with 2+ outgoing edges to services
// and at least one client connecting to it.
func detectAPIGateway(nodes []model.GraphNode, byID map[string]model.GraphNode, out, in map[string][]model.GraphEdge) *DetectedPattern {
	for _, n := range nodes {
		if !isGateway(n.Type) {
			continue
		}

		// Count downstream services
		var serviceTargets []string
		for _, e := range out[n.ID] {
			tgt := byID[e.Target]
			if isService(tgt.Type) {
				serviceTargets = append(serviceTargets, tgt.Name)
			}
		}

		if len(serviceTargets) < 2 {
			continue
		}

		// Check for client connections
		hasClient := false
		var clientName string
		for _, e := range in[n.ID] {
			src := byID[e.Source]
			if isClient(src.Type) {
				hasClient = true
				clientName = src.Name
				break
			}
		}

		evidence := []string{
			n.Name + " routes to " + itoa(len(serviceTargets)) + " backend services",
		}
		if hasClient {
			evidence = append(evidence, clientName+" connects through "+n.Name)
		}

		return &DetectedPattern{
			Name:        "API Gateway",
			Description: n.Name + " serves as a single entry point routing to backend services",
			Evidence:    evidence,
		}
	}

	return nil
}

// detectMicroservices identifies independent services with dedicated data stores.
// Requires: 3+ services each with at least one dedicated (non-shared) data store.
func detectMicroservices(nodes []model.GraphNode, byID map[string]model.GraphNode, out map[string][]model.GraphEdge) *DetectedPattern {
	// Map each data store to the set of services that use it
	storeUsers := make(map[string][]string) // store ID -> service names

	for _, n := range nodes {
		if !isService(n.Type) {
			continue
		}
		for _, e := range out[n.ID] {
			tgt := byID[e.Target]
			if isDataStore(tgt.Type) {
				storeUsers[tgt.ID] = append(storeUsers[tgt.ID], n.Name)
			}
		}
	}

	// Find services with at least one dedicated (single-user) data store
	dedicatedServices := make(map[string]string) // service name -> one of its dedicated stores
	for storeID, users := range storeUsers {
		if len(users) == 1 {
			store := byID[storeID]
			dedicatedServices[users[0]] = store.Name
		}
	}

	if len(dedicatedServices) >= 3 {
		var evidence []string
		for svc, store := range dedicatedServices {
			evidence = append(evidence, svc+" has dedicated data store "+store)
		}
		return &DetectedPattern{
			Name:        "Microservices",
			Description: itoa(len(dedicatedServices)) + " services with independent data stores (database-per-service pattern)",
			Evidence:    evidence,
		}
	}

	return nil
}

// detectMonolith identifies a single-service architecture.
// Requires: exactly 1 service node handling all data store and client connections.
func detectMonolith(nodes []model.GraphNode, byID map[string]model.GraphNode, out, in map[string][]model.GraphEdge) *DetectedPattern {
	var services []model.GraphNode
	dataStoreCount := 0
	clientCount := 0

	for _, n := range nodes {
		if isService(n.Type) {
			services = append(services, n)
		}
		if isDataStore(n.Type) {
			dataStoreCount++
		}
		if isClient(n.Type) {
			clientCount++
		}
	}

	if len(services) != 1 || dataStoreCount == 0 {
		return nil
	}

	svc := services[0]

	// Check the service connects to data stores
	storeConns := 0
	for _, e := range out[svc.ID] {
		tgt := byID[e.Target]
		if isDataStore(tgt.Type) {
			storeConns++
		}
	}

	if storeConns == 0 {
		return nil
	}

	evidence := []string{
		svc.Name + " is the only service, connected to " + itoa(storeConns) + " data store(s)",
	}
	if clientCount > 0 {
		evidence = append(evidence, itoa(clientCount)+" client(s) in the architecture")
	}

	return &DetectedPattern{
		Name:        "Monolith",
		Description: "Single service handling all concerns with " + itoa(storeConns) + " data store(s)",
		Evidence:    evidence,
	}
}

func itoa(n int) string {
	if n < 0 {
		return "-" + itoa(-n)
	}
	if n < 10 {
		return string(rune('0' + n))
	}
	return itoa(n/10) + string(rune('0'+n%10))
}
