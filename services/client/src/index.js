import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';

console.log('🚀 Starting simple React app');

ReactDOM.render((
  <Router>
    <App />
  </Router>
), document.getElementById('root'));
