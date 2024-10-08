import { PersonSchema } from "@/schemas";
import { z } from "zod";

type PersonListProps = z.infer<typeof PersonSchema> & {
  onSelect: (personID: string) => void; // Pass the onSelect handler prop
};

export function PersonCheckBoxList({
  id,
  name,
  position,
  email,
  onSelect,
}: PersonListProps) {
  return (
    <li className="flex gap-1 items-center">
      <input
        id={id}
        type="radio"
        name="personID"
        value={id}
        className="cursor-pointer peer"
        onChange={() => onSelect(id)}
      />
      <label
        htmlFor={id}
        className="cursor-pointer peer-checked:line-through peer-checked:text-slate-400"
      >
        <strong>Name:</strong> {name} <strong>Position:</strong>{" "}
        {position ?? "N/A"} <strong>Email:</strong>{" "}
        {email || "No email provided"}
      </label>
    </li>
  );
}
