# DNS & Custom Domain Setup

Serving `https://azure-sql-ev.techcloudup.com` on Azure Static Web Apps, with DNS managed in Cloudflare.

## Topology

- **Domain**: `techcloudup.com` (nameservers stay at Cloudflare)
- **Record**: a single CNAME for the subdomain
- **Target**: the Static Web App default hostname

## Steps

### 1. Create the CNAME in Cloudflare

| Field | Value |
| :--- | :--- |
| Type | `CNAME` |
| Name | `azure-sql-ev` |
| Target | `wonderful-rock-0b2a86a0f.3.azurestaticapps.net` |
| Proxy status | **DNS only** (grey cloud) |
| TTL | Auto |

> Keep proxy **disabled** ("DNS only") so Azure can validate the CNAME directly. Proxying (orange cloud) would hide the target from the validation check.

### 2. Register the domain on the Static Web App

```bash
az staticwebapp hostname set \
  -n swa-ev-37851cd1 \
  -g rg-azure-sql-ev \
  --hostname azure-sql-ev.techcloudup.com
```

The domain passes through `RetrievingValidationToken` → `Validating` → `Ready`.

### 3. SSL

Azure provisions a managed certificate automatically once validation succeeds (no action needed). The certificate is issued by DigiCert and auto-renews.

## Notes

- Azure Static Web Apps supports CNAME validation for subdomains out of the box.
- Root-domain (`apex`) validation requires the `dns-txt-token` method with `asuid` TXT records; this project uses a subdomain, so the simpler CNAME path applies.
- Keeping DNS in Cloudflare avoids the $0.50/month Azure DNS zone fee and preserves the project's $0/month target.
