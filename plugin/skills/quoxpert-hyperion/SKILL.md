---
name: quoxpert-hyperion
description: "Operate HYPERION (agent id atlas), Quox's governed Proxmox operator: the disposable VM pool (lease a throwaway VM in seconds, build to order, recycle), quox vm (list, info, start/stop/reboot/shutdown, snapshot, node power), rehearsal twins (rehearse a risky command on an isolated clone first, then approve the real change with proof), Proxmox REST reads, standing-grant lanes, and the gotchas proven live on 2026-10-14. Load when a session needs a VM, wants to move heavy work off dev-01, asks about Proxmox state, or wants to change a real server safely."
argument-hint: "<task, e.g. 'get me a VM', 'reboot dev-02', 'rehearse apt upgrade on X', 'pool status'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    sources:
      - repo: quox-dashboard
        path: services/collector/lib/proxmoxPool.js
      - repo: quox-dashboard
        path: services/collector/lib/proxmoxRehearse.js
      - repo: quox-dashboard
        path: cli/lib/commands/vm.js
---

# HYPERION: governed Proxmox

HYPERION is the registry agent `atlas`. Humans drive it with `quox vm ...`; agents
use its `proxmox_*` tools. Every host command is witnessed and passes the one
governed boundary (standing-grant lane or a human approval).

