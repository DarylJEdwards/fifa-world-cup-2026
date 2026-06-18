import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CSSProperties } from "react";
import type { GroupCode, GroupStanding } from "../types";

export default function StageContent({
  groups,
  selectedGroup,
  onSelectGroup,
  motionOff
}: {
  groups: GroupStanding[];
  selectedGroup: GroupCode;
  onSelectGroup: (group: GroupCode) => void;
  motionOff: boolean;
}) {
  return (
    <>
      <div className="stage-title">
        <span>12 Groups</span>
        <strong>Live Tournament Orbit</strong>
      </div>
      <div className="group-orbit">
        {groups.map((group, index) => (
          <motion.button
            className={group.code === selectedGroup ? "group-card selected" : "group-card"}
            key={group.code}
            data-group={group.code}
            aria-pressed={group.code === selectedGroup}
            aria-current={group.code === selectedGroup ? "true" : undefined}
            onClick={() => onSelectGroup(group.code)}
            style={{ "--accent": group.rows[0].team.colors[0], "--delay": `${index * 70}ms` } as CSSProperties}
            initial={motionOff ? false : { opacity: 0, y: 28, rotateX: -8 }}
            animate={motionOff ? undefined : { opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: motionOff ? 0 : 0.45, delay: motionOff ? 0 : index * 0.035, ease: [0.16, 1, 0.3, 1] }}
          >
            <GroupCard group={group} />
          </motion.button>
        ))}
      </div>
      <div className="swipe-rail">
        <ChevronLeft size={18} />
        <span>Explore all groups</span>
        <ChevronRight size={18} />
      </div>
    </>
  );
}

function GroupCard({ group }: { group: GroupStanding }) {
  return (
    <>
      <div className="group-card-head">
        <strong>{group.code}</strong>
        <span>PTS</span>
        <span>GD</span>
      </div>
      <div className="group-rows">
        {group.rows.map((row) => (
          <div className="mini-row" key={row.team.id}>
            <span className="mini-rank">{row.rank}</span>
            <span className="flag">{row.team.flag}</span>
            <strong>{row.team.shortName}</strong>
            <span>{row.points}</span>
            <span>{signed(row.goalDifference)}</span>
          </div>
        ))}
      </div>
      <div className="group-badges">
        <span>Q</span>
        <span>R32</span>
        <span>3rd Race</span>
      </div>
    </>
  );
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
