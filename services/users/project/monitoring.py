# services/users/project/monitoring.py
"""
Professional Database Monitoring and Alerting System for Aurora PostgreSQL
Provides comprehensive monitoring, logging, and alerting capabilities
"""

import os
import time
import logging
import psutil
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from flask import current_app
from sqlalchemy import text, event
from sqlalchemy.engine import Engine
from sqlalchemy.pool import Pool

from . import db
from .aurora_config import aurora_config

# Configure monitoring logger
monitoring_logger = logging.getLogger('aurora_monitoring')
monitoring_logger.setLevel(logging.INFO)

# Create handler if it doesn't exist
if not monitoring_logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    monitoring_logger.addHandler(handler)

@dataclass
class DatabaseMetrics:
    """Database performance metrics"""
    connection_count: int
    active_connections: int
    idle_connections: int
    query_count: int
    slow_query_count: int
    error_count: int
    avg_response_time: float
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    timestamp: datetime

@dataclass
class QueryMetrics:
    """Individual query performance metrics"""
    query_hash: str
    query_text: str
    execution_time: float
    rows_affected: int
    timestamp: datetime
    status: str  # 'success', 'error', 'slow'

class AuroraMonitor:
    """Professional Aurora PostgreSQL monitoring system"""
    
    def __init__(self):
        self.metrics_history: List[DatabaseMetrics] = []
        self.query_history: List[QueryMetrics] = []
        self.alert_thresholds = {
            'max_connections': 80,  # Percentage
            'slow_query_threshold': 5.0,  # Seconds
            'error_rate_threshold': 0.05,  # 5% error rate
            'cpu_threshold': 80.0,  # Percentage
            'memory_threshold': 85.0,  # Percentage
            'response_time_threshold': 2.0  # Seconds
        }
        self.is_monitoring = False
        
    def start_monitoring(self):
        """Start the monitoring system"""
        if not aurora_config.is_aurora_environment():
            monitoring_logger.info("Monitoring disabled for non-Aurora environments")
            # Still set monitoring to True for testing purposes, but with limited functionality
            self.is_monitoring = True
            return

        self.is_monitoring = True
        monitoring_logger.info("🔍 Aurora monitoring system started")

        # Set up SQLAlchemy event listeners
        self._setup_query_monitoring()
        
    def stop_monitoring(self):
        """Stop the monitoring system"""
        self.is_monitoring = False
        monitoring_logger.info("Aurora monitoring system stopped")
    
    def _setup_query_monitoring(self):
        """Set up SQLAlchemy event listeners for query monitoring"""
        
        @event.listens_for(Engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
            context._query_statement = statement
        
        @event.listens_for(Engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if hasattr(context, '_query_start_time'):
                execution_time = time.time() - context._query_start_time
                
                # Log slow queries
                if execution_time > self.alert_thresholds['slow_query_threshold']:
                    monitoring_logger.warning(
                        f"🐌 Slow query detected: {execution_time:.2f}s - {statement[:100]}..."
                    )
                
                # Record query metrics
                query_metrics = QueryMetrics(
                    query_hash=str(hash(statement)),
                    query_text=statement[:500],  # Truncate long queries
                    execution_time=execution_time,
                    rows_affected=cursor.rowcount if hasattr(cursor, 'rowcount') else 0,
                    timestamp=datetime.now(),
                    status='slow' if execution_time > self.alert_thresholds['slow_query_threshold'] else 'success'
                )
                
                self.query_history.append(query_metrics)
                
                # Keep only recent queries (last 1000)
                if len(self.query_history) > 1000:
                    self.query_history = self.query_history[-1000:]
    
    def collect_metrics(self) -> DatabaseMetrics:
        """Collect current database metrics"""
        try:
            # Database connection metrics
            connection_metrics = self._get_connection_metrics()
            
            # Query performance metrics
            query_metrics = self._get_query_metrics()
            
            # System metrics
            system_metrics = self._get_system_metrics()
            
            metrics = DatabaseMetrics(
                connection_count=connection_metrics['total'],
                active_connections=connection_metrics['active'],
                idle_connections=connection_metrics['idle'],
                query_count=query_metrics['total'],
                slow_query_count=query_metrics['slow'],
                error_count=query_metrics['errors'],
                avg_response_time=query_metrics['avg_time'],
                cpu_usage=system_metrics['cpu'],
                memory_usage=system_metrics['memory'],
                disk_usage=system_metrics['disk'],
                timestamp=datetime.now()
            )
            
            self.metrics_history.append(metrics)
            
            # Keep only recent metrics (last 1440 = 24 hours if collected every minute)
            if len(self.metrics_history) > 1440:
                self.metrics_history = self.metrics_history[-1440:]
            
            return metrics
            
        except Exception as e:
            monitoring_logger.error(f"Error collecting metrics: {e}")
            return None
    
    def _get_connection_metrics(self) -> Dict[str, int]:
        """Get database connection metrics"""
        try:
            with db.engine.connect() as conn:
                # Get connection statistics from PostgreSQL
                result = conn.execute(text("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """))
                
                row = result.fetchone()
                return {
                    'total': row[0] if row else 0,
                    'active': row[1] if row else 0,
                    'idle': row[2] if row else 0
                }
        except Exception as e:
            monitoring_logger.error(f"Error getting connection metrics: {e}")
            return {'total': 0, 'active': 0, 'idle': 0}
    
    def _get_query_metrics(self) -> Dict[str, Any]:
        """Get query performance metrics from recent history"""
        if not self.query_history:
            return {'total': 0, 'slow': 0, 'errors': 0, 'avg_time': 0.0}
        
        # Get metrics from last 5 minutes
        cutoff_time = datetime.now() - timedelta(minutes=5)
        recent_queries = [q for q in self.query_history if q.timestamp > cutoff_time]
        
        if not recent_queries:
            return {'total': 0, 'slow': 0, 'errors': 0, 'avg_time': 0.0}
        
        total_queries = len(recent_queries)
        slow_queries = len([q for q in recent_queries if q.status == 'slow'])
        error_queries = len([q for q in recent_queries if q.status == 'error'])
        avg_time = sum(q.execution_time for q in recent_queries) / total_queries
        
        return {
            'total': total_queries,
            'slow': slow_queries,
            'errors': error_queries,
            'avg_time': avg_time
        }
    
    def _get_system_metrics(self) -> Dict[str, float]:
        """Get system resource metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu': cpu_percent,
                'memory': memory.percent,
                'disk': disk.percent
            }
        except Exception as e:
            monitoring_logger.error(f"Error getting system metrics: {e}")
            return {'cpu': 0.0, 'memory': 0.0, 'disk': 0.0}
    
    def check_alerts(self, metrics: DatabaseMetrics) -> List[str]:
        """Check metrics against alert thresholds"""
        alerts = []
        
        # Connection alerts
        if metrics.connection_count > 0:
            connection_usage = (metrics.active_connections / metrics.connection_count) * 100
            if connection_usage > self.alert_thresholds['max_connections']:
                alerts.append(f"High connection usage: {connection_usage:.1f}%")
        
        # Performance alerts
        if metrics.avg_response_time > self.alert_thresholds['response_time_threshold']:
            alerts.append(f"High response time: {metrics.avg_response_time:.2f}s")
        
        if metrics.slow_query_count > 0:
            alerts.append(f"Slow queries detected: {metrics.slow_query_count}")
        
        # Error rate alerts
        if metrics.query_count > 0:
            error_rate = metrics.error_count / metrics.query_count
            if error_rate > self.alert_thresholds['error_rate_threshold']:
                alerts.append(f"High error rate: {error_rate:.2%}")
        
        # System resource alerts
        if metrics.cpu_usage > self.alert_thresholds['cpu_threshold']:
            alerts.append(f"High CPU usage: {metrics.cpu_usage:.1f}%")
        
        if metrics.memory_usage > self.alert_thresholds['memory_threshold']:
            alerts.append(f"High memory usage: {metrics.memory_usage:.1f}%")
        
        return alerts
    
    def get_health_status(self) -> Dict[str, Any]:
        """Get overall database health status"""
        if not self.metrics_history:
            return {'status': 'unknown', 'message': 'No metrics available'}
        
        latest_metrics = self.metrics_history[-1]
        alerts = self.check_alerts(latest_metrics)
        
        if alerts:
            status = 'warning' if len(alerts) <= 2 else 'critical'
            message = f"{len(alerts)} alert(s): {'; '.join(alerts[:3])}"
        else:
            status = 'healthy'
            message = 'All systems operational'
        
        return {
            'status': status,
            'message': message,
            'metrics': {
                'connections': latest_metrics.connection_count,
                'active_connections': latest_metrics.active_connections,
                'avg_response_time': latest_metrics.avg_response_time,
                'cpu_usage': latest_metrics.cpu_usage,
                'memory_usage': latest_metrics.memory_usage
            },
            'alerts': alerts,
            'timestamp': latest_metrics.timestamp.isoformat() if latest_metrics.timestamp else datetime.now().isoformat()
        }
    
    def get_performance_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance summary for the specified time period"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_metrics = [m for m in self.metrics_history if m.timestamp > cutoff_time]
        
        if not recent_metrics:
            return {'message': 'No metrics available for the specified period'}
        
        # Calculate averages and peaks
        avg_response_time = sum(m.avg_response_time for m in recent_metrics) / len(recent_metrics)
        peak_response_time = max(m.avg_response_time for m in recent_metrics)
        avg_connections = sum(m.connection_count for m in recent_metrics) / len(recent_metrics)
        peak_connections = max(m.connection_count for m in recent_metrics)
        total_queries = sum(m.query_count for m in recent_metrics)
        total_slow_queries = sum(m.slow_query_count for m in recent_metrics)
        
        return {
            'period_hours': hours,
            'metrics_count': len(recent_metrics),
            'performance': {
                'avg_response_time': round(avg_response_time, 3),
                'peak_response_time': round(peak_response_time, 3),
                'avg_connections': round(avg_connections, 1),
                'peak_connections': peak_connections,
                'total_queries': total_queries,
                'slow_queries': total_slow_queries,
                'slow_query_rate': round((total_slow_queries / total_queries * 100), 2) if total_queries > 0 else 0
            }
        }

# Global monitor instance
aurora_monitor = AuroraMonitor()

def init_monitoring(app):
    """Initialize monitoring system with Flask app"""
    with app.app_context():
        aurora_monitor.start_monitoring()
        monitoring_logger.info("Aurora monitoring initialized")

def get_monitoring_data():
    """Get current monitoring data for API endpoints"""
    return {
        'health': aurora_monitor.get_health_status(),
        'performance_24h': aurora_monitor.get_performance_summary(24),
        'performance_1h': aurora_monitor.get_performance_summary(1)
    }
