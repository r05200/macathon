import { useAuth0 } from "@auth0/auth0-react"

const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true"

export function useUserEmail(): string | null {
  if (authDisabled) {
    return null
  }

  const { user, isLoading } = useAuth0()

  // While Auth0 is loading, return null but pages should check isLoading
  // For now, return email if available, null otherwise
  return user?.email ?? null
}

export function useAuth0Loading(): boolean {
  if (authDisabled) {
    return false
  }

  const { isLoading } = useAuth0()
  return isLoading
}
