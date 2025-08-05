/**
 * Batch Query Service
 * Intelligent query batching with 5-minute caching to optimize Firestore operations
 */

const { getDb } = require('../config/firebaseConfig');
const { safeSetTimeout, safeClearTimeout } = require('./TimerManager');

class BatchQueryService {
  constructor() {
    this.cache = new Map();
    this.pendingQueries = new Map();
    this.batchQueue = new Map();
    this.batchTimeout = null;
    
    // Configuration
    this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    this.BATCH_DELAY = 50; // 50ms delay to collect queries
    this.MAX_BATCH_SIZE = 500; // Maximum queries per batch
    this.CLEANUP_INTERVAL = 60 * 1000; // Clean cache every minute
    
    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Generate cache key from query parameters
   */
  generateCacheKey(collection, queryParams = {}) {
    const sortedParams = Object.keys(queryParams)
      .sort()
      .reduce((result, key) => {
        result[key] = queryParams[key];
        return result;
      }, {});
    
    return `${collection}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Check if cached data is still valid
   */
  isCacheValid(cacheEntry) {
    return Date.now() - cacheEntry.timestamp < this.CACHE_DURATION;
  }

  /**
   * Get data from cache if available and valid
   */
  getFromCache(cacheKey) {
    const cacheEntry = this.cache.get(cacheKey);
    
    if (cacheEntry && this.isCacheValid(cacheEntry)) {
      return cacheEntry.data;
    }
    
    // Remove expired cache entry
    if (cacheEntry) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  /**
   * Store data in cache
   */
  setCache(cacheKey, data) {
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
  }

  /**
   * Execute a single document query with caching
   */
  async getDocument(collection, docId, useCache = true) {
    const cacheKey = this.generateCacheKey(collection, { docId });
    
    // Check cache first
    if (useCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    try {
      const db = getDb();
      const docRef = db.collection(collection).doc(docId);
      const doc = await docRef.get();
      
      const result = doc.exists ? { id: doc.id, ...doc.data() } : null;
      
      // Cache the result
      if (useCache) {
        this.setCache(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching document ${collection}/${docId}:`, error);
      throw error;
    }
  }

  /**
   * Execute a collection query with caching
   */
  async getCollection(collection, queryParams = {}, useCache = true) {
    const cacheKey = this.generateCacheKey(collection, queryParams);
    
    // Check cache first
    if (useCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }
    }

    try {
      const db = getDb();
      let query = db.collection(collection);
      
      // Apply query parameters
      if (queryParams.where) {
        queryParams.where.forEach(([field, operator, value]) => {
          query = query.where(field, operator, value);
        });
      }
      
      if (queryParams.orderBy) {
        queryParams.orderBy.forEach(([field, direction = 'asc']) => {
          query = query.orderBy(field, direction);
        });
      }
      
      if (queryParams.limit) {
        query = query.limit(queryParams.limit);
      }
      
      if (queryParams.startAfter) {
        query = query.startAfter(queryParams.startAfter);
      }
      
      if (queryParams.endBefore) {
        query = query.endBefore(queryParams.endBefore);
      }
      
      const snapshot = await query.get();
      const result = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Cache the result
      if (useCache) {
        this.setCache(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      console.error(`Error fetching collection ${collection}:`, error);
      throw error;
    }
  }

  /**
   * Execute multiple document queries in a batch
   */
  async batchGetDocuments(requests, useCache = true) {
    const results = [];
    const uncachedRequests = [];
    
    // Check cache for each request
    for (const request of requests) {
      const cacheKey = this.generateCacheKey(request.collection, { docId: request.docId });
      
      if (useCache) {
        const cachedData = this.getFromCache(cacheKey);
        if (cachedData !== null) {
          results[requests.indexOf(request)] = cachedData;
          continue;
        }
      }
      
      uncachedRequests.push({
        ...request,
        originalIndex: requests.indexOf(request)
      });
    }
    
    // Process uncached requests in batches
    if (uncachedRequests.length > 0) {
      const db = getDb();
      const batchSize = Math.min(this.MAX_BATCH_SIZE, uncachedRequests.length);
      
      for (let i = 0; i < uncachedRequests.length; i += batchSize) {
        const batch = uncachedRequests.slice(i, i + batchSize);
        const docRefs = batch.map(req => db.collection(req.collection).doc(req.docId));
        
        try {
          const docs = await db.getAll(...docRefs);
          
          docs.forEach((doc, index) => {
            const request = batch[index];
            const result = doc.exists ? { id: doc.id, ...doc.data() } : null;
            
            results[request.originalIndex] = result;
            
            // Cache the result
            if (useCache) {
              const cacheKey = this.generateCacheKey(request.collection, { docId: request.docId });
              this.setCache(cacheKey, result);
            }
          });
        } catch (error) {
          console.error('Error in batch document fetch:', error);
          
          // Set error results for this batch
          batch.forEach(request => {
            results[request.originalIndex] = null;
          });
        }
      }
    }
    
    return results;
  }

  /**
   * Add a query to the batch queue
   */
  queueQuery(queryFn, cacheKey) {
    return new Promise((resolve, reject) => {
      // Check if this query is already pending
      if (this.pendingQueries.has(cacheKey)) {
        this.pendingQueries.get(cacheKey).push({ resolve, reject });
        return;
      }
      
      // Create new pending query group
      this.pendingQueries.set(cacheKey, [{ resolve, reject }]);
      this.batchQueue.set(cacheKey, queryFn);
      
      // Set batch processing timeout
      if (!this.batchTimeout) {
        this.batchTimeout = safeSetTimeout(() => {
          this.processBatchQueue();
        }, this.BATCH_DELAY, 'batchQueryProcessor');
      }
    });
  }

  /**
   * Process all queued queries in batches
   */
  async processBatchQueue() {
    const queries = Array.from(this.batchQueue.entries());
    this.batchQueue.clear();
    this.batchTimeout = null;
    
    // Process queries in parallel
    const promises = queries.map(async ([cacheKey, queryFn]) => {
      const pendingCallbacks = this.pendingQueries.get(cacheKey) || [];
      this.pendingQueries.delete(cacheKey);
      
      try {
        const result = await queryFn();
        
        // Resolve all pending promises for this query
        pendingCallbacks.forEach(({ resolve }) => resolve(result));
        
        return { cacheKey, result, success: true };
      } catch (error) {
        // Reject all pending promises for this query
        pendingCallbacks.forEach(({ reject }) => reject(error));
        
        return { cacheKey, error, success: false };
      }
    });
    
    await Promise.all(promises);
  }

  /**
   * Smart query with automatic batching and caching
   */
  async smartQuery(collection, queryParams = {}, useCache = true, useBatching = true) {
    const cacheKey = this.generateCacheKey(collection, queryParams);
    
    // Check cache first
    if (useCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData !== null) {
        return cachedData;
      }
    }
    
    const queryFn = async () => {
      const result = await this.getCollection(collection, queryParams, false);
      
      // Cache the result
      if (useCache) {
        this.setCache(cacheKey, result);
      }
      
      return result;
    };
    
    // Use batching if enabled
    if (useBatching) {
      return this.queueQuery(queryFn, cacheKey);
    } else {
      return queryFn();
    }
  }

  /**
   * Start automatic cache cleanup
   */
  startCacheCleanup() {
    const cleanup = () => {
      const now = Date.now();
      const expiredKeys = [];
      
      this.cache.forEach((entry, key) => {
        if (now - entry.timestamp >= this.CACHE_DURATION) {
          expiredKeys.push(key);
        }
      });
      
      expiredKeys.forEach(key => this.cache.delete(key));
      
      if (expiredKeys.length > 0) {
        console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    };
    
    // Run cleanup immediately and then every minute
    cleanup();
    safeSetTimeout(() => {
      cleanup();
      this.startCacheCleanup(); // Restart the cycle
    }, this.CLEANUP_INTERVAL, 'cacheCleanup');
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cache.clear();
    console.log('Query cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    this.cache.forEach(entry => {
      if (this.isCacheValid(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      pendingQueries: this.pendingQueries.size,
      queuedQueries: this.batchQueue.size
    };
  }

  /**
   * Invalidate cache for specific collection
   */
  invalidateCollection(collection) {
    const keysToDelete = [];
    
    this.cache.forEach((entry, key) => {
      if (key.startsWith(`${collection}:`)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    console.log(`Invalidated ${keysToDelete.length} cache entries for collection: ${collection}`);
  }
}

// Create singleton instance
const batchQueryService = new BatchQueryService();

// Export convenience functions
function getDocument(collection, docId, useCache = true) {
  return batchQueryService.getDocument(collection, docId, useCache);
}

function getCollection(collection, queryParams = {}, useCache = true) {
  return batchQueryService.getCollection(collection, queryParams, useCache);
}

function batchGetDocuments(requests, useCache = true) {
  return batchQueryService.batchGetDocuments(requests, useCache);
}

function smartQuery(collection, queryParams = {}, useCache = true, useBatching = true) {
  return batchQueryService.smartQuery(collection, queryParams, useCache, useBatching);
}

function clearQueryCache() {
  return batchQueryService.clearCache();
}

function invalidateCollection(collection) {
  return batchQueryService.invalidateCollection(collection);
}

function getQueryCacheStats() {
  return batchQueryService.getCacheStats();
}

module.exports = {
  BatchQueryService,
  batchQueryService,
  getDocument,
  getCollection,
  batchGetDocuments,
  smartQuery,
  clearQueryCache,
  invalidateCollection,
  getQueryCacheStats
};

// Make available globally
if (typeof window !== 'undefined') {
  window.FoamBatchQueryService = module.exports;
}