---
name: quoxpert-cli-build
description: "Reference for the `quox` verbs that build and manage what agents can do:
  agents (get/update/activate/slots/tool assignment), assistants
  (create/fork/deploy/publish), the tool catalog, skills (QSKL crystals:
  query/run/review/promote), org plugins, POWERS (MCP endpoints and hosted
  repos), workflows and runs, and the saved prompt library. Load when a task is
  \"give an agent a tool\", \"publish an assistant\", \"install a plugin\",
  \"list my saved prompts\"."
argument-hint: "<task, e.g. 'which flags does X take'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        cmd: "quox <domain> --help (walked recursively by quoxpert-coverage)"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert CLI reference: Agents, tools, skills, plugins and workflows

Command reference generated from the live `quox` help tree. It lists the verbs that no hand-written recipe in the other quoxpert skills teaches yet. For concepts, approval flow and gotchas load `quoxpert-cli` first.

- Usage is `quox <verb> <args>`; `<arg>` is required, `[arg]` is optional, flags are indented under their verb.
- Add `-o json` for machine output (`table`, `json`, `csv`, `quiet`).
- Writes that are destructive or sensitive are held for human approval: report "awaiting approval", never "done".
- Never pass a secret as an argument: use the verb's stdin or file option.
- Regenerate with `quoxpert-coverage --regen-refs`; verify with `quoxpert-coverage` (fails on any stale verb or flag).

<!-- coverage-ref: agent,assistant,tool,skills,plugin,powers,workflow,run,prompt -->

### quox agent

- Manage agents

```
quox agent activate <agentId>   # Activate an agent
quox agent deactivate <agentId>   # Deactivate an agent
quox agent delete <agentId>   # Delete an agent
quox agent get <agentId>   # Get agent details
quox agent grant-attach-all <userId>   # Grant a user permission to attach as ANY agent in the org, present and future (org admin only)
quox agent revoke-attach-all <userId>   # Revoke a user's roster-wide (attach-any) grant (org admin only)
quox agent slot <agentId>   # Show which slot an agent is bound to (the only slot a user-made agent may post to)
quox agent tool assign <agentId>   # Assign a tool to an agent
    --tool <toolId>   # tool ID
    --access-mode <mode>   # access mode (default: "full")
quox agent tool list <agentId>   # List tools assigned to an agent
quox agent tool revoke <agentId>   # Revoke a tool from an agent
    --tool <toolId>   # tool ID
quox agent update <agentId>   # Update an agent
    --name <name>   # new name
    --description <desc>   # new description
    --level <level>   # new level
    --status <status>   # new status
    --prompt <text>   # new instructions (system prompt)
    --prompt-file <path>   # read new instructions from a file
    --domain <domains>   # comma-separated domains
    --parent <parentId>   # parent agent ID
```

### quox assistant

- Manage assistants

```
quox assistant create   # Create an assistant
    --name <name>   # assistant name
    --persona <text>   # persona/system prompt
    --description <desc>   # description
quox assistant delete <assistantId>   # Delete an assistant
quox assistant deploy <assistantId>   # Deploy an active assistant to a scope (scope ids: quox org divisions list, quox department list, quox team list)
    --scope <scopeId>   # scope ID to deploy to (required)
    --target <scopeId>   # alias for --scope
    --mode <mode>   # private, shared, public (default shared)
quox assistant fork <assistantId>   # Fork an assistant
    --name <name>   # name for the fork
quox assistant get <assistantId>   # Get assistant details
quox assistant list   # List assistants
quox assistant publish <assistantId>   # Publish a draft assistant (draft to active), so it can be deployed
quox assistant undeploy <assistantId>   # Remove a deployment of an assistant (by --deployment id, or the active one at --scope)
    --deployment <deploymentId>   # deployment ID to remove (see quox assistant get)
    --scope <scopeId>   # remove the active deployment at this scope
quox assistant update <assistantId>   # Update an assistant
    --name <name>   # new name
    --persona <text>   # new persona
    --description <desc>   # new description
```

### quox tool

- Manage tools and tool catalog

