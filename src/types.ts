export type City = "Bangkok" | "Chiang Mai" | "Phuket" | "Khon Kaen";
export type PaceBand = "social" | "steady" | "tempo";
export type SocialOption = "alcohol_free" | "beer_optional" | "run_only";
export type TransportMode = "transit" | "taxi" | "walk" | "sober_driver";

export interface RunEvent {
  id: string;
  city: City;
  neighborhood: string;
  date: string;
  startTime: string;
  distanceKm: 3 | 5 | 7 | 10;
  paceBands: PaceBand[];
  meetingPoint: string;
  finishVenue: string;
  capacity: number;
  spotsLeft: number;
  priceThb: number;
  social: SocialOption[];
  accessibility: string[];
  routeLabel: string;
  routeNote: string;
  transit: string;
  host: string;
  accent: "lime" | "amber" | "blue" | "coral";
}

export interface EventFilters {
  city?: City;
  distanceKm?: number;
  pace?: PaceBand;
  date?: string;
  socialPreference?: SocialOption;
  alcoholFreeRequired?: boolean;
}

export interface RegistrationInput {
  eventId: string;
  runnerName: string;
  email: string;
  emergencyContact: string;
  pace: PaceBand;
  socialPreference: SocialOption;
  age20Plus: boolean;
  transportMode: TransportMode;
  rulesAccepted: boolean;
  privacyAccepted: boolean;
}

export interface Registration extends RegistrationInput {
  id: string;
  createdAt: string;
  status: "confirmed" | "cancelled";
}

export interface ReadinessInput {
  eventId: string;
  age20Plus: boolean;
  hasConcerningSymptoms: boolean;
  hasHydrationPlan: boolean;
  transportMode: TransportMode;
  socialPreference: SocialOption;
}

export interface ReadinessResult {
  status: "ready" | "attention" | "blocked";
  reasons: string[];
  requiredActions: string[];
  disclaimer: string;
}

export interface ActivityEntry {
  id: string;
  time: string;
  source: "human" | "agent" | "system";
  title: string;
  detail: string;
}
