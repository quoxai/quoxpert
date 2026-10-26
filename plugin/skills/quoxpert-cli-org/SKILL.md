---
name: quoxpert-cli-org
description: "Reference for the `quox` verbs that manage an organization: orgs, teams,
  departments, custom roles (RBAC), SSO (OIDC/SAML), SCIM tokens, domain
  verification, org security policy (session, IP allowlist, MFA), your own
  account and MFA, invitations, webhook subscribers, data-processing consent and
  notification settings. Load when a task is \"add someone to a team\", \"create
  a role\", \"set up SSO\", \"verify a domain\", \"restrict logins by IP\"."
argument-hint: "<task, e.g. 'which flags does X take'>"
metadata:
  quoxpert:
    source_repo: quox-dashboard (cli/)
    sources:
      - repo: quox-dashboard
        cmd: "quox <domain> --help (walked recursively by quoxpert-coverage)"
license: LicenseRef-SkillRights-Reserved-1.0
---

# Quoxpert CLI reference: Org, identity and access

Command reference generated from the live `quox` help tree. It lists the verbs that no hand-written recipe in the other quoxpert skills teaches yet. For concepts, approval flow and gotchas load `quoxpert-cli` first.

- Usage is `quox <verb> <args>`; `<arg>` is required, `[arg]` is optional, flags are indented under their verb.
- Add `-o json` for machine output (`table`, `json`, `csv`, `quiet`).
- Writes that are destructive or sensitive are held for human approval: report "awaiting approval", never "done".
- Never pass a secret as an argument: use the verb's stdin or file option.
- Regenerate with `quoxpert-coverage --regen-refs`; verify with `quoxpert-coverage` (fails on any stale verb or flag).

<!-- coverage-ref: org,team,department,role,sso,scim,domain,security,mfa,account,invites,webhook,consent,notification,scope -->

### quox org

- Manage organizations

```
quox org audit   # View organization audit log
    --action <action>   # filter by action type
    --limit <n>   # max results (default: "50")
quox org delete <orgId>   # Delete an organization
quox org divisions create   # Create a division
    --name <name>   # division name
    --description <desc>   # description
quox org divisions delete <divId>   # Delete a division
quox org divisions list   # List divisions
quox org divisions update <divId>   # Update a division
    --name <name>   # new name
    --description <desc>   # new description
quox org get <orgId>   # Get organization details
quox org members add   # Invite a member to the organization
    --email <email>   # email to invite
    --role <role>
quox org members list   # List organization members
quox org members remove <userId>   # Remove a member from the organization
quox org members update <userId>   # Update a member role
    --role <role>   # new role
quox org update <orgId>   # Update an organization
    --name <name>   # new name
    --description <desc>   # new description
```

### quox team

- Manage teams

```
quox team create   # Create a team
    --name <name>   # team name
    --division <divId>   # division ID
    --department <deptId>   # department ID
    --description <desc>   # description
quox team delete <teamId>   # Delete a team
quox team get <teamId>   # Get team details
quox team list   # List teams
    --division <divId>   # filter by division
quox team members add <teamId>   # Add a member to a team
    --user <userId>   # user ID
    --role <role>   # team role (default: "member")
quox team members remove <teamId>   # Remove a member from a team
    --user <userId>   # user ID
quox team provision-room <teamId>   # Provision (or adopt) the governed Matrix room for a team
quox team update <teamId>   # Update a team
    --name <name>   # new name
    --description <desc>   # new description
```

### quox department

- Manage departments within divisions

```
quox department create   # Create a department
    --division <divId>   # division ID
    --name <name>   # department name
    --description <desc>   # description
quox department delete <deptId>   # Delete a department
    --division <divId>   # division ID
quox department list   # List departments (all divisions unless --division; division ids: quox org divisions list)
    --division <divId>   # only this division
quox department update <deptId>   # Update a department
    --division <divId>   # division ID
    --name <name>   # new name
    --description <desc>   # new description
```

