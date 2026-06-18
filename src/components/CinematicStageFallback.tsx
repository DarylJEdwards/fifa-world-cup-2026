import type { GroupCode, GroupStanding } from "../types";
import StageContent from "./StageContent";

export default function CinematicStageFallback({
  groups,
  selectedGroup,
  onSelectGroup
}: {
  groups: GroupStanding[];
  selectedGroup: GroupCode;
  onSelectGroup: (group: GroupCode) => void;
}) {
  return (
    <section className="stage stage-loading" aria-busy="true">
      <div className="three-layer three-layer-fallback" aria-hidden="true">
        <div className="fallback-pitch" />
      </div>
      <StageContent groups={groups} selectedGroup={selectedGroup} onSelectGroup={onSelectGroup} motionOff />
    </section>
  );
}
