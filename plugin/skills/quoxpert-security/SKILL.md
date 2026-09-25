---
name: quoxpert-security
description: "Make any Claude fluent at QUOX-SECURITY, Quox's agentic security testing engagement/scope substrate. Covers the quox engagement CLI (create/list/show/add-target/verify-target/check-policy/scan/scan-async/job/jobs/tools), the risk-tier and environment-tier model, target domain-verification (dns_txt, well_known_file, and quoxagent_install for private-network targets), the async scan job model, and the 4 security testing agents (DRAGO, RECON-Q, PROBE-Q, ATTEST-Q). Load when the user wants to set up a security testing engagement, check what a target is authorized for, or understand why a scan attempt was refused. Honest about maturity: SECURITY_SCAN_HOST (hyp-01) has all 5 binaries installed. 4 of 5 capability tools proven live end to end (resolve_dns, inspect_tls, probe_http, and vuln_scan, which ran a full ~117s nuclei scan on 2026-08-11 after the QuoxBastion 60s-timeout bug was fixed and redeployed). discover_hosts (subfinder) needs a domain-type target to mean anything, none exists yet."
argument-hint: "<task, e.g. 'set up an engagement', 'why was my scan refused', 'add a target'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard
    sources:
      - repo: quox-dashboard
        path: docs/STATUS_AND_LIMITS_SECURITY.md
      - repo: quox-dashboard
        path: services/collector/lib/securityEngagement.js
      - repo: quox-dashboard
        path: services/collector/lib/securityCapabilityTools.js
      - repo: quox-dashboard
        path: cli/lib/commands/engagement.js
    generated_at: 2026-08-09
    quox_version: ">=0.1 pre-1.0"
---

# Quoxpert: QUOX-SECURITY (agentic security testing)

## What this is, honestly, right now

QUOX-SECURITY is Quox's agentic security testing capability: an authorization
substrate (the "engagement"), 4 chat-reachable specialist agents, capability
tools, and findings storage with adversarial verification. It is Phase 1 of a
5-phase build.

**Tool registry as of 2026-08-22: `quox engagement tools` now lists 11
tools, not the original 5.** The five with a proven end-to-end status are the
ones discussed below: `discover_hosts` (subfinder), `probe_http` (httpx),
`vuln_scan` (nuclei), `resolve_dns` (dig), `inspect_tls` (openssl). Six more
are REGISTERED but not yet verified end to end from a session here, so do not
imply they have run: `port_scan` (nmap, safe_active), `ssl_scan` (sslscan),
`fingerprint_web` (whatweb), `fuzz_content` (ffuf, safe_active),
`scan_secrets` (gitleaks), `scan_image` (trivy). Risk tiers: everything is
`discovery` except `vuln_scan`, `port_scan` and `fuzz_content`, which are
`safe_active` — so an engagement whose `risk_ceiling` is `discovery` will
refuse those three at the policy gate. Always read `quox engagement tools`
live rather than trusting this list; it grows.

