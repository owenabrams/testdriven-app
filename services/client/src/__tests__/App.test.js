import React from 'react';
import { render } from '@testing-library/react';
import renderer from 'react-test-renderer';
import axios from 'axios';
import App from '../App';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock the auth service to return a logged-in user
jest.mock('../services/offlineAuthService', () => ({
  getCurrentUser: jest.fn(() => ({
    id: 'test-user-1',
    username: 'testuser',
    email: 'test@example.com',
    role: 'user'
  })),
  onAuthChange: jest.fn(() => () => {}),
  initialize: jest.fn(() => Promise.resolve())
}));

const users = [
  {
    'active': true,
    'email': 'hermanmu@gmail.com',
    'id': 1,
    'username': 'michael'
  },
  {
    'active': true,
    'email': 'michael@mherman.org',
    'id': 2,
    'username': 'michaelherman'
  }
];

beforeEach(() => {
  jest.clearAllMocks();
});

test('App renders login screen when not authenticated', () => {
  // Mock axios.get to return a resolved promise
  mockedAxios.get.mockResolvedValue({
    data: {
      data: {
        users: []
      }
    }
  });

  const { container } = render(<App />);
  const loginTitle = container.querySelector('h2');
  expect(loginTitle).toBeTruthy();
  expect(loginTitle.textContent).toBe('🔐 Login');
});

test('App renders a snapshot properly', () => {
  // Mock axios.get to return a resolved promise
  mockedAxios.get.mockResolvedValue({
    data: {
      data: {
        users: []
      }
    }
  });

  const tree = renderer.create(<App />).toJSON();
  expect(tree).toMatchSnapshot();
});
