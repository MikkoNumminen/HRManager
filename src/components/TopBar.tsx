"use client";

import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import { colors } from "@/muiStyles";
import Link from "next/link";

interface TopBarProps {
  title: string;
  backHref?: string;
}

export default function TopBar({ title, backHref }: TopBarProps) {
  return (
    <AppBar
      position="static"
      sx={{ mb: 2, backgroundColor: colors.slate600, borderRadius: "4px", border: `1px solid ${colors.slate300}`, ...(backHref && { ml: "-44px", width: "calc(100% + 44px)" }) }}
      elevation={0}
    >
      <Toolbar sx={backHref ? { pl: "44px" } : {}}>
        {backHref && (
          <Button
            component={Link}
            href={backHref}
            sx={{ color: colors.slate300, mr: 2, minWidth: "auto", px: 1 }}
          >
            ←
          </Button>
        )}
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h6">{title}</Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
