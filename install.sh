#!/usr/bin/env bash
#
# Quoxpert curl installer — fallback distribution channel (plan
# STREAM_QUOXPERT_PLAN.md §6.2 channel B). Copies plugin/skills/* into
# ~/.claude/skills/<skill-id>/ so any Claude Code install picks them up as
# ordinary Agent Skills, without needing the plugin-marketplace flow.
#
# Idempotent: safe to re-run to pick up an updated checkout (overwrites the
# previously-installed copy of each skill, does not touch unrelated skills
# already in ~/.claude/skills/).
#
# This script NEVER asks for or handles a secret. QuoxMCP connection details
# (collector URL, service key) are entered later, directly into the QuoxMCP
# install flow (the .mcpb bundle's own dialog, or your MCP config file) —
# never pasted into this shell or into a chat with Claude. See "Next steps"
# printed at the end.
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/quoxai/quoxpert/main/install.sh | bash
#   # or, from a local checkout:
#   ./install.sh

set -euo pipefail

SKILLS_DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"
REPO_URL="https://github.com/quoxai/quoxpert"
RAW_BASE="https://raw.githubusercontent.com/quoxai/quoxpert/main"

# Sub-skill list (plan §3) — kept as an explicit list rather than discovered
# at curl-time (no directory listing over raw.githubusercontent.com), and
# mirrors plugin/skills/ 1:1 by convention. If this repo checkout is local
# (running ./install.sh from a clone), we instead just walk the directory.
SKILLS=(
  quoxpert
  quoxpert-core
  quoxpert-cli
  quoxpert-mcp
  quoxpert-flow
  quoxpert-bastion
  quoxpert-plugin-sdk
  quoxpert-protocols
  quoxpert-deploy
  quoxpert-qluster
)

log() { printf '%s\n' "$*"; }

main() {
  mkdir -p "$SKILLS_DEST"

  # Detect: are we running from inside a local checkout of this repo (has
  # plugin/skills/ on disk), or piped via curl (need to fetch each file)?
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" && pwd 2>/dev/null || echo '')"

  if [[ -n "$script_dir" && -d "$script_dir/plugin/skills" ]]; then
    log "Quoxpert installer: local checkout detected at $script_dir"
    install_from_local "$script_dir/plugin/skills"
  else
    log "Quoxpert installer: fetching skills from $REPO_URL"
    install_from_remote
  fi

  print_next_steps
}

install_from_local() {
  local src_root="$1"
  local installed=0
  for skill in "${SKILLS[@]}"; do
    local src="$src_root/$skill"
    if [[ ! -f "$src/SKILL.md" ]]; then
      log "  skip $skill (no SKILL.md yet)"
      continue
    fi
    local dest="$SKILLS_DEST/$skill"
    rm -rf "$dest"
    mkdir -p "$dest"
    cp -R "$src/." "$dest/"
    log "  installed $skill -> $dest"
    installed=$((installed + 1))
  done
  log ""
  log "Installed/updated $installed sub-skill(s) into $SKILLS_DEST"
}

install_from_remote() {
  local installed=0
  for skill in "${SKILLS[@]}"; do
    local dest="$SKILLS_DEST/$skill"
    local tmp_file
    tmp_file="$(mktemp)"
    if curl -sSLf "$RAW_BASE/plugin/skills/$skill/SKILL.md" -o "$tmp_file" 2>/dev/null; then
      mkdir -p "$dest"
      mv "$tmp_file" "$dest/SKILL.md"
      log "  installed $skill -> $dest"
      installed=$((installed + 1))
    else
      rm -f "$tmp_file"
      log "  skip $skill (not published yet or fetch failed)"
    fi
  done
  log ""
  log "Installed/updated $installed sub-skill(s) into $SKILLS_DEST"
  log ""
  log "Note: this fallback path only fetches SKILL.md (no references/scripts"
  log "subdirs). For the full artifact, prefer the plugin-marketplace install:"
  log "  /plugin marketplace add quoxai/quoxpert"
  log "  /plugin install quoxpert"
}

print_next_steps() {
  cat <<'EOF'

Quoxpert installed. Restart Claude Code (or reload skills) to pick it up.

Next steps:
  1. Ask Claude: "what is Quoxpert?" — it should route via the root
     quoxpert skill and explain the ecosystem + the four things it is NOT.
  2. If you're operating an existing Quox instance, connect QuoxMCP so
     Claude can wield the 130 fleet-ops tools directly:
       - Recommended: download the .mcpb bundle from
         https://github.com/quoxai/quoxmcp/releases and double-click it.
         Claude Desktop's own install dialog will ask for your collector
         URL and service key — enter them THERE, not in a chat message or
         this shell. quoxpert-mcp's SKILL.md walks through this in detail.
       - CLI/manual install: see quoxmcp/README.md's "Manual install"
         section for the --mcp-config snippet (same rule: put the service
         key in your MCP config file, never in conversation).
  3. No Quox instance yet? Ask Claude: "help me install Quox" — routes to
     quoxpert-deploy for the full-stack quickstart.

EOF
}

main "$@"