**The one fact that matters most: 4 of the 5 capability tools now run end
to end for real; only `sectest_discover_hosts` is unproven, and solely
because no domain target exists to point it at.** `sectest_resolve_dns`
(dig), `sectest_inspect_tls` (openssl s_client), `sectest_probe_http`
(httpx), and `sectest_vuln_scan` (nuclei) all complete against a real
verified target. `sectest_vuln_scan` in particular ran a full ~117s
nuclei default-template scan on 2026-08-11 (8 info findings on the
agent-host target) via the async job path (`quox engagement scan-async` /
`job` / `jobs`, `security_scan_jobs` table). It was the last one blocked,
by a QuoxBastion executor bug (a hardcoded 60s command timer independent
of the request's timeout) plus a 30s HTTP `write_timeout`; BOTH are now
fixed and redeployed (canonical `quoxai/quoxbastion` `a71885f`, running
hyp-01 instance at health version `1.0.1-timeoutfix`, `write_timeout`
raised to 600s). See `[[incident_quoxbastion_exec_hardcoded_60s_timeout]]`.
`sectest_discover_hosts` (subfinder) still can't produce a meaningful
result: subdomain enumeration needs a `domain`-type verified target and
none exists yet (no `sectest.quox.ai`-style target). Still: never imply a
scan completed for a tool/target combination not actually proven end to
end. Check `docs/STATUS_AND_LIMITS_SECURITY.md` in `quox-dashboard` for the
current maturity table before promising anything beyond this.

## The model: engagement, target, risk

An **engagement** (`security_engagements` table) is the authorization
container: an org-scoped object with a `name`, an `environment_tier`
(`dev` | `staging` | `production`), and a `risk_ceiling` (the highest capability
risk this engagement permits, one of `passive` < `discovery` < `safe_active` <
`intrusive` < `credential_sensitive` < `exploit_emulation`, in that order).
`production`-tier engagements are hard-capped at `discovery` risk in Phase 1,
no elevation path exists.

A **target** (`security_targets` table) belongs to one engagement: a `type`
(`domain` | `cidr` | `repo` | `cloud_account`) and a `value`. If it declares a
`verification_method` (`dns_txt` | `well_known_file` | `quoxagent_install`), it
starts `unverified` and MUST pass that domain-verification challenge before
any capability may run against it. `dns_txt`/`well_known_file` go through a
real SSRF guard and by design can never verify a private-LAN target.
`quoxagent_install` is the private-network path: proof of control is the
target already being a real, healthy member of the QuoxAgent fleet (checked
against live `/api/v1/agents` data, matched by hostname or IP), not a new
install or config change, use it for any internal host/VM already carrying a
quoxagent sidecar. `signed_attestation` remains declared but not implemented,
attempting it throws an honest error, never a fake pass.

Every capability call is gated by `checkEngagementPolicy`, checked in order:
target is in this engagement's scope -> target is verified -> requested
capability risk is at or under the engagement's `risk_ceiling` -> current time
is inside the engagement's `time_window` (if one is set). Any failure returns
`allowed: false` with a plain-English reason, and NO command is ever built or
sent to a host when denied.

## The `quox engagement` CLI

All commands require `quox login` first (`quoxpert-cli` for auth). org_id is
always derived server-side from the authenticated caller, never something you
pass.

```
quox engagement create <name> --environment-tier <dev|staging|production> [--risk-ceiling <tier>] [--time-window-start <iso>] [--time-window-end <iso>] [--responsible-project <name>]
quox engagement list
quox engagement show <id>
quox engagement add-target <id> <domain|cidr|repo|cloud_account> <value> [--verification-method <dns_txt|well_known_file|quoxagent_install>]
quox engagement verify-target <id> <targetId>
quox engagement check-policy <id> <targetValue> <capabilityRisk>
quox engagement tools
quox engagement scan <id> <target> <discover_hosts|probe_http|vuln_scan>
quox engagement scan-async <id> <target> <tool>
quox engagement job <jobId>
quox engagement jobs <id>
quox engagement report-finding <id> <targetValue> <title> <description> [--severity <info|low|medium|high|critical>]
quox engagement findings <id>
quox engagement verify-finding <findingId> <confirmed|refuted> --reason <text>
quox engagement resolve-finding <findingId>                              # mark a (confirmed) finding remediated; refuses a refuted one
quox engagement discover-ports <id> <hostTarget> [--add]                 # httpx over a curated port set; --add registers each live endpoint as a verified url target
quox engagement report <id>                                             # download the engagement report (targets, tools, findings) as PDF
quox engagement issue <findingId>                                       # raise a finding as a GitHub issue (honest no-op if GitHub unconfigured; skips re-filing)
quox engagement sync-issues <id>                                        # reconcile filed findings vs GitHub issue state (closed issue auto-resolves its finding)
quox engagement propose <findingId>                                     # propose a finding as a QuoxPlan note (default stream QUOX-SECURITY, #438)
quox engagement schedule                                                # recurring scan schedules (re-run a tool on a fixed cadence)
quox engagement set-gripe-target <id> [--repo <owner/name>] [--clear]   # route findings filed from this engagement to a customer repo/token (--clear = platform default quoxai/quox)
```

**Typical flow:**

```
quox engagement create "Q1 dev pentest" --environment-tier dev --risk-ceiling safe_active
# -> ENG_01J... created

quox engagement add-target ENG_01J... domain example.test --verification-method dns_txt
# -> prints: Add a DNS TXT record on example.test: quox-verify=<token>
#    Then run: quox engagement verify-target ENG_01J... TGT_01J...

# (publish the TXT record on the real DNS provider for that domain, then:)
quox engagement verify-target ENG_01J... TGT_01J...
# -> verified, or "challenge did not match yet" if the record isn't live yet

quox engagement check-policy ENG_01J... example.test discovery
# -> Allowed (requiresApproval: false)

quox engagement scan ENG_01J... example.test discover_hosts
# -> if SECURITY_SCAN_HOST is unset: "Failed (allowed: true): Scan host not configured..."
#    if it's set but the tool's binary isn't installed there: "Failed (allowed: true): subfinder: command not found"
#    once both exist: real output (proven live 2026-08-09 for resolve_dns/inspect_tls against hyp-01)
```

**Private-network target, verified for real (2026-08-09 recipe):**

```
quox engagement create "Internal recon" --environment-tier dev --risk-ceiling discovery
quox engagement add-target ENG_01J... cidr 203.0.113.31 --verification-method quoxagent_install
# -> no token to publish anywhere, this method has no manual step

quox engagement verify-target ENG_01J... TGT_01J...
# -> verified if 203.0.113.31 (or the hostname) is a real, listed fleet member;
#    verification_ref reads "fleet:<hostId>" on success

quox engagement scan ENG_01J... 203.0.113.31 inspect_tls
# -> runs for real if SECURITY_SCAN_HOST is set and openssl is on that host;
#    a "Connection refused" IS a valid, honest result (port closed), not a failure

quox engagement report-finding ENG_01J... example.test "Verbose server header" "Server header discloses exact version" --severity low
# -> Finding "FND_01J..." reported (status: candidate)

quox engagement verify-finding FND_01J... confirmed --reason "Reproduced independently with curl -sI"
# -> Finding "FND_01J..." confirmed
```

**Async job for a slow tool (2026-08-11 recipe, e.g. vuln_scan):**

```
quox engagement scan-async ENG_01J... example.test vuln_scan
# -> "vuln_scan started as job JOB_01J... (status: queued)."
#    Returns immediately, does NOT wait for nuclei to finish.

quox engagement job JOB_01J...
# -> poll this; status moves queued -> running -> succeeded/failed.
#    vuln_scan now completes: after the QuoxBastion 60s-timeout fix
#    (2026-08-11) a real nuclei default-template scan runs ~1-2 min and
#    lands as succeeded with real findings. resolve_dns/inspect_tls/
#    probe_http finish in seconds through the same async path.
```

**Reading a refusal correctly** (this is the most common support question):

- `allowed: false` in `check-policy` or `scan` output means the POLICY gate
  refused, before any host was ever contacted. The `reason`/`error` field says
  exactly which check failed (not in scope, not verified, over risk ceiling,
  outside time window).
- `allowed: true` but `success: false` with an error mentioning "scan host not
  configured" means the policy PASSED and `SECURITY_SCAN_HOST` is unset in
  this deployment (still the default on a fresh install).
- `allowed: true` but `success: false` with `command not found` means the
  policy PASSED, a scan host IS configured, but that tool's binary isn't
  installed there (true today for subfinder/httpx/nuclei on `hyp-01`).
  Both are infrastructure gaps, not authorization problems, do not tell the
  user to re-check their engagement scope for either.

## The 4 agents

Chat-reachable, delegatable from `quox` like any core agent (flat hierarchy,
none of them can delegate to each other directly):

| Agent | Role | Real tools today |
|---|---|---|
| `security_lead` (DRAGO) | Manager, owns the engagement, endorses specialist work | full engagement CRUD + `security_check_policy` |
| `recon_specialist` (RECON-Q) | Host/service/domain discovery | `sectest_discover_hosts` (subfinder), `sectest_probe_http` (httpx), `sectest_resolve_dns` (dig) |
| `web_specialist` (PROBE-Q) | Web application testing | `sectest_probe_http` (httpx), `sectest_vuln_scan` (nuclei), `sectest_inspect_tls` (openssl s_client) |
| `findings_verifier` (ATTEST-Q) | Adversarial review, the only agent that can confirm/refute | `security_list_findings`, `security_verify_finding` |

`recon_specialist` and `web_specialist` also hold `security_report_finding`
(candidate only) and `security_list_findings`; `security_lead` holds
`security_list_findings` for oversight. Only `findings_verifier` can move a
finding out of `candidate`, and `security_verify_finding` refuses a bare
verdict with no reason, matching its persona's own adversarial rules.

All 4 will call the real tool rather than describe a capability gap, and will
report the tool's actual return honestly, whether that's "scan host not
configured", "command not found", or a genuine result (including a "no
findings"-shaped result like a closed port, which is real evidence, not a
failure). If an agent claims a scan completed with findings that were never
reported via `security_report_finding`, that's worth flagging as a bug.

