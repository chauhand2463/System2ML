"""AutoML Report Generation Module"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime
import base64
from io import BytesIO

logger = logging.getLogger(__name__)


@dataclass
class ReportConfig:
    """Configuration for report generation"""

    title: str = "ML Experiment Report"
    include_dataset: bool = True
    include_models: bool = True
    include_comparison: bool = True
    include_recommendation: bool = True
    include_charts: bool = True


class ReportGenerator:
    """Generates downloadable reports for ML experiments"""

    def __init__(self, output_dir: str = "reports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate_json_report(
        self,
        experiment_data: Dict[str, Any],
        report_id: str,
    ) -> str:
        """Generate JSON report"""
        report_path = os.path.join(self.output_dir, f"report_{report_id}.json")

        report_data = {
            "report_id": report_id,
            "generated_at": datetime.utcnow().isoformat(),
            "experiment": experiment_data,
        }

        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2, default=str)

        logger.info(f"Generated JSON report: {report_path}")
        return report_path

    def generate_html_report(
        self,
        experiment_data: Dict[str, Any],
        report_id: str,
    ) -> str:
        """Generate HTML report"""
        report_path = os.path.join(self.output_dir, f"report_{report_id}.html")

        html_content = self._generate_html_content(experiment_data)

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        logger.info(f"Generated HTML report: {report_path}")
        return report_path

    def _generate_html_content(self, data: Dict[str, Any]) -> str:
        """Generate HTML content for report"""
        dataset_info = data.get("dataset", {})
        models = data.get("models", [])
        best_model = data.get("best_model", {})
        recommendation = data.get("recommendation", {})

        html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ML Experiment Report</title>
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; background: #f5f5f5; }}
        .container {{ max-width: 900px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        h2 {{ color: #34495e; margin-top: 30px; }}
        .section {{ margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 15px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #3498db; color: white; }}
        tr:hover {{ background: #f5f5f5; }}
        .metric {{ display: inline-block; padding: 8px 16px; background: #ecf0f1; border-radius: 4px; margin: 4px; }}
        .metric-value {{ font-weight: bold; color: #2980b9; }}
        .best-model {{ background: #d5f4e6; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60; }}
        .recommendation {{ background: #e8f4f8; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }}
        .footer {{ margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #7f8c8d; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 ML Experiment Report</h1>
        
        <div class="section">
            <h2>📊 Dataset Information</h2>
            <p><strong>Name:</strong> {dataset_info.get("name", "N/A")}</p>
            <p><strong>Rows:</strong> {dataset_info.get("rows", "N/A")}</p>
            <p><strong>Columns:</strong> {dataset_info.get("columns", "N/A")}</p>
            <p><strong>Features:</strong> {dataset_info.get("features", "N/A")}</p>
            <p><strong>Task Type:</strong> {dataset_info.get("task_type", "N/A")}</p>
            <p><strong>Target:</strong> {dataset_info.get("target_column", "N/A")}</p>
        </div>
        
        <div class="section">
            <h2>📈 Trained Models</h2>
            <table>
                <tr>
                    <th>Model</th>
                    <th>Primary Metric</th>
                    <th>Value</th>
                </tr>
"""

        for model in models:
            primary_metric = model.get("primary_metric", "accuracy")
            primary_value = model.get("primary_value", "N/A")
            html += f"""
                <tr>
                    <td>{model.get("model_name", "N/A")}</td>
                    <td>{primary_metric}</td>
                    <td>{primary_value}</td>
                </tr>
"""

        html += """
            </table>
        </div>
"""

        if best_model:
            html += f"""
        <div class="section">
            <h2>🏆 Best Model</h2>
            <div class="best-model">
                <p><strong>Model:</strong> {best_model.get("model_name", "N/A")}</p>
                <p><strong>Score:</strong> {best_model.get("score", "N/A")}</p>
            </div>
        </div>
"""

        if recommendation:
            html += f"""
        <div class="section">
            <h2>💡 Recommendation</h2>
            <div class="recommendation">
                <p><strong>Recommended:</strong> {recommendation.get("recommended_model", "N/A")}</p>
                <p><strong>Reason:</strong> {recommendation.get("reason", "N/A")}</p>
                <p><strong>Confidence:</strong> {recommendation.get("confidence", "N/A")}</p>
            </div>
        </div>
"""

        html += f"""
        <div class="footer">
            <p>Generated by System2ML AutoML Platform</p>
            <p>Generated at: {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")}</p>
        </div>
    </div>
</body>
</html>
"""

        return html

    def generate_markdown_report(
        self,
        experiment_data: Dict[str, Any],
        report_id: str,
    ) -> str:
        """Generate Markdown report"""
        report_path = os.path.join(self.output_dir, f"report_{report_id}.md")

        md_content = self._generate_markdown_content(experiment_data)

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(md_content)

        logger.info(f"Generated Markdown report: {report_path}")
        return report_path

    def _generate_markdown_content(self, data: Dict[str, Any]) -> str:
        """Generate Markdown content"""
        dataset_info = data.get("dataset", {})
        models = data.get("models", [])
        best_model = data.get("best_model", {})

        md = f"""# ML Experiment Report

**Generated:** {datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")}

---

## Dataset Information

| Property | Value |
|----------|-------|
| Name | {dataset_info.get("name", "N/A")} |
| Rows | {dataset_info.get("rows", "N/A")} |
| Columns | {dataset_info.get("columns", "N/A")} |
| Features | {dataset_info.get("features", "N/A")} |
| Task Type | {dataset_info.get("task_type", "N/A")} |
| Target | {dataset_info.get("target_column", "N/A")} |

---

## Trained Models

| Model | {models[0].get("primary_metric", "Accuracy") if models else "Score"} |
|-------|------|
"""

        for model in models:
            md += f"| {model.get('model_name', 'N/A')} | {model.get('primary_value', 'N/A')} |\n"

        if best_model:
            md += f"""

---

## Best Model

- **Model:** {best_model.get("model_name", "N/A")}
- **Score:** {best_model.get("score", "N/A")}

"""

        md += "\n---\n*Generated by System2ML AutoML Platform*"

        return md

    def generate_full_report(
        self,
        experiment_data: Dict[str, Any],
        report_id: str,
        format: str = "html",
    ) -> Dict[str, str]:
        """Generate full report in multiple formats"""
        if format == "json":
            json_path = self.generate_json_report(experiment_data, report_id)
            return {"json": json_path}
        elif format == "html":
            html_path = self.generate_html_report(experiment_data, report_id)
            return {"html": html_path}
        elif format == "markdown":
            md_path = self.generate_markdown_report(experiment_data, report_id)
            return {"markdown": md_path}
        else:
            json_path = self.generate_json_report(experiment_data, report_id)
            html_path = self.generate_html_report(experiment_data, report_id)
            md_path = self.generate_markdown_report(experiment_data, report_id)
            return {"json": json_path, "html": html_path, "markdown": md_path}
