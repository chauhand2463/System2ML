"""
Pipeline Generator Module
Converts visual pipeline representation to executable pipeline spec.
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


def generate_pipeline_json(
    nodes: List[Dict[str, Any]],
    edges: List[Dict[str, Any]],
    name: str = "pipeline",
    dataset_profile: Dict[str, Any] = {},
    constraints: Dict[str, Any] = {},
) -> Dict[str, Any]:
    """
    Generate a pipeline specification from visual nodes and edges.

    Args:
        nodes: List of node objects with id, name, type, config
        edges: List of edge objects with id, source, target
        name: Pipeline name
        dataset_profile: Dataset information
        constraints: Constraints (budget, latency, etc.)

    Returns:
        Pipeline specification with nodes and edges
    """
    logger.info(f"Generating pipeline '{name}' with {len(nodes)} nodes")

    # If no nodes, return empty pipeline
    if not nodes:
        return {
            "status": "success",
            "nodes": [],
            "edges": [],
        }

    # Validate edges reference existing nodes
    node_ids = {n.get("id") for n in nodes}
    valid_edges = [e for e in edges if e.get("source") in node_ids and e.get("target") in node_ids]

    # Build node execution order using topological sort
    execution_order = _build_execution_order(nodes, valid_edges)

    # Generate pipeline steps based on node types
    pipeline_nodes = []
    for idx, node_id in enumerate(execution_order):
        node = next((n for n in nodes if n.get("id") == node_id), {})
        node_type = node.get("type", "transform")

        # Map visual node types to pipeline operations
        operation = _map_node_type_to_operation(node_type)

        pipeline_nodes.append(
            {
                "id": node.get("id", f"node_{idx}"),
                "name": node.get("name", f"Step {idx + 1}"),
                "type": node_type,
                "operation": operation,
                "config": node.get("config", {}),
                "inputs": _get_node_inputs(node_id, valid_edges),
                "outputs": _get_node_outputs(node_id, valid_edges),
                "order": idx,
                "status": "pending",
            }
        )

    # Build edges for pipeline
    pipeline_edges = []
    for edge in valid_edges:
        pipeline_edges.append(
            {
                "id": edge.get("id", f"edge_{len(pipeline_edges)}"),
                "source": edge.get("source"),
                "target": edge.get("target"),
            }
        )

    # Estimate metrics based on dataset and constraints
    estimated_metrics = _estimate_metrics(dataset_profile, constraints, len(nodes))

    return {
        "status": "success",
        "name": name,
        "nodes": pipeline_nodes,
        "edges": pipeline_edges,
        "execution_order": execution_order,
        "estimated_metrics": estimated_metrics,
    }


def _build_execution_order(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> List[str]:
    """Build execution order using topological sort."""
    if not nodes:
        return []

    # Build adjacency list
    """Build execution order using topological sort."""
    if not nodes:
        return []

    # Build adjacency list
    node_ids = {n.get("id") for n in nodes}
    in_degree = {nid: 0 for nid in node_ids}
    dependents = {nid: [] for nid in node_ids}

    for edge in edges:
        src, tgt = edge.get("source"), edge.get("target")
        if src in node_ids and tgt in node_ids:
            in_degree[tgt] = in_degree.get(tgt, 0) + 1
            dependents[src].append(tgt)

    # Topological sort (Kahn's algorithm)
    queue = [nid for nid, deg in in_degree.items() if deg == 0]
    order = []

    while queue:
        current = queue.pop(0)
        order.append(current)
        for dep in dependents.get(current, []):
            in_degree[dep] -= 1
            if in_degree[dep] == 0:
                queue.append(dep)

    # If there are cycles, just return original order
    if len(order) != len(node_ids):
        logger.warning("Cycle detected in pipeline, using original order")
        order = [n.get("id") for n in nodes]

    return order


def _map_node_type_to_operation(node_type: str) -> str:
    """Map visual node types to pipeline operations."""
    type_map = {
        "input": "load_data",
        "dataset": "load_data",
        "load": "load_data",
        "transform": "transform",
        "preprocess": "transform",
        "clean": "transform",
        "model": "train",
        "train": "train",
        "classifier": "train",
        "regressor": "train",
        "output": "save",
        "save": "save",
        "export": "save",
        "split": "split",
        "validation": "validate",
        "evaluate": "evaluate",
        "feature": "feature_engineering",
        "scaler": "scale",
        "encoder": "encode",
    }
    return type_map.get(node_type.lower(), "transform")


def _get_node_inputs(node_id: str, edges: List[Dict[str, Any]]) -> List[str]:
    """Get input node IDs for a given node."""
    return [e.get("source") for e in edges if e.get("target") == node_id]


def _get_node_outputs(node_id: str, edges: List[Dict[str, Any]]) -> List[str]:
    """Get output node IDs for a given node."""
    return [e.get("target") for e in edges if e.get("source") == node_id]


def _estimate_metrics(dataset_profile: Dict, constraints: Dict, num_nodes: int) -> Dict[str, Any]:
    """Estimate pipeline metrics."""
    rows = dataset_profile.get("rows", 1000)
    features = dataset_profile.get("features", 10)

    # Rough estimates
    base_time = (rows * features) / 10000  # seconds
    total_time = base_time * num_nodes

    cost_per_row = 0.001
    estimated_cost = rows * cost_per_row * num_nodes / 1000

    carbon_per_row = 0.00001
    estimated_carbon = rows * carbon_per_row * num_nodes / 1000

    return {
        "estimated_time_seconds": round(total_time, 2),
        "estimated_cost_usd": round(estimated_cost, 4),
        "estimated_carbon_kg": round(estimated_carbon, 6),
        "estimated_accuracy": 0.85,
    }


def generate_ai_pipeline(
    dataset_profile: Dict,
    constraints: Dict,
    infra_context: Dict = None,
) -> Dict[str, Any]:
    """
    Generate pipeline using AI service.
    """
    try:
        from agent.ai_service import get_ai_service

        ai = get_ai_service()
        result = ai.generate_pipeline(
            dataset_profile=dataset_profile,
            constraints=constraints,
            infra_context=infra_context,
        )
        return result
    except Exception as e:
        logger.error(f"AI pipeline generation failed: {e}")
        return {
            "status": "error",
            "error": str(e),
        }


__all__ = [
    "generate_pipeline_json",
    "generate_ai_pipeline",
]
