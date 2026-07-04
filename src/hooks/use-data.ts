"use client"

import useSWR from "swr"
import useSWRMutation from "swr/mutation"
import { fetcher, apiUrl } from "@/lib/api"

export function useWines(userId?: number | null) {
  const url = apiUrl("/api/viner", userId ? { userId } : undefined)
  const { data, error, isLoading, isValidating, mutate } = useSWR(url, fetcher)
  return {
    wines: data ?? [],
    error,
    loading: isLoading,
    refreshing: isValidating && !isLoading,
    mutate,
  }
}

export function useFriends() {
  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/friends", fetcher)
  return {
    friends: data?.friends ?? [],
    pendingSent: data?.pendingSent ?? [],
    pendingReceived: data?.pendingReceived ?? [],
    pendingShareInvitesSent: data?.pendingShareInvitesSent ?? [],
    pendingShareInvitesReceived: data?.pendingShareInvitesReceived ?? [],
    sharedLists: data?.sharedLists ?? [],
    error,
    loading: isLoading,
    refreshing: isValidating && !isLoading,
    mutate,
  }
}

export function useSuggestions() {
  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/forslag", fetcher)
  return {
    received: data?.received ?? [],
    sent: data?.sent ?? [],
    error,
    loading: isLoading,
    refreshing: isValidating && !isLoading,
    mutate,
  }
}

export function useAdminSettings() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/settings", fetcher)
  return {
    settings: data ?? null,
    error,
    loading: isLoading,
    mutate,
  }
}

export function useAdminUsers() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/users", fetcher)
  return {
    users: data ?? [],
    error,
    loading: isLoading,
    mutate,
  }
}

export function useAdminImages() {
  const { data, error, isLoading, mutate } = useSWR("/api/admin/images", fetcher)
  return {
    images: data?.images ?? [],
    error,
    loading: isLoading,
    mutate,
  }
}

export function useWineDetail(id?: number) {
  const { data, error, isLoading, mutate } = useSWR(id ? `/api/viner/${id}` : null, fetcher)
  return {
    wine: data ?? null,
    error,
    loading: isLoading,
    mutate,
  }
}

type ListSummary = {
  id: number
  name: string
  createdAt: string
  updatedAt: string
  _count?: { wines: number }
}

export function useLists() {
  const { data, error, isLoading, isValidating, mutate } = useSWR("/api/lists", fetcher)
  return {
    lists: (data ?? []) as ListSummary[],
    error,
    loading: isLoading,
    refreshing: isValidating && !isLoading,
    mutate,
  }
}

export function useListDetail(id?: number) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(id ? `/api/lists/${id}` : null, fetcher)
  return {
    list: data ?? null,
    error,
    loading: isLoading,
    refreshing: isValidating && !isLoading,
    mutate,
  }
}

export function useWineLists(wineId?: number) {
  const { data, error, mutate } = useSWR(wineId ? `/api/viner/${wineId}/lists` : null, fetcher)
  return {
    listIds: (data?.listIds ?? []) as number[],
    error,
    mutate,
  }
}
