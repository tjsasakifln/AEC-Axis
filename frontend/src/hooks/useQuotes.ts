import { useQuery, useMutation } from '@tanstack/react-query'
import { quotesApi, QuoteSubmissionRequest } from '../services/api'
import { queryKeys } from '../lib/query-client'

// Get quote details (for suppliers filling out quotes)
export const useQuoteDetails = (token: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.quoteDetails(token!),
    queryFn: () => quotesApi.getDetails(token!),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Don't retry on auth failures
  })
}

// Submit quote mutation
export const useSubmitQuote = () => {
  return useMutation({
    mutationFn: ({ token, data }: { token: string; data: QuoteSubmissionRequest }) =>
      quotesApi.submit(token, data),
    // Note: We don't invalidate queries here since this is typically a one-time action
    // and the token becomes invalid after submission
  })
}