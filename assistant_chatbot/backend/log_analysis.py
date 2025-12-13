"""
Log Analysis Utilities for Security Monitoring

This module provides utilities for analyzing security logs and generating
insights about potential threats, attack patterns, and system health.
"""

import re
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from collections import defaultdict, Counter
import logging

logger = logging.getLogger(__name__)


@dataclass
class SecurityAlert:
    """Security alert generated from log analysis"""
    alert_type: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    ip_address: str
    description: str
    evidence: List[str]
    timestamp: datetime
    recommendation: str


@dataclass
class AttackPattern:
    """Detected attack pattern"""
    pattern_type: str
    ip_addresses: List[str]
    event_count: int
    time_span_minutes: int
    confidence_score: float  # 0.0 to 1.0
    description: str


class SecurityLogAnalyzer:
    """
    Analyzes security logs to detect attack patterns and generate alerts.
    
    Provides analysis for:
    - Brute force attacks
    - Distributed attacks
    - Suspicious patterns
    - Anomaly detection
    """
    
    def __init__(self):
        """Initialize the security log analyzer."""
        self.attack_patterns = {
            "brute_force": self._detect_brute_force,
            "distributed_attack": self._detect_distributed_attack,
            "suspicious_patterns": self._detect_suspicious_patterns,
            "rate_limit_abuse": self._detect_rate_limit_abuse
        }
        
        logger.info("SecurityLogAnalyzer initialized")
    
    def analyze_logs(self, log_entries: List[Dict[str, Any]], 
                    time_window_minutes: int = 60) -> Dict[str, Any]:
        """
        Analyze security log entries for threats and patterns.
        
        Args:
            log_entries: List of parsed log entries
            time_window_minutes: Time window for pattern analysis
        
        Returns:
            Analysis results with alerts and patterns
        """
        analysis_start = datetime.utcnow()
        
        # Filter recent entries
        cutoff_time = analysis_start - timedelta(minutes=time_window_minutes)
        recent_entries = [
            entry for entry in log_entries
            if self._parse_timestamp(entry.get("timestamp", "")) >= cutoff_time
        ]
        
        results = {
            "analysis_timestamp": analysis_start.isoformat(),
            "time_window_minutes": time_window_minutes,
            "total_entries_analyzed": len(recent_entries),
            "alerts": [],
            "attack_patterns": [],
            "statistics": self._generate_statistics(recent_entries),
            "recommendations": []
        }
        
        # Run pattern detection
        for pattern_name, detector_func in self.attack_patterns.items():
            try:
                patterns = detector_func(recent_entries, time_window_minutes)
                results["attack_patterns"].extend(patterns)
            except Exception as e:
                logger.error(f"Error in {pattern_name} detection: {str(e)}")
        
        # Generate alerts from patterns
        results["alerts"] = self._generate_alerts(results["attack_patterns"])
        
        # Generate recommendations
        results["recommendations"] = self._generate_recommendations(
            results["alerts"], results["statistics"]
        )
        
        logger.info(
            f"Log analysis completed: {len(results['alerts'])} alerts, "
            f"{len(results['attack_patterns'])} patterns detected"
        )
        
        return results
    
    def _detect_brute_force(self, entries: List[Dict[str, Any]], 
                           time_window: int) -> List[AttackPattern]:
        """Detect brute force attack patterns."""
        patterns = []
        
        # Group by IP address
        ip_events = defaultdict(list)
        for entry in entries:
            if entry.get("event_type") in ["rate_limit_violation", "input_validation_failure"]:
                ip_address = entry.get("ip_address", "unknown")
                ip_events[ip_address].append(entry)
        
        # Analyze each IP for brute force patterns
        for ip_address, events in ip_events.items():
            if len(events) >= 10:  # Threshold for brute force
                # Calculate time span
                timestamps = [self._parse_timestamp(e.get("timestamp", "")) for e in events]
                timestamps = [t for t in timestamps if t]  # Filter valid timestamps
                
                if timestamps:
                    time_span = (max(timestamps) - min(timestamps)).total_seconds() / 60
                    
                    # Calculate confidence based on frequency and consistency
                    frequency = len(events) / max(time_span, 1)  # events per minute
                    confidence = min(frequency / 5.0, 1.0)  # Max confidence at 5 events/min
                    
                    if confidence >= 0.3:  # Minimum confidence threshold
                        patterns.append(AttackPattern(
                            pattern_type="brute_force",
                            ip_addresses=[ip_address],
                            event_count=len(events),
                            time_span_minutes=int(time_span),
                            confidence_score=confidence,
                            description=f"Brute force attack detected from {ip_address}: "
                                      f"{len(events)} violations in {int(time_span)} minutes"
                        ))
        
        return patterns
    
    def _detect_distributed_attack(self, entries: List[Dict[str, Any]], 
                                  time_window: int) -> List[AttackPattern]:
        """Detect distributed attack patterns."""
        patterns = []
        
        # Group events by type and time
        event_timeline = defaultdict(list)
        for entry in entries:
            event_type = entry.get("event_type")
            if event_type in ["rate_limit_violation", "input_validation_failure", "cors_violation"]:
                timestamp = self._parse_timestamp(entry.get("timestamp", ""))
                if timestamp:
                    # Group by 5-minute windows
                    time_bucket = int(timestamp.timestamp() // 300) * 300
                    event_timeline[time_bucket].append(entry)
        
        # Look for coordinated attacks (multiple IPs in short time)
        for time_bucket, events in event_timeline.items():
            unique_ips = set(e.get("ip_address", "") for e in events)
            unique_ips.discard("")  # Remove empty IP addresses
            
            if len(unique_ips) >= 5 and len(events) >= 20:  # Thresholds for distributed attack
                confidence = min(len(unique_ips) / 10.0, 1.0)  # Max confidence at 10+ IPs
                
                patterns.append(AttackPattern(
                    pattern_type="distributed_attack",
                    ip_addresses=list(unique_ips),
                    event_count=len(events),
                    time_span_minutes=5,
                    confidence_score=confidence,
                    description=f"Distributed attack detected: {len(events)} events "
                              f"from {len(unique_ips)} IPs in 5-minute window"
                ))
        
        return patterns
    
    def _detect_suspicious_patterns(self, entries: List[Dict[str, Any]], 
                                   time_window: int) -> List[AttackPattern]:
        """Detect suspicious behavioral patterns."""
        patterns = []
        
        # Look for unusual input validation failures
        validation_failures = [
            e for e in entries 
            if e.get("event_type") == "input_validation_failure"
        ]
        
        # Group by validation type
        validation_types = Counter(
            e.get("details", {}).get("validation_type", "unknown")
            for e in validation_failures
        )
        
        # Check for unusual patterns
        for validation_type, count in validation_types.items():
            if count >= 50:  # High number of specific validation failures
                # Get IPs involved
                involved_ips = set(
                    e.get("ip_address", "") for e in validation_failures
                    if e.get("details", {}).get("validation_type") == validation_type
                )
                involved_ips.discard("")
                
                confidence = min(count / 100.0, 1.0)  # Max confidence at 100+ failures
                
                patterns.append(AttackPattern(
                    pattern_type="suspicious_patterns",
                    ip_addresses=list(involved_ips),
                    event_count=count,
                    time_span_minutes=time_window,
                    confidence_score=confidence,
                    description=f"Suspicious pattern: {count} '{validation_type}' "
                              f"validation failures from {len(involved_ips)} IPs"
                ))
        
        return patterns
    
    def _detect_rate_limit_abuse(self, entries: List[Dict[str, Any]], 
                                time_window: int) -> List[AttackPattern]:
        """Detect rate limit abuse patterns."""
        patterns = []
        
        # Find rate limit violations
        rate_limit_events = [
            e for e in entries 
            if e.get("event_type") == "rate_limit_violation"
        ]
        
        # Group by IP and check for persistent violations
        ip_violations = defaultdict(list)
        for event in rate_limit_events:
            ip_address = event.get("ip_address", "unknown")
            ip_violations[ip_address].append(event)
        
        for ip_address, violations in ip_violations.items():
            blocked_violations = [
                v for v in violations 
                if v.get("details", {}).get("blocked", False)
            ]
            
            if len(blocked_violations) >= 3:  # Multiple blocks indicate persistent abuse
                confidence = min(len(blocked_violations) / 5.0, 1.0)
                
                patterns.append(AttackPattern(
                    pattern_type="rate_limit_abuse",
                    ip_addresses=[ip_address],
                    event_count=len(violations),
                    time_span_minutes=time_window,
                    confidence_score=confidence,
                    description=f"Rate limit abuse: {ip_address} blocked "
                              f"{len(blocked_violations)} times, "
                              f"{len(violations)} total violations"
                ))
        
        return patterns
    
    def _generate_alerts(self, patterns: List[AttackPattern]) -> List[SecurityAlert]:
        """Generate security alerts from detected patterns."""
        alerts = []
        
        for pattern in patterns:
            # Determine severity based on pattern type and confidence
            severity = self._calculate_severity(pattern)
            
            # Generate alert
            alert = SecurityAlert(
                alert_type=pattern.pattern_type,
                severity=severity,
                ip_address=pattern.ip_addresses[0] if pattern.ip_addresses else "multiple",
                description=pattern.description,
                evidence=[
                    f"Event count: {pattern.event_count}",
                    f"Time span: {pattern.time_span_minutes} minutes",
                    f"Confidence: {pattern.confidence_score:.2f}",
                    f"IPs involved: {len(pattern.ip_addresses)}"
                ],
                timestamp=datetime.utcnow(),
                recommendation=self._get_recommendation(pattern)
            )
            
            alerts.append(alert)
        
        return alerts
    
    def _calculate_severity(self, pattern: AttackPattern) -> str:
        """Calculate alert severity based on pattern characteristics."""
        if pattern.confidence_score >= 0.8:
            if pattern.pattern_type in ["brute_force", "distributed_attack"]:
                return "CRITICAL"
            else:
                return "HIGH"
        elif pattern.confidence_score >= 0.6:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _get_recommendation(self, pattern: AttackPattern) -> str:
        """Get recommendation based on attack pattern."""
        recommendations = {
            "brute_force": "Consider blocking the IP address and implementing CAPTCHA or account lockout mechanisms.",
            "distributed_attack": "Implement rate limiting at the network level and consider using a CDN with DDoS protection.",
            "suspicious_patterns": "Review input validation rules and consider implementing additional filtering.",
            "rate_limit_abuse": "Consider extending block duration or implementing progressive penalties."
        }
        
        return recommendations.get(pattern.pattern_type, "Monitor the situation and consider additional security measures.")
    
    def _generate_statistics(self, entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate statistics from log entries."""
        stats = {
            "total_events": len(entries),
            "events_by_type": Counter(e.get("event_type", "unknown") for e in entries),
            "unique_ips": len(set(e.get("ip_address", "") for e in entries if e.get("ip_address"))),
            "top_ips": [],
            "event_timeline": {}
        }
        
        # Top violating IPs
        ip_counts = Counter(e.get("ip_address", "") for e in entries if e.get("ip_address"))
        stats["top_ips"] = [
            {"ip": ip, "count": count} 
            for ip, count in ip_counts.most_common(10)
        ]
        
        # Event timeline (hourly buckets)
        timeline = defaultdict(int)
        for entry in entries:
            timestamp = self._parse_timestamp(entry.get("timestamp", ""))
            if timestamp:
                hour_bucket = timestamp.replace(minute=0, second=0, microsecond=0)
                timeline[hour_bucket.isoformat()] += 1
        
        stats["event_timeline"] = dict(timeline)
        
        return stats
    
    def _generate_recommendations(self, alerts: List[SecurityAlert], 
                                statistics: Dict[str, Any]) -> List[str]:
        """Generate general security recommendations."""
        recommendations = []
        
        # Check alert severity distribution
        critical_alerts = sum(1 for a in alerts if a.severity == "CRITICAL")
        high_alerts = sum(1 for a in alerts if a.severity == "HIGH")
        
        if critical_alerts > 0:
            recommendations.append(
                f"URGENT: {critical_alerts} critical security alerts detected. "
                "Immediate action required."
            )
        
        if high_alerts > 2:
            recommendations.append(
                f"{high_alerts} high-severity alerts detected. "
                "Review security measures and consider tightening restrictions."
            )
        
        # Check event volume
        total_events = statistics.get("total_events", 0)
        if total_events > 1000:
            recommendations.append(
                f"High security event volume ({total_events} events). "
                "Consider implementing additional rate limiting or filtering."
            )
        
        # Check IP diversity
        unique_ips = statistics.get("unique_ips", 0)
        if unique_ips > 100:
            recommendations.append(
                f"High number of unique IPs ({unique_ips}) generating security events. "
                "Possible distributed attack - consider network-level protection."
            )
        
        if not recommendations:
            recommendations.append("Security posture appears normal. Continue monitoring.")
        
        return recommendations
    
    def _parse_timestamp(self, timestamp_str: str) -> Optional[datetime]:
        """Parse timestamp string to datetime object."""
        if not timestamp_str:
            return None
        
        try:
            # Try ISO format first
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                # Try common log format
                return datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                logger.warning(f"Could not parse timestamp: {timestamp_str}")
                return None


def analyze_security_logs(log_entries: List[Dict[str, Any]], 
                         time_window_minutes: int = 60) -> Dict[str, Any]:
    """
    Convenience function to analyze security logs.
    
    Args:
        log_entries: List of parsed log entries
        time_window_minutes: Time window for analysis
    
    Returns:
        Analysis results
    """
    analyzer = SecurityLogAnalyzer()
    return analyzer.analyze_logs(log_entries, time_window_minutes)


def parse_log_file(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse a log file and extract security events.
    
    Args:
        file_path: Path to the log file
    
    Returns:
        List of parsed log entries
    """
    entries = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                
                try:
                    # Try to parse as JSON (structured logs)
                    entry = json.loads(line)
                    entries.append(entry)
                except json.JSONDecodeError:
                    # Try to parse as standard log format
                    entry = _parse_standard_log_line(line)
                    if entry:
                        entries.append(entry)
                    else:
                        logger.warning(f"Could not parse log line {line_num}: {line[:100]}")
                
    except FileNotFoundError:
        logger.error(f"Log file not found: {file_path}")
    except Exception as e:
        logger.error(f"Error reading log file {file_path}: {str(e)}")
    
    return entries


def _parse_standard_log_line(line: str) -> Optional[Dict[str, Any]]:
    """Parse a standard log format line."""
    # Basic regex for common log formats
    # Format: timestamp - logger - level - message
    pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+ - (\w+) - (\w+) - (.+)'
    
    match = re.match(pattern, line)
    if match:
        timestamp, logger_name, level, message = match.groups()
        
        # Try to extract JSON from message
        json_match = re.search(r'\{.*\}', message)
        if json_match:
            try:
                json_data = json.loads(json_match.group())
                json_data['timestamp'] = timestamp
                json_data['log_level'] = level
                return json_data
            except json.JSONDecodeError:
                pass
        
        # Return basic parsed entry
        return {
            'timestamp': timestamp,
            'logger': logger_name,
            'level': level,
            'message': message,
            'event_type': 'log_entry'
        }
    
    return None