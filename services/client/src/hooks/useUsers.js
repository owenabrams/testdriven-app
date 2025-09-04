import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = process.env.REACT_APP_USERS_SERVICE_URL;

// Fetch users
export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/users`);
      return data.data.users;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 or auth errors
      if (error.response?.status === 404 || error.response?.status === 401) {
        return false;
      }
      // Retry up to 2 times for network errors
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

// Add user mutation
export const useAddUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userData) => {
      const { data } = await axios.post(`${API_URL}/users`, userData);
      return data;
    },
    onSuccess: () => {
      // Invalidate and refetch users
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

// Auth mutations
export const useAuthMutations = () => {
  const queryClient = useQueryClient();
  
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }) => {
      const { data } = await axios.post(`${API_URL}/auth/login`, { email, password });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('authToken', data.auth_token);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
  
  const registerMutation = useMutation({
    mutationFn: async ({ username, email, password }) => {
      const { data } = await axios.post(`${API_URL}/auth/register`, { username, email, password });
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('authToken', data.auth_token);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
  
  return { loginMutation, registerMutation };
};