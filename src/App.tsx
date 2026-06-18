import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Grid3X3,
  Home,
  Menu,
  Radio,
  RefreshCcw,
  Shield,
  SlidersHorizontal,
  Star,
  Trophy,
  Users
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import CinematicStageFallback from "./components/CinematicStageFallback";
import { useTournament } from "./hooks/useTournament";
import { usePreferences } from "./store/preferences";
import type { GroupCode, GroupStanding, Match, MatchStatus, StandingRow, Team, ThirdPlaceRow, TournamentSnapshot, UserPreferences } from "./types";

const CinematicStage = lazy(() => import("./components/CinematicStage"));

const navItems = [
  { label: "Home", sublabel: "Live command center", icon: Home },
  { label: "Matches", sublabel: "Live & upcoming", icon: CalendarDays },
  { label: "Groups", sublabel: "Standings & stats", icon: Globe2 },
  { label: "Knockout", sublabel: "Bracket & path", icon: Trophy },
  { label: "Teams", sublabel: "Profiles", icon: Shield },
  { label: "Players", sublabel: "Top performers", icon: Users },
  { label: "Stats Hub", sublabel: "Insights & trends", icon: BarChart3 },
  { label: "Settings", sublabel: "Config & data", icon: SlidersHorizontal }
] as const;

type ActiveSection = (typeof navItems)[number]["label"];

export default function App() {
  const { data, isLoading, isError, refetch, isFetching } = useTournament();
  const [activeSection, setActiveSection] = useState<ActiveSection>("Home");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const selectedGroup = usePreferences((state) => state.selectedGroup);
  const setSelectedGroup = usePreferences((state) => state.setSelectedGroup);
  const theme = usePreferences((state) => state.theme);
  const layout = usePreferences((state) => state.layout);
  const reducedMotion = usePreferences((state) => state.reducedMotion);
  const prefersReducedMotion = useReducedMotion();
  const motionOff = reducedMotion || Boolean(prefersReducedMotion);

  const snapshot = data;
  const activeGroup = snapshot?.groups.find((group) => group.code === selectedGroup) ?? snapshot?.groups[0];

  return (
    <main className={`app-shell theme-${theme} layout-${layout} ${motionOff ? "reduce-motion" : ""}`}>
      <div className="stadium-vignette" />
      <div className="led-ribbon ribbon-one" />
      <div className="led-ribbon ribbon-two" />

      <Sidebar
        activeSection={activeSection}
        expanded={sidebarExpanded}
        onSelectSection={setActiveSection}
        onToggleExpanded={() => setSidebarExpanded((value) => !value)}
        onClose={() => setSidebarExpanded(false)}
      />

      <section className="command-deck" aria-label="World Cup 2026 live command center">
        <TopBar
          snapshot={snapshot}
          isFetching={isFetching}
          refetch={refetch}
          sidebarExpanded={sidebarExpanded}
          onToggleMenu={() => setSidebarExpanded((value) => !value)}
        />

        {isLoading && <LoadingState />}
        {isError && <ErrorState refetch={refetch} />}

        {snapshot && activeGroup && (
          <SectionContent
            activeSection={activeSection}
            snapshot={snapshot}
            activeGroup={activeGroup}
            onSelectGroup={setSelectedGroup}
            motionOff={motionOff}
          />
        )}
      </section>
    </main>
  );
}

function Sidebar({
  activeSection,
  expanded,
  onSelectSection,
  onToggleExpanded,
  onClose
}: {
  activeSection: ActiveSection;
  expanded: boolean;
  onSelectSection: (section: ActiveSection) => void;
  onToggleExpanded: () => void;
  onClose: () => void;
}) {
  return (
    <aside className={expanded ? "sidebar expanded" : "sidebar"}>
      <div className="brand-lockup">
        <Trophy size={34} />
        <div>
          <strong>World Cup 2026</strong>
          <span>Live Command Center</span>
        </div>
      </div>
      <nav id="primary-navigation" aria-label="Primary sections">
        {navItems.map(({ label, sublabel, icon: Icon }) => (
          <button
            className={label === activeSection ? "nav-item active" : "nav-item"}
            key={label}
            onClick={() => {
              onSelectSection(label);
              onClose();
            }}
            aria-current={label === activeSection ? "page" : undefined}
            aria-label={label}
          >
            <Icon size={18} />
            <span>
              <strong>{label}</strong>
              <small>{sublabel}</small>
            </span>
          </button>
        ))}
      </nav>
      <button className="mobile-menu-button" onClick={onToggleExpanded} aria-label="Toggle navigation" aria-controls="primary-navigation" aria-expanded={expanded}>
        <Menu size={18} />
      </button>
    </aside>
  );
}

