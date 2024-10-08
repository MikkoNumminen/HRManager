import React from "react";

type TeamsCheckBoxListProps = {
  teamId: string;
  teamName: string;
  teamManagerId: string | null;
};

export function ManageTeamsCheckBoxList({
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
      <div>
        <label className="font-bold">Team Name:</label> {teamName}{" "}
        <label className="font-bold">Team Manager:</label> {teamManagerId}
      </div>
    </li>
  );
}
