import type { GroupCode, Match, Team } from "../types.js";

const profiles = {
  manager: "Tournament staff",
  captain: "Matchday captain",
  star: "Featured player",
  bestFinish: "World Cup finalist",
  form: ["W", "D", "W", "L", "W"]
};

export const teams: Team[] = [
  team("mex", "Mexico", "MEX", "A", "🇲🇽", ["#006847", "#ffffff", "#ce1126"], "CONCACAF", 15, "Quarter-finals"),
  team("rsa", "South Africa", "RSA", "A", "🇿🇦", ["#007749", "#ffb81c", "#de3831"], "CAF", 61, "Group stage"),
  team("kor", "South Korea", "KOR", "A", "🇰🇷", ["#c60c30", "#ffffff", "#003478"], "AFC", 22, "Fourth place"),
  team("cze", "Czechia", "CZE", "A", "🇨🇿", ["#d7141a", "#ffffff", "#11457e"], "UEFA", 44, "Runner-up"),
  team("can", "Canada", "CAN", "B", "🇨🇦", ["#d52b1e", "#ffffff", "#d52b1e"], "CONCACAF", 31, "Group stage"),
  team("sui", "Switzerland", "SUI", "B", "🇨🇭", ["#d52b1e", "#ffffff", "#8b0000"], "UEFA", 20, "Quarter-finals"),
  team("qat", "Qatar", "QAT", "B", "🇶🇦", ["#8a1538", "#ffffff", "#6f0f2f"], "AFC", 53, "Group stage"),
  team("ita", "Italy", "ITA", "B", "🇮🇹", ["#009246", "#ffffff", "#ce2b37"], "UEFA", 9, "Winners"),
  team("bra", "Brazil", "BRA", "C", "🇧🇷", ["#009c3b", "#ffdf00", "#002776"], "CONMEBOL", 5, "Winners"),
  team("mar", "Morocco", "MAR", "C", "🇲🇦", ["#c1272d", "#006233", "#ffffff"], "CAF", 12, "Fourth place"),
  team("sco", "Scotland", "SCO", "C", "🏴", ["#005eb8", "#ffffff", "#002f6c"], "UEFA", 39, "Group stage"),
  team("hai", "Haiti", "HAI", "C", "🇭🇹", ["#00209f", "#d21034", "#ffffff"], "CONCACAF", 86, "Group stage"),
  team("usa", "United States", "USA", "D", "🇺🇸", ["#3c3b6e", "#ffffff", "#b22234"], "CONCACAF", 14, "Third place"),
  team("par", "Paraguay", "PAR", "D", "🇵🇾", ["#d52b1e", "#ffffff", "#0038a8"], "CONMEBOL", 39, "Quarter-finals"),
  team("aus", "Australia", "AUS", "D", "🇦🇺", ["#00843d", "#ffcd00", "#012169"], "AFC", 26, "Round of 16"),
  team("tur", "Turkey", "TUR", "D", "🇹🇷", ["#e30a17", "#ffffff", "#9d0000"], "UEFA", 25, "Third place"),
  team("ger", "Germany", "GER", "E", "🇩🇪", ["#000000", "#dd0000", "#ffce00"], "UEFA", 10, "Winners"),
  team("jpn", "Japan", "JPN", "E", "🇯🇵", ["#bc002d", "#ffffff", "#1f4ea3"], "AFC", 18, "Round of 16"),
  team("tun", "Tunisia", "TUN", "E", "🇹🇳", ["#e70013", "#ffffff", "#8a0d14"], "CAF", 42, "Group stage"),
  team("nzl", "New Zealand", "NZL", "E", "🇳🇿", ["#00247d", "#cc142b", "#ffffff"], "OFC", 103, "Group stage"),
  team("fra", "France", "FRA", "F", "🇫🇷", ["#0055a4", "#ffffff", "#ef4135"], "UEFA", 3, "Winners"),
  team("col", "Colombia", "COL", "F", "🇨🇴", ["#fcd116", "#003893", "#ce1126"], "CONMEBOL", 13, "Quarter-finals"),
  team("ksa", "Saudi Arabia", "KSA", "F", "🇸🇦", ["#006c35", "#ffffff", "#004f2d"], "AFC", 60, "Round of 16"),
  team("pan", "Panama", "PAN", "F", "🇵🇦", ["#005293", "#ffffff", "#d21034"], "CONCACAF", 35, "Group stage"),
  team("arg", "Argentina", "ARG", "G", "🇦🇷", ["#75aadb", "#ffffff", "#f6b40e"], "CONMEBOL", 2, "Winners"),
  team("por", "Portugal", "POR", "G", "🇵🇹", ["#006600", "#ff0000", "#ffcc00"], "UEFA", 6, "Third place"),
  team("civ", "Ivory Coast", "CIV", "G", "🇨🇮", ["#f77f00", "#ffffff", "#009e60"], "CAF", 46, "Group stage"),
  team("uzb", "Uzbekistan", "UZB", "G", "🇺🇿", ["#1eb53a", "#0099b5", "#ce1126"], "AFC", 57, "Debut"),
  team("esp", "Spain", "ESP", "H", "🇪🇸", ["#aa151b", "#f1bf00", "#aa151b"], "UEFA", 1, "Winners"),
  team("uru", "Uruguay", "URU", "H", "🇺🇾", ["#0038a8", "#ffffff", "#fcd116"], "CONMEBOL", 16, "Winners"),
  team("cpv", "Cape Verde", "CPV", "H", "🇨🇻", ["#003893", "#f7d116", "#cf2027"], "CAF", 68, "Debut"),
  team("bol", "Bolivia", "BOL", "H", "🇧🇴", ["#d52b1e", "#f9e300", "#007934"], "CONMEBOL", 78, "Group stage"),
  team("eng", "England", "ENG", "I", "🏴", ["#ffffff", "#c8102e", "#012169"], "UEFA", 4, "Winners"),
  team("bel", "Belgium", "BEL", "I", "🇧🇪", ["#000000", "#fae042", "#ed2939"], "UEFA", 8, "Third place"),
  team("gha", "Ghana", "GHA", "I", "🇬🇭", ["#ce1126", "#fcd116", "#006b3f"], "CAF", 73, "Quarter-finals"),
  team("tri", "Trinidad and Tobago", "TRI", "I", "🇹🇹", ["#da1a35", "#ffffff", "#000000"], "CONCACAF", 98, "Group stage"),
  team("ecu", "Ecuador", "ECU", "J", "🇪🇨", ["#ffdd00", "#034ea2", "#ed1c24"], "CONMEBOL", 24, "Round of 16"),
  team("alg", "Algeria", "ALG", "J", "🇩🇿", ["#006233", "#ffffff", "#d21034"], "CAF", 37, "Round of 16"),
  team("aut", "Austria", "AUT", "J", "🇦🇹", ["#ed2939", "#ffffff", "#c8102e"], "UEFA", 29, "Third place"),
  team("jor", "Jordan", "JOR", "J", "🇯🇴", ["#007a3d", "#ffffff", "#ce1126"], "AFC", 64, "Debut"),
  team("den", "Denmark", "DEN", "K", "🇩🇰", ["#c60c30", "#ffffff", "#8b0000"], "UEFA", 21, "Quarter-finals"),
  team("sen", "Senegal", "SEN", "K", "🇸🇳", ["#00853f", "#fdef42", "#e31b23"], "CAF", 19, "Quarter-finals"),
  team("drc", "DR Congo", "DRC", "K", "🇨🇩", ["#007fff", "#f7d618", "#ce1021"], "CAF", 56, "Group stage"),
  team("nor", "Norway", "NOR", "K", "🇳🇴", ["#ba0c2f", "#ffffff", "#00205b"], "UEFA", 29, "Round of 16"),
  team("cro", "Croatia", "CRO", "L", "🇭🇷", ["#ff0000", "#ffffff", "#171796"], "UEFA", 11, "Runner-up"),
  team("ned", "Netherlands", "NED", "L", "🇳🇱", ["#ae1c28", "#ffffff", "#21468b"], "UEFA", 7, "Runner-up"),
  team("irl", "Ireland", "IRL", "L", "🇮🇪", ["#169b62", "#ffffff", "#ff883e"], "UEFA", 48, "Quarter-finals"),
  team("kuw", "Kuwait", "KUW", "L", "🇰🇼", ["#007a3d", "#ffffff", "#ce1126"], "AFC", 134, "Group stage")
];

