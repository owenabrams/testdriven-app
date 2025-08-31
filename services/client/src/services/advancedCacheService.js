// Advanced Cache Service with versioning and intelligent invalidation
class AdvancedCacheService {
  constructor() {
    this.caches = new Map();
    this.cacheVersions = new Map();
    this.cacheMetadata = new Map();
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.defaultTTL = 24 * 60 * 60 * 1000; // 24 hours
    this.cleanupInterval = 60 * 60 * 1000; // 1 hour
    
    this.initializeCache();
  }

  async initializeCache() {
    try {
      // Initialize cache storage
      this.staticCache = await caches.open('testdriven-static-v1');
      this.apiCache = await caches.open('testdriven-api-v1');
      this.dynamicCache = await caches.open('testdriven-dynamic-v1');
      
      // Start cleanup interval
      this.startCleanupInterval();
      
      console.log('🗄️ Advanced cache service initialized');
    } catch (error) {
      console.error('Failed to initialize cache service:', error);
    }
  }

  // Cache with versioning and metadata
  async set(key, data, options = {}) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: options.ttl || this.defaultTTL,
      version: options.version || 1,
      tags: options.tags || [],
      size: this.calculateSize(data),
      accessCount: 0,
      lastAccessed: Date.now()
    };

    // Check cache size limits
    await this.ensureCacheSpace(cacheEntry.size);
    
    // Store in appropriate cache
    const cacheType = this.determineCacheType(key, options);
    await this.storeInCache(cacheType, key, cacheEntry);
    
    // Update metadata
    this.cacheMetadata.set(key, {
      type: cacheType,
      ...cacheEntry
    });
    
    console.log(`💾 Cached: ${key} (${cacheEntry.size} bytes, TTL: ${cacheEntry.ttl}ms)`);
  }

  // Get from cache with version checking
  async get(key, options = {}) {
    const metadata = this.cacheMetadata.get(key);
    if (!metadata) return null;

    // Check TTL
    if (this.isExpired(metadata)) {
      await this.delete(key);
      return null;
    }

    // Check version if specified
    if (options.version && metadata.version !== options.version) {
      console.log(`🔄 Cache version mismatch for ${key}: expected ${options.version}, got ${metadata.version}`);
      return null;
    }

    try {
      const cacheEntry = await this.retrieveFromCache(metadata.type, key);
      if (!cacheEntry) return null;

      // Update access metadata
      metadata.accessCount++;
      metadata.lastAccessed = Date.now();
      this.cacheMetadata.set(key, metadata);

      return cacheEntry.data;
    } catch (error) {
      console.error(`Failed to retrieve from cache: ${key}`, error);
      return null;
    }
  }

  // Intelligent cache invalidation
  async invalidate(pattern, options = {}) {
    const keys = Array.from(this.cacheMetadata.keys());
    const keysToInvalidate = [];

    for (const key of keys) {
      const metadata = this.cacheMetadata.get(key);
      
      // Match by pattern
      if (this.matchesPattern(key, pattern)) {
        keysToInvalidate.push(key);
        continue;
      }
      
      // Match by tags
      if (options.tags && this.hasMatchingTags(metadata.tags, options.tags)) {
        keysToInvalidate.push(key);
        continue;
      }
      
      // Match by version
      if (options.version && metadata.version === options.version) {
        keysToInvalidate.push(key);
        continue;
      }
    }

    // Delete matched keys
    for (const key of keysToInvalidate) {
      await this.delete(key);
    }

    console.log(`🗑️ Invalidated ${keysToInvalidate.length} cache entries`);
    return keysToInvalidate;
  }

  // Delete specific cache entry
  async delete(key) {
    const metadata = this.cacheMetadata.get(key);
    if (!metadata) return false;

    try {
      await this.removeFromCache(metadata.type, key);
      this.cacheMetadata.delete(key);
      console.log(`🗑️ Deleted cache entry: ${key}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete cache entry: ${key}`, error);
      return false;
    }
  }

  // Cache warming - preload important data
  async warmCache(warmingConfig) {
    console.log('🔥 Starting cache warming...');
    
    for (const config of warmingConfig) {
      try {
        const data = await this.fetchDataForWarming(config);
        await this.set(config.key, data, {
          ttl: config.ttl,
          tags: config.tags,
          version: config.version
        });
      } catch (error) {
        console.error(`Failed to warm cache for ${config.key}:`, error);
      }
    }
    
    console.log('✅ Cache warming completed');
  }

  // Determine appropriate cache type
  determineCacheType(key, options) {
    if (options.cacheType) return options.cacheType;
    
    if (key.includes('/static/') || key.includes('.js') || key.includes('.css')) {
      return 'static';
    } else if (key.includes('/api/') || key.includes('/users')) {
      return 'api';
    } else {
      return 'dynamic';
    }
  }

  // Store in appropriate cache
  async storeInCache(cacheType, key, cacheEntry) {
    const cache = this.getCacheByType(cacheType);
    if (!cache) throw new Error(`Unknown cache type: ${cacheType}`);

    const response = new Response(JSON.stringify(cacheEntry), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Timestamp': cacheEntry.timestamp.toString(),
        'Cache-Version': cacheEntry.version.toString()
      }
    });

    await cache.put(key, response);
  }

  // Retrieve from cache
  async retrieveFromCache(cacheType, key) {
    const cache = this.getCacheByType(cacheType);
    if (!cache) return null;

    const response = await cache.match(key);
    if (!response) return null;

    return await response.json();
  }

  // Remove from cache
  async removeFromCache(cacheType, key) {
    const cache = this.getCacheByType(cacheType);
    if (!cache) return false;

    return await cache.delete(key);
  }

  // Get cache by type
  getCacheByType(cacheType) {
    switch (cacheType) {
      case 'static': return this.staticCache;
      case 'api': return this.apiCache;
      case 'dynamic': return this.dynamicCache;
      default: return null;
    }
  }

  // Check if cache entry is expired
  isExpired(metadata) {
    return Date.now() - metadata.timestamp > metadata.ttl;
  }

  // Pattern matching for cache keys
  matchesPattern(key, pattern) {
    if (typeof pattern === 'string') {
      return key.includes(pattern);
    } else if (pattern instanceof RegExp) {
      return pattern.test(key);
    }
    return false;
  }

  // Check if tags match
  hasMatchingTags(entryTags, targetTags) {
    return targetTags.some(tag => entryTags.includes(tag));
  }

  // Calculate data size
  calculateSize(data) {
    return new Blob([JSON.stringify(data)]).size;
  }

  // Ensure cache space is available
  async ensureCacheSpace(requiredSize) {
    const currentSize = await this.getCurrentCacheSize();
    
    if (currentSize + requiredSize > this.maxCacheSize) {
      await this.evictLeastRecentlyUsed(requiredSize);
    }
  }

  // Get current cache size
  async getCurrentCacheSize() {
    let totalSize = 0;
    for (const metadata of this.cacheMetadata.values()) {
      totalSize += metadata.size;
    }
    return totalSize;
  }

  // Evict least recently used entries
  async evictLeastRecentlyUsed(requiredSpace) {
    const entries = Array.from(this.cacheMetadata.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    let freedSpace = 0;
    for (const [key, metadata] of entries) {
      await this.delete(key);
      freedSpace += metadata.size;
      
      if (freedSpace >= requiredSpace) break;
    }
    
    console.log(`🧹 Evicted cache entries, freed ${freedSpace} bytes`);
  }

  // Start cleanup interval
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.cleanupInterval);
  }

  // Cleanup expired entries
  async cleanupExpiredEntries() {
    const expiredKeys = [];
    
    for (const [key, metadata] of this.cacheMetadata.entries()) {
      if (this.isExpired(metadata)) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      await this.delete(key);
    }
    
    if (expiredKeys.length > 0) {
      console.log(`🧹 Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  // Fetch data for cache warming
  async fetchDataForWarming(config) {
    // This would typically fetch from your API
    // For now, return mock data
    return { warmed: true, key: config.key, timestamp: Date.now() };
  }

  // Get cache statistics
  async getStats() {
    const stats = {
      totalEntries: this.cacheMetadata.size,
      totalSize: await this.getCurrentCacheSize(),
      cacheTypes: { static: 0, api: 0, dynamic: 0 },
      expiredEntries: 0,
      averageAccessCount: 0
    };

    let totalAccessCount = 0;
    
    for (const metadata of this.cacheMetadata.values()) {
      stats.cacheTypes[metadata.type]++;
      totalAccessCount += metadata.accessCount;
      
      if (this.isExpired(metadata)) {
        stats.expiredEntries++;
      }
    }
    
    stats.averageAccessCount = stats.totalEntries > 0 ? 
      totalAccessCount / stats.totalEntries : 0;
    
    return stats;
  }

  // Clear all caches
  async clearAll() {
    await Promise.all([
      this.staticCache?.clear(),
      this.apiCache?.clear(),
      this.dynamicCache?.clear()
    ]);
    
    this.cacheMetadata.clear();
    console.log('🗑️ All caches cleared');
  }
}

// Export singleton instance
export const advancedCacheService = new AdvancedCacheService();
export default advancedCacheService;
