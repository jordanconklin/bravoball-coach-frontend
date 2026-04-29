"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alignment, Fit, Layout, useRive } from "rive-react";
import styles from "./page.module.css";

type TeamSummary = {
  id: number;
  name: string;
  join_code: string;
  player_count: number;
  created_at: string;
  avg_time_per_player_minutes: number;
  trained_minutes_in_range: number;
  sessions_in_range: number;
};

type TeamMember = {
  user_id: number;
  username: string | null;
  email?: string | null;
  full_name?: string | null;
  current_streak: number;
  best_streak: number;
  sessions_completed: number;
  total_trained_minutes: number;
  technical_minutes: number;
  physical_minutes: number;
  mental_minutes: number;
  last_completed_session_at: string | null;
};

type TeamRoster = {
  team_id: number;
  team_name: string;
  join_code: string;
  members: TeamMember[];
};

type PlayerCompletedDrill = {
  title: string;
  skill?: string | null;
  sub_skills: string[];
  duration_minutes: number;
};

type PlayerCompletedSession = {
  session_id: number;
  date: string;
  session_type: string;
  total_minutes: number;
  technical_minutes: number;
  physical_minutes: number;
  mental_minutes: number;
  drills: PlayerCompletedDrill[];
};

type PlayerSessionHistory = {
  team_id: number;
  team_name: string;
  user_id: number;
  username?: string | null;
  email?: string | null;
  full_name?: string | null;
  sessions: PlayerCompletedSession[];
};

type DashboardTopPlayer = {
  user_id: number;
  username?: string | null;
  full_name?: string | null;
  total_minutes: number;
};

type DashboardBreakdownItem = {
  category: string;
  minutes: number;
};

type TeamDashboard = {
  team_id: number;
  team_name: string;
  active_players: number;
  total_players: number;
  total_training_minutes: number;
  top_players: DashboardTopPlayer[];
  breakdown: DashboardBreakdownItem[];
};

type TimeFilter =
  | "current_week"
  | "last_week"
  | "current_month"
  | "last_month"
  | "all_time";

type View = "teams" | "players" | "dashboard" | "settings";
type AuthMode = "signup" | "login";
type AuthStatus = "loading" | "unauthenticated" | "authenticated";

type CoachProfile = {
  user_id: number;
  email: string;
  username: string;
  first_name?: string | null;
  last_name?: string | null;
  role: string;
};

type AuthFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
};

const DEFAULT_TIME_FILTER: TimeFilter = "current_week";
const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const timeFilterOptions: { value: TimeFilter; label: string }[] = [
  { value: "current_week", label: "Current Week" },
  { value: "last_week", label: "Last Week" },
  { value: "current_month", label: "Current Month" },
  { value: "last_month", label: "Last Month" },
  { value: "all_time", label: "All Time" },
];

const skillInfo = {
  technical: "Passing, shooting, dribbling, first touch, goalkeeping",
  physical: "Defending and fitness",
};

const dashboardCategoryLabels: Record<string, string> = {
  passing: "Passing",
  shooting: "Shooting",
  dribbling: "Dribbling",
  first_touch: "First Touch",
  defending: "Defending",
  goalkeeping: "Goalkeeping",
  fitness: "Fitness",
  mental_training: "Mental Training",
};

const dashboardCategoryColors: Record<string, string> = {
  passing: "#F7DD63",
  shooting: "#2F5DA8",
  dribbling: "#8A6F68",
  first_touch: "#6B6BB2",
  defending: "#D69B54",
  goalkeeping: "#BFC7D6",
  fitness: "#68A97B",
  mental_training: "#D96FA8",
};

const sidebarGroups = [
  {
    title: "Group Members",
    items: ["Teams", "Players"],
  },
  {
    title: "Player Tracking",
    items: ["Dashboard"],
  },
  {
    title: "Account",
    items: ["Settings"],
  },
];

const authHighlights = [
  {
    title: "Onboard players",
    text: "Invite athletes onto teams and keep squads organized.",
  },
  {
    title: "Training beyond practice",
    text: "See solo and app training—not just scheduled team sessions.",
  },
  {
    title: "Teams, players, dashboard",
    text: "Manage rosters and scan progress in one visual workspace.",
  },
];

function formatMinutes(totalMinutes: number) {
  const rounded = Math.round(totalMinutes);
  if (rounded <= 0) {
    return "0m";
  }
  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function trainedLabelForFilter(filter: TimeFilter) {
  switch (filter) {
    case "current_week":
      return "Trained This Week";
    case "last_week":
      return "Trained Last Week";
    case "current_month":
      return "Trained This Month";
    case "last_month":
      return "Trained Last Month";
    case "all_time":
      return "Trained All Time";
  }
}

function pageTitleForView(view: View) {
  switch (view) {
    case "teams":
      return "Manage Your Teams";
    case "players":
      return "Players";
    case "dashboard":
      return "Dashboard";
    case "settings":
      return "General Settings";
  }
}

function coachDisplayName(profile: CoachProfile | null) {
  const firstName = profile?.first_name;
  const lastName = profile?.last_name;
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }
  return profile?.username || "Coach";
}