### quox role

- Manage org custom roles (enterprise — RBAC)

```
quox role agent clear <roleId> <agentId>   # Remove an agent access rule from a role
    --scope-id <scopeId>   # scope ID (must match the rule's scope)
quox role agent list <roleId>   # List agent access rules for a role
quox role agent set <roleId> <agentId>   # Set (allow or deny) a role's access to an agent
    --allowed <bool>   # true|false
    --scope-id <scopeId>   # restrict the rule to a specific scope
quox role capability add <roleId> <capability>   # Grant a capability to a role
    --scope-id <scopeId>   # restrict the grant to a specific scope
quox role capability remove <roleId> <capability>   # Revoke a capability from a role
    --scope-id <scopeId>   # scope ID (must match the grant's scope)
quox role create   # Create a custom role
    --slug <slug>   # unique role slug
    --name <name>   # role name
    --description <text>   # role description
quox role delete <roleId>   # Delete a custom role
    --force   # skip confirmation
quox role get <roleId>   # Show a custom role and its granted capabilities
quox role list   # List custom roles for the active org
quox role tool clear <roleId> <toolId>   # Remove a tool access rule from a role
quox role tool list <roleId>   # List tool access rules for a role
quox role tool set <roleId> <toolId>   # Set (allow or deny) a role's access to a tool
    --allowed <bool>   # true|false
```

### quox sso

- Manage org SSO providers (enterprise — OIDC/SAML admin)

```
quox sso providers create   # Create an SSO provider
    --key <providerKey>   # unique provider key (e.g. "okta",
    --protocol <protocol>   # oidc|saml (create defaults to oidc)
    --display-name <name>   # human-readable name
    --enabled   # enable the provider
    --disabled   # disable the provider
    --sso-only   # require SSO for matching email domains (disable
    --email-domains <domains>   # comma-separated email domains routed to this
    --issuer <url>   # [oidc] issuer URL
    --client-id <id>   # [oidc] client ID
    --client-secret <secret>   # [oidc] client secret
    --authz-url <url>   # [oidc] authorization endpoint (optional, discovered
    --token-url <url>   # [oidc] token endpoint
    --userinfo-url <url>   # [oidc] userinfo endpoint
    --jwks-uri <url>   # [oidc] JWKS URI
    --scopes <scopes>   # [oidc] comma-separated scopes (default:
    --entity-id <id>   # [saml] IdP entity ID
    --sso-url <url>   # [saml] IdP SSO URL
    --slo-url <url>   # [saml] IdP SLO URL
    --x509-cert-file <path>   # [saml] path to the IdP's PEM-encoded x509
    --nameid-format <format>   # [saml] NameID format
    --attribute-map <json>   # [saml] attribute mapping as a JSON object
    --group-role-map <json>   # [saml] group-to-role mapping as a JSON object
quox sso providers delete <providerId>   # Delete an SSO provider
    --force   # skip confirmation
quox sso providers get <providerId>   # Show SSO provider details
quox sso providers list   # List SSO providers for the active org
quox sso providers saml-metadata <providerId>   # Fetch the SP metadata XML for a SAML provider (paste into your IdP)
quox sso providers update <providerId>   # Update an SSO provider
    --protocol <protocol>   # oidc|saml (create defaults to oidc)
    --display-name <name>   # human-readable name
    --enabled   # enable the provider
    --disabled   # disable the provider
    --sso-only   # require SSO for matching email domains (disable
    --email-domains <domains>   # comma-separated email domains routed to this
    --issuer <url>   # [oidc] issuer URL
    --client-id <id>   # [oidc] client ID
    --client-secret <secret>   # [oidc] client secret
    --authz-url <url>   # [oidc] authorization endpoint (optional, discovered
    --token-url <url>   # [oidc] token endpoint
    --userinfo-url <url>   # [oidc] userinfo endpoint
    --jwks-uri <url>   # [oidc] JWKS URI
    --scopes <scopes>   # [oidc] comma-separated scopes (default:
    --entity-id <id>   # [saml] IdP entity ID
    --sso-url <url>   # [saml] IdP SSO URL
    --slo-url <url>   # [saml] IdP SLO URL
    --x509-cert-file <path>   # [saml] path to the IdP's PEM-encoded x509
    --nameid-format <format>   # [saml] NameID format
    --attribute-map <json>   # [saml] attribute mapping as a JSON object
    --group-role-map <json>   # [saml] group-to-role mapping as a JSON object
```

