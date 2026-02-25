from dataclasses import dataclass
import random


@dataclass
class Benchmark:
    name: str
    dataset: str
    data_type: str
    target_metric: str
    baseline_score: float
    
    def evaluate(self, pipeline) -> dict:
        return {
            "metric": self.target_metric,
            "score": random.uniform(0.7, 0.95),
            "time_seconds": random.uniform(10, 300),
            "carbon_kg": random.uniform(0.1, 2.0),
        }


BENCHMARKS = [
    Benchmark("Iris Classification", "iris", "tabular", "accuracy", 0.95),
    Benchmark("Titanic Survival", "titanic", "tabular", "accuracy", 0.80),
    Benchmark("IMDB Sentiment", "imdb", "text", "accuracy", 0.85),
    Benchmark("CIFAR-10 Image", "cifar10", "image", "accuracy", 0.90),
]


def run_benchmark(pipeline, benchmark: Benchmark) -> dict:
    return benchmark.evaluate(pipeline)


def get_benchmark_results() -> list:
    return [{"name": b.name, "dataset": b.dataset} for b in BENCHMARKS]


__all__ = ["Benchmark", "BENCHMARKS", "run_benchmark", "get_benchmark_results"]