function TopBar({
  snapshot,
  isFetching,
  refetch,
  sidebarExpanded,
  onToggleMenu
}: {
  snapshot?: TournamentSnapshot;
  isFetching: boolean;
  refetch: () => void;
  sidebarExpanded: boolean;
  onToggleMenu: () => void;
}) {
  const favorites = usePreferences((state) => state.favorites);
  const timezone = usePreferences((state) => state.timezone);
  const setTimezone = usePreferences((state) => state.setTimezone);
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);
  const layout = usePreferences((state) => state.layout);
  const setLayout = usePreferences((state) => state.setLayout);
  const reducedMotion = usePreferences((state) => state.reducedMotion);
  const setReducedMotion = usePreferences((state) => state.setReducedMotion);

  return (
    <header className="topbar">
      <div className="live-chip">
        <span className="live-dot" />
        <strong>{snapshot?.providerStatus.state ?? "loading"}</strong>
        <small>{snapshot?.providerStatus.provider ?? "Tournament feed"}</small>
      </div>
      <button className="icon-button" onClick={() => refetch()} aria-label="Refresh data">
        <RefreshCcw size={17} className={isFetching ? "spin" : ""} />
      </button>
      <time>{formatClock(snapshot?.lastUpdated, timezone)}</time>
      <div className="topbar-spacer" />
      <Segmented label="Favorites" value={String(favorites.length)} icon={<Star size={16} />} />
      <SelectControl label="Timezone" value={timezone} onChange={setTimezone} options={["local", "venue", "utc"]} />
      <SelectControl label="Theme" value={theme} onChange={setTheme} options={["dark", "gold", "pitch"]} />
      <SelectControl label="Layout" value={layout} onChange={setLayout} options={["cinematic", "compact"]} />
      <button className={reducedMotion ? "icon-button active" : "icon-button"} onClick={() => setReducedMotion(!reducedMotion)} aria-label="Toggle reduced motion">
        <Radio size={17} />
      </button>
      <button className={sidebarExpanded ? "icon-button active" : "icon-button"} onClick={onToggleMenu} aria-label="Open menu" aria-controls="primary-navigation" aria-expanded={sidebarExpanded}>
        <Menu size={18} />
      </button>
    </header>
  );
}

function SectionContent({
  activeSection,
  snapshot,
  activeGroup,
  onSelectGroup,
  motionOff
}: {
  activeSection: ActiveSection;
  snapshot: TournamentSnapshot;
  activeGroup: GroupStanding;
  onSelectGroup: (group: GroupCode) => void;
  motionOff: boolean;
}) {
  if (activeSection === "Matches") return <MatchesScreen snapshot={snapshot} />;
  if (activeSection === "Knockout") return <KnockoutScreen snapshot={snapshot} />;
  if (activeSection === "Teams") return <TeamsScreen snapshot={snapshot} onSelectGroup={onSelectGroup} />;
  if (activeSection === "Players") return <PlayersScreen snapshot={snapshot} />;
  if (activeSection === "Stats Hub") return <StatsHubScreen snapshot={snapshot} />;
  if (activeSection === "Settings") return <SettingsScreen snapshot={snapshot} />;

  return (
    <>
      <div className="arena-grid">
        <Suspense fallback={<CinematicStageFallback groups={snapshot.groups} selectedGroup={activeGroup.code} onSelectGroup={onSelectGroup} />}>
          <CinematicStage
            groups={snapshot.groups}
            selectedGroup={activeGroup.code}
            onSelectGroup={onSelectGroup}
            motionOff={motionOff}
          />
        </Suspense>
        <GroupInspector
          group={activeGroup}
          groups={snapshot.groups}
          onSelectGroup={onSelectGroup}
          thirdPlaceRace={snapshot.thirdPlaceRace}
          liveMatches={snapshot.liveMatches}
          motionOff={motionOff}
        />
      </div>
      <BottomDeck snapshot={snapshot} />
    </>
  );
}

