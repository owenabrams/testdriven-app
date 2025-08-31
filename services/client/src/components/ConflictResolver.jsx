import React, { Component } from 'react';
import conflictResolver from '../services/conflictResolution';

class ConflictResolver extends Component {
  constructor(props) {
    super(props);
    this.state = {
      conflicts: [],
      selectedConflict: null,
      customData: {},
      showModal: false
    };
    
    this.handleConflict = this.handleConflict.bind(this);
    this.resolveConflict = this.resolveConflict.bind(this);
    this.closeModal = this.closeModal.bind(this);
  }

  componentDidMount() {
    // Subscribe to conflict events
    this.unsubscribe = conflictResolver.onConflict(this.handleConflict);
    
    // Load existing pending conflicts
    const pendingConflicts = conflictResolver.getPendingConflicts();
    if (pendingConflicts.length > 0) {
      this.setState({ conflicts: pendingConflicts });
    }
  }

  componentWillUnmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  handleConflict(conflict) {
    if (conflict.conflictType === 'USER_CHOICE') {
      this.setState(prevState => ({
        conflicts: [...prevState.conflicts, conflict],
        selectedConflict: conflict,
        showModal: true
      }));
    }
  }

  resolveConflict(choice, customData = null) {
    const { selectedConflict } = this.state;
    if (!selectedConflict) return;

    conflictResolver.resolveUserChoice(selectedConflict.id, choice, customData);
    
    this.setState(prevState => ({
      conflicts: prevState.conflicts.filter(c => c.id !== selectedConflict.id),
      selectedConflict: null,
      showModal: false,
      customData: {}
    }));
  }

  closeModal() {
    this.setState({
      showModal: false,
      selectedConflict: null,
      customData: {}
    });
  }

  handleCustomDataChange(field, value) {
    this.setState(prevState => ({
      customData: {
        ...prevState.customData,
        [field]: value
      }
    }));
  }

  renderConflictModal() {
    const { selectedConflict, customData, showModal } = this.state;
    
    if (!showModal || !selectedConflict) return null;

    const { localData, serverData } = selectedConflict;

    return (
      <div className="modal is-active">
        <div className="modal-background" onClick={this.closeModal}></div>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">
              🔄 Data Conflict Detected
            </p>
            <button 
              className="delete" 
              aria-label="close"
              onClick={this.closeModal}
            ></button>
          </header>
          
          <section className="modal-card-body">
            <div className="notification is-warning is-light">
              <strong>Conflict:</strong> The same data has been modified both locally and on the server. 
              Please choose how to resolve this conflict.
            </div>

            <div className="columns">
              {/* Local Version */}
              <div className="column">
                <div className="box">
                  <h4 className="title is-5 has-text-info">
                    📱 Your Local Version
                  </h4>
                  <div className="content">
                    <p><strong>Username:</strong> {localData.username}</p>
                    <p><strong>Email:</strong> {localData.email}</p>
                    {localData.updatedAt && (
                      <p><strong>Modified:</strong> {new Date(localData.updatedAt).toLocaleString()}</p>
                    )}
                    {localData.createdAt && (
                      <p><strong>Created:</strong> {new Date(localData.createdAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Server Version */}
              <div className="column">
                <div className="box">
                  <h4 className="title is-5 has-text-success">
                    🌐 Server Version
                  </h4>
                  <div className="content">
                    <p><strong>Username:</strong> {serverData.username}</p>
                    <p><strong>Email:</strong> {serverData.email}</p>
                    {serverData.updatedAt && (
                      <p><strong>Modified:</strong> {new Date(serverData.updatedAt).toLocaleString()}</p>
                    )}
                    {serverData.createdAt && (
                      <p><strong>Created:</strong> {new Date(serverData.createdAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Resolution */}
            <div className="box">
              <h4 className="title is-6">🛠️ Custom Resolution</h4>
              <div className="field">
                <label className="label">Username</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter custom username"
                    value={customData.username || ''}
                    onChange={(e) => this.handleCustomDataChange('username', e.target.value)}
                  />
                </div>
              </div>
              <div className="field">
                <label className="label">Email</label>
                <div className="control">
                  <input
                    className="input"
                    type="email"
                    placeholder="Enter custom email"
                    value={customData.email || ''}
                    onChange={(e) => this.handleCustomDataChange('email', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <footer className="modal-card-foot">
            <div className="buttons">
              <button 
                className="button is-info"
                onClick={() => this.resolveConflict('LOCAL')}
              >
                📱 Use Local Version
              </button>
              <button 
                className="button is-success"
                onClick={() => this.resolveConflict('SERVER')}
              >
                🌐 Use Server Version
              </button>
              <button 
                className="button is-warning"
                onClick={() => this.resolveConflict('MERGE')}
              >
                🔄 Auto Merge
              </button>
              <button 
                className="button is-primary"
                onClick={() => this.resolveConflict('CUSTOM', {
                  ...localData,
                  ...customData,
                  id: serverData.id || localData.id
                })}
                disabled={!customData.username && !customData.email}
              >
                🛠️ Use Custom
              </button>
              <button 
                className="button"
                onClick={this.closeModal}
              >
                Cancel
              </button>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  renderConflictIndicator() {
    const { conflicts } = this.state;
    
    if (conflicts.length === 0) return null;

    return (
      <div className="notification is-warning">
        <strong>⚠️ {conflicts.length} Data Conflict{conflicts.length > 1 ? 's' : ''}</strong>
        <p>Some data conflicts need your attention. Please resolve them to continue syncing.</p>
        <button 
          className="button is-small is-warning mt-2"
          onClick={() => this.setState({ 
            selectedConflict: conflicts[0], 
            showModal: true 
          })}
        >
          Resolve Conflicts
        </button>
      </div>
    );
  }

  render() {
    return (
      <>
        {this.renderConflictIndicator()}
        {this.renderConflictModal()}
      </>
    );
  }
}

export default ConflictResolver;
