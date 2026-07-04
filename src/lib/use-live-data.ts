"use client";

import { create } from "zustand";
import { Billionaire } from "@/lib/types";
import { billionaires as staticBillionaires } from "@/data/billionaires";

interface LiveDataState {
  liveBillionaires: Map<string, LiveBillionaireData>;
  loaded: boolean;
  lastUpdated: number | null;
  setLiveData: (data: LiveBillionaireData[]) => void;
  getMerged: () => Billionaire[];
  getEnriched: (id: string) => EnrichedBillionaire | null;
}

export interface LiveBillionaireData {
  uri: string;
  rank: number;
  name: string;
  netWorthM: number;
  source: string;
  country: string;
  industries: string[];
  photoUrl: string | null;
  archivedWorthM: number;
}

export interface EnrichedBillionaire extends Billionaire {
  photoUrl: string | null;
  rank: number;
  country: string;
  liveNetWorthB: number;
  liveEarningsPerSecond: number;
  isLive: boolean;
}

// Mapping from static billionaire IDs to Forbes URIs
const ID_TO_URI: Record<string, string> = {
  "elon-musk": "elon-musk",
  "bernard-arnault": "bernard-arnault",
  "jeff-bezos": "jeff-bezos",
  "mark-zuckerberg": "mark-zuckerberg",
  "larry-page": "larry-page",
  "larry-ellison": "larry-ellison",
  "warren-buffett": "warren-buffett",
  "bill-gates": "bill-gates",
  "steve-ballmer": "steve-ballmer",
  "mukesh-ambani": "mukesh-ambani",
  "jensen-huang": "jensen-huang",
  "zhong-shanshan": "zhong-shanshan",
};

function calcEarningsPerSec(currentM: number, archivedM: number): number {
  // Calculate from yearly change in net worth
  if (archivedM <= 0 || currentM <= archivedM) {
    // Fallback: 3% annual return on net worth
    return (currentM * 1_000_000 * 0.03) / (365.25 * 24 * 3600);
  }
  const yearlyGain = (currentM - archivedM) * 1_000_000;
  return yearlyGain / (365.25 * 24 * 3600);
}

export const useLiveData = create<LiveDataState>()((set, get) => ({
  liveBillionaires: new Map(),
  loaded: false,
  lastUpdated: null,

  setLiveData: (data: LiveBillionaireData[]) => {
    const map = new Map<string, LiveBillionaireData>();
    for (const d of data) {
      map.set(d.uri, d);
    }
    set({ liveBillionaires: map, loaded: true, lastUpdated: Date.now() });
  },

  getMerged: () => {
    const { liveBillionaires, loaded } = get();
    if (!loaded) return staticBillionaires;

    return staticBillionaires.map((b) => {
      const uri = ID_TO_URI[b.id];
      const live = uri ? liveBillionaires.get(uri) : null;
      if (!live) return b;

      return {
        ...b,
        netWorthB: live.netWorthM / 1000,
        earningsPerSecond: calcEarningsPerSec(live.netWorthM, live.archivedWorthM),
      };
    });
  },

  getEnriched: (id: string) => {
    const { liveBillionaires, loaded } = get();
    const staticB = staticBillionaires.find((b) => b.id === id);
    if (!staticB) return null;

    const uri = ID_TO_URI[id];
    const live = uri && loaded ? liveBillionaires.get(uri) : null;

    if (!live) {
      return {
        ...staticB,
        photoUrl: null,
        rank: 0,
        country: "",
        liveNetWorthB: staticB.netWorthB,
        liveEarningsPerSecond: staticB.earningsPerSecond,
        isLive: false,
      };
    }

    return {
      ...staticB,
      netWorthB: live.netWorthM / 1000,
      earningsPerSecond: calcEarningsPerSec(live.netWorthM, live.archivedWorthM),
      photoUrl: live.photoUrl,
      rank: live.rank,
      country: live.country,
      liveNetWorthB: live.netWorthM / 1000,
      liveEarningsPerSecond: calcEarningsPerSec(live.netWorthM, live.archivedWorthM),
      isLive: true,
    };
  },
}));

// Fetch live data on mount
export function initLiveData() {
  fetch("/api/billionaires")
    .then((r) => r.json())
    .then((data) => {
      if (data.success && Array.isArray(data.billionaires)) {
        useLiveData.getState().setLiveData(data.billionaires);
      }
    })
    .catch(() => {});
}
