type TeamMemberListProps = {
    teamName: string;
    members: {
        name: string;
        email: string;
    }[];
};
  
  export function TeamMemberList({ teamName, members }: TeamMemberListProps) {
    return (
      <li className="flex gap-1 items-center p-2 py-1">
        <span className="flex flex-col border-t pt-2">
          <span><strong>Team Name:</strong> {teamName}</span>
          <span><strong>Team Members:</strong> {members.map((m) => m.name + ", " )}</span>
        </span>
      </li>
    );
  }
  