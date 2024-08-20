type PersonListProps = {
  id: string;
  name: string;
  position: string;
  email: string;
};

export function RemovePersonCheckBoxList({
  id,
  name,
  position,
  email,
}: PersonListProps) {
  return (
    <li className="flex gap-1 items-center">
      <input
        id={id}
        type="radio"
        name="personID"
        value={id}
        className="cursor-pointer peer"
      />
      <label
        htmlFor={id}
        className="cursor-pointer peer-checked:line-through peer-checked:text-slate-400"
      >
        <strong>Name:</strong> {name} <strong>Position:</strong> {position}{" "}
        <strong>Email:</strong> {(email = "")}
      </label>
    </li>
  );
}