### quox scim

- Manage org SCIM bearer tokens (enterprise — IdP directory sync)

```
quox scim tokens create   # Create a SCIM bearer token
    --label <label>   # human-readable label
quox scim tokens delete <tokenId>   # Revoke a SCIM token
quox scim tokens list   # List SCIM tokens for the active org
```

### quox domain

- Manage org domain verification (team+ — DNS ownership proof)

```
quox domain add <domain>   # Claim a domain and get its DNS verification instructions
quox domain list   # List domains claimed by the active org
quox domain remove <domainId>   # Remove a claimed domain
    --force   # skip confirmation
quox domain verify <domainId>   # Re-check DNS for a claimed domain
```

### quox security

- Manage org security policy (enterprise — session, IP allowlist, MFA)

```
quox security ip-allowlist add <cidr>   # Add an IP allowlist entry
    --label <label>   # human-readable label
quox security ip-allowlist list   # List IP allowlist entries
quox security ip-allowlist remove <entryId>   # Remove an IP allowlist entry
quox security mfa get   # Show the active org MFA policy mode
quox security mfa set <mode>   # Set the org-wide MFA policy mode
quox security session-policy get   # Show the active session policy
quox security session-policy set   # Update the session policy (0 = disabled for that dimension)
    --idle-timeout-sec <n>   # idle timeout in seconds
    --max-session-sec <n>   # max session lifetime in seconds
    --remember-me <bool>   # true|false — allow "remember me" opt-in
```

### quox mfa

- Manage multi-factor authentication

```
quox mfa backup-codes   # View MFA backup codes
quox mfa disable   # Disable MFA for your account
    --code <code>   # TOTP code to confirm
quox mfa setup   # Enable MFA for your account
quox mfa verify   # Verify MFA setup with a code
    --code <code>   # TOTP verification code
```

### quox account

- Your own account (password, session)

```
quox account password   # Change your password
    --current <password>   # current password (WARNING: visible in argv/shell history
    --new <password>   # new password (same warning)
```

### quox invites

- Your pending organization invitations

```
quox invites accept <id>   # Accept a pending invitation by id (no emailed token needed)
quox invites list   # List pending invitations addressed to your verified email
```

### quox webhook

- Manage org webhook subscribers (enterprise — team_event fan-out)

```
quox webhook create   # Create an org webhook subscription
    --url <url>   # https:// endpoint to receive events
    --events <events>   # comma-separated team_event types (e.g.
quox webhook delete <id>   # Delete an org webhook subscription
    --force   # skip confirmation
quox webhook list   # List org webhook subscriptions
quox webhook rotate <id>   # Rotate a webhook's signing secret
```

### quox consent

- Manage data processing consent

```
quox consent grant   # Grant consent for a provider
    --provider <provider>   # provider name
quox consent history   # View consent change history
quox consent list   # List consent records
```

### quox notification

- Manage notification settings

```
quox notification channels list   # List notification channels
quox notification channels set   # Configure a notification channel
    --type <type>   # Channel type (email|slack|telegram|...)
    --enable   # Enable channel
    --disable   # Disable channel
    --destination <dest>   # Channel destination (email, webhook URL, chat ID)
```

### quox scope

- View scopes (read-only — use // to manage)

```
quox scope list   # List scopes
```

<!-- /coverage-ref -->