```
quox tool create   # Create a new tool
    --name <name>   # tool name
    --type <type>   # type: mcp, function, api, script, workflow
    --description <desc>   # description
    --risk-level <level>   # risk level: low, medium, high (default: "low")
    --spec <json>   # tool spec as JSON string
quox tool delete <toolId>   # Delete a tool
quox tool get <toolId>   # Get tool details
quox tool install <toolId>   # Install a tool from the catalog
quox tool list   # List tools in the organization
    --type <type>   # filter by type: mcp, function, api, script, workflow
    --status <status>   # filter by status: active, draft
quox tool publish <toolId>   # Publish a tool
quox tool update <toolId>   # Update a tool
    --name <name>   # new name
    --description <desc>   # new description
    --status <status>   # new status
```

### quox skills

- Manage the quoxflow skill library (QSKL Crystals): query, run, review, promote, and your saved library

```
quox skills disclosures   # Org rights disclosure ledger: distributions + protections under declared rights, policy in force, evidence counts
quox skills library add   # Save a workflow definition to your library
    --name <name>   # entry name
    --definition <json>   # workflow definition, as a JSON object string
    --file <path>   # read the workflow definition from a JSON file
    --description <text>   # description
    --source <source>   # curated|n8n-imported|mine (default: "mine")
    --source-workflow-id <id>   # originating workflow ID
    --tags <tags>   # comma-separated tags
quox skills library list   # List your saved library entries
    --source <source>   # filter by source: curated|n8n-imported|mine
quox skills library remove <id>   # Remove a saved library entry
    --force   # skip confirmation
quox skills promote-draft <executionId>   # Promote an in-flight task-time draft Crystal to the skill library (requires tier_b)
    --tier <tier>   # org tier: tier_a|tier_b (tier_b required to promote) (default:
quox skills protect [dir]   # Sign a skill with the org identity, register it in the open SkillRights registry, and keep the receipt in the org evidence chain
    --public   # list the skill publicly (sends name/description to the
    --supersedes <sha256>   # claimed earlier version this replaces
    --repository <url>   # repository URL (public mode only)
quox skills protections   # List this org's protected skills (SRID, licence, org key, evidence envelope)
quox skills review approve <qid>   # Approve a review queue item
    --comment <text>   # optional reviewer comment
quox skills review list   # List review queue items (default: pending)
    --status <status>   # pending|approved|rejected (default: "pending")
quox skills review reject <qid>   # Reject a review queue item
    --comment <text>   # optional reviewer comment
quox skills review show <qid>   # Show a review queue item (with skill snapshot + latest firewall log)
quox skills rollback-to-version <sourceWorkflowId> <targetVersion>   # Roll a skill back to a prior version (writes a NEW version copying the target's content)
quox skills sealed add <path>   # Seal a local skill: its content is uploaded once, executed on org infrastructure thereafter, and never returned to a caller
    --name <name>   # sealed skill name
    --description <text>   # description
    --contract <file>   # JSON file describing the expected input contract
quox skills sealed invoke <sealedId>   # Invoke a sealed skill: the model gets only the output, never the methodology text.
    --input <text>   # input text
    --input-file <path>   # read the input from a file (overrides --input)
quox skills sealed list   # List sealed skill manifests for this org (manifest only, never the sealed content)
quox skills sealed show <sealedId>   # Show a sealed skill's manifest (name, description, input contract, content hash).
```

### quox plugin

- Manage org-installed plugins

