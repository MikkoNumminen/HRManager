type TeamsCheckBoxListProps = {
  teamId: string;
  teamName: string;
  teamManagerId: string | null;
};

export function TeamsCheckBoxList({
  teamId,
  teamName,
  teamManagerId,
}: TeamsCheckBoxListProps) {
  return (
    <li className="flex gap-1 items-center">
      <input
        id={teamId}
        type="radio"
        name="teamID"
        value={teamId}
        className="cursor-pointer peer"
      />
      <label
        htmlFor={teamId}
        className="cursor-pointer peer-checked:line-through peer-checked:text-slate-400"
      >
        <strong>Team Name:</strong> {teamName} <strong>Team Manager:</strong>
        {teamManagerId}
        {teamManagerId}
      </label>
    </li>
  );
}