function MatchesScreen({ snapshot }: { snapshot: TournamentSnapshot }) {
  const timezone = usePreferences((state) => state.timezone);
  const [statusFilter, setStatusFilter] = useState<"all" | MatchStatus>("all");
  const [query, setQuery] = useState("");
  const teams = allTeams(snapshot);
  const matches = snapshot.groups
    .flatMap((group) => group.matches)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime())
    .filter((match) => statusFilter === "all" || match.status === statusFilter)
    .filter((match) => {
      const haystack = [
        match.group,
        match.venue,
        teamFor(match.homeTeamId, teams)?.name,
        teamFor(match.awayTeamId, teams)?.name
      ].join(" ").toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

  return (
    <section className="section-screen" aria-labelledby="matches-title">
      <ScreenHeader
        id="matches-title"
        eyebrow="Schedule control"
        title="Matches"
        detail={`${snapshot.liveMatches.length} live · ${matches.length} shown`}
      />
      <div className="screen-toolbar">
        <label className="search-control">
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Team, group, venue" />
        </label>
        <SelectControl label="Status" value={statusFilter} onChange={setStatusFilter} options={["all", "live", "scheduled", "complete"]} />
      </div>
      <div className="match-grid">
        {matches.map((match) => (
          <article className="match-card" key={match.id}>
            <div className="match-card-head">
              <span>Group {match.group}</span>
              <b className={`status-pill ${match.status}`}>{match.status}</b>
            </div>
            <div className="scoreline">
              <TeamMark team={teamFor(match.homeTeamId, teams)} />
              <strong>{score(match)}</strong>
              <TeamMark team={teamFor(match.awayTeamId, teams)} />
            </div>
            <p>{formatDate(match.kickoff, timezone)} · {match.venue}</p>
            {match.minute && <small>{match.minute}</small>}
          </article>
        ))}
      </div>
    </section>
  );
}

function KnockoutScreen({ snapshot }: { snapshot: TournamentSnapshot }) {
  return (
    <section className="section-screen" aria-labelledby="knockout-title">
      <ScreenHeader
        id="knockout-title"
        eyebrow="Projection desk"
        title="Knockout"
        detail="Round of 32 slots use current table order; third-place matrix remains marked as provisional."
      />
      <div className="bracket-board">
        {snapshot.knockoutSlots.map((slot) => (
          <article className="bracket-lane" key={slot.id}>
            <span>{slot.label}</span>
            <strong>{slot.teamLabel}</strong>
            <small>{slot.source}</small>
          </article>
        ))}
      </div>
      <div className="race-table expanded">
        {snapshot.thirdPlaceRace.map((entry) => (
          <div className={entry.qualifies ? "race-row qualifies" : "race-row"} key={entry.row.team.id}>
            <span>{entry.rank}</span>
            <b>{entry.row.team.flag} {entry.row.team.name}</b>
            <small>Group {entry.group}</small>
            <small>{entry.row.points} pts · {signed(entry.row.goalDifference)} GD</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamsScreen({ snapshot, onSelectGroup }: { snapshot: TournamentSnapshot; onSelectGroup: (group: GroupCode) => void }) {
  const favorites = usePreferences((state) => state.favorites);
  const toggleFavorite = usePreferences((state) => state.toggleFavorite);
  const [confederation, setConfederation] = useState("all");
  const teams = allTeams(snapshot);
  const confederations = ["all", ...Array.from(new Set(teams.map((team) => team.confederation))).sort()];
  const filteredTeams = confederation === "all" ? teams : teams.filter((team) => team.confederation === confederation);

  return (
    <section className="section-screen" aria-labelledby="teams-title">
      <ScreenHeader id="teams-title" eyebrow="Squad directory" title="Teams" detail={`${filteredTeams.length} teams · ${favorites.length} favorites`} />
      <div className="screen-toolbar">
        <SelectControl label="Confed" value={confederation} onChange={setConfederation} options={confederations} />
      </div>
      <div className="team-directory">
        {filteredTeams.map((team) => (
          <article className="team-card" key={team.id} style={{ "--team-a": team.colors[0], "--team-b": team.colors[2] } as React.CSSProperties}>
            <button className="team-card-main" onClick={() => onSelectGroup(team.group)} aria-label={`Open Group ${team.group} for ${team.name}`}>
              <span className="hero-flag">{team.flag}</span>
              <strong>{team.name}</strong>
              <small>Group {team.group} · {team.confederation} · FIFA {team.fifaRank}</small>
            </button>
            <button className={favorites.includes(team.id) ? "favorite active" : "favorite"} onClick={() => toggleFavorite(team.id)} aria-label={`Toggle ${team.name} favorite`}>
              <Star size={18} />
            </button>
            <p>{team.profile.bestFinish} · {team.profile.form.join(" ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function PlayersScreen({ snapshot }: { snapshot: TournamentSnapshot }) {
  const teams = allTeams(snapshot);
  const sourceIsLive = snapshot.source === "provider";
  const featured = teams.slice(0, 12);

  return (
    <section className="section-screen" aria-labelledby="players-title">
      <ScreenHeader
        id="players-title"
        eyebrow="Player feed"
        title="Players"
        detail={sourceIsLive ? "Provider-backed player surfaces are ready for statistics." : "Seed cache has team profile stars only; provider player statistics are unavailable."}
      />
      <div className="provider-note" role="status">
        <strong>{sourceIsLive ? "Provider connected" : "Player stats unavailable"}</strong>
        <span>{sourceIsLive ? "Top scorers, cards, assists, and minutes can be added when API-Football player endpoints are enabled." : "No goalscorer or player-stat feed is included in the local seed cache, so this screen avoids fake leaderboards."}</span>
      </div>
      <div className="player-grid">
        {featured.map((team) => (
          <article className="player-card" key={team.id}>
            <span>{team.flag}</span>
            <strong>{team.profile.star}</strong>
            <small>{team.name} · Group {team.group}</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatsHubScreen({ snapshot }: { snapshot: TournamentSnapshot }) {
  const matches = snapshot.groups.flatMap((group) => group.matches);
  const completed = matches.filter((match) => match.status === "complete").length;
  const scheduled = matches.filter((match) => match.status === "scheduled").length;
  const leaders = snapshot.groups.map((group) => group.rows[0]).sort((a, b) => b.points - a.points).slice(0, 8);

  return (
    <section className="section-screen" aria-labelledby="stats-title">
      <ScreenHeader id="stats-title" eyebrow="Tournament telemetry" title="Stats Hub" detail={snapshot.providerStatus.detail} />
      <div className="kpi-grid">
        <Metric label="Matches tracked" value={matches.length} />
        <Metric label="Completed" value={completed} />
        <Metric label="Scheduled" value={scheduled} />
        <Metric label="Goals" value={snapshot.goalsScored} />
      </div>
      <div className="section-split">
        <div className="standings-panel">
          <div className="table-title">Group leaders</div>
          <table>
            <tbody>
              {leaders.map((row) => (
                <tr key={row.team.id}>
                  <td><span>{row.team.flag}</span><strong>{row.team.name}</strong></td>
                  <td>{row.points} pts</td>
                  <td>{signed(row.goalDifference)} GD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="provider-note">
          <strong>{snapshot.providerStatus.provider}</strong>
          <span>{snapshot.providerStatus.state} · checked {formatClock(snapshot.providerStatus.checkedAt)}</span>
          {snapshot.providerStatus.cacheAgeSeconds !== undefined && <small>Cache age {snapshot.providerStatus.cacheAgeSeconds}s</small>}
        </div>
      </div>
    </section>
  );
}

function SettingsScreen({ snapshot }: { snapshot: TournamentSnapshot }) {
  const theme = usePreferences((state) => state.theme);
  const setTheme = usePreferences((state) => state.setTheme);
  const layout = usePreferences((state) => state.layout);
  const setLayout = usePreferences((state) => state.setLayout);
  const timezone = usePreferences((state) => state.timezone);
  const setTimezone = usePreferences((state) => state.setTimezone);
  const refreshSeconds = usePreferences((state) => state.refreshSeconds);
  const setRefreshSeconds = usePreferences((state) => state.setRefreshSeconds);
  const reducedMotion = usePreferences((state) => state.reducedMotion);
  const setReducedMotion = usePreferences((state) => state.setReducedMotion);

  return (
    <section className="section-screen" aria-labelledby="settings-title">
      <ScreenHeader id="settings-title" eyebrow="Operator controls" title="Settings" detail="Display, refresh, and source-status controls." />
      <div className="settings-grid">
        <SelectControl label="Timezone" value={timezone} onChange={setTimezone} options={["local", "venue", "utc"]} />
        <SelectControl label="Theme" value={theme} onChange={setTheme} options={["dark", "gold", "pitch"]} />
        <SelectControl label="Layout" value={layout} onChange={setLayout} options={["cinematic", "compact"]} />
        <label className="select-control refresh-control">
          <span>Refresh</span>
          <input
            type="number"
            min="10"
            max="300"
            step="5"
            value={refreshSeconds}
            onChange={(event) => setRefreshSeconds(Number(event.target.value))}
          />
        </label>
        <button className={reducedMotion ? "primary-button active" : "primary-button"} onClick={() => setReducedMotion(!reducedMotion)}>
          {reducedMotion ? "Reduced motion on" : "Reduced motion off"}
        </button>
      </div>
      <div className="provider-note">
        <strong>{snapshot.providerStatus.provider}</strong>
        <span>{snapshot.providerStatus.detail}</span>
        <small>Source: {snapshot.source} · state: {snapshot.providerStatus.state}</small>
      </div>
    </section>
  );
}

function ScreenHeader({ id, eyebrow, title, detail }: { id: string; eyebrow: string; title: string; detail: string }) {
  return (
    <header className="screen-header">
      <span>{eyebrow}</span>
      <h1 id={id}>{title}</h1>
      <p>{detail}</p>
    </header>
  );
}

function GroupInspector({
  group,
  groups,
  onSelectGroup,
  thirdPlaceRace,
  liveMatches,
  motionOff
}: {
  group: GroupStanding;
  groups: GroupStanding[];
  onSelectGroup: (group: GroupCode) => void;
  thirdPlaceRace: ThirdPlaceRow[];
  liveMatches: Match[];
  motionOff: boolean;
}) {
  const favorites = usePreferences((state) => state.favorites);
  const toggleFavorite = usePreferences((state) => state.toggleFavorite);
  const timezone = usePreferences((state) => state.timezone);
  const leader = group.rows[0];
  const nextMatch = group.matches.find((match) => match.status !== "complete") ?? group.matches[0];
  const thirdRace = thirdPlaceRace.find((entry) => entry.group === group.code);
  const groupIndex = groups.findIndex((item) => item.code === group.code);
  const previousGroup = groups[(groupIndex - 1 + groups.length) % groups.length];
  const nextGroup = groups[(groupIndex + 1) % groups.length];

  return (
    <AnimatePresence mode="wait">
      <motion.aside
        className="inspector"
        key={group.code}
        initial={motionOff ? false : { opacity: 0, x: 36, filter: "blur(8px)" }}
        animate={motionOff ? undefined : { opacity: 1, x: 0, filter: "blur(0px)" }}
        exit={motionOff ? undefined : { opacity: 0, x: 20, filter: "blur(8px)" }}
        transition={{ duration: motionOff ? 0 : 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="inspector-head">
          <button className="icon-button small" onClick={() => onSelectGroup(previousGroup.code)} aria-label={`Previous group, Group ${previousGroup.code}`}>
            <ChevronLeft size={16} />
          </button>
          <strong>Group {group.code}</strong>
          <button className="icon-button small" onClick={() => onSelectGroup(nextGroup.code)} aria-label={`Next group, Group ${nextGroup.code}`}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="team-hero" style={{ "--team-a": leader.team.colors[0], "--team-b": leader.team.colors[2] } as React.CSSProperties}>
          <div>
            <span className="hero-flag">{leader.team.flag}</span>
            <h2>{leader.team.name}</h2>
            <p>{leader.rank === 1 ? "1st place" : `${leader.rank} place`} · {leader.points} pts · {signed(leader.goalDifference)} GD</p>
          </div>
          <button
            className={favorites.includes(leader.team.id) ? "favorite active" : "favorite"}
            onClick={() => toggleFavorite(leader.team.id)}
            aria-label="Toggle favorite"
          >
            <Star size={18} />
          </button>
        </div>

        <MetricStrip row={leader} />
        <StandingsTable rows={group.rows} />
        <div className="inspector-grid">
          <TiebreakerLadder leader={leader} />
          <NextMatch match={nextMatch} teams={group.rows.map((row) => row.team)} timezone={timezone} />
        </div>
        <div className="race-callout">
          <span>Best third race</span>
          <strong>{thirdRace ? `${ordinal(thirdRace.rank)} overall` : "Awaiting table"}</strong>
          <small>{thirdRace?.qualifies ? "Currently projects to Round of 32" : "Needs points or goal swing"}</small>
        </div>
        <LivePulse matches={liveMatches} />
      </motion.aside>
    </AnimatePresence>
  );
}

function MetricStrip({ row }: { row: StandingRow }) {
  return (
    <div className="metric-strip">
      <Metric label="Played" value={row.played} />
      <Metric label="Won" value={row.won} />
      <Metric label="Drawn" value={row.drawn} />
      <Metric label="Lost" value={row.lost} />
      <Metric label="GD" value={signed(row.goalDifference)} />
      <Metric label="Points" value={row.points} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <div className="standings-panel">
      <div className="table-title">Standings</div>
      <table>
        <thead>
          <tr>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>PTS</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team.id}>
              <td>
                <span>{row.rank}</span>
                <span>{row.team.flag}</span>
                <strong>{row.team.name}</strong>
              </td>
              <td>{row.played}</td>
              <td>{row.won}</td>
              <td>{row.drawn}</td>
              <td>{row.lost}</td>
              <td>{signed(row.goalDifference)}</td>
              <td>{row.points}</td>
              <td><QualificationBadge row={row} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QualificationBadge({ row }: { row: StandingRow }) {
  if (row.rank <= 2) return <span className="q-badge qualified">R32</span>;
  if (row.rank === 3) return <span className="q-badge third">3rd</span>;
  return <span className="q-badge out">Out</span>;
}

function TiebreakerLadder({ leader }: { leader: StandingRow }) {
  const steps = [
    ["Points", leader.points],
    ["Head-to-head points", "live"],
    ["Head-to-head GD", "live"],
    ["Overall goal difference", signed(leader.goalDifference)],
    ["Goals scored", leader.goalsFor],
    ["Fair play score", leader.fairPlay],
    ["FIFA ranking fallback", leader.team.fifaRank]
  ];

  return (
    <div className="ladder-panel">
      <strong>Tiebreaker ladder</strong>
      {steps.map(([label, value], index) => (
        <div className="ladder-row" key={label}>
          <span>{index + 1}</span>
          <small>{label}</small>
          <b>{value}</b>
        </div>
      ))}
    </div>
  );
}

function NextMatch({ match, teams: groupTeams, timezone }: { match?: Match; teams: Team[]; timezone: UserPreferences["timezone"] }) {
  if (!match) return null;
  const home = groupTeams.find((team) => team.id === match.homeTeamId);
  const away = groupTeams.find((team) => team.id === match.awayTeamId);

  return (
    <div className="next-panel">
      <strong>{match.status === "live" ? "Live now" : "Next match"}</strong>
      <div className="versus">
        <span>{home?.flag}</span>
        <b>vs</b>
        <span>{away?.flag}</span>
      </div>
      <p>{home?.name} vs {away?.name}</p>
      <small>{formatDate(match.kickoff, timezone)} · {match.venue}</small>
    </div>
  );
}

function LivePulse({ matches: liveMatches }: { matches: Match[] }) {
  return (
    <div className="live-pulse">
      <span className="live-dot" />
      <strong>{liveMatches.length} live now</strong>
      <small>Auto-updating feed</small>
    </div>
  );
}

function BottomDeck({ snapshot }: { snapshot: TournamentSnapshot }) {
  const timezone = usePreferences((state) => state.timezone);

  return (
    <footer className="bottom-deck">
      <section className="qualification-rail">
        <header>
          <strong>Top 2 qualify automatically</strong>
          <span>Round of 32 projection</span>
        </header>
        <div className="group-qualifiers">
          {snapshot.groups.map((group) => (
            <div className="qualifier-card" key={group.code}>
              <b>{group.code}</b>
              {group.rows.slice(0, 2).map((row) => (
                <span key={row.team.id}>{row.team.flag}<small>{row.team.shortName}</small></span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="third-race">
        <header>
          <strong>Best third-place race</strong>
          <span>Top 8 advance</span>
        </header>
        <div className="race-table">
          {snapshot.thirdPlaceRace.slice(0, 8).map((entry) => (
            <div className="race-row" key={entry.row.team.id}>
              <span>{entry.rank}</span>
              <b>{entry.row.team.flag} {entry.row.team.shortName}</b>
              <small>{entry.row.points} pts</small>
              <small>{signed(entry.row.goalDifference)} GD</small>
            </div>
          ))}
        </div>
      </section>

      <section className="road-final">
        <header>
          <strong>Road to the final</strong>
          <span>Projected bracket</span>
        </header>
        <div className="bracket-strip">
          {snapshot.knockoutSlots.map((slot) => (
            <div className="bracket-node" key={slot.id}>
              <Grid3X3 size={17} />
              <b>{slot.label}</b>
              <small>{slot.teamLabel}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="data-bar">
        <span><span className="live-dot" /> Data refreshed {formatClock(snapshot.lastUpdated, timezone)}</span>
        <span>Total matches <b>{snapshot.totalMatches}</b></span>
        <span>Goals scored <b>{snapshot.goalsScored}</b></span>
        <span>Goals per match <b>{(snapshot.goalsScored / Math.max(1, snapshot.groups.flatMap((group) => group.matches).filter((match) => match.homeScore !== null).length)).toFixed(2)}</b></span>
      </div>
    </footer>
  );
}

function LoadingState() {
  return (
    <div className="state-panel">
      <Trophy size={32} />
      <strong>Loading tournament command center</strong>
    </div>
  );
}

function ErrorState({ refetch }: { refetch: () => void }) {
  return (
    <div className="state-panel">
      <strong>Live feed unavailable</strong>
      <button className="primary-button" onClick={() => refetch()}>Retry</button>
    </div>
  );
}

function Segmented({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="segmented">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SelectControl<T extends string>({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <label className="select-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TeamMark({ team }: { team?: Team }) {
  return (
    <span className="team-mark">
      <b>{team?.flag ?? "•"}</b>
      <small>{team?.shortName ?? "TBD"}</small>
    </span>
  );
}

function score(match: Match) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

function allTeams(snapshot: TournamentSnapshot): Team[] {
  return snapshot.groups.flatMap((group) => group.rows.map((row) => row.team));
}

function teamFor(teamId: string, teams: Team[]): Team | undefined {
  return teams.find((team) => team.id === teamId);
}

function formatClock(value?: string, preference: UserPreferences["timezone"] = "local") {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: timeZoneFor(preference)
  }).format(value ? new Date(value) : new Date());
}

function formatDate(value: string, preference: UserPreferences["timezone"] = "local") {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timeZoneFor(preference)
  }).format(new Date(value));
}

function timeZoneFor(preference: UserPreferences["timezone"]) {
  if (preference === "utc") return "UTC";
  if (preference === "venue") return "America/New_York";
  return undefined;
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function ordinal(value: number) {
  const suffix = value % 10 === 1 && value !== 11 ? "st" : value % 10 === 2 && value !== 12 ? "nd" : value % 10 === 3 && value !== 13 ? "rd" : "th";
  return `${value}${suffix}`;
}