## Need a VM? (most common)
```
quox vm pool status                                   # lanes, ready VMs, your leases
quox vm pool lease --pubkey-file ~/.ssh/id_ed25519.pub --cores 4 --memory-gb 8 --disk-gb 40 --purpose "what for"
# Fleet cases on a proving VM: run tools/bin/quox-proving-bastion <vm-ip> ON the VM (with the Bastion binary at ~/bastion-bin): a Bastion managing only that VM. Never point a proving VM Bastion at real fleet hosts.
# --ttl-h <n> shortens one lease (1 up to the pool lease_ttl_h, default 24). Built 26553ef89; live only once landed + collector rebuilt.
# 2026-10-16 (z2h-gripes): the installed CLI still has NO --ttl-h ('unknown option'); omit it. And `quox-vmpool lease` (the bash
#   tool) refuses outside the HYPERION session ('pool host ops only work from the HYPERION session'): other sessions use
#   `quox vm pool lease` above, with a DEDICATED keypair (ssh-keygen -f <scratch>/key), never ~/.ssh/id_ed25519.
#   BUT on an agent/service login `quox vm pool lease` 403s "Leasing a pool VM requires a human caller" (by design; do not
#   borrow a human profile). Route that works for agent sessions (proven 2026-10-16, 2c/4G built in ~6 min): join and ask
#   HYPERION, `quox slot join provisioner --session <S>` then `quox slot say provisioner --room --session <S> "<size, purpose,
#   pubkey>"`; read replies with `quox slot read provisioner --since <ts> --json` (the table view truncates the IP), and
#   say "done <vmid>" to destroy. Do not `grep -v <your session>` the reply: HYPERION addresses you by name.
#   201 -> a warm VM now (prints ssh hyp@<ip>); 202 -> building to order, re-run status until 'leased'
quox vm pool done <vmid>                              # destroy it when finished, the pool re-warms
```
- Bring YOUR OWN public key. The VM user is `hyp` with passwordless sudo, Ubuntu 24.04.
- Leases expire (default 24h) and are reaped. Heavy suites/builds belong here, not on dev-01:
  recipe for running a test suite on a pool VM: `~/.quox/vmpool/RUN_TESTS_ON_POOL_VM.md`.
- `quox vm pool ...` is the HUMAN surface (REST, you acting directly = the authorization).
  An AGENT calling `proxmox_pool_lease/release/configure` always files an approval first
  (pinned by `test/proxmoxPoolAgentGate.test.js`): an injected agent must never hand a LAN box
  to an unknown key or destroy someone else's lease.
- Pool config (org admin): `quox vm pool config --set '{"enabled":1,"warm_target":10,"lanes":[{"node":"pve-05","template_vmid":3631,"max":12,"clone_mode":"linked"}],"deny_nodes":["pve-01","pve-04"],"vmid_min":9250,"vmid_max":9299}'`.
  Each lane needs a standing grant on that node:
  `quox approvals grants create --host <node> --preset proxmox-test-vm-lane --template <tpl> --vmid-range 9200-9299 --name-prefix hyp --days 30 --reason "..."`.
  A grant FREEZES its preset's patterns at creation (`patterns_json`). Widening a preset (e.g. the 2026-10-17
  `qm set --tags/--description` lane addition) does NOT reach grants that already exist: a covered-looking command
  still files an owner card. A human admin must re-issue the grant to pick it up. Never test a new preset shape
  against an old grant (2026-10-16: a `qm set --tags` probe filed an owner card).
- New collector code that reads Proxmox over Bastion goes through `runSafeRead('pvesh-read', host, {path}, rawFallback)`
  (as toolExecutors/proxmox.js readJson does), never a direct `await callBastion(`. A direct await trips
  `test/w-callbastion-coverage.test.js` (the shell-injection census) and turns main red. Run that test with any
  proxmox lib change (2026-10-17: the activity view's fallback did exactly this).

## Every worker runs the latest Claude (owner rule, 2026-10-19)
Before any Claude-driven work on a leased VM, a fleet host or a test install, check `claude --version` against `npm view @anthropic-ai/claude-code version`, and update when behind (`npm install -g @anthropic-ai/claude-code@<latest>`, or `claude update` as the same user that runs it, never root inside a collector). Use the latest models (Opus 5.5, Sonnet 5.5): never leave a worker on an older default. The owner found "a ton of workers operating on opus 4.8" on 2026-10-19. The dev collector image pins Claude Code exactly (services/collector/Dockerfile, a supply-chain rule), so on each deploy bump that pin to the latest instead of unpinning it (48b8a83bc took it 2.1.197 to 2.1.303).
- HYPERION worker VMs (.40 .41 .45 .46 .49, 2026-10-19): the in-app auto-update fails there (no write permission to the npm prefix), so use `sudo -n npm i -g @anthropic-ai/claude-code@<latest>`, and set `"model": "opus"` in ~/.claude/settings.json (the alias tracks the newest Opus).
- 🔴 2.1.303+ is a native-binary package that REQUIRES Node >= 22 (2026-10-19, card A, 14 hosts). On Node 18/20 `npm i -g` only warns (EBADENGINE), but the postinstall that places the native binary does not finish, so `/usr/local/bin/claude` vanishes and every new `claude` fails. Fix that worked: `cd <prefix>/lib/node_modules/@anthropic-ai/claude-code && node install.cjs && ln -sfn $PWD/bin/claude.exe <prefix>/bin/claude`. It can take minutes to place the ~285 MB binary, so re-check `claude --version` after about 5 min before calling it failed. ALWAYS update ONE host first, then the group; plan Node 22 on hosts that are behind.
- Restart a worker's Claude by sending `/exit` into its tmux session (the session closes itself), then start it again with `--model opus --continue`. Do not kill tmux sessions on a default socket: the dev-01 tmux guard blocks it, rightly. Press Escape first to dismiss any startup dialog ("Teach auto mode" swallowed an /exit once).
- A worker's `quox -p dev login` is the owner's login. When it expires the owner renews it (`ssh -t -i ~/.quox/vmpool/id_ed25519 hyp@<ip> 'quox -p dev login'`); neither the worker nor HYPERION can.

## Before handing a branch to VULCAN (2026-10-17, after HYPERION turned main red twice)
Run ALL of these in the worktree, and read every "not ok", not just the summary line:
- `node scripts/matrix/test/matrix-drift.mjs` (new CLI leaf => domains.json claim + leaf-policy row, never edit expectations)
- `cd services/collector && npx vitest run test/w-callbastion-coverage.test.js test/quoxCliPolicy.test.js test/quoxonEngineGrounding.test.js` plus the touched area's tests
- `node scripts/guards/check-test-loosening.mjs origin/main HEAD --strict` over the WHOLE branch range: the commit hook only checks the commit being made, and a cherry-pick skips it (2026-10-17: a cherry-picked commit changed an expected literal and VULCAN's land refused it after HYPERION said "clean"). Any CHANGED expected literal counts as a loosening: add a new test case instead of editing an existing one. A revert of a loosening still needs the owner PIN (`quox ask --yn --high-risk --justify`), a Restores: trailer is not a waiver.
- After a land, confirm with `git cherry origin/main <branch>` that EVERY commit landed: three HYPERION branches sat unlanded for a day, incl. the revert of its own loosening.
Then, after deploy: DRIVE the real verb on dev (`quox hyperion --json`, the proof case) before saying "live".
Shape tool output to the question: a read that returns a raw multi-KB dump makes the agent fan out (view=vm returned
39 KB of unsorted VMs; atlas took 200 s and 10 calls; computed top_cpu/top_mem made it one call, 44 s turn).

## This instance (2026-10-14)
- Lanes: pve-05 (tpl 3631, linked), pve-07 (VM 700, NOT a template, so FULL clones, ~4 min), pve-03 (tpl 3630, linked).
- Never pve-01 (hosts hyp-01, the owner's way in) or pve-04 (hosts dev-01). Placement = highest free-RAM
  FRACTION from Prometheus 203.0.113.10:9090 (absolute free RAM starved small idle nodes).
- No warming in the PBS backup window 05:45-08:00 UTC.
- NO Proxmox API token is configured yet: REST reads (`proxmox_cluster_status`, `ha_status`, `node_resources`,
  `vm_resolve`) and rehearsal PLANNING fail with not_configured / plan_unavailable until an owner adds a
  read-only (PVEAuditor) token as a vault Proxmox credential assigned to atlas. Do not mistake the
  monitoring cache (`quox mon config cache proxmox`) for proof the API works: it can be old.

## Changing a real VM
```
quox vm list | info <name>
quox vm start|stop|reboot|shutdown <name|vmid> --reason "why"   # approval-gated
quox vm snapshot <name> [--name pre-x]                           # approval-gated, snapname required
quox vm node <pveNN>                                            # node resources (read); node power is NOT built
quox offload --docker -- <cmd>                                   # worker gets docker + quox-sandbox images (scriptExecutor suites 22/22 live 2026-10-19)
# offload also syncs the repo's .offload-siblings.json checkouts (git-TRACKED files only) to <offload root>/<name>:
# skillrights, claude-root/{skills,metron,precompacticus,quox-devsuite}, quoxagent/deploy. A test reading a sibling
# repo that fails on the worker = add the sibling there, never skip the test. Agent sessions cannot lease a NEW
# (--worker) VM: 403 'requires a human caller'; use the shared worker. Collector full suite on the worker 2026-10-19.
quox vm agents [--node pveNN]                                   # guest-agent coverage of every running VM, one read (84/84 live 2026-10-19, 6 s)
quox vm rehearse <name|vmid> [--check url:http://127.0.0.1:80/|unit:nginx|cmd:"..."] -- <command>
```
Rehearsal twins: ONE approval (the card lists every exact host command + plan hash) mints a 60-minute
grant for exactly those commands on the target and its twin only (max uses, revoked at the end).
The twin is a full clone from a fresh snapshot, booted with every NIC link_down=1 and driven only through
the QEMU guest agent, so it can never clash with the real server. Verdict + diff of failed units/checks
is stored and can be attached to the real change's approval card (`rehearsal_id`).

## Gotchas proven live (each cost time)
- pve-03 has no AES CPU flag: golden template default `x86-64-v2-AES` dies with "QEMU exited with code 1" -> `--cpu host`.
- Clones share `/etc/machine-id` -> DHCP gives every clone the SAME IP. Regenerate machine-id + `ssh-keygen -A` + `netplan apply`.
- The golden image is LVM: growpart alone leaves `/` at 10G; also `pvresize` + `lvextend -r`.
- NEVER retry `qm clone`: a timed-out clone keeps running and the retry fails "config file already exists".
  Full clones run detached (`systemd-run --collect --unit hyp-clone-<id> qm clone ... --full`) and are polled.
- A dead clone task leaves `lock: clone`; clean-up needs `qm unlock <vmid>` (not in the lane preset yet: one approval).
- `qm start` can succeed while the reply times out: check `qm status` before calling it failed.
- A rehearsal runs INSIDE the collector process. A collector roll mid-run orphans it (2026-10-19, RH_634F7C36C018CDF4: roll at 07:13:40, 7 min in). Before asking for a collector roll, check `proxmox_read view=rehearsal` for anything `running`. Tell-tale of an orphan: state `running` with `updated_at` earlier than `docker inspect -f '{{.State.StartedAt}}' quox-collector`. Before 08ddfeb4c boot recovery skipped rows under 45 min old; with it, every orphan is cleaned at the next boot (its exact-scope grant lasts 60 min, after that the snapshot delete needs one approval).
- Agent approval cards (an atlas proposal such as proxmox_rehearse) EXPIRE after 1 h (approvalTtl.js APPROVAL_MAX_AGE_MS, closed by the sweeper). Never file one while the owner is asleep or away: it is dead before they see it (2026-10-19, 01M59HSDM1RGPY42G5F1ZYGM85). Queue it in the handover and file it when they are present. PIN asks (`quox ask`) are different and can stay open for a day.
- Any retried guest-exec write must be idempotent: install a key with `grep -qxF "$K" f || echo "$K" >> f`, never a bare `echo >>` inside a retry loop (2026-10-19: a retry duplicated a key and HYPERION wrongly blamed the template; the build REPLACES authorized_keys, so templates cannot leak keys).
- Post "done: <vmid> destroyed" ONLY after `proxmox_read view=vms` shows the vmid gone; gate the slot post on that check, never chain it after a helper that can fail (2026-10-19: SSH rate limiting failed the stop, the post went out anyway and needed a correction). Retry on `rate limiting` with backoff like `mint failed`.
- Template apt sources are http; pool builds rewrite them to https (7ede7c23d). VMs built before that still have http sources and apt fails where TCP 80 is dropped.
- A new `quox vm` leaf needs a policy class: add it to the OVERRIDE map in scripts/matrix/leaf-policy.mjs and regenerate, never hand-edit docs/matrix/sources/cli-leaf-policy.json (a regeneration silently reverts it; WORKER1 caught this for `vm agents`, 2026-10-19).
- **Rehearsal FIRST PASS 2026-10-20 (RH_E5546075EC7F48D3, 783 s):** on a network-isolated twin `systemd-networkd-wait-online.service` always FAILS (no link), so anything ordered after network-online (docker and its unless-stopped containers) comes up late; a single before-check right after boot saw url 000 and runs 2-3 errored. The baseline is now retried 3x 20 s apart (inside the grant slack), and a twin that never matches ends `not_representative` without running the command. Expect that failed unit in failed_units_before/after; it is the isolation, not your command. `--keep-twin` keeps the stopped twin (delete it yourself afterwards: `qm stop` + `qm destroy <twin> --purge` under the pool grant).
- **Offload worker out of disk (2026-10-20, 9254):** "No space left on device" in rsync or npm = the SHARED worker's 40G disk filled by ~25 sessions each syncing a worktree plus its own node_modules (the 2 h idle prune frees nothing when every dir is recent). Grow it live, no reboot: `qm resize <vmid> scsi0 +80G` on its node (covered by the pool grant), then in the guest `sudo growpart /dev/sda 3; sudo pvresize /dev/sda3; sudo lvextend -r -l +100%FREE /dev/ubuntu-vg/ubuntu-lv`. Worker ssh: `ssh -i ~/.config/quox/offload_ed25519 hyp@<ip>`. Long rm -rf on it must run detached (nohup), a 100 s ssh times out.
- **Offload "npm: command not found" (2026-10-20, fixed f0b464636):** a worker recorded ready with no npm. Cause: setup install steps inside `&&` lists, which `set -e` ignores, so a nodesource run that hit the first-boot dpkg lock still "succeeded"; plus callers on dev01 run node 20 (plain shell) and node 22 (global `quox`) and flipped the shared worker. Diagnose with `ssh -i ~/.config/quox/offload_ed25519 hyp@<ip> 'node --version; command -v npm'` (worker and its setup marker in ~/.config/quox/offload.json); an agent cannot lease a fresh one (`--fresh` needs a human). Lesson for every remote setup script: `set -o pipefail`, `|| exit 1` on each install step, and verify the toolchain before recording success.
- `quox offload` is for credential-free work (suites, builds, `--docker` tests). It is the WRONG shape for proof-engine runs: the worker has no `-p moo` profile (offload never copies secrets, and putting a human JWT on another box is the human-cred hole), `.git` is excluded so `--push` fails, and the chat turn runs in dev01's collector anyway. Run engine cases in parallel from dev01 instead (SEER, 2026-10-19). A Claude worker VM is right for AUTHORING cases against the fake-quox e2e harness (no login needed).
- quox CLI error JSON is `{error:true, message}`: log `.message`, never the literal `true`.
- An attach lease can lapse during an auth stall (quox#895): re-attach `quox agent attach atlas`.
- Slots are single-writer (quox#902): talk to HYPERION on slot `provisioner` only via its holder's listener.
- The local pre-bash build guard blocks ANY Bash command text containing `docker compose up/build`, even over `ssh <pool-vm>` and inside a heredoc (2026-10-17, Z2H-AGENTINST). Do not work around it: plan pool-VM recreates as part of the VM's own setup (e.g. env in the install's .env/compose BEFORE `setup.sh`), or ask the owner.
- pve-03 pool VMs (Xeon X7560, no AVX): Ollama qwen2.5:1.5b runs ~10 prompt tok/s, 3.7 gen tok/s, so a Quox chat turn cannot finish inside the default 150 s QUOX_LOCAL_TURN_BUDGET_MS. Even qwen2.5:0.5b misses it (QUOXON, 2026-10-17). pve-05 is also X7560 (no AVX); only pve-07 (E5-2680 v3, avx2, template 700) can host conversation proofs.

## Gotcha: conversation proofs need the AVX lane (2026-10-17)
- pve-03 and pve-05 are Xeon X7560: no AVX or AES. A local Ollama model (even qwen2.5:0.5b) can't finish a governed chat turn within the 150 s local budget there, and builds are slow.
- Only pve-07 (E5-2680 v3, AVX2, template 700) can run conversation-led proofs on local models. Ask HYPERION for the "AVX lane" when a proof includes a chat check.
- A rebuilt VM at the same IP gets a NEW host key. Drop the old known_hosts entry and accept only the fingerprint HYPERION reads inside the VM.