export const matches: Match[] = [
  match("A", "mex", "rsa", 2, 1, "complete", "2026-06-11T20:00:00-05:00", "Estadio Banorte"),
  match("A", "kor", "cze", 1, 1, "complete", "2026-06-12T18:00:00-05:00", "AT&T Stadium"),
  match("A", "mex", "kor", 2, 2, "live", "2026-06-18T21:00:00-05:00", "Mercedes-Benz Stadium", "62'"),
  match("B", "can", "sui", 2, 0, "complete", "2026-06-12T18:00:00-04:00", "BMO Field"),
  match("B", "qat", "ita", 1, 3, "complete", "2026-06-13T15:00:00-04:00", "MetLife Stadium"),
  match("B", "can", "ita", 2, 2, "live", "2026-06-18T20:00:00-04:00", "BC Place", "45+2'"),
  match("C", "bra", "mar", 3, 1, "complete", "2026-06-13T18:00:00-04:00", "Hard Rock Stadium"),
  match("C", "sco", "hai", 1, 0, "complete", "2026-06-14T13:00:00-04:00", "Lincoln Financial Field"),
  match("C", "bra", "sco", null, null, "scheduled", "2026-06-19T18:00:00-04:00", "SoFi Stadium"),
  match("D", "usa", "par", 2, 1, "complete", "2026-06-12T18:00:00-07:00", "SoFi Stadium"),
  match("D", "aus", "tur", 1, 1, "complete", "2026-06-13T15:00:00-07:00", "Levi's Stadium"),
  match("D", "usa", "aus", 1, 0, "live", "2026-06-18T18:00:00-07:00", "Lumen Field", "74'"),
  match("E", "ger", "jpn", 2, 2, "complete", "2026-06-14T15:00:00-05:00", "NRG Stadium"),
  match("E", "tun", "nzl", 1, 0, "complete", "2026-06-15T18:00:00-05:00", "Arrowhead Stadium"),
  match("F", "fra", "col", 2, 1, "live", "2026-06-16T18:00:00-04:00", "Gillette Stadium", "45+2'"),
  match("F", "ksa", "pan", 1, 1, "complete", "2026-06-15T13:00:00-04:00", "Hard Rock Stadium"),
  match("G", "arg", "por", 2, 2, "complete", "2026-06-16T21:00:00-04:00", "MetLife Stadium"),
  match("G", "civ", "uzb", 3, 0, "complete", "2026-06-16T15:00:00-05:00", "AT&T Stadium"),
  match("H", "esp", "cpv", 2, 0, "complete", "2026-06-15T18:00:00-04:00", "BMO Field"),
  match("H", "uru", "bol", 1, 1, "complete", "2026-06-16T15:00:00-06:00", "Estadio Akron"),
  match("I", "eng", "bel", 1, 0, "live", "2026-06-17T20:00:00-04:00", "Mercedes-Benz Stadium", "38'"),
  match("I", "gha", "tri", 2, 2, "complete", "2026-06-16T19:00:00-04:00", "Lincoln Financial Field"),
  match("J", "ecu", "alg", 2, 1, "complete", "2026-06-17T15:00:00-06:00", "Estadio BBVA"),
  match("J", "aut", "jor", 1, 1, "complete", "2026-06-17T18:00:00-05:00", "Arrowhead Stadium"),
  match("K", "den", "sen", 1, 1, "live", "2026-06-17T20:00:00-04:00", "Hard Rock Stadium", "54'"),
  match("K", "drc", "nor", 0, 2, "complete", "2026-06-16T18:00:00-07:00", "Levi's Stadium"),
  match("L", "cro", "ned", 1, 2, "complete", "2026-06-17T21:00:00-04:00", "MetLife Stadium"),
  match("L", "irl", "kuw", 3, 0, "complete", "2026-06-17T18:00:00-07:00", "Lumen Field")
];

export const groupCodes: GroupCode[] = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function team(
  id: string,
  name: string,
  shortName: string,
  group: GroupCode,
  flag: string,
  colors: [string, string, string],
  confederation: string,
  fifaRank: number,
  bestFinish: string
): Team {
  return {
    id,
    name,
    shortName,
    group,
    flag,
    colors,
    confederation,
    fifaRank,
    profile: { ...profiles, bestFinish, star: `${name} talisman` }
  };
}

function match(
  group: GroupCode,
  homeTeamId: string,
  awayTeamId: string,
  homeScore: number | null,
  awayScore: number | null,
  status: Match["status"],
  kickoff: string,
  venue: string,
  minute?: string
): Match {
  return {
    id: `${group}-${homeTeamId}-${awayTeamId}`,
    group,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    status,
    kickoff,
    venue,
    minute
  };
}
