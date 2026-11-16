export type Plan = {
  id: number;
  code: string;
  name: string;
  price_cents: number;
  price_display: string;
  currency: string;
  monthly_api_calls: number;
  seats: number;
};

export type Member = {
  id: number;
  email: string;
  full_name: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

export type Subscription = {
  id: number;
  plan: Plan;
  status: string;
  is_current: boolean;
  current_period_end: string | null;
  created_at: string;
};

export type Quota = {
  used: number;
  limit: number;
  remaining: number;
  plan_code: string;
  period: string;
};

export type Organization = {
  id: number;
  name: string;
  slug: string;
  role: string;
  created_at: string;
};

export type CurrentOrg = {
  organization: Organization;
  role: "owner" | "admin" | "member";
  members: Member[];
  subscription: Subscription | null;
  quota: Quota;
};

export type AuthResponse = {
  user: { id: number; email: string; full_name: string; display_name: string };
  access?: string;
  refresh?: string;
  org?: { id: number; name: string; slug: string; role: string } | null;
};

export type ReportResult = {
  generated_at: string;
  organization: string;
  member_count: number;
  roles: Record<string, number>;
  quota: Quota;
  provider: string;
};
