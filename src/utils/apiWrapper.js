import { getApiErrorMessage } from './errorUtils';

export const withErrorHandling = async (apiCall, options = {}) => {
  const { onError = null, fallbackValue = null, rethrow = true } = options;

  try {
    return await apiCall();
  } catch (error) {
    console.error('API call failed:', error);

    if (onError) {
      onError(error);
    }

    if (rethrow) {
      throw error;
    }

    return fallbackValue;
  }
};

export const withLoadingState = (apiCall, setLoading) => {
  return async (...args) => {
    setLoading(true);
    try {
      const result = await apiCall(...args);
      return result;
    } finally {
      setLoading(false);
    }
  };
};

export const withErrorState = (apiCall, setError) => {
  return async (...args) => {
    setError('');
    try {
      const result = await apiCall(...args);
      return result;
    } catch (error) {
      const errorMessage = getApiErrorMessage(error);
      setError(errorMessage);
      throw error;
    }
  };
};

export const withLoadingAndErrorState = (apiCall, setLoading, setError) => {
  return async (...args) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiCall(...args);
      return result;
    } catch (error) {
      const errorMessage = getApiErrorMessage(error);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };
};

export const createApiCall = (apiCall, { loading, error } = {}) => {
  let wrappedCall = apiCall;

  if (loading && error) {
    wrappedCall = withLoadingAndErrorState(wrappedCall, loading.set, error.set);
  } else if (loading) {
    wrappedCall = withLoadingState(wrappedCall, loading.set);
  } else if (error) {
    wrappedCall = withErrorState(wrappedCall, error.set);
  }

  return wrappedCall;
};
