# HRManager — Kubernetes Deployment Guide

This directory contains production-grade Kubernetes manifests and a Helm chart for deploying HRManager.

## Directory structure

```
k8s/
├── manifests/          # Raw Kubernetes YAML manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   └── pdb.yaml
└── helm/
    └── hrmanager/      # Helm chart
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
            ├── _helpers.tpl
            ├── configmap.yaml
            ├── secret.yaml
            ├── deployment.yaml
            ├── service.yaml
            ├── ingress.yaml
            ├── hpa.yaml
            ├── pdb.yaml
            └── NOTES.txt
```

## Prerequisites

- **kubectl** ≥ 1.28 configured against your cluster
- **Helm** ≥ 3.12 (for Helm-based deployment)
- **ingress-nginx** controller installed in the cluster
- **cert-manager** (optional but recommended for automatic TLS via Let's Encrypt)

### Install ingress-nginx

```bash
helm upgrade --install ingress-nginx ingress-nginx \
  --repo https://kubernetes.github.io/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

### Install cert-manager

```bash
helm upgrade --install cert-manager cert-manager \
  --repo https://charts.jetstack.io \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true
```

---

## Option A — Raw Kubernetes manifests

### 1. Set your secrets

Edit `k8s/manifests/secret.yaml` and replace every placeholder base64 value:

```bash
# Generate base64-encoded values
echo -n 'postgresql://user:pass@host:5432/hrmanager' | base64
echo -n 'your-nextauth-secret-min-32-chars'          | base64
echo -n 'your-google-client-id'                       | base64
# … etc.
```

Paste the output into the corresponding field in `secret.yaml`.

> **Never commit real secrets to git.** Use a secrets manager (Vault, AWS Secrets Manager, Sealed Secrets) in production.

### 2. Update the ConfigMap

Edit `k8s/manifests/configmap.yaml` and set `AUTH_URL` to your actual domain.

### 3. Set your container image

Edit `k8s/manifests/deployment.yaml` and replace:

```yaml
image: ghcr.io/your-org/hrmanager:latest
```

with your actual image reference.

### 4. Deploy

```bash
# Apply in dependency order
kubectl apply -f k8s/manifests/namespace.yaml
kubectl apply -f k8s/manifests/configmap.yaml
kubectl apply -f k8s/manifests/secret.yaml
kubectl apply -f k8s/manifests/deployment.yaml
kubectl apply -f k8s/manifests/service.yaml
kubectl apply -f k8s/manifests/ingress.yaml
kubectl apply -f k8s/manifests/hpa.yaml
kubectl apply -f k8s/manifests/pdb.yaml

# Or apply the whole directory at once (namespace must already exist)
kubectl apply -f k8s/manifests/
```

### 5. Verify

```bash
kubectl rollout status deployment/hrmanager-app -n hrmanager
kubectl get pods -n hrmanager
curl https://hrmanager.example.com/api/health
```

### Upgrade (raw manifests)

Edit the relevant file and re-apply:

```bash
kubectl apply -f k8s/manifests/deployment.yaml
kubectl rollout status deployment/hrmanager-app -n hrmanager
```

### Rollback (raw manifests)

```bash
kubectl rollout undo deployment/hrmanager-app -n hrmanager
kubectl rollout status deployment/hrmanager-app -n hrmanager
```

---

## Option B — Helm chart

### 1. Prepare a secrets values file

Create a file **outside** your git repository (e.g., `~/hrmanager-secrets.yaml`):

```yaml
secrets:
  data:
    DATABASE_URL: "postgresql://user:pass@host:5432/hrmanager"
    # Auth.js v5 reads AUTH_SECRET — the legacy NEXTAUTH_SECRET is not read.
    AUTH_SECRET: "your-auth-secret-min-32-chars"
    # Both fail closed in production; generate with: openssl rand -base64 32
    AUDIT_HMAC_SECRET: "your-audit-hmac-secret"
    TOTP_ENCRYPTION_KEY: "your-totp-encryption-key"
    AUTH_GOOGLE_ID: "your-google-client-id"
    AUTH_GOOGLE_SECRET: "your-google-client-secret"
    AUTH_GITHUB_ID: "your-github-client-id"
    AUTH_GITHUB_SECRET: "your-github-client-secret"
    # The app reads MONGODB_URL — with any other name the audit trail no-ops.
    MONGODB_URL: "mongodb://user:pass@host:27017/hrmanager_audit"

config:
  AUTH_URL: "https://your-domain.com"

ingress:
  host: your-domain.com

image:
  repository: ghcr.io/your-org/hrmanager
  tag: "1.2.3"
```

### 2. Install

```bash
helm upgrade --install hrmanager k8s/helm/hrmanager \
  --namespace hrmanager \
  --create-namespace \
  --values ~/hrmanager-secrets.yaml
```

### 3. Verify

```bash
helm status hrmanager -n hrmanager
kubectl rollout status deployment/hrmanager-hrmanager-app -n hrmanager
curl https://your-domain.com/api/health
```

### Upgrade (Helm)

```bash
helm upgrade hrmanager k8s/helm/hrmanager \
  --namespace hrmanager \
  --reuse-values \
  --values ~/hrmanager-secrets.yaml
```

To deploy a new image tag:

```bash
helm upgrade hrmanager k8s/helm/hrmanager \
  --namespace hrmanager \
  --reuse-values \
  --set image.tag=1.2.4
```

### Rollback (Helm)

```bash
# List release history
helm history hrmanager -n hrmanager

# Rollback to the previous release
helm rollback hrmanager 0 -n hrmanager

# Rollback to a specific revision number
helm rollback hrmanager 2 -n hrmanager
```

---

## Using an external secret manager

For production, avoid storing secrets in Helm values files. Use one of:

- **Sealed Secrets** (Bitnami) — encrypt secrets in git
- **External Secrets Operator** — sync from AWS Secrets Manager / GCP Secret Manager / Vault
- **HashiCorp Vault Agent Injector** — inject secrets as environment variables at pod startup

When using an external secret manager, set `secrets.existingSecret` in your Helm values to the name of the pre-created Kubernetes Secret and leave `secrets.data` empty:

```yaml
secrets:
  existingSecret: "hrmanager-external-secret"
```

---

## Scheduled work

Background maintenance runs through the CRON_SECRET-gated `/api/cron/*` routes,
mirroring the Vercel deployment's `vercel.json` crons:

- **Raw manifests** — `cronjob.yaml` ships two CronJobs (audit-outbox drain at
  03:00, pg-boss job drain at 03:30). They read `CRON_SECRET` from
  `hrmanager-secret`, so set that key before applying.
- **Helm** — disabled by default. Set `secrets.data.CRON_SECRET`, then deploy
  with `--set cron.enabled=true` (schedules and paths under `cron.jobs`).

## Architecture notes

| Resource   | Details                                                               |
| ---------- | --------------------------------------------------------------------- |
| Deployment | 2 replicas min, rolling update (maxUnavailable: 0)                    |
| HPA        | 2–10 replicas, CPU 70% / Memory 80% targets                           |
| PDB        | minAvailable: 1 — ensures zero-downtime node drains                   |
| Probes     | `/api/health` — liveness (30s delay), readiness (10s delay)           |
| Security   | Non-root user (UID 1001), all capabilities dropped                    |
| Topology   | Pods spread across nodes via topologySpreadConstraints                |
| Ingress    | NGINX with TLS redirect, rate limiting (100 rps/IP), security headers |
