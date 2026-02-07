export type MockEvent = {
  id: string
  firstParty: string
  country: string
}

export const mockEvents: MockEvent[] = [
  { id: "1", firstParty: "example.com", country: "US" },
  { id: "2", firstParty: "example.com", country: "US" },
  { id: "3", firstParty: "other-site.org", country: "DE" },
  { id: "4", firstParty: "other-site.org", country: "DE" },
  { id: "5", firstParty: "third.io", country: "GB" },
]
