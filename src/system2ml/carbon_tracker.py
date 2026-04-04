"""
Carbon Tracker Module for System2ML
Real carbon footprint tracking using CodeCarbon
"""

import os
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

HAS_CODECARBON = False

try:
    from codecarbon import EmissionsTracker
    from codecarbon.output_methods import EmissionsData

    HAS_CODECARBON = True
except ImportError:
    EmissionsTracker = None
    EmissionsData = None


class CarbonTracker:
    """
    Wrapper for CodeCarbon emissions tracking.
    Provides real carbon footprint measurement for training runs.
    """

    def __init__(
        self,
        project_name: str = "system2ml-training",
        output_dir: str = "./carbon_reports",
        save_to_file: bool = True,
        log_level: str = "error",
    ):
        self.project_name = project_name
        self.output_dir = output_dir
        self.save_to_file = save_to_file
        self.log_level = log_level
        self.tracker: Optional[EmissionsTracker] = None
        self.emissions_data: Optional[EmissionsData] = None
        self._is_running = False

        if not HAS_CODECARBON:
            logger.warning(
                "CodeCarbon not installed. Carbon tracking disabled. Install with: pip install codecarbon"
            )
            return

        os.makedirs(output_dir, exist_ok=True)

    def start(self, run_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Start carbon tracking for a training run.

        Args:
            run_id: Optional identifier for this run

        Returns:
            Dictionary with tracker status
        """
        if not HAS_CODECARBON:
            return {"status": "unavailable", "reason": "CodeCarbon not installed"}

        if self._is_running:
            logger.warning("Carbon tracker already running")
            return {"status": "already_running"}

        try:
            self.tracker = EmissionsTracker(
                project_name=f"{self.project_name}-{run_id or 'default'}",
                output_dir=self.output_dir,
                save_to_file=self.save_to_file,
                log_level=self.log_level,
            )
            self.tracker.start()
            self._is_running = True

            logger.info(f"Carbon tracking started for run: {run_id}")
            return {"status": "started", "timestamp": datetime.utcnow().isoformat()}

        except Exception as e:
            logger.error(f"Failed to start carbon tracker: {e}")
            return {"status": "error", "error": str(e)}

    def stop(self) -> Dict[str, Any]:
        """
        Stop carbon tracking and return emissions data.

        Returns:
            Dictionary with emissions data in kg CO2
        """
        if not HAS_CODECARBON:
            return {"status": "unavailable", "emissions_kg": 0.0}

        if not self._is_running or not self.tracker:
            return {"status": "not_running"}

        try:
            self.emissions_data = self.tracker.stop()
            self._is_running = False

            if self.emissions_data:
                result = {
                    "status": "completed",
                    "emissions_kg": self.emissions_data.emissions,
                    "emissions_lb": self.emissions_data.emissions * 2.20462,
                    "duration_seconds": self.emissions_data.duration,
                    "cpu_energy_kwh": self.emissions_data.cpu_energy,
                    "gpu_energy_kwh": self.emissions_data.gpu_energy,
                    "ram_energy_kwh": self.emissions_data.ram_energy,
                    "country_name": self.emissions_data.country_name,
                    "country_iso_code": self.emissions_data.country_iso_code,
                    "region": self.emissions_data.region,
                    "timestamp": datetime.utcnow().isoformat(),
                }

                logger.info(
                    f"Carbon tracking stopped. Emissions: {result['emissions_kg']:.4f} kg CO2"
                )
                return result
            else:
                return {"status": "no_data", "emissions_kg": 0.0}

        except Exception as e:
            logger.error(f"Error stopping carbon tracker: {e}")
            return {"status": "error", "error": str(e)}

    def get_current(self) -> Dict[str, Any]:
        """
        Get current emissions without stopping the tracker.

        Returns:
            Dictionary with current emissions data
        """
        if not HAS_CODECARBON or not self._is_running:
            return {"status": "not_running", "emissions_kg": 0.0}

        try:
            if self.emissions_data:
                return {
                    "emissions_kg": self.emissions_data.emissions,
                    "duration_seconds": self.emissions_data.duration,
                    "cpu_energy_kwh": self.emissions_data.cpu_energy,
                }
        except Exception:
            pass

        return {"status": "measuring", "emissions_kg": 0.0}

    @staticmethod
    def is_available() -> bool:
        """Check if CodeCarbon is available."""
        return HAS_CODECARBON

    @staticmethod
    def estimate_from_duration(
        duration_hours: float,
        gpu_watts: float = 350,
        efficiency: float = 0.35,
        carbon_intensity: float = 0.5,
    ) -> Dict[str, Any]:
        """
        Estimate carbon emissions from training duration (fallback when CodeCarbon unavailable).

        Args:
            duration_hours: Training duration in hours
            gpu_watts: GPU power consumption in watts
            efficiency: Power Usage Effectiveness (PUE) of data center
            carbon_intensity: kg CO2 per kWh (global avg ~0.5, varies by region)

        Returns:
            Dictionary with estimated emissions
        """
        energy_kwh = (gpu_watts * duration_hours * efficiency) / 1000
        emissions_kg = energy_kwh * carbon_intensity

        return {
            "method": "estimation",
            "duration_hours": duration_hours,
            "gpu_watts": gpu_watts,
            "energy_kwh": energy_kwh,
            "emissions_kg": emissions_kg,
            "carbon_intensity": carbon_intensity,
            "note": "Estimated using duration * power formula. Install CodeCarbon for accurate tracking.",
        }


class CarbonReporter:
    """
    Generate carbon footprint reports for enterprise procurement.
    """

    def __init__(self, tracker: Optional[CarbonTracker] = None):
        self.tracker = tracker or CarbonTracker()

    def generate_report(self, run_data: Dict[str, Any]) -> str:
        """
        Generate a formatted carbon report for a training run.

        Args:
            run_data: Dictionary with run details (duration, model, etc.)

        Returns:
            Formatted markdown report
        """
        duration_hours = run_data.get("duration_hours", 0)
        model = run_data.get("model", "Unknown")
        method = run_data.get("method", "Unknown")

        if self.tracker.is_available():
            current = self.tracker.get_current()
            emissions = current.get("emissions_kg", 0)
        else:
            estimated = CarbonTracker.estimate_from_duration(duration_hours)
            emissions = estimated.get("emissions_kg", 0)

        report = f"""# Carbon Footprint Report

## Training Run Details
- **Model**: {model}
- **Method**: {method}
- **Duration**: {duration_hours:.2f} hours

## Carbon Emissions
- **Emissions**: {emissions:.4f} kg CO2
- **Equivalencies**:
  - 🔋 {emissions / 0.011:.0f} smartphone charges
  - 🚗 {emissions / 4.6:.2f} miles driven
  - 🌲 {emissions / 0.02:.1f} tree days of CO2 absorption

## Recommendations
{"This training run had relatively low emissions. Consider using QLoRA for even more efficient fine-tuning." if emissions < 1 else "Consider using Unsloth for 60% more efficient training to reduce carbon footprint."}

---
*Generated by System2ML Carbon Tracker*
*Timestamp: {datetime.utcnow().isoformat()}*
"""
        return report

    def export_json(self, run_data: Dict[str, Any], filepath: str) -> bool:
        """
        Export carbon data as JSON.

        Args:
            run_data: Dictionary with run details
            filepath: Output file path

        Returns:
            True if successful
        """
        import json

        duration_hours = run_data.get("duration_hours", 0)

        if self.tracker.is_available():
            current = self.tracker.get_current()
            data = {
                "run_id": run_data.get("run_id"),
                "model": run_data.get("model"),
                "method": run_data.get("method"),
                "timestamp": datetime.utcnow().isoformat(),
                "emissions_kg": current.get("emissions_kg", 0),
                "duration_hours": duration_hours,
                "tracking_method": "codecarbon",
            }
        else:
            estimated = CarbonTracker.estimate_from_duration(duration_hours)
            data = {
                "run_id": run_data.get("run_id"),
                "model": run_data.get("model"),
                "method": run_data.get("method"),
                "timestamp": datetime.utcnow().isoformat(),
                "emissions_kg": estimated.get("emissions_kg", 0),
                "duration_hours": duration_hours,
                "tracking_method": "estimation",
            }

        try:
            with open(filepath, "w") as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Failed to export carbon JSON: {e}")
            return False