```
quox plugin assign add <pluginId>   # Assign a plugin to all org members, a user, or a team
    --type <assigneeType>   # all_org_members|user|team
    --id <assigneeId>   # assignee ID (user or team ID; omit for all_org_members)
quox plugin assign list <pluginId>   # List assignments for a plugin
quox plugin assign remove <pluginId> <assigneeType> [assigneeId]   # Remove a plugin assignment
quox plugin data delete <pluginId> <key>   # Delete a plugin data value
    --scope <scope>   # org|user (default: "org")
quox plugin data get <pluginId> <key>   # Get a plugin data value
    --scope <scope>   # org|user (default: "org")
quox plugin data list <pluginId>   # List data keys for a plugin
    --scope <scope>   # org|user (default: "org")
quox plugin data set <pluginId> <key>   # Set a plugin data value
    --value <value>   # value to store (JSON is parsed automatically; otherwise
    --scope <scope>   # org|user (default: "org")
quox plugin enable <pluginId>   # Start a licensed plugin from its prebuilt image on this self-hosted install (QuoxPlan for now).
    --dir <path>   # the install directory (default: the one Getting started
quox plugin get <pluginId>   # Show plugin install details
quox plugin revocations add   # Revoke a signer key or a bundle digest
    --signer-key <hex>   # raw Ed25519 public key (64 hex), as in signature.json
    --bundle-digest <hex>   # sha256 of plugin.esm.js (64 hex), as shown by quox
    --reason <text>   # why (kept in the audit trail)
quox plugin revocations list   # List revocations
quox plugin revocations remove <revocationId>   # Lift a revocation
quox plugin secrets delete <pluginId> <name>   # Delete a plugin secret (admin only)
quox plugin secrets list <pluginId>   # List secret metadata for a plugin (no plaintext)
quox plugin secrets reveal <pluginId> <name>   # Reveal a plugin secret's plaintext value (audited)
quox plugin trusted-keys remove <keyId>   # Remove a trusted signing key
    --confirm-unsigned   # WARNING: required to remove the LAST trusted key; the org
quox plugin uninstall <pluginId>   # Uninstall a plugin (admin only)
    --force   # skip confirmation
quox plugin update <pluginId>   # Upgrade a plugin bundle and/or toggle its enabled state (admin only)
    --enable   # enable the plugin
    --disable   # disable the plugin
    --manifest <file>   # path to a new manifest JSON file (required together with
    --bundle <file>   # path to a new bundle JS file (required together with
    --css <file>   # path to a new CSS file
    --signature <file>   # path to a new signature JSON file
```

### quox powers

- Deploy and manage POWERS (MCP endpoint / hosted-repo tools)

```
quox powers config <toolDefId>   # Update env vars and/or agent persona for a hosted-repo power without rebuilding
    --env <key=value>   # env var to set/rotate (repeatable) (default:
    --name <name>   # new agent display name
    --description <text>   # new agent description
    --icon <icon>   # new agent icon
    --system-prompt-additions <text>   # new system prompt additions
quox powers restore <toolDefId>   # Restore a previously archived hosted-repo power
```

### quox workflow

- Manage workflows

```
quox workflow delete <workflowId>   # Delete a workflow
quox workflow schedule <workflowId>   # Show whether a workflow's schedule trigger is registered with the live scheduler, and its next fire time
quox workflow steps list <workflowId>   # List steps of a workflow
quox workflow steps set <workflowId>   # Set workflow steps (replaces all)
    --steps <json>   # steps as JSON array
quox workflow update <workflowId>   # Update a workflow
    --name <name>   # new name
    --description <desc>   # new description
    --status <status>   # new status
```

### quox run

- Manage workflow runs

```
quox run create   # Start a new workflow run
    --workflow <id>   # workflow ID
    --input <json>   # input data as JSON
    --wait   # engine workflows: wait for the run to finish (up to 10
```

### quox prompt

- Manage the user-owned prompts library

```
quox prompt create   # Create a prompt
    --name <name>   # prompt name
    --content <text>   # prompt body text
    --file <path>   # read prompt body from a file (overrides --content)
    --description <text>   # description
    --tags <tags>   # comma-separated tags
    --category <category>   # category
    --visibility <vis>   # private|org (default: "private")
quox prompt delete <id>   # Delete a prompt (soft-delete)
    --force   # skip confirmation
quox prompt export   # Export all of the caller's prompts as JSON
quox prompt get <id>   # Show prompt details
quox prompt import <file>   # Bulk-import prompts from a JSON file (as produced by )
quox prompt list   # List prompts (own + org-visible)
    --search <text>   # substring search on name/body
    --tags <tags>   # comma-separated tag filter (match any)
quox prompt restore <id> <version>   # Restore a prompt to a previous version
quox prompt update <id>   # Update a prompt (bumps version)
    --name <name>   # new name
    --content <text>   # new body text
    --file <path>   # read new body from a file (overrides --content)
    --description <text>   # new description
    --tags <tags>   # new tags (comma-separated)
    --category <category>   # new category
    --visibility <vis>   # private|org
quox prompt versions <id>   # Show version history for a prompt
```

<!-- /coverage-ref -->
