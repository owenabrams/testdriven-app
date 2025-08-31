# PWA Implementation Guide for New Services

This guide explains how to add PWA (Progressive Web App) offline functionality to any new service in the testdriven-app project.

## Overview

The PWA system provides:
- **Offline Storage**: Data persists when offline using IndexedDB
- **Sync Queue**: Operations are queued and synced when online
- **Automatic Retry**: Failed sync operations are retried
- **Conflict Resolution**: Handles data conflicts gracefully
- **Generic Architecture**: Easy to extend for any service

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React App     │    │  Service PWA     │    │  Generic PWA    │
│                 │    │  (users, etc.)   │    │  Service        │
├─────────────────┤    ├──────────────────┤    ├─────────────────┤
│ - Add/Edit Data │───▶│ - Service Logic  │───▶│ - IndexedDB     │
│ - Display Data  │    │ - Data Validation│    │ - Sync Queue    │
│ - Sync Control  │    │ - API Mapping    │    │ - Retry Logic   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Step-by-Step Implementation

### 1. Create Service-Specific PWA Class

Create a new file: `services/client/src/services/[serviceName]PWAService.js`

```javascript
import GenericPWAService from './genericPWAService';

class ServiceNamePWAService extends GenericPWAService {
  constructor() {
    super('serviceName', {
      endpoint: '/api/serviceName',
      storeName: 'serviceName',
      keyPath: 'id',
      indexes: [
        { name: 'field1', keyPath: 'field1', options: { unique: false } },
        { name: 'field2', keyPath: 'field2', options: { unique: true } },
        { name: 'synced', keyPath: 'synced' },
        { name: 'createdAt', keyPath: 'createdAt' }
      ]
    });
  }

  // Override data preparation for your API format
  prepareDataForSync(syncItem) {
    const { field1, field2, field3 } = syncItem.data;
    return { field1, field2, field3 };
  }

  // Override sync success handler for your API response format
  async handleCreateSyncSuccess(syncItem, responseData) {
    if (responseData.data && responseData.data.serviceName) {
      const serverItem = responseData.data.serviceName;
      const updatedItem = {
        ...syncItem.data,
        id: serverItem.id,
        synced: true,
        createdAt: serverItem.created_date || syncItem.data.createdAt
      };
      
      const db = await this.dbPromise;
      await db.put(this.config.storeName, updatedItem);
      return updatedItem;
    }
  }

  // Add service-specific methods
  async getByField1(value) {
    const db = await this.dbPromise;
    const tx = db.transaction(this.config.storeName, 'readonly');
    const index = tx.store.index('field1');
    return index.get(value);
  }
}

// Export singleton instance
const serviceNamePWAService = new ServiceNamePWAService();
export default serviceNamePWAService;
```

### 2. Update React Component

In your React component:

```javascript
import serviceNamePWAService from './services/serviceNamePWAService';

class ServiceComponent extends Component {
  // Add offline functionality to form submission
  async handleSubmit(formData) {
    if (!this.state.isOnline && this.state.pwaEnabled) {
      // Offline: Save to IndexedDB and sync queue
      try {
        const offlineItem = await serviceNamePWAService.add({
          ...formData,
          synced: false
        });
        
        this.setState(prevState => ({
          items: [...prevState.items, offlineItem]
        }));
        
        console.log('Item saved offline and queued for sync');
        return;
      } catch (error) {
        console.error('Failed to save offline:', error);
        alert('Failed to save offline. Please try again.');
        return;
      }
    }

    // Online: Save to backend and optionally to IndexedDB
    try {
      const response = await fetch('/api/serviceName', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      const newItem = {
        id: data.data.serviceName.id,
        ...formData,
        synced: true,
        createdAt: data.data.serviceName.created_date
      };

      this.setState(prevState => ({
        items: [...prevState.items, newItem]
      }));

      // Save to IndexedDB for offline access
      if (this.state.pwaEnabled) {
        await serviceNamePWAService.add({ ...newItem, synced: true });
      }

    } catch (error) {
      console.error('Failed to save online:', error);
      alert('Failed to save. Please try again.');
    }
  }

  // Add sync functionality
  async syncItems() {
    if (!this.state.isOnline) return;

    try {
      this.setState({ syncStatus: 'syncing' });
      
      const syncResult = await serviceNamePWAService.processSync(this.state.isOnline);
      
      if (syncResult.success) {
        await this.loadItemsFromStorage();
        console.log(`Sync completed: ${syncResult.message}`);
      }
      
      this.setState({ syncStatus: 'idle' });
    } catch (error) {
      console.error('Sync failed:', error);
      this.setState({ syncStatus: 'error' });
    }
  }

  // Load items from IndexedDB
  async loadItemsFromStorage() {
    try {
      if (this.state.pwaEnabled) {
        const items = await serviceNamePWAService.getAll();
        this.setState({ items });
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  }
}
```

### 3. Backend API Requirements

Your Flask API should follow this pattern:

```python
# POST /api/serviceName
@api.route('/serviceName', methods=['POST'])
def add_service_item():
    response_object = {
        'status': 'success',
        'data': {
            'serviceName': {
                'id': new_item.id,
                'field1': new_item.field1,
                'field2': new_item.field2,
                'created_date': new_item.created_date.isoformat()
            }
        }
    }
    return jsonify(response_object), 201

# GET /api/serviceName
@api.route('/serviceName', methods=['GET'])
def get_all_service_items():
    response_object = {
        'status': 'success',
        'data': {
            'serviceName': [
                {
                    'id': item.id,
                    'field1': item.field1,
                    'field2': item.field2,
                    'created_date': item.created_date.isoformat()
                }
                for item in items
            ]
        }
    }
    return jsonify(response_object), 200
```

## Key Features

### ✅ Automatic Offline Storage
- Data is automatically saved to IndexedDB when offline
- Sync queue tracks all pending operations
- No data loss when connection is lost

### ✅ Smart Sync Process
- Operations are synced in priority order (CREATE → UPDATE → DELETE)
- Failed operations are retried with exponential backoff
- Conflicts are handled gracefully

### ✅ Generic Architecture
- One generic PWA service handles all common functionality
- Service-specific classes only need to override API-specific methods
- Easy to add new services with minimal code

### ✅ Production Ready
- Comprehensive error handling
- Retry logic for failed operations
- Clean separation of concerns
- Extensive logging for debugging

## Testing PWA Functionality

1. **Enable PWA**: Click "🟢 Enable PWA" button
2. **Go Offline**: Disconnect internet or use browser dev tools
3. **Add Data**: Submit forms - data should be saved locally
4. **Check Queue**: Use "🔍 Debug PWA" to see queued operations
5. **Go Online**: Reconnect internet
6. **Sync**: Click "🔄 Sync Now" or wait for automatic sync
7. **Verify**: Check that data appears in backend and is marked as synced

## Best Practices

1. **Always check online status** before deciding sync strategy
2. **Provide user feedback** for offline operations
3. **Handle errors gracefully** with user-friendly messages
4. **Use the debug tools** during development
5. **Test offline scenarios** thoroughly
6. **Keep sync operations idempotent** to handle retries safely

## Troubleshooting

- **Sync not working**: Check browser console for errors
- **Data not persisting**: Verify IndexedDB is enabled in browser
- **Conflicts**: Check API response format matches expected structure
- **Performance issues**: Consider pagination for large datasets

This architecture ensures that every new service can easily support offline functionality with minimal additional code!
