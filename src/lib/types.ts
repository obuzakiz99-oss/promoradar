export type VenueKind = "cex" | "dex" | "defi" | "airdrop";

export type Category =
  | "airdrop"       // launchpool, launchpad, airdrops, jumpstart, megadrop, points
  | "competition"   // trading competitions, trade-to-earn, tournaments
  | "bonus"         // deposit / new-user / welcome bonuses
  | "earn"          // staking, savings, flash earn, hold-to-earn
  | "farming"       // DeFi liquidity / lending incentive rewards
  | "listing"       // listing campaigns & token giveaways
  | "referral"      // invite friends, affiliate
  | "other";

export interface Venue {
  id: string;
  name: string;
  kind: VenueKind;
  color: string;
  ink: string;
  monogram: string;
  logo?: string;
}

export interface Reward {
  amount: number;
  unit: string;
  usd?: number;
  label: string;
}

export interface Promo {
  id: string;
  venue: Venue;
  title: string;
  titleOrig?: string;        // original-language title when `title` is a translation (slugs use this)
  url: string;               // original page / rules
  joinUrl?: string;          // where "Join" leads (referral link or app)
  category: Category;
  publishedAt: number;       // ms; 0 for ongoing programmes without a date
  startsAt?: number;
  endsAt?: number;
  reward?: Reward;
  tags: string[];
  sponsored?: boolean;
  evergreen?: boolean;       // ongoing programme (farming pools, points)
  meta?: {
    source?: string;         // "airdrops.io", "DefiLlama"…
    actions?: string;        // what to do (airdrops)
    requires?: string[];     // telegram, x, email, kyc, discord…
    confirmed?: boolean;
    hot?: number;            // 0..100
    apr?: number;            // reward APR, %
    baseApr?: number;
    tvlUsd?: number;
    chain?: string;
    symbol?: string;
    perUser?: { amount: number; unit: string; usd?: number; text: string };   // most one person can get (from the rules)
    minEntry?: { amount: number; unit: string; kind: "trade" | "deposit" | "stake" | "hold" | "buy"; text: string };   // smallest $ threshold that earns anything
    datesFromRules?: boolean;
    geo?: { only?: string; noUA?: boolean; noEU?: boolean; text?: string };   // region-exclusive / country restrictions
    forNew?: boolean;          // only for new users
    tiers?: Array<{ min: number; reward: string; amount: number; unit: string }>;   // threshold → reward table from the rules
    aprPct?: number;           // advertised APR of an interest-type promo
    futures?: boolean;         // the trading requirement is on futures (lower fees than spot)
    noDeposit?: boolean;       // quiz / register-to-claim / check-in style: no money needed
    payout?: import("./payout").Payout;   // what the reward really is & how it is paid (read from the rules)
    value?: import("./value").Value;   // expected net $ for a typical participant + confidence (value.ts)
    thin?: boolean;            // no amount, no dates, no rules yet (teaser-like) — shown last   // start/end were read from the rules text
  };
}
