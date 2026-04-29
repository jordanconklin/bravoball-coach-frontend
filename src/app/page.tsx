"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const STORAGE_KEY = "bravoball-coach-checkpoint-1";
const DEFAULT_TIME_FILTER: TimeFilter = "current_week";

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
};

const dashboardCategoryColors: Record<string, string> = {
  passing: "#F7DD63",
  shooting: "#2F5DA8",
  dribbling: "#8A6F68",
  first_touch: "#6B6BB2",
  defending: "#D69B54",
  goalkeeping: "#BFC7D6",
  fitness: "#68A97B",
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
];

type View = "teams" | "players" | "dashboard";

function getInitialConfig() {
  if (typeof window === "undefined") {
    return { backendUrl: "http://localhost:8000" };
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { backendUrl: "http://localhost:8000" };
  }

  try {
    const parsed = JSON.parse(saved) as { backendUrl?: string };
    return { backendUrl: parsed.backendUrl || "http://localhost:8000" };
  } catch {
    return { backendUrl: "http://localhost:8000" };
  }
}

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
  }
}

export default function Home() {
  const [initialConfig] = useState(getInitialConfig);
  const [backendUrl, setBackendUrl] = useState(initialConfig.backendUrl);
  const [teamName, setTeamName] = useState("");
  const [usernameToAdd, setUsernameToAdd] = useState("");
  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [roster, setRoster] = useState<TeamRoster | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(DEFAULT_TIME_FILTER);
  const [activeView, setActiveView] = useState<View>("teams");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isPlayerDetailOpen, setIsPlayerDetailOpen] = useState(false);
  const [playerHistory, setPlayerHistory] = useState<PlayerSessionHistory | null>(null);
  const [dashboard, setDashboard] = useState<TeamDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const createInputRef = useRef<HTMLInputElement | null>(null);
  const addPlayerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ backendUrl }));
  }, [backendUrl]);

  const api = useCallback(
    async function api<T>(path: string, init?: RequestInit): Promise<T> {
      const headers = new Headers(init?.headers ?? {});
      headers.set("Content-Type", "application/json");

      const response = await fetch(`${backendUrl}${path}`, {
        ...init,
        headers,
      });

      if (!response.ok) {
        let detail = `${response.status} ${response.statusText}`;
        try {
          const body = (await response.json()) as { detail?: string };
          if (body.detail) {
            detail = body.detail;
          }
        } catch {}
        throw new Error(detail);
      }

      return (await response.json()) as T;
    },
    [backendUrl],
  );

  const loadTeams = useCallback(async () => {
    const nextTeams = await api<TeamSummary[]>(
      `/api/coach/teams/me?time_filter=${timeFilter}`,
    );
    setTeams(nextTeams);
    setSelectedTeamId((current) =>
      nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id ?? null,
    );
    setNotice(null);
  }, [api, timeFilter]);

  const loadRosterForTeam = useCallback(
    async (teamId: number) => {
      const nextRoster = await api<TeamRoster>(
        `/api/coach/teams/${teamId}/members?time_filter=${timeFilter}`,
      );
      setRoster(nextRoster);
    },
    [api, timeFilter],
  );

  const loadPlayerHistory = useCallback(
    async (teamId: number, userId: number) => {
      const nextHistory = await api<PlayerSessionHistory>(
        `/api/coach/teams/${teamId}/members/${userId}/sessions?time_filter=${timeFilter}`,
      );
      setPlayerHistory(nextHistory);
    },
    [api, timeFilter],
  );

  const loadDashboard = useCallback(
    async (teamId: number) => {
      const nextDashboard = await api<TeamDashboard>(
        `/api/coach/dashboard?team_id=${teamId}&time_filter=${timeFilter}`,
      );
      setDashboard(nextDashboard);
    },
    [api, timeFilter],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
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
  }, [api, timeFilter]);

  useEffect(() => {
    let cancelled = false;

    async function loadRoster() {
      if (!selectedTeamId) {
        setRoster(null);
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

    void loadRoster();
    return () => {
      cancelled = true;
    };
  }, [activeView, api, selectedTeamId, timeFilter]);

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

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
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
            <span className={styles.brandText}>BravoBall</span>
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
            <button className={styles.signOutButton}>Sign out</button>
          </div>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
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
                      (item === "Dashboard" && activeView === "dashboard")
                        ? styles.sidebarItemActive
                        : ""
                    }`}
                    onClick={() =>
                      setActiveView(
                        item === "Teams"
                          ? "teams"
                          : item === "Players"
                            ? "players"
                            : "dashboard",
                      )
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
              <p className={styles.eyebrow}>Coach MVP</p>
              <h1 className={styles.title}>
                {pageTitleForView(activeView)}
                {activeView === "teams" ? ` (${teams.length})` : ""}
              </h1>
            </div>
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
          </div>

          {error ? <Banner tone="error" text={error} /> : null}
          {notice ? <Banner tone="success" text={notice} /> : null}

          {activeView === "teams" ? (
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Overview</h2>
                <p className={styles.panelText}>Filtered team activity updates automatically when the date range changes.</p>
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
                        className={team.id === selectedTeamId ? styles.selectedRow : ""}
                        onClick={() => setSelectedTeamId(team.id)}
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
            <section className={styles.panel}>
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
                  onChange={(event) => setSelectedTeamId(event.target.value ? Number(event.target.value) : null)}
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
                        <span className={styles.infoBadge} aria-hidden="true">i</span>
                        <span className={styles.headerTooltip} role="tooltip">
                          {skillInfo.technical}
                        </span>
                      </span>
                    </th>
                    <th>
                      <span className={styles.headerHint}>
                        Physical
                        <span className={styles.infoBadge} aria-hidden="true">i</span>
                        <span className={styles.headerTooltip} role="tooltip">
                          {skillInfo.physical}
                        </span>
                      </span>
                    </th>
                    <th>Mental</th>
                    <th>Streak</th>
                    <th>Best</th>
                  </tr>
                </thead>
                <tbody>
                  {!selectedTeamId ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyCell}>
                        No team selected.
                      </td>
                    </tr>
                  ) : roster?.members.length ? (
                    roster.members.map((member) => (
                      <tr
                        key={member.user_id}
                        className={styles.clickableRow}
                        onClick={() => {
                          if (!selectedTeamId) return;
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
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className={styles.emptyCell}>
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

          <section className={styles.localPanel}>
            <label className={styles.localLabel} htmlFor="backend-url">
              Local backend URL
            </label>
            <input
              id="backend-url"
              className={styles.textInput}
              value={backendUrl}
              onChange={(event) => setBackendUrl(event.target.value)}
              placeholder="Backend URL"
            />
          </section>

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
                    onChange={(event) => setSelectedTeamId(event.target.value ? Number(event.target.value) : null)}
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

                <div className={styles.detailStats}>
                  <div className={styles.quickStat}>
                    <span className={styles.quickStatLabel}>Sessions</span>
                    <strong>{playerHistory?.sessions.length ?? 0}</strong>
                  </div>
                  <div className={styles.quickStat}>
                    <span className={styles.quickStatLabel}>Range</span>
                    <strong>{timeFilterOptions.find((option) => option.value === timeFilter)?.label}</strong>
                  </div>
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
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function Banner({ tone, text }: { tone: "error" | "success"; text: string }) {
  return <div className={tone === "error" ? styles.errorBanner : styles.successBanner}>{text}</div>;
}
