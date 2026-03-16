import { checkboxLabel } from "@/tailwindStyles";

type TeamsCheckBoxListProps = {
  teamId: string;
  teamName: string;
  managerName: string | null;
};

export function TeamsCheckBoxList({
  teamId,
  teamName,
  managerName,
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
        className={checkboxLabel}
      >
        <strong>Team Name:</strong> {teamName} <strong>Team Manager:</strong>{" "}
        {managerName || "No Manager Assigned"}
      </label>
    </li>
  );
}
