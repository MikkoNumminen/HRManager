"use client";

import { Person } from "@/schemas";
import { Avatar, Box, Tooltip, Typography } from "@mui/material";
import { colors } from "@/muiStyles";

type Props = {
  person: Person;
  selected: boolean;
  onSelect: (id: string) => void;
  variant?: "add" | "remove";
};

export function PersonSelectCard({ person, selected, onSelect, variant = "add" }: Props) {
  const { id, name, position, email } = person;
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isRemove = variant === "remove";
  const accentColor = isRemove ? colors.error : colors.green400;
  const accentBg = isRemove ? colors.errorBg : "rgba(74, 222, 128, 0.08)";
  const accentDark = isRemove ? "#7f1d1d" : colors.green900;

  return (
    <Tooltip title={email || "No email"} placement="top" arrow>
      <Box
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={name}
        onClick={() => onSelect(selected ? "" : id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect(selected ? "" : id);
        }}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
          p: 1.5,
          borderRadius: "8px",
          border: `1px solid ${selected ? accentColor : colors.slate700}`,
          backgroundColor: selected ? accentBg : "transparent",
          cursor: "pointer",
          transition: "all 0.15s ease",
          userSelect: "none",
          textAlign: "center",
          outline: "none",
          "&:hover": {
            borderColor: accentColor,
            backgroundColor: selected ? accentBg : colors.hoverOverlay,
          },
          "&:focus-visible": {
            outline: `2px solid ${accentColor}`,
            outlineOffset: "2px",
          },
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            fontSize: "0.8rem",
            fontWeight: 600,
            backgroundColor: selected ? accentDark : colors.slate700,
            color: selected ? accentColor : colors.slate400,
            border: `1px solid ${selected ? accentColor : colors.slate600}`,
          }}
        >
          {initials}
        </Avatar>
        <Box>
          <Typography
            sx={{
              fontSize: { xs: "0.85rem", sm: "0.8rem" },
              fontWeight: selected ? 600 : 400,
              color: selected ? accentColor : colors.slate100,
              lineHeight: 1.3,
            }}
          >
            {name}
          </Typography>
          {position && (
            <Typography
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.7rem" },
                color: colors.slate400,
                lineHeight: 1.2,
              }}
            >
              {position}
            </Typography>
          )}
        </Box>
      </Box>
    </Tooltip>
  );
}
