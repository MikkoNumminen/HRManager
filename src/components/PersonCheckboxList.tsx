import { PersonSchema } from "@/schemas";
import { checkboxLabel } from "@/tailwindStyles";
import { z } from "zod";

type PersonListProps = z.infer<typeof PersonSchema> & {
  onSelect: (personID: string) => void;
  groupName: string;
  selectedId: string;
};

export function PersonCheckBoxList({
  id,
  name,
  position,
  email,
  onSelect,
  groupName,
  selectedId,
}: PersonListProps) {
  const isSelected = selectedId === id;
  const inputId = `${groupName}-${id}`;

  return (
    <li className="flex gap-1 items-center">
      <input
        id={inputId}
        type="radio"
        name={groupName}
        value={id}
        checked={isSelected}
        className="cursor-pointer peer"
        onChange={() => onSelect(id)}
        onClick={() => { if (isSelected) onSelect(""); }}
      />
      <label
        htmlFor={inputId}
        className={checkboxLabel}
      >
        <strong>Name:</strong> {name} <strong>Position:</strong>{" "}
        {position ?? "N/A"} <strong>Email:</strong>{" "}
        {email || "No email provided"}
      </label>
    </li>
  );
}
