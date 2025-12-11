#!/usr/bin/env python3
"""
GCP Cost Monitoring Script for Medical AI Assistant
Monitors Cloud Run usage and provides cost estimates
"""

import subprocess
import json
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, List
import argparse

class GCPCostMonitor:
    def __init__(self, project_id: str, service_name: str = "medical-assistant", region: str = "us-central1"):
        self.project_id = project_id
        self.service_name = service_name
        self.region = region
        
        # Cloud Run pricing (as of 2024, us-central1)
        self.pricing = {
            "cpu_per_vcpu_second": 0.00002400,  # $0.000024 per vCPU-second
            "memory_per_gb_second": 0.00000250,  # $0.0000025 per GB-second
            "requests_per_million": 0.40,        # $0.40 per million requests
            "free_tier": {
                "cpu_seconds": 180000,           # 180,000 vCPU-seconds per month
                "memory_gb_seconds": 360000,     # 360,000 GB-seconds per month
                "requests": 2000000              # 2 million requests per month
            }
        }
    
    def run_gcloud_command(self, command: List[str]) -> Dict[str, Any]:
        """Run a gcloud command and return JSON output"""
        try:
            result = subprocess.run(
                ["gcloud"] + command + ["--format=json"],
                capture_output=True,
                text=True,
                check=True
            )
            return json.loads(result.stdout) if result.stdout.strip() else {}
        except subprocess.CalledProcessError as e:
            print(f"Error running gcloud command: {e}")
            print(f"Command: {' '.join(['gcloud'] + command)}")
            print(f"Error output: {e.stderr}")
            return {}
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON output: {e}")
            return {}
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get Cloud Run service information"""
        command = [
            "run", "services", "describe", self.service_name,
            "--region", self.region,
            "--project", self.project_id
        ]
        return self.run_gcloud_command(command)
    
    def get_service_metrics(self, days: int = 7) -> Dict[str, Any]:
        """Get service metrics for cost calculation"""
        # Note: This is a simplified version. In production, you'd use Cloud Monitoring API
        # For now, we'll provide estimates based on service configuration
        
        service_info = self.get_service_info()
        if not service_info:
            return {}
        
        # Extract resource limits
        spec = service_info.get("spec", {}).get("template", {}).get("spec", {})
        containers = spec.get("containers", [{}])
        
        if containers:
            resources = containers[0].get("resources", {}).get("limits", {})
            cpu_limit = resources.get("cpu", "1000m")
            memory_limit = resources.get("memory", "1Gi")
            
            # Convert to numeric values
            cpu_vcpus = float(cpu_limit.replace("m", "")) / 1000 if "m" in cpu_limit else float(cpu_limit)
            memory_gb = float(memory_limit.replace("Gi", "")) if "Gi" in memory_limit else float(memory_limit.replace("Mi", "")) / 1024
        else:
            cpu_vcpus = 1.0
            memory_gb = 1.0
        
        return {
            "cpu_vcpus": cpu_vcpus,
            "memory_gb": memory_gb,
            "concurrency": spec.get("containerConcurrency", 80),
            "min_instances": int(spec.get("metadata", {}).get("annotations", {}).get("autoscaling.knative.dev/minScale", "0")),
            "max_instances": int(spec.get("metadata", {}).get("annotations", {}).get("autoscaling.knative.dev/maxScale", "10"))
        }
    
    def estimate_monthly_cost(self, estimated_requests: int = 1000, avg_request_duration: float = 2.0) -> Dict[str, Any]:
        """
        Estimate monthly costs based on usage patterns
        
        Args:
            estimated_requests: Number of requests per month
            avg_request_duration: Average request duration in seconds
        """
        metrics = self.get_service_metrics()
        if not metrics:
            return {"error": "Could not retrieve service metrics"}
        
        cpu_vcpus = metrics["cpu_vcpus"]
        memory_gb = metrics["memory_gb"]
        
        # Calculate resource usage
        total_cpu_seconds = estimated_requests * avg_request_duration * cpu_vcpus
        total_memory_gb_seconds = estimated_requests * avg_request_duration * memory_gb
        
        # Apply free tier
        billable_cpu_seconds = max(0, total_cpu_seconds - self.pricing["free_tier"]["cpu_seconds"])
        billable_memory_gb_seconds = max(0, total_memory_gb_seconds - self.pricing["free_tier"]["memory_gb_seconds"])
        billable_requests = max(0, estimated_requests - self.pricing["free_tier"]["requests"])
        
        # Calculate costs
        cpu_cost = billable_cpu_seconds * self.pricing["cpu_per_vcpu_second"]
        memory_cost = billable_memory_gb_seconds * self.pricing["memory_per_gb_second"]
        request_cost = (billable_requests / 1000000) * self.pricing["requests_per_million"]
        
        total_cost = cpu_cost + memory_cost + request_cost
        
        return {
            "service_config": {
                "cpu_vcpus": cpu_vcpus,
                "memory_gb": memory_gb,
                "min_instances": metrics["min_instances"],
                "max_instances": metrics["max_instances"],
                "concurrency": metrics["concurrency"]
            },
            "usage_estimate": {
                "requests_per_month": estimated_requests,
                "avg_request_duration_seconds": avg_request_duration,
                "total_cpu_seconds": total_cpu_seconds,
                "total_memory_gb_seconds": total_memory_gb_seconds
            },
            "free_tier_usage": {
                "cpu_seconds_used": min(total_cpu_seconds, self.pricing["free_tier"]["cpu_seconds"]),
                "memory_gb_seconds_used": min(total_memory_gb_seconds, self.pricing["free_tier"]["memory_gb_seconds"]),
                "requests_used": min(estimated_requests, self.pricing["free_tier"]["requests"])
            },
            "billable_usage": {
                "cpu_seconds": billable_cpu_seconds,
                "memory_gb_seconds": billable_memory_gb_seconds,
                "requests": billable_requests
            },
            "cost_breakdown": {
                "cpu_cost": round(cpu_cost, 4),
                "memory_cost": round(memory_cost, 4),
                "request_cost": round(request_cost, 4),
                "total_monthly_cost": round(total_cost, 2)
            },
            "cost_scenarios": {
                "minimal_usage_100_requests": self._calculate_scenario_cost(100, avg_request_duration, cpu_vcpus, memory_gb),
                "light_usage_1000_requests": self._calculate_scenario_cost(1000, avg_request_duration, cpu_vcpus, memory_gb),
                "moderate_usage_10000_requests": self._calculate_scenario_cost(10000, avg_request_duration, cpu_vcpus, memory_gb),
                "heavy_usage_100000_requests": self._calculate_scenario_cost(100000, avg_request_duration, cpu_vcpus, memory_gb)
            }
        }
    
    def _calculate_scenario_cost(self, requests: int, duration: float, cpu_vcpus: float, memory_gb: float) -> float:
        """Calculate cost for a specific usage scenario"""
        total_cpu_seconds = requests * duration * cpu_vcpus
        total_memory_gb_seconds = requests * duration * memory_gb
        
        billable_cpu_seconds = max(0, total_cpu_seconds - self.pricing["free_tier"]["cpu_seconds"])
        billable_memory_gb_seconds = max(0, total_memory_gb_seconds - self.pricing["free_tier"]["memory_gb_seconds"])
        billable_requests = max(0, requests - self.pricing["free_tier"]["requests"])
        
        cpu_cost = billable_cpu_seconds * self.pricing["cpu_per_vcpu_second"]
        memory_cost = billable_memory_gb_seconds * self.pricing["memory_per_gb_second"]
        request_cost = (billable_requests / 1000000) * self.pricing["requests_per_million"]
        
        return round(cpu_cost + memory_cost + request_cost, 2)
    
    def get_optimization_recommendations(self) -> List[str]:
        """Get cost optimization recommendations"""
        metrics = self.get_service_metrics()
        recommendations = []
        
        if metrics.get("min_instances", 0) > 0:
            recommendations.append("✅ Set minimum instances to 0 to enable scale-to-zero")
        
        if metrics.get("cpu_vcpus", 1) > 1:
            recommendations.append("💡 Consider reducing CPU allocation if not fully utilized")
        
        if metrics.get("memory_gb", 1) > 1:
            recommendations.append("💡 Consider reducing memory allocation if not fully utilized")
        
        if metrics.get("concurrency", 80) < 50:
            recommendations.append("💡 Increase concurrency to handle more requests per instance")
        
        recommendations.extend([
            "🔄 Enable CPU throttling to only allocate CPU during requests",
            "📍 Use us-central1 region for lowest costs",
            "🏗️ Optimize Docker image size to reduce cold start times",
            "📊 Monitor actual usage and adjust resources accordingly"
        ])
        
        return recommendations

def main():
    parser = argparse.ArgumentParser(description="Monitor GCP Cloud Run costs for Medical AI Assistant")
    parser.add_argument("--project", required=True, help="GCP Project ID")
    parser.add_argument("--service", default="medical-assistant", help="Cloud Run service name")
    parser.add_argument("--region", default="us-central1", help="GCP region")
    parser.add_argument("--requests", type=int, default=1000, help="Estimated monthly requests")
    parser.add_argument("--duration", type=float, default=2.0, help="Average request duration in seconds")
    
    args = parser.parse_args()
    
    monitor = GCPCostMonitor(args.project, args.service, args.region)
    
    print(f"🔍 Analyzing costs for {args.service} in {args.project}")
    print("=" * 60)
    
    # Get cost estimate
    cost_data = monitor.estimate_monthly_cost(args.requests, args.duration)
    
    if "error" in cost_data:
        print(f"❌ Error: {cost_data['error']}")
        sys.exit(1)
    
    # Display service configuration
    config = cost_data["service_config"]
    print(f"\n📋 Service Configuration:")
    print(f"   CPU: {config['cpu_vcpus']} vCPUs")
    print(f"   Memory: {config['memory_gb']} GB")
    print(f"   Min Instances: {config['min_instances']}")
    print(f"   Max Instances: {config['max_instances']}")
    print(f"   Concurrency: {config['concurrency']}")
    
    # Display usage estimate
    usage = cost_data["usage_estimate"]
    print(f"\n📊 Usage Estimate:")
    print(f"   Requests/month: {usage['requests_per_month']:,}")
    print(f"   Avg duration: {usage['avg_request_duration_seconds']}s")
    print(f"   Total CPU-seconds: {usage['total_cpu_seconds']:,.0f}")
    print(f"   Total GB-seconds: {usage['total_memory_gb_seconds']:,.0f}")
    
    # Display free tier usage
    free_tier = cost_data["free_tier_usage"]
    print(f"\n🆓 Free Tier Usage:")
    print(f"   CPU-seconds: {free_tier['cpu_seconds_used']:,.0f} / 180,000")
    print(f"   GB-seconds: {free_tier['memory_gb_seconds_used']:,.0f} / 360,000")
    print(f"   Requests: {free_tier['requests_used']:,} / 2,000,000")
    
    # Display cost breakdown
    costs = cost_data["cost_breakdown"]
    print(f"\n💰 Monthly Cost Breakdown:")
    print(f"   CPU cost: ${costs['cpu_cost']:.4f}")
    print(f"   Memory cost: ${costs['memory_cost']:.4f}")
    print(f"   Request cost: ${costs['request_cost']:.4f}")
    print(f"   Total: ${costs['total_monthly_cost']:.2f}")
    
    # Display cost scenarios
    scenarios = cost_data["cost_scenarios"]
    print(f"\n📈 Cost Scenarios:")
    print(f"   100 requests/month: ${scenarios['minimal_usage_100_requests']}")
    print(f"   1,000 requests/month: ${scenarios['light_usage_1000_requests']}")
    print(f"   10,000 requests/month: ${scenarios['moderate_usage_10000_requests']}")
    print(f"   100,000 requests/month: ${scenarios['heavy_usage_100000_requests']}")
    
    # Display optimization recommendations
    recommendations = monitor.get_optimization_recommendations()
    print(f"\n🎯 Optimization Recommendations:")
    for rec in recommendations:
        print(f"   {rec}")
    
    print(f"\n💡 Note: Costs include only Cloud Run charges. Additional costs may apply for:")
    print(f"   - Container Registry storage (~$0.10/month)")
    print(f"   - Secret Manager (~$0.06/month)")
    print(f"   - Cloud Build (free tier: 120 build-minutes/day)")

if __name__ == "__main__":
    main()