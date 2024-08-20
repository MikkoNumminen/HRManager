type PersonListProps = {
  id: string;
  name: string;
  position: string;
  email: string;
};

export function PersonList({ name, position, email }: PersonListProps) {
  return (
    <li className="flex gap-1 items-center p-2 py-1">
      <span className="flex flex-col border-t pt-2">
        <span><strong>Name:</strong> {name}</span>
        <span><strong>Position:</strong> {position}</span>
        <span><strong>Email:</strong> {email}</span>
      </span>
    </li>
  );
}
