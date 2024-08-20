type TeamsListProps = {
    teamId: string;
    teamName: string;
    teamManagerId: string;
  };
  
  export function TeamsList({ teamName, teamManagerId }: TeamsListProps) {
    return (
      <li className="flex gap-1 items-center p-2 py-1">
        <span className="flex flex-col border-t pt-2">
          <span><strong>Team Name:</strong> {teamName}</span>
          <span><strong>Team Manager:</strong> {teamManagerId}</span>
        </span>
      </li>
    );
  }
  