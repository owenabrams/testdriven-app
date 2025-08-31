import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConflictResolver from '../ConflictResolver';
import conflictResolver from '../../services/conflictResolution';

// Mock the conflict resolution service
jest.mock('../../services/conflictResolution', () => ({
  onConflict: jest.fn(),
  getPendingConflicts: jest.fn(() => []),
  resolveUserChoice: jest.fn()
}));

describe('ConflictResolver Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders without conflicts', () => {
    conflictResolver.getPendingConflicts.mockReturnValue([]);
    
    render(<ConflictResolver />);
    
    // Should not show any conflict indicators
    expect(screen.queryByText(/Data Conflict/)).not.toBeInTheDocument();
  });

  test('shows conflict indicator when conflicts exist', () => {
    const mockConflicts = [{
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    }];
    
    conflictResolver.getPendingConflicts.mockReturnValue(mockConflicts);
    
    render(<ConflictResolver />);
    
    expect(screen.getByText(/Data Conflict/)).toBeInTheDocument();
    expect(screen.getByText(/Resolve Conflicts/)).toBeInTheDocument();
  });

  test('opens conflict modal when resolve button is clicked', async () => {
    const mockConflicts = [{
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    }];
    
    conflictResolver.getPendingConflicts.mockReturnValue(mockConflicts);
    
    render(<ConflictResolver />);
    
    // Click resolve conflicts button
    fireEvent.click(screen.getByText(/Resolve Conflicts/));
    
    // Should show modal
    await waitFor(() => {
      expect(screen.getByText(/Data Conflict Detected/)).toBeInTheDocument();
    });
  });

  test('displays conflict data in modal', async () => {
    const mockConflict = {
      id: 'conflict-1',
      localData: { 
        username: 'localuser', 
        email: 'local@test.com',
        updatedAt: '2023-01-01T10:00:00Z'
      },
      serverData: { 
        username: 'serveruser', 
        email: 'server@test.com',
        updatedAt: '2023-01-01T11:00:00Z'
      },
      conflictType: 'USER_CHOICE'
    };

    // Mock the onConflict callback to simulate conflict
    let conflictCallback;
    conflictResolver.onConflict.mockImplementation((callback) => {
      conflictCallback = callback;
      return () => {}; // unsubscribe function
    });

    render(<ConflictResolver />);

    // Simulate conflict event
    if (conflictCallback) {
      conflictCallback(mockConflict);
    }

    await waitFor(() => {
      expect(screen.getByText('localuser')).toBeInTheDocument();
      expect(screen.getByText('serveruser')).toBeInTheDocument();
      expect(screen.getByText('local@test.com')).toBeInTheDocument();
      expect(screen.getByText('server@test.com')).toBeInTheDocument();
    });
  });

  test('resolves conflict with local version', async () => {
    const mockConflict = {
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    };

    let conflictCallback;
    conflictResolver.onConflict.mockImplementation((callback) => {
      conflictCallback = callback;
      return () => {};
    });

    render(<ConflictResolver />);

    // Simulate conflict
    if (conflictCallback) {
      conflictCallback(mockConflict);
    }

    await waitFor(() => {
      expect(screen.getByText(/Use Local Version/)).toBeInTheDocument();
    });

    // Click local version button
    fireEvent.click(screen.getByText(/Use Local Version/));

    // Should call resolveUserChoice with LOCAL
    expect(conflictResolver.resolveUserChoice).toHaveBeenCalledWith(
      'conflict-1',
      'LOCAL',
      null
    );
  });

  test('resolves conflict with server version', async () => {
    const mockConflict = {
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    };

    let conflictCallback;
    conflictResolver.onConflict.mockImplementation((callback) => {
      conflictCallback = callback;
      return () => {};
    });

    render(<ConflictResolver />);

    // Simulate conflict
    if (conflictCallback) {
      conflictCallback(mockConflict);
    }

    await waitFor(() => {
      expect(screen.getByText(/Use Server Version/)).toBeInTheDocument();
    });

    // Click server version button
    fireEvent.click(screen.getByText(/Use Server Version/));

    // Should call resolveUserChoice with SERVER
    expect(conflictResolver.resolveUserChoice).toHaveBeenCalledWith(
      'conflict-1',
      'SERVER',
      null
    );
  });

  test('resolves conflict with auto merge', async () => {
    const mockConflict = {
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    };

    let conflictCallback;
    conflictResolver.onConflict.mockImplementation((callback) => {
      conflictCallback = callback;
      return () => {};
    });

    render(<ConflictResolver />);

    // Simulate conflict
    if (conflictCallback) {
      conflictCallback(mockConflict);
    }

    await waitFor(() => {
      expect(screen.getByText(/Auto Merge/)).toBeInTheDocument();
    });

    // Click auto merge button
    fireEvent.click(screen.getByText(/Auto Merge/));

    // Should call resolveUserChoice with MERGE
    expect(conflictResolver.resolveUserChoice).toHaveBeenCalledWith(
      'conflict-1',
      'MERGE',
      null
    );
  });

  test('resolves conflict with custom data', async () => {
    const mockConflict = {
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    };

    let conflictCallback;
    conflictResolver.onConflict.mockImplementation((callback) => {
      conflictCallback = callback;
      return () => {};
    });

    render(<ConflictResolver />);

    // Simulate conflict
    if (conflictCallback) {
      conflictCallback(mockConflict);
    }

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Enter custom username/)).toBeInTheDocument();
    });

    // Enter custom data
    fireEvent.change(screen.getByPlaceholderText(/Enter custom username/), {
      target: { value: 'customuser' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter custom email/), {
      target: { value: 'custom@test.com' }
    });

    // Click use custom button
    fireEvent.click(screen.getByText(/Use Custom/));

    // Should call resolveUserChoice with CUSTOM and custom data
    expect(conflictResolver.resolveUserChoice).toHaveBeenCalledWith(
      'conflict-1',
      'CUSTOM',
      expect.objectContaining({
        username: 'customuser',
        email: 'custom@test.com'
      })
    );
  });

  test('closes modal when cancel is clicked', async () => {
    const mockConflict = {
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    };

    let conflictCallback;
    conflictResolver.onConflict.mockImplementation((callback) => {
      conflictCallback = callback;
      return () => {};
    });

    render(<ConflictResolver />);

    // Simulate conflict
    if (conflictCallback) {
      conflictCallback(mockConflict);
    }

    await waitFor(() => {
      expect(screen.getByText(/Data Conflict Detected/)).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByText('Cancel'));

    // Modal should be closed
    await waitFor(() => {
      expect(screen.queryByText(/Data Conflict Detected/)).not.toBeInTheDocument();
    });
  });

  test('handles multiple conflicts', () => {
    const mockConflicts = [
      {
        id: 'conflict-1',
        localData: { username: 'local1', email: 'local1@test.com' },
        serverData: { username: 'server1', email: 'server1@test.com' },
        conflictType: 'USER_CHOICE'
      },
      {
        id: 'conflict-2',
        localData: { username: 'local2', email: 'local2@test.com' },
        serverData: { username: 'server2', email: 'server2@test.com' },
        conflictType: 'USER_CHOICE'
      }
    ];
    
    conflictResolver.getPendingConflicts.mockReturnValue(mockConflicts);
    
    render(<ConflictResolver />);
    
    expect(screen.getByText(/2 Data Conflicts/)).toBeInTheDocument();
  });

  test('disables custom button when no custom data is entered', async () => {
    const mockConflict = {
      id: 'conflict-1',
      localData: { username: 'local', email: 'local@test.com' },
      serverData: { username: 'server', email: 'server@test.com' },
      conflictType: 'USER_CHOICE'
    };

    let conflictCallback;
    conflictResolver.onConflict.mockImplementation((callback) => {
      conflictCallback = callback;
      return () => {};
    });

    render(<ConflictResolver />);

    // Simulate conflict
    if (conflictCallback) {
      conflictCallback(mockConflict);
    }

    await waitFor(() => {
      const customButton = screen.getByText(/Use Custom/);
      expect(customButton).toBeDisabled();
    });
  });
});
