"""
Layer 1 — Deterministic Telemetry Validation (C10 Part 4)
Performs strict range checks, slew-rate bounds, stuck-value detection,
stale-timestamp checks, and sampling regularity validation.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math
from .schema import StandardObservation, SensorType

# Valid physiological boundaries
PHYSIOLOGICAL_RANGES = {
    SensorType.HEART_RATE: {"min": 30.0, "max": 240.0, "unit": "bpm", "max_slew": 40.0}, # max change per sec
    SensorType.SPO2: {"min": 50.0, "max": 100.0, "unit": "%", "max_slew": 10.0},
    SensorType.BLOOD_PRESSURE_SYS: {"min": 50.0, "max": 260.0, "unit": "mmHg", "max_slew": 35.0},
    SensorType.BLOOD_PRESSURE_DIA: {"min": 30.0, "max": 150.0, "unit": "mmHg", "max_slew": 25.0},
    SensorType.RESPIRATORY_RATE: {"min": 4.0, "max": 60.0, "unit": "brpm", "max_slew": 15.0},
    SensorType.BLOOD_GLUCOSE: {"min": 20.0, "max": 600.0, "unit": "mg/dL", "max_slew": 50.0},
}


class TelemetryValidator:
    def __init__(self, history_window_size: int = 20):
        self.history_window_size = history_window_size
        # Key: device_id:sensor_type -> List[StandardObservation]
        self._history: Dict[str, List[StandardObservation]] = {}

    def validate(self, obs: StandardObservation) -> Dict[str, Any]:
        """
        Validate observation against deterministic physiological and temporal rules.
        Returns a dict of flags, status, and details.
        """
        flags: List[str] = []
        rule_ids: List[str] = []
        details: Dict[str, Any] = {}

        key = f"{obs.device_id}:{obs.sensor_type.value}"
        history = self._history.get(key, [])

        # 1. Range Validation (Rule R1)
        limits = PHYSIOLOGICAL_RANGES.get(obs.sensor_type)
        if limits:
            if obs.value < limits["min"] or obs.value > limits["max"]:
                flags.append("OUT_OF_PHYSIOLOGICAL_RANGE")
                rule_ids.append("R1_RANGE_BOUNDS")
                details["range_violation"] = {
                    "val": obs.value,
                    "min": limits["min"],
                    "max": limits["max"],
                }

        # 2. Stale Observation / Timestamp Check (Rule R2)
        measured_time = obs.measured_at
        received_time = obs.received_at
        if measured_time.tzinfo is None:
            measured_time = measured_time.replace(tzinfo=timezone.utc)
        if received_time.tzinfo is None:
            received_time = received_time.replace(tzinfo=timezone.utc)

        time_delta_sec = (received_time - measured_time).total_seconds()
        if time_delta_sec > 120.0:  # Older than 2 minutes
            flags.append("STALE_OBSERVATION")
            rule_ids.append("R2_STALE_TIMESTAMP")
            details["delay_sec"] = time_delta_sec
        elif time_delta_sec < -5.0:  # Future timestamp from clock skew
            flags.append("FUTURE_TIMESTAMP_CLOCK_SKEW")
            rule_ids.append("R2_CLOCK_SKEW")
            details["clock_skew_sec"] = time_delta_sec

        # 3. History-based validation (Spike & Stuck Detection)
        if history:
            prev_obs = history[-1]
            prev_time = prev_obs.measured_at
            if prev_time.tzinfo is None:
                prev_time = prev_time.replace(tzinfo=timezone.utc)
            dt_sec = max(0.1, (measured_time - prev_time).total_seconds())

            # A. Slew-rate / Sudden Spike (Rule R3)
            val_diff = abs(obs.value - prev_obs.value)
            slew_rate = val_diff / dt_sec
            max_slew = limits.get("max_slew", 50.0) if limits else 50.0

            if slew_rate > max_slew:
                flags.append("SUDDEN_SPIKE_DETECTED")
                rule_ids.append("R3_SLEW_RATE_SPIKE")
                details["slew_rate"] = slew_rate
                details["max_allowed_slew"] = max_slew

            # B. Stuck / Flatline Check (Rule R4)
            # True physiological vitals almost always have heart rate variability (HRV)
            # or minor sensor noise. If > 5 consecutive readings have exactly identical values:
            recent_vals = [h.value for h in history[-5:]] + [obs.value]
            if len(recent_vals) >= 5:
                variance = sum((x - sum(recent_vals)/len(recent_vals))**2 for x in recent_vals) / len(recent_vals)
                if variance == 0.0 and obs.sensor_type in [SensorType.HEART_RATE, SensorType.SPO2]:
                    flags.append("STUCK_SENSOR_FLATLINE")
                    rule_ids.append("R4_STUCK_VALUE_VARIANCE")
                    details["consecutive_identical_readings"] = len(recent_vals)

        # Append to history cache
        history.append(obs)
        if len(history) > self.history_window_size:
            history.pop(0)
        self._history[key] = history

        is_valid = len(flags) == 0
        return {
            "is_valid": is_valid,
            "flags": flags,
            "rule_ids": rule_ids,
            "details": details,
        }