export default function Home() {
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authForm, setAuthForm] = useState<AuthFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteCode: "",
  });
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [usernameToAdd, setUsernameToAdd] = useState("");
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(DEFAULT_TIME_FILTER);
  const [activeView, setActiveView] = useState<View>("teams");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isPlayerDetailOpen, setIsPlayerDetailOpen] = useState(false);
  const [playerHistory, setPlayerHistory] = useState<PlayerSessionHistory | null>(null);
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [settingsForm, setSettingsForm] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [deleteAccountForm, setDeleteAccountForm] = useState({
    currentPassword: "",
    confirmationText: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const createInputRef = useRef<HTMLInputElement | null>(null);
  const addPlayerRef = useRef<HTMLInputElement | null>(null);

  const { RiveComponent } = useRive({
    src: "Bravo_Panting.riv",
    autoplay: true,
    stateMachines: "State Machine 1",
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
  });

  function applyCoachProfileToSettings(profile: CoachProfile | null) {
    setSettingsForm({
      firstName: profile?.first_name || "",
      lastName: profile?.last_name || "",
      username: profile?.username || "",
      email: profile?.email || "",
    });
  }

  async function parseErrorResponse(response: Response) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {}
    return detail;
  }

  const clearCoachState = useCallback(
    function clearCoachState() {
      setCoachProfile(null);
      applyCoachProfileToSettings(null);
      setAuthStatus("unauthenticated");
      setTeams([]);
      setRoster(null);
      setSelectedTeamId(null);
      setDashboard(null);
      setPlayerHistory(null);
      setNotice(null);
      setError(null);
    },
    [],
  );

  const refreshCoachSession = useCallback(
    async function refreshCoachSession() {
      const response = await fetch(`${DEFAULT_BACKEND_URL}/api/coach/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }
    },
    [],
  );

  const api = useCallback(
    async function api<T>(path: string, init?: RequestInit, retryOnRefresh = true): Promise<T> {
      const headers = new Headers(init?.headers ?? {});
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
      let response = await fetch(`${DEFAULT_BACKEND_URL}${path}`, {
        ...init,
        credentials: "include",
        headers,
      });

      if (response.status === 401 && retryOnRefresh) {
        try {
          await refreshCoachSession();
          response = await fetch(`${DEFAULT_BACKEND_URL}${path}`, {
            ...init,
            credentials: "include",
            headers,
          });
        } catch {
          clearCoachState();
          throw new Error("Session expired. Sign in again.");
        }
      }

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      return (await response.json()) as T;
    },
    [clearCoachState, refreshCoachSession],
  );

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      setAuthStatus("loading");
      try {
        const me = await api<CoachProfile>("/api/coach/auth/me");
        if (cancelled) {
          return;
        }
        setCoachProfile(me);
        applyCoachProfileToSettings(me);
        setAuthStatus("authenticated");
      } catch {
        if (cancelled) {
          return;
        }
        clearCoachState();
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [api, clearCoachState]);

  async function handleAuthSubmit() {
    setAuthError(null);
    setAuthNotice(null);

    const email = authForm.email.trim();
    const password = authForm.password;

    if (!email) {
      setAuthError("Email is required.");
      return;
    }
    if (!password) {
      setAuthError("Password is required.");
      return;
    }
    if (authMode === "signup") {
      if (!authForm.firstName.trim() || !authForm.lastName.trim()) {
        setAuthError("First and last name are required.");
        return;
      }
      if (!authForm.inviteCode.trim()) {
        setAuthError("Coach invite code is required.");
        return;
      }
      if (password.length < 8) {
        setAuthError("Password must be at least 8 characters.");
        return;
      }
      if (password !== authForm.confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }
    }

    setIsAuthSubmitting(true);
    try {
      const endpoint =
        authMode === "signup" ? "/api/coach/auth/register" : "/api/coach/auth/login";
      const payload =
        authMode === "signup"
          ? {
              first_name: authForm.firstName.trim(),
              last_name: authForm.lastName.trim(),
              email,
              password,
              invite_code: authForm.inviteCode.trim(),
            }
          : {
              email,
              password,
            };

      const response = await fetch(`${DEFAULT_BACKEND_URL}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response));
      }

      const session = (await response.json()) as CoachProfile;
      setCoachProfile(session);
      applyCoachProfileToSettings(session);
      setAuthStatus("authenticated");
      setAuthForm({
        firstName: "",
        lastName: "",
        email,
        password: "",
        confirmPassword: "",
        inviteCode: "",
      });
      setAuthNotice(authMode === "signup" ? "Coach account created." : null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unable to sign you in.");
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  function signOutCoach() {
    clearCoachState();
    setAuthNotice("Signed out.");
  }

  async function handleCoachLogout() {
    try {
      await fetch(`${DEFAULT_BACKEND_URL}/api/coach/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {}
    signOutCoach();
  }

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      if (authStatus !== "authenticated") {
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const nextTeams = await api<TeamSummary[]>(
          `/api/coach/teams/me?time_filter=${timeFilter}`,
        );
        if (cancelled) {
          return;
        }
        setTeams(nextTeams);
        setSelectedTeamId((current) =>
          nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id ?? null,
        );
        setNotice(null);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load teams");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void initialLoad();
    return () => {
      cancelled = true;
    };
  }, [api, authStatus, timeFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadTeamData() {
      if (authStatus !== "authenticated") {
        return;
      }
      if (!selectedTeamId) {
        setRoster(null);
        setDashboard(null);
        return;
      }

      try {
        const nextRoster = await api<TeamRoster>(
          `/api/coach/teams/${selectedTeamId}/members?time_filter=${timeFilter}`,
        );
        if (!cancelled) {
          setRoster(nextRoster);
        }

        if (activeView === "dashboard") {
          const nextDashboard = await api<TeamDashboard>(
            `/api/coach/dashboard?team_id=${selectedTeamId}&time_filter=${timeFilter}`,
          );
          if (!cancelled) {
            setDashboard(nextDashboard);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load roster");
        }
      }
    }

    void loadTeamData();
    return () => {
      cancelled = true;
    };
  }, [activeView, api, authStatus, selectedTeamId, timeFilter]);

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams],
  );

  const dashboardChart = useMemo(() => {
    const items = (dashboard?.breakdown ?? []).filter((item) => item.minutes > 0);
    const total = items.reduce((sum, item) => sum + item.minutes, 0);
    if (total === 0) {
      return {
        background: "conic-gradient(#ece6d8 0 360deg)",
        items: [] as Array<DashboardBreakdownItem & { percent: number; color: string; label: string }>,
      };
    }

    let cursor = 0;
    const slices = items.map((item) => {
      const percent = (item.minutes / total) * 100;
      const start = cursor;
      cursor += percent;
      return {
        ...item,
        percent,
        start,
        end: cursor,
        color: dashboardCategoryColors[item.category] ?? "#2F5DA8",
        label: dashboardCategoryLabels[item.category] ?? item.category,
      };
    });

    return {
      background: `conic-gradient(${slices
        .map((slice) => `${slice.color} ${slice.start}% ${slice.end}%`)
        .join(", ")})`,
      items: slices,
    };
  }, [dashboard]);

  const playerHistorySummary = useMemo(() => {
    const sessions = playerHistory?.sessions ?? [];
    return sessions.reduce(
      (totals, session) => ({
        sessions: totals.sessions + 1,
        totalMinutes: totals.totalMinutes + session.total_minutes,
        mentalMinutes: totals.mentalMinutes + session.mental_minutes,
      }),
      { sessions: 0, totalMinutes: 0, mentalMinutes: 0 },
    );
  }, [playerHistory]);

  async function loadTeams() {
    const nextTeams = await api<TeamSummary[]>(
      `/api/coach/teams/me?time_filter=${timeFilter}`,
    );
    setTeams(nextTeams);
    setSelectedTeamId((current) =>
      nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id ?? null,
    );
    setNotice(null);
  }

  async function loadRosterForTeam(teamId: number) {
    const nextRoster = await api<TeamRoster>(
      `/api/coach/teams/${teamId}/members?time_filter=${timeFilter}`,
    );
    setRoster(nextRoster);
  }

  async function loadPlayerHistory(teamId: number, userId: number) {
    const nextHistory = await api<PlayerSessionHistory>(
      `/api/coach/teams/${teamId}/members/${userId}/sessions?time_filter=${timeFilter}`,
    );
    setPlayerHistory(nextHistory);
  }

  async function loadDashboard(teamId: number) {
    const nextDashboard = await api<TeamDashboard>(
      `/api/coach/dashboard?team_id=${teamId}&time_filter=${timeFilter}`,
    );
    setDashboard(nextDashboard);
  }

  async function createTeam() {
    if (!teamName.trim()) {
      setError("Team name must not be empty");
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      const created = await api<TeamSummary>("/api/coach/teams", {
        method: "POST",
        body: JSON.stringify({ name: teamName.trim() }),
      });
      setTeamName("");
      setSelectedTeamId(created.id);
      setNotice(`Created ${created.name}`);
      await loadTeams();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function addPlayerByUsername() {
    if (!selectedTeamId) {
      setError("Select or create a team first");
      return false;
    }
    if (!usernameToAdd.trim()) {
      setError("Username must not be empty");
      return false;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api(`/api/coach/teams/${selectedTeamId}/members/by-username`, {
        method: "POST",
        body: JSON.stringify({ username: usernameToAdd.trim() }),
      });
      setUsernameToAdd("");
      setNotice("Player added to team");
      await loadTeams();
      await loadRosterForTeam(selectedTeamId);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player");
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  async function removePlayerFromTeam(userId: number) {
    if (!selectedTeamId) {
      setError("Select a team first");
      return;
    }
    if (!window.confirm("Remove this player from the selected team?")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api(`/api/coach/teams/${selectedTeamId}/members/${userId}`, {
        method: "DELETE",
      });
      setNotice("Player removed from team");
      await loadTeams();
      await loadRosterForTeam(selectedTeamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove player");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteSelectedTeam() {
    if (!selectedTeamId || !selectedTeam) {
      setError("Select a team first");
      return;
    }
    if (!window.confirm(`Delete team "${selectedTeam.name}"?`)) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api(`/api/coach/teams/${selectedTeamId}`, { method: "DELETE" });
      setNotice(`Deleted ${selectedTeam.name}`);
      setSelectedTeamId(null);
      setRoster(null);
      setDashboard(null);
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCoachSettings() {
    if (!settingsForm.firstName.trim() || !settingsForm.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!settingsForm.username.trim() || !settingsForm.email.trim()) {
      setError("Username and email are required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const updated = await api<CoachProfile>("/api/coach/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          first_name: settingsForm.firstName.trim(),
          last_name: settingsForm.lastName.trim(),
          username: settingsForm.username.trim(),
          email: settingsForm.email.trim(),
        }),
      });
      setCoachProfile(updated);
      applyCoachProfileToSettings(updated);
      setNotice("Coach profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  }

  async function changeCoachPassword() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError("Current and new password are required.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password confirmation does not match.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api("/api/coach/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setNotice("Password updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteCoachAccount() {
    if (!deleteAccountForm.currentPassword) {
      setError("Current password is required.");
      return;
    }
    if (deleteAccountForm.confirmationText.trim().toUpperCase() !== "DELETE") {
      setError("Type DELETE to confirm account deletion.");
      return;
    }
    if (!window.confirm("Delete your coach account permanently? This cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await api("/api/coach/auth/delete-account", {
        method: "POST",
        body: JSON.stringify({
          current_password: deleteAccountForm.currentPassword,
          confirmation_text: deleteAccountForm.confirmationText,
        }),
      });
      setDeleteAccountForm({
        currentPassword: "",
        confirmationText: "",
      });
      signOutCoach();
      setAuthNotice("Coach account deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  }

  if (authStatus === "loading") {
    return (
      <main className={styles.authPage}>
        <AuthTopbar />
        <section className={styles.authLoadingWrap}>
          <div className={styles.authLoadingCard}>
            <div className={styles.loadingAnimation}>
              <RiveComponent />
            </div>
            <h1 className={styles.loadingTitle}>Opening your workspace</h1>
            <p className={styles.loadingText}>Connecting to BravoBall.</p>
          </div>
        </section>
      </main>
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <main className={styles.authPage}>
        <AuthTopbar />
        <section className={styles.authLayout}>
          <div className={styles.authIntro}>
            <div className={styles.authHeroCard}>
              <div className={styles.heroCopy}>
                <span className={styles.heroEyebrow}>Coach MVP</span>
                <h1 className={styles.heroTitle}>Coach teams, players, and training—in one place.</h1>
                <p className={styles.heroText}>
                  Onboard athletes, see training outside team sessions, and manage teams from a simple dashboard.
                </p>
              </div>
              <div className={styles.heroAnimationWrap}>
                <RiveComponent />
              </div>
            </div>

            <div className={styles.highlightGrid}>
              {authHighlights.map((item) => (
                <article key={item.title} className={styles.highlightCard}>
                  <h2 className={styles.highlightTitle}>{item.title}</h2>
                  <p className={styles.highlightText}>{item.text}</p>
                </article>
              ))}
            </div>
          </div>

          <section className={styles.authPanel}>
            <div className={styles.authModeTabs} role="tablist" aria-label="Coach sign up or sign in">
              <button
                className={`${styles.authModeTab} ${authMode === "signup" ? styles.authModeTabActive : ""}`}
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                type="button"
              >
                Sign up
              </button>
              <button
                className={`${styles.authModeTab} ${authMode === "login" ? styles.authModeTabActive : ""}`}
                onClick={() => {
                  setAuthMode("login");
                  setAuthError(null);
                  setAuthNotice(null);
                }}
                type="button"
              >
                Sign in
              </button>
            </div>

            <div className={styles.authPanelHeader}>
              <p className={styles.eyebrow}>{authMode === "signup" ? "Sign up" : "Sign in"}</p>
              <h2 className={styles.authPanelTitle}>
                {authMode === "signup" ? "Coach account" : "Welcome back"}
              </h2>
              <p className={styles.panelText}>
                {authMode === "signup"
                  ? "Then onboard players and open your dashboard."
                  : "Email or username from your coach account."}
              </p>
            </div>

            {authError ? <Banner tone="error" text={authError} /> : null}
            {authNotice ? <Banner tone="success" text={authNotice} /> : null}

            <div className={styles.authForm}>
              {authMode === "signup" ? (
                <div className={styles.authNameRow}>
                  <label className={styles.fieldLabel}>
                    <span>First name</span>
                    <input
                      className={styles.textInput}
                      value={authForm.firstName}
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, firstName: event.target.value }))
                      }
                      placeholder="Jordan"
                    />
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Last name</span>
                    <input
                      className={styles.textInput}
                      value={authForm.lastName}
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, lastName: event.target.value }))
                      }
                      placeholder="Coach"
                    />
                  </label>
                </div>
              ) : null}

              {authMode === "signup" ? (
                <label className={styles.fieldLabel}>
                  <span>Coach invite code</span>
                  <input
                    className={styles.textInput}
                    value={authForm.inviteCode}
                    onChange={(event) =>
                      setAuthForm((current) => ({ ...current, inviteCode: event.target.value }))
                    }
                    placeholder="6-digit code"
                  />
                </label>
              ) : null}

              <label className={styles.fieldLabel}>
                <span>{authMode === "signup" ? "Email" : "Email or username"}</span>
                <input
                  className={styles.textInput}
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder={authMode === "signup" ? "coach@example.com" : "coach@example.com"}
                />
              </label>

              <label className={styles.fieldLabel}>
                <span>Password</span>
                <input
                  className={styles.textInput}
                  type="password"
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="At least 8 characters"
                />
              </label>

              {authMode === "signup" ? (
                <label className={styles.fieldLabel}>
                  <span>Confirm password</span>
                  <input
                    className={styles.textInput}
                    type="password"
                    value={authForm.confirmPassword}
                    onChange={(event) =>
                      setAuthForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    placeholder="Repeat password"
                  />
                </label>
              ) : null}

              <button
                className={styles.authSubmitButton}
                onClick={() => void handleAuthSubmit()}
                disabled={isAuthSubmitting}
                type="button"
              >
                {isAuthSubmitting
                  ? authMode === "signup"
                    ? "Creating account..."
                    : "Signing in..."
                  : authMode === "signup"
                    ? "Create account"
                    : "Sign in"}
              </button>
            </div>

          </section>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <div className={styles.brandRow}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-label={isMobileSidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={isMobileSidebarOpen}
              onClick={() => setIsMobileSidebarOpen((current) => !current)}
            >
              <span />
              <span />
              <span />
            </button>

            <div className={styles.brand}>
              <div className={styles.brandMark}>
                <Image
                  src="/bravo_head.png"
                  alt="BravoBall mascot"
                  width={1080}
                  height={1080}
                  priority
                  className={styles.brandMarkImage}
                />
              </div>
              <div className={styles.brandStack}>
                <span className={styles.brandText}>BravoBall</span>
                <span className={styles.brandSubtext}>Coach MVP</span>
              </div>
            </div>
          </div>

          <div className={styles.topbarActions}>
            <div className={styles.searchWrap}>
              <input className={styles.searchInput} placeholder="Find a player..." />
              <button className={styles.searchButton} aria-label="Search players">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13Zm0 2a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9Zm7.9 10.5 2.6 2.6-1.4 1.4-2.6-2.6 1.4-1.4Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            </div>

            <div className={styles.sessionPill}>
              <span className={styles.sessionName}>{coachDisplayName(coachProfile)}</span>
              <span className={styles.sessionMeta}>{coachProfile?.email}</span>
            </div>

            <button className={styles.signOutButton} onClick={() => void handleCoachLogout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        {isMobileSidebarOpen ? (
          <button
            type="button"
            className={styles.sidebarScrim}
            aria-label="Close navigation"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        ) : null}

        <aside
          className={`${styles.sidebar} ${isMobileSidebarOpen ? styles.sidebarOpen : ""}`}
          aria-hidden={!isMobileSidebarOpen}
        >
          {sidebarGroups.map((group) => (
            <div key={group.title} className={styles.sidebarGroup}>
              <p className={styles.sidebarLabel}>{group.title}</p>
              <div className={styles.sidebarItems}>
                {group.items.map((item) => (
                  <button
                    key={item}
                    className={`${styles.sidebarItem} ${
                      (item === "Teams" && activeView === "teams") ||
                      (item === "Players" && activeView === "players") ||
                      (item === "Dashboard" && activeView === "dashboard") ||
                      (item === "Settings" && activeView === "settings")
                        ? styles.sidebarItemActive
                        : ""
                    }`}
                    onClick={() =>
                      {
                        setActiveView(
                          item === "Teams"
                            ? "teams"
                            : item === "Players"
                              ? "players"
                              : item === "Dashboard"
                                ? "dashboard"
                                : "settings",
                        );
                        setIsMobileSidebarOpen(false);
                      }
                    }
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <section className={styles.content}>
          <div className={styles.contentHeader}>
            <div>
              <p className={styles.eyebrow}>Workspace</p>
              <h1 className={styles.title}>
                {pageTitleForView(activeView)}
                {activeView === "teams" ? ` (${teams.length})` : ""}
              </h1>
            </div>
            {activeView !== "settings" ? (
              <div className={styles.headerButtons}>
                <select
                  className={styles.selectInput}
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value as TimeFilter)}
                >
                  {timeFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button className={styles.secondaryButton} onClick={() => setIsAddPlayerModalOpen(true)}>
                  Add player
                </button>
                <button className={styles.primaryButton} onClick={() => setIsCreateModalOpen(true)}>
                  Create team
                </button>
              </div>
            ) : null}
          </div>

          {error ? <Banner tone="error" text={error} /> : null}
          {notice ? <Banner tone="success" text={notice} /> : null}

          {activeView === "teams" ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Overview</h2>
                  <p className={styles.panelText}>
                    Filtered team activity updates automatically when the date range changes.
                  </p>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Registration</th>
                      <th>Avg Time/Player</th>
                      <th>{trainedLabelForFilter(timeFilter)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.length === 0 ? (
                      <tr>
                        <td colSpan={4} className={styles.emptyCell}>
                          {isLoading ? "Loading..." : "No teams loaded yet."}
                        </td>
                      </tr>
                    ) : (
                      teams.map((team) => (
                        <tr
                          key={team.id}
                          className={`${team.id === selectedTeamId ? styles.selectedRow : ""} ${styles.clickableRow}`}
                          onClick={() => {
                            setSelectedTeamId(team.id);
                            setActiveView("players");
                          }}
                        >
                          <td>
                            <div className={styles.teamCell}>
                              <span className={styles.teamName}>{team.name}</span>
                              <span className={styles.teamMeta}>Join code {team.join_code}</span>
                            </div>
                          </td>
                          <td>{team.player_count}</td>
                          <td>{formatMinutes(team.avg_time_per_player_minutes)}</td>
                          <td>{formatMinutes(team.trained_minutes_in_range)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeView === "teams" ? (
            <div className={styles.lowerGrid}>
              <section className={`${styles.panel} ${styles.selectedTeamPanel}`}>
                <h2 className={styles.panelTitle}>Selected team</h2>
                <p className={styles.teamTitle}>{selectedTeam ? selectedTeam.name : "No team selected"}</p>
                <div className={styles.joinCodeCard}>
                  <span className={styles.joinCodeLabel}>Join Code</span>
                  <span className={styles.joinCodeValue}>{selectedTeam?.join_code ?? "--"}</span>
                </div>
                <div className={styles.quickStats}>
                  <div className={styles.quickStat}>
                    <span className={styles.quickStatLabel}>Players</span>
                    <strong>{selectedTeam?.player_count ?? 0}</strong>
                  </div>
                  <div className={styles.quickStat}>
                    <span className={styles.quickStatLabel}>Sessions</span>
                    <strong>{selectedTeam?.sessions_in_range ?? 0}</strong>
                  </div>
                </div>
                <div className={`${styles.inlineControls} ${styles.teamActions}`}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => setActiveView("players")}
                    disabled={!selectedTeamId}
                  >
                    Manage players
                  </button>
                  <button
                    className={styles.dangerButton}
                    onClick={() => void deleteSelectedTeam()}
                    disabled={!selectedTeamId || isLoading}
                  >
                    Delete team
                  </button>
                </div>
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Coach account</h2>
                <p className={styles.panelText}>
                  Signed in as {coachDisplayName(coachProfile)}.
                </p>
                <div className={styles.quickStats}>
                  <div className={styles.quickStat}>
                    <span className={styles.quickStatLabel}>Username</span>
                    <strong>{coachProfile?.username}</strong>
                  </div>
                  <div className={styles.quickStat}>
                    <span className={styles.quickStatLabel}>Role</span>
                    <strong>{coachProfile?.role || "coach"}</strong>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {activeView === "players" ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Overview</h2>
                  <p className={styles.panelText}>Select a team to view player stats and roster details.</p>
                </div>
                <div className={styles.inlineControls}>
                  <select
                    className={styles.selectInput}
                    value={selectedTeamId ?? ""}
                    onChange={(event) =>
                      setSelectedTeamId(event.target.value ? Number(event.target.value) : null)
                    }
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <button className={styles.secondaryButton} onClick={() => setIsAddPlayerModalOpen(true)}>
                    Add player
                  </button>
                </div>
              </div>

              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Trained</th>
                      <th>
                        <span className={styles.headerHint}>
                          Technical
                          <span className={styles.infoBadge} aria-hidden="true">
                            i
                          </span>
                          <span className={styles.headerTooltip} role="tooltip">
                            {skillInfo.technical}
                          </span>
                        </span>
                      </th>
                      <th>
                        <span className={styles.headerHint}>
                          Physical
                          <span className={styles.infoBadge} aria-hidden="true">
                            i
                          </span>
                          <span className={styles.headerTooltip} role="tooltip">
                            {skillInfo.physical}
                          </span>
                        </span>
                      </th>
                      <th>Mental</th>
                      <th>Streak</th>
                      <th>Best</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedTeamId ? (
                      <tr>
                        <td colSpan={8} className={styles.emptyCell}>
                          No team selected.
                        </td>
                      </tr>
                    ) : roster?.members.length ? (
                      roster.members.map((member) => (
                        <tr
                          key={member.user_id}
                          className={styles.clickableRow}
                          onClick={() => {
                            if (!selectedTeamId) {
                              return;
                            }
                            setIsPlayerDetailOpen(true);
                            void loadPlayerHistory(selectedTeamId, member.user_id);
                          }}
                        >
                          <td>
                            <div className={styles.teamCell}>
                              <span className={styles.teamName}>
                                {member.full_name || member.username || `user-${member.user_id}`}
                              </span>
                              <span className={styles.teamMeta}>{member.email || member.username}</span>
                            </div>
                          </td>
                          <td>{formatMinutes(member.total_trained_minutes)}</td>
                          <td>{formatMinutes(member.technical_minutes)}</td>
                          <td>{formatMinutes(member.physical_minutes)}</td>
                          <td>{formatMinutes(member.mental_minutes)}</td>
                          <td>{member.current_streak}d</td>
                          <td>{member.best_streak}d</td>
                          <td>
                            <button
                              className={styles.tableDangerButton}
                              onClick={(event) => {
                                event.stopPropagation();
                                void removePlayerFromTeam(member.user_id);
                              }}
                              disabled={isLoading}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className={styles.emptyCell}>
                          No members yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {activeView === "dashboard" ? (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Overview</h2>
                  <p className={styles.panelText}>Team-level activity for the selected date range.</p>
                </div>
                <div className={styles.inlineControls}>
                  <select
                    className={styles.selectInput}
                    value={selectedTeamId ?? ""}
                    onChange={(event) => {
                      const nextTeamId = event.target.value ? Number(event.target.value) : null;
                      setSelectedTeamId(nextTeamId);
                      if (nextTeamId) {
                        void loadDashboard(nextTeamId);
                      } else {
                        setDashboard(null);
                      }
                    }}
                  >
                    <option value="">Select team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.dashboardCards}>
                <div className={styles.quickStat}>
                  <span className={styles.quickStatLabel}>Active Players</span>
                  <strong>
                    {dashboard ? `${dashboard.active_players} / ${dashboard.total_players}` : "--"}
                  </strong>
                </div>
                <div className={styles.quickStat}>
                  <span className={styles.quickStatLabel}>Total Time Logged</span>
                  <strong>{dashboard ? formatMinutes(dashboard.total_training_minutes) : "--"}</strong>
                </div>
              </div>

              <div className={styles.dashboardGrid}>
                <section className={styles.dashboardPanel}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Top Training Players</h3>
                  </div>
                  <div className={styles.topPlayersList}>
                    {dashboard?.top_players.length ? (
                      dashboard.top_players.map((player) => {
                        const maxMinutes = dashboard.top_players[0]?.total_minutes || 1;
                        const width = `${Math.max((player.total_minutes / maxMinutes) * 100, 4)}%`;
                        return (
                          <div key={player.user_id} className={styles.topPlayerRow}>
                            <div className={styles.topPlayerHeader}>
                              <span className={styles.teamName}>
                                {player.full_name || player.username || `user-${player.user_id}`}
                              </span>
                              <span>{formatMinutes(player.total_minutes)}</span>
                            </div>
                            <div className={styles.topPlayerBarTrack}>
                              <div className={styles.topPlayerBarFill} style={{ width }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className={styles.panelText}>No training data for this range yet.</p>
                    )}
                  </div>
                </section>

                <section className={styles.dashboardPanel}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.panelTitle}>Training Breakdown</h3>
                  </div>
                  <div className={styles.breakdownWrap}>
                    <div className={styles.pieChart} style={{ background: dashboardChart.background }} />
                    <div className={styles.breakdownLegend}>
                      {dashboardChart.items.length ? (
                        dashboardChart.items.map((item) => (
                          <div key={item.category} className={styles.legendRow}>
                            <span className={styles.legendSwatch} style={{ background: item.color }} />
                            <span>{item.label}</span>
                            <span>{formatMinutes(item.minutes)}</span>
                          </div>
                        ))
                      ) : (
                        <p className={styles.panelText}>No category data for this range yet.</p>
                      )}
                    </div>
                  </div>
                </section>
              </div>

              {!selectedTeamId ? (
                <p className={styles.panelText}>Select a team to view dashboard data.</p>
              ) : null}
              {selectedTeamId && !dashboard ? (
                <button
                  className={styles.secondaryButton}
                  onClick={() => void loadDashboard(selectedTeamId)}
                >
                  Load dashboard
                </button>
              ) : null}
              {selectedTeamId && dashboard && dashboard.team_name ? (
                <div className={styles.dashboardFooter}>
                  <span className={styles.teamMeta}>Viewing {dashboard.team_name}</span>
                </div>
              ) : null}
            </section>
          ) : null}

          {activeView === "settings" ? (
            <div className={styles.lowerGrid}>
              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Coach profile</h2>
                <p className={styles.panelText}>Update your account information used across coach features.</p>
                <div className={styles.formStack}>
                  <div className={styles.authNameRow}>
                    <label className={styles.fieldLabel}>
                      <span>First name</span>
                      <input
                        className={styles.textInput}
                        value={settingsForm.firstName}
                        onChange={(event) =>
                          setSettingsForm((current) => ({ ...current, firstName: event.target.value }))
                        }
                      />
                    </label>
                    <label className={styles.fieldLabel}>
                      <span>Last name</span>
                      <input
                        className={styles.textInput}
                        value={settingsForm.lastName}
                        onChange={(event) =>
                          setSettingsForm((current) => ({ ...current, lastName: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                  <label className={styles.fieldLabel}>
                    <span>Username</span>
                    <input
                      className={styles.textInput}
                      value={settingsForm.username}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, username: event.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Email</span>
                    <input
                      className={styles.textInput}
                      value={settingsForm.email}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </label>
                  <div className={styles.modalActions}>
                    <button className={styles.primaryButton} onClick={() => void saveCoachSettings()} disabled={isLoading}>
                      Save profile
                    </button>
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Change password</h2>
                <p className={styles.panelText}>Use your current password to set a new one.</p>
                <div className={styles.formStack}>
                  <label className={styles.fieldLabel}>
                    <span>Current password</span>
                    <input
                      type="password"
                      className={styles.textInput}
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>New password</span>
                    <input
                      type="password"
                      className={styles.textInput}
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Confirm new password</span>
                    <input
                      type="password"
                      className={styles.textInput}
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                      }
                    />
                  </label>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => void changeCoachPassword()}
                      disabled={isLoading}
                    >
                      Update password
                    </button>
                  </div>
                </div>
              </section>

              <section className={styles.panel}>
                <h2 className={styles.panelTitle}>Delete account</h2>
                <p className={styles.panelText}>
                  This permanently deletes your coach account. For safety, delete all active teams first.
                </p>
                <div className={styles.formStack}>
                  <label className={styles.fieldLabel}>
                    <span>Current password</span>
                    <input
                      type="password"
                      className={styles.textInput}
                      value={deleteAccountForm.currentPassword}
                      onChange={(event) =>
                        setDeleteAccountForm((current) => ({
                          ...current,
                          currentPassword: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Type DELETE to confirm</span>
                    <input
                      className={styles.textInput}
                      value={deleteAccountForm.confirmationText}
                      onChange={(event) =>
                        setDeleteAccountForm((current) => ({
                          ...current,
                          confirmationText: event.target.value,
                        }))
                      }
                      placeholder="DELETE"
                    />
                  </label>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.dangerButton}
                      onClick={() => void deleteCoachAccount()}
                      disabled={isLoading}
                    >
                      Delete account
                    </button>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {isCreateModalOpen ? (
            <div className={styles.modalOverlay} onClick={() => setIsCreateModalOpen(false)}>
              <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Create Team</h3>
                  <button className={styles.modalClose} onClick={() => setIsCreateModalOpen(false)}>
                    ×
                  </button>
                </div>
                <div className={styles.formStack}>
                  <input
                    ref={createInputRef}
                    className={styles.textInput}
                    value={teamName}
                    onChange={(event) => setTeamName(event.target.value)}
                    placeholder="Team name"
                  />
                  <div className={styles.modalActions}>
                    <button className={styles.secondaryButton} onClick={() => setIsCreateModalOpen(false)}>
                      Cancel
                    </button>
                    <button
                      className={styles.primaryButton}
                      onClick={() =>
                        void createTeam().then((success) => {
                          if (success) {
                            setIsCreateModalOpen(false);
                          }
                        })
                      }
                      disabled={isLoading}
                    >
                      Create Team
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isAddPlayerModalOpen ? (
            <div className={styles.modalOverlay} onClick={() => setIsAddPlayerModalOpen(false)}>
              <div className={styles.modalCard} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Add Player</h3>
                  <button className={styles.modalClose} onClick={() => setIsAddPlayerModalOpen(false)}>
                    ×
                  </button>
                </div>
                <div className={styles.formStack}>
                  <select
                    className={styles.selectInput}
                    value={selectedTeamId ?? ""}
                    onChange={(event) =>
                      setSelectedTeamId(event.target.value ? Number(event.target.value) : null)
                    }
                  >
                    <option value="">Choose a team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  <input
                    ref={addPlayerRef}
                    className={styles.textInput}
                    value={usernameToAdd}
                    onChange={(event) => setUsernameToAdd(event.target.value)}
                    placeholder="Username or email"
                  />
                  <div className={styles.modalActions}>
                    <button className={styles.secondaryButton} onClick={() => setIsAddPlayerModalOpen(false)}>
                      Cancel
                    </button>
                    <button
                      className={styles.primaryButton}
                      onClick={() =>
                        void addPlayerByUsername().then((success) => {
                          if (success) {
                            setIsAddPlayerModalOpen(false);
                          }
                        })
                      }
                      disabled={isLoading || !selectedTeamId}
                    >
                      Add Player
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isPlayerDetailOpen ? (
            <div className={styles.modalOverlay} onClick={() => setIsPlayerDetailOpen(false)}>
              <div className={styles.detailModalCard} onClick={(event) => event.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <div>
                    <h3 className={styles.modalTitle}>
                      {playerHistory?.full_name || playerHistory?.username || "Player detail"}
                    </h3>
                    <p className={styles.panelText}>
                      {playerHistory?.email || playerHistory?.username || ""}
                    </p>
                  </div>
                  <button className={styles.modalClose} onClick={() => setIsPlayerDetailOpen(false)}>
                    ×
                  </button>
                </div>

                <div className={styles.detailModalBody}>
                  <section className={styles.detailSection}>
                    <div className={styles.detailStats}>
                      <div className={styles.quickStat}>
                        <span className={styles.quickStatLabel}>Sessions</span>
                        <strong>{playerHistorySummary.sessions}</strong>
                      </div>
                      <div className={styles.quickStat}>
                        <span className={styles.quickStatLabel}>Total Trained</span>
                        <strong>{formatMinutes(playerHistorySummary.totalMinutes)}</strong>
                      </div>
                      <div className={styles.quickStat}>
                        <span className={styles.quickStatLabel}>Mental</span>
                        <strong>{formatMinutes(playerHistorySummary.mentalMinutes)}</strong>
                      </div>
                      <div className={styles.quickStat}>
                        <span className={styles.quickStatLabel}>Range</span>
                        <strong>{timeFilterOptions.find((option) => option.value === timeFilter)?.label}</strong>
                      </div>
                    </div>
                  </section>

                  <section className={styles.detailSection}>
                    <div className={styles.detailSectionHeader}>
                      <h4 className={styles.panelTitle}>Session history</h4>
                    </div>
                    <div className={styles.detailSessionList}>
                      {playerHistory?.sessions.length ? (
                        playerHistory.sessions.map((session) => (
                          <div key={session.session_id} className={styles.detailSessionCard}>
                            <div className={styles.detailSessionHeader}>
                              <div>
                                <strong>{new Date(session.date).toLocaleString()}</strong>
                                <p className={styles.teamMeta}>{session.session_type.replace("_", " ")}</p>
                              </div>
                              <strong>{formatMinutes(session.total_minutes)}</strong>
                            </div>
                            <div className={styles.detailBreakdown}>
                              <span>Technical {formatMinutes(session.technical_minutes)}</span>
                              <span>Physical {formatMinutes(session.physical_minutes)}</span>
                              <span>Mental {formatMinutes(session.mental_minutes)}</span>
                            </div>
                            <div className={styles.drillList}>
                              {session.drills.length ? (
                                session.drills.map((drill, index) => (
                                  <div key={`${session.session_id}-${index}`} className={styles.drillItem}>
                                    <span className={styles.teamName}>{drill.title}</span>
                                    <span className={styles.teamMeta}>
                                      {[drill.skill, ...drill.sub_skills].filter(Boolean).join(" • ")}
                                      {drill.duration_minutes ? ` • ${formatMinutes(drill.duration_minutes)}` : ""}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className={styles.teamMeta}>No drill breakdown saved for this session.</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className={styles.panelText}>No sessions found for this player in the selected date range.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function AuthTopbar() {
  return (
    <header className={styles.authTopbar}>
      <div className={styles.authTopbarInner}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Image
              src="/bravo_head.png"
              alt="BravoBall mascot"
              width={1080}
              height={1080}
              priority
              className={styles.brandMarkImage}
            />
          </div>
          <div className={styles.brandStack}>
            <span className={styles.brandText}>BravoBall</span>
            <span className={styles.brandSubtext}>Coach</span>
          </div>
        </div>
      </div>
    </header>
  );
}

function Banner({ tone, text }: { tone: "error" | "success"; text: string }) {
  return <div className={tone === "error" ? styles.errorBanner : styles.successBanner}>{text}</div>;
}