## What is NOT live yet (do not promise these)

- Dashboard UI (`/quox-security`, redesigned 2026-08-10): a real console per engagement, tabs for Overview/Targets/Tools/Findings, DRAGO's chat sidebar alongside. The Tools tab has a real **Run** button (streams output into a terminal panel), capability calls are no longer chat/CLI-only. Driven live once via automated browser testing, not yet by a real customer session.
- No agent has actually reported or verified a finding in a live
  conversation yet: `security_findings` is real and tested, but only
  exercised by direct tool-call tests so far, not a real chat turn.
- No CVSS-style scoring: `severity` is one of a fixed plain-text set
  (info/low/medium/high/critical), not a scoring engine.
- Capability registry / multi-provider routing: each tool is a fixed 1:1
  mapping to one provider (discover_hosts is always subfinder), no
  selection/ranking between alternative providers.
- Cloud/Identity packs, dynamic team assembly, cross-org MSSP delegation,
  production authorization ladder, red-team/exploit pack: not started
  (Phases 2-4 of the roadmap).
- Scoped/conditional HITL approvals: an approval, if one is ever triggered,
  is binary for the whole action, "approved for these 3 hosts only" cannot be
  expressed.

## Staying current

This file mixes hand-authored recipes with facts that will drift as phases
ship. If a recipe here disagrees with the live `docs/STATUS_AND_LIMITS_SECURITY.md`
in `quox-dashboard`, trust that file, it is the source of truth per house
convention (README/promo are marketing-adjacent, STATUS_AND_LIMITS is not).
Report the mismatch as a gap in this skill rather than guessing around it.
