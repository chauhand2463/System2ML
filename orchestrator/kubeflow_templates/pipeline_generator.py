"""Kubeflow pipeline templates"""
import yaml


def create_kubeflow_pipeline(pipeline_id: str, config: dict) -> dict:
    """Create a Kubeflow pipeline spec.

    Args:
        pipeline_id: Identifier for the pipeline; must be non‑empty.
        config: Additional configuration (currently unused).

    Returns:
        A dictionary representing the Kubeflow pipeline spec.

    Raises:
        ValueError: If ``pipeline_id`` is empty.
    """
    if not pipeline_id:
        raise ValueError("pipeline_id must be a non‑empty string")
    pipeline_spec = {
        "apiVersion": "kubeflow.org/v1beta1",
        "kind": "Pipeline",
        "metadata": {
            "name": f"system2ml-pipeline-{pipeline_id}",
            "generateName": "system2ml-",
        },
        "spec": {
            "pipelineSpec": {
                "tasks": [
                    {
                        "name": "load-data",
                        "taskRef": {
                            "name": "load-data-task",
                            "resolver": "ref",
                        },
                    },
                    {
                        "name": "preprocess",
                        "taskRef": {
                            "name": "preprocess-task",
                        },
                        "dependencies": ["load-data"],
                    },
                    {
                        "name": "train",
                        "taskRef": {
                            "name": "train-task",
                        },
                        "dependencies": ["preprocess"],
                    },
                    {
                        "name": "evaluate",
                        "taskRef": {
                            "name": "evaluate-task",
                        },
                        "dependencies": ["train"],
                    },
                ]
            }
        }
    }
    return pipeline_spec


def generate_component_yaml(name: str, image: str, command: list) -> str:
    """Generate a Kubeflow component definition as a YAML string.

    Args:
        name: Component name.
        image: Container image.
        command: List of command arguments for the container.

    Returns:
        YAML string representing the component.

    Raises:
        ValueError: If ``name`` or ``image`` is empty, or ``command`` is not a non‑empty list.
    """
    if not name:
        raise ValueError("Component name must be provided")
    if not image:
        raise ValueError("Container image must be provided")
    if not isinstance(command, list) or not command:
        raise ValueError("command must be a non-empty list of strings")
    component = {
        "name": name,
        "description": f"System2ML {name} component",
        "inputs": [{"name": "input_data", "type": "String"}],
        "outputs": [{"name": "output_data", "type": "String"}],
        "implementation": {
            "container": {
                "image": image,
                "command": command,
            }
        }
    }
    return yaml.safe_dump(component)


__all__ = ["create_kubeflow_pipeline", "generate_component_yaml"]
