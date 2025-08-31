// Conflict Resolution Service
class ConflictResolutionService {
  constructor() {
    this.conflictStrategies = {
      'CLIENT_WINS': this.clientWinsStrategy,
      'SERVER_WINS': this.serverWinsStrategy,
      'MERGE': this.mergeStrategy,
      'USER_CHOICE': this.userChoiceStrategy,
      'TIMESTAMP': this.timestampStrategy
    };
    
    this.conflictQueue = [];
    this.conflictListeners = [];
  }

  // Main conflict resolution entry point
  async resolveConflict(localData, serverData, conflictType = 'USER_CHOICE') {
    const conflict = {
      id: this.generateConflictId(),
      localData,
      serverData,
      conflictType,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    console.log('🔄 Conflict detected:', conflict);

    // Add to conflict queue
    this.conflictQueue.push(conflict);
    this.notifyConflictListeners(conflict);

    // Apply resolution strategy
    const strategy = this.conflictStrategies[conflictType] || this.conflictStrategies['USER_CHOICE'];
    const resolution = await strategy.call(this, conflict);

    // Update conflict status
    conflict.status = 'RESOLVED';
    conflict.resolution = resolution;
    conflict.resolvedAt = new Date().toISOString();

    console.log('✅ Conflict resolved:', resolution);
    return resolution;
  }

  // Strategy: Client data wins
  clientWinsStrategy(conflict) {
    return {
      strategy: 'CLIENT_WINS',
      data: conflict.localData,
      reason: 'Local changes take precedence'
    };
  }

  // Strategy: Server data wins
  serverWinsStrategy(conflict) {
    return {
      strategy: 'SERVER_WINS',
      data: conflict.serverData,
      reason: 'Server data is authoritative'
    };
  }

  // Strategy: Merge data intelligently
  mergeStrategy(conflict) {
    const merged = this.mergeObjects(conflict.localData, conflict.serverData);
    return {
      strategy: 'MERGE',
      data: merged,
      reason: 'Data merged automatically'
    };
  }

  // Strategy: Let user choose
  async userChoiceStrategy(conflict) {
    return new Promise((resolve) => {
      // This will be handled by the UI component
      conflict.resolver = resolve;
      this.notifyConflictListeners(conflict);
    });
  }

  // Strategy: Use timestamp to determine winner
  timestampStrategy(conflict) {
    const localTime = new Date(conflict.localData.updatedAt || conflict.localData.createdAt);
    const serverTime = new Date(conflict.serverData.updatedAt || conflict.serverData.createdAt);
    
    const winner = localTime > serverTime ? conflict.localData : conflict.serverData;
    const strategy = localTime > serverTime ? 'CLIENT_WINS' : 'SERVER_WINS';
    
    return {
      strategy: 'TIMESTAMP',
      data: winner,
      reason: `${strategy.toLowerCase().replace('_', ' ')} based on timestamp`
    };
  }

  // Intelligent object merging
  mergeObjects(local, server) {
    const merged = { ...server }; // Start with server data
    
    // Merge specific fields with conflict resolution logic
    Object.keys(local).forEach(key => {
      if (key === 'id') {
        // Always use server ID if available
        merged[key] = server[key] || local[key];
      } else if (key === 'createdAt') {
        // Use earliest creation time
        merged[key] = new Date(local[key]) < new Date(server[key]) ? local[key] : server[key];
      } else if (key === 'updatedAt') {
        // Use latest update time
        merged[key] = new Date(local[key]) > new Date(server[key]) ? local[key] : server[key];
      } else if (local[key] !== server[key]) {
        // For conflicting fields, prefer local if it's more recent
        const localTime = new Date(local.updatedAt || local.createdAt);
        const serverTime = new Date(server.updatedAt || server.createdAt);
        merged[key] = localTime > serverTime ? local[key] : server[key];
      }
    });

    // Add merge metadata
    merged._mergedAt = new Date().toISOString();
    merged._mergeSource = 'AUTOMATIC';
    
    return merged;
  }

  // Detect conflicts between local and server data
  detectConflicts(localData, serverData) {
    const conflicts = [];
    
    // Check for field-level conflicts
    Object.keys(localData).forEach(key => {
      if (key.startsWith('_') || key === 'id') return; // Skip metadata and ID
      
      if (localData[key] !== serverData[key]) {
        conflicts.push({
          field: key,
          localValue: localData[key],
          serverValue: serverData[key],
          type: 'FIELD_CONFLICT'
        });
      }
    });

    // Check for version conflicts
    const localVersion = localData.version || 1;
    const serverVersion = serverData.version || 1;
    
    if (localVersion !== serverVersion) {
      conflicts.push({
        field: 'version',
        localValue: localVersion,
        serverValue: serverVersion,
        type: 'VERSION_CONFLICT'
      });
    }

    return conflicts;
  }

  // Resolve user choice conflict
  resolveUserChoice(conflictId, choice, customData = null) {
    const conflict = this.conflictQueue.find(c => c.id === conflictId);
    if (!conflict || !conflict.resolver) return;

    let resolution;
    switch (choice) {
      case 'LOCAL':
        resolution = {
          strategy: 'USER_CHOICE_LOCAL',
          data: conflict.localData,
          reason: 'User chose local version'
        };
        break;
      case 'SERVER':
        resolution = {
          strategy: 'USER_CHOICE_SERVER',
          data: conflict.serverData,
          reason: 'User chose server version'
        };
        break;
      case 'MERGE':
        resolution = {
          strategy: 'USER_CHOICE_MERGE',
          data: this.mergeObjects(conflict.localData, conflict.serverData),
          reason: 'User chose to merge versions'
        };
        break;
      case 'CUSTOM':
        resolution = {
          strategy: 'USER_CHOICE_CUSTOM',
          data: customData,
          reason: 'User provided custom resolution'
        };
        break;
      default:
        resolution = {
          strategy: 'USER_CHOICE_LOCAL',
          data: conflict.localData,
          reason: 'Default to local version'
        };
    }

    conflict.resolver(resolution);
  }

  // Subscribe to conflict events
  onConflict(callback) {
    this.conflictListeners.push(callback);
    return () => {
      this.conflictListeners = this.conflictListeners.filter(cb => cb !== callback);
    };
  }

  // Notify conflict listeners
  notifyConflictListeners(conflict) {
    this.conflictListeners.forEach(callback => callback(conflict));
  }

  // Get pending conflicts
  getPendingConflicts() {
    return this.conflictQueue.filter(c => c.status === 'PENDING');
  }

  // Get conflict history
  getConflictHistory() {
    return this.conflictQueue.filter(c => c.status === 'RESOLVED');
  }

  // Clear resolved conflicts
  clearResolvedConflicts() {
    this.conflictQueue = this.conflictQueue.filter(c => c.status === 'PENDING');
  }

  // Generate unique conflict ID
  generateConflictId() {
    return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Validate resolution
  validateResolution(resolution) {
    return resolution && 
           resolution.strategy && 
           resolution.data && 
           resolution.reason;
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolutionService();
export default conflictResolver;
