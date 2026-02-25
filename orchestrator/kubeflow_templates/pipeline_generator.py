"""Kubeflow pipeline templates"""
import yaml


def create_kubeflow_pipeline(pipeline_id: str, config: dict) -> dict:
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
    return yaml.dump(component)


__all__ = ["create_kubeflow_pipeline", "generate_component_yaml"]
