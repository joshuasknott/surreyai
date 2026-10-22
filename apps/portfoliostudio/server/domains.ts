import type { Store } from "./store";
import { base64url, randomBytes } from "./security";

export type DomainStatus = "pending" | "active" | "error";

export type DomainConfig = {
  accountId?: string;
  projectName?: string;
  projectSubdomain?: string;
  apiToken?: string;
  fetcher?: typeof fetch;
};

export type DnsProof = {
  txtName: string;
  txtVerified: boolean;
  cnameVerified: boolean;
  checkedAt: string;
};

export type ManagedDomain = {
  version: 1;
  domain: string;
  ownerId: string;
  projectId: string;
  status: DomainStatus;
  verificationToken: string;
  dns: DnsProof;
  providerDomainId: string | null;
  providerStatus: string | null;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
};

export type PagesDomain = {
  id: string;
  name: string;
  status: string;
  validationStatus: string | null;
  verificationStatus: string | null;
  txtName: string | null;
  txtValue: string | null;
};

export class DomainError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 502 | 503,
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

type DnsJson = { Answer?: Array<{ type?: number; data?: string }> };

const domainPrefix = "managed-domain:";
const projectDomainPrefix = "project-domain:";
const now = () => new Date().toISOString();
const domainKey = (domain: string) => `${domainPrefix}${domain}`;
const projectDomainKey = (projectId: string) =>
  `${projectDomainPrefix}${projectId}`;

function configured(
  config: DomainConfig,
): config is Required<
  Pick<
    DomainConfig,
    "accountId" | "projectName" | "projectSubdomain" | "apiToken"
  >
> &
  DomainConfig {
  return Boolean(
    config.accountId &&
    config.projectName &&
    config.projectSubdomain &&
    config.apiToken,
  );
}

export function domainCapabilities(config: DomainConfig): {
  enabled: boolean;
  reason: "ready" | "missing_pages_api_token" | "missing_pages_project";
} {
  if (!config.apiToken)
    return { enabled: false, reason: "missing_pages_api_token" };
  if (!config.accountId || !config.projectName || !config.projectSubdomain)
    return { enabled: false, reason: "missing_pages_project" };
  return { enabled: true, reason: "ready" };
}

/** Normalizes and restricts the feature to hostnames that are subdomains. */
export function normalizeManagedDomain(value: string): string {
  const candidate = value.trim().toLowerCase().replace(/\.$/, "");
  if (
    !candidate ||
    candidate.length > 253 ||
    candidate.includes("/") ||
    candidate.includes(":") ||
    candidate.includes("@") ||
    candidate.includes("*")
  ) {
    throw new DomainError(
      400,
      "Enter a valid subdomain such as portfolio.example.com.",
      "domain_invalid",
    );
  }
  let hostname: string;
  try {
    const parsed = new URL(`https://${candidate}`);
    if (
      parsed.hostname !== candidate ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.pathname !== "/"
    )
      throw new Error("invalid");
    hostname = parsed.hostname;
  } catch {
    throw new DomainError(
      400,
      "Enter a valid subdomain such as portfolio.example.com.",
      "domain_invalid",
    );
  }
  const labels = hostname.split(".");
  if (
    labels.length < 3 ||
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label),
    )
  ) {
    throw new DomainError(
      400,
      "Use a subdomain. Root domains need nameserver or DNS provider setup first.",
      "domain_subdomain_required",
    );
  }
  return hostname;
}

function normalizeTarget(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.$/, "")
    .replace(/\/$/, "");
}

function txtValue(data: string): string {
  return data.replace(/^"|"$/g, "").replaceAll('\\"', '"');
}

function isDnsAnswer(
  data: DnsJson,
  predicate: (value: string) => boolean,
): boolean {
  return (data.Answer ?? []).some(
    (answer) => typeof answer.data === "string" && predicate(answer.data),
  );
}

async function readDnsJson(response: Response): Promise<DnsJson> {
  if (!response.ok)
    throw new DomainError(
      503,
      "DNS verification is temporarily unavailable. Try again shortly.",
      "dns_unavailable",
    );
  try {
    const value = (await response.json()) as unknown;
    return value && typeof value === "object" ? (value as DnsJson) : {};
  } catch {
    throw new DomainError(
      503,
      "DNS verification is temporarily unavailable. Try again shortly.",
      "dns_unavailable",
    );
  }
}

export async function verifyDnsProof(
  domain: string,
  verificationToken: string,
  pagesSubdomain: string,
  fetcher: typeof fetch = fetch,
): Promise<DnsProof> {
  const normalized = normalizeManagedDomain(domain);
  const txtName = `_portfolio-studio.${normalized}`;
  const [txtResponse, cnameResponse] = await Promise.all([
    fetcher(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(txtName)}&type=TXT`,
      { headers: { accept: "application/dns-json" } },
    ),
    fetcher(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(normalized)}&type=CNAME`,
      { headers: { accept: "application/dns-json" } },
    ),
  ]);
  const [txt, cname] = await Promise.all([
    readDnsJson(txtResponse),
    readDnsJson(cnameResponse),
  ]);
  const target = normalizeTarget(pagesSubdomain);
  return {
    txtName,
    txtVerified: isDnsAnswer(
      txt,
      (value) => txtValue(value) === verificationToken,
    ),
    cnameVerified: isDnsAnswer(
      cname,
      (value) => normalizeTarget(value) === target,
    ),
    checkedAt: now(),
  };
}

function apiBase(config: DomainConfig): string {
  if (!configured(config))
    throw new DomainError(
      503,
      "Custom domains are not configured yet.",
      "domains_unavailable",
    );
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/pages/projects/${encodeURIComponent(config.projectName)}/domains`;
}

function providerDomain(value: unknown): PagesDomain {
  const record =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const validation =
    record.validation_data && typeof record.validation_data === "object"
      ? (record.validation_data as Record<string, unknown>)
      : {};
  const verification =
    record.verification_data && typeof record.verification_data === "object"
      ? (record.verification_data as Record<string, unknown>)
      : {};
  return {
    id:
      typeof record.id === "string"
        ? record.id
        : typeof record.domain_id === "string"
          ? record.domain_id
          : "",
    name: typeof record.name === "string" ? record.name : "",
    status: typeof record.status === "string" ? record.status : "pending",
    validationStatus:
      typeof validation.status === "string" ? validation.status : null,
    verificationStatus:
      typeof verification.status === "string" ? verification.status : null,
    txtName:
      typeof validation.txt_name === "string" ? validation.txt_name : null,
    txtValue:
      typeof validation.txt_value === "string" ? validation.txt_value : null,
  };
}

async function pagesRequest(
  config: DomainConfig,
  path = "",
  init: RequestInit = {},
): Promise<unknown> {
  const fetcher = config.fetcher ?? fetch;
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${config.apiToken ?? ""}`);
  headers.set("accept", "application/json");
  if (init.body) headers.set("content-type", "application/json");
  const response = await fetcher(`${apiBase(config)}${path}`, {
    ...init,
    headers,
  });
  let body: { result?: unknown; success?: boolean } = {};
  try {
    body = (await response.json()) as { result?: unknown; success?: boolean };
  } catch {
    /* bounded error below */
  }
  if (!response.ok || body.success === false)
    throw new DomainError(
      502,
      "Cloudflare could not update this domain yet. Check the DNS records and try again.",
      "pages_domain_unavailable",
    );
  return body.result;
}

async function createPagesDomain(
  config: DomainConfig,
  domain: string,
): Promise<PagesDomain> {
  return providerDomain(
    await pagesRequest(config, "", {
      method: "POST",
      body: JSON.stringify({ name: domain }),
    }),
  );
}

async function getPagesDomain(
  config: DomainConfig,
  domain: string,
): Promise<PagesDomain> {
  return providerDomain(
    await pagesRequest(config, `/${encodeURIComponent(domain)}`),
  );
}

async function deletePagesDomain(
  config: DomainConfig,
  domain: string,
): Promise<void> {
  await pagesRequest(config, `/${encodeURIComponent(domain)}`, {
    method: "DELETE",
  });
}

function publicDomain(
  record: ManagedDomain,
): Omit<ManagedDomain, "verificationToken"> & { verificationToken?: never } {
  const { verificationToken: _verificationToken, ...safe } = record;
  return safe;
}

export class DomainService {
  constructor(
    private readonly store: Store,
    private readonly config: DomainConfig,
  ) {}

  capabilities() {
    return domainCapabilities(this.config);
  }

  async get(
    ownerId: string,
    projectId: string,
  ): Promise<
    | (Omit<ManagedDomain, "verificationToken"> & { verificationToken?: never })
    | null
  > {
    const reference = await this.store.get<{ domain: string }>(
      projectDomainKey(projectId),
    );
    if (!reference) return null;
    const record = await this.store.get<ManagedDomain>(
      domainKey(reference.domain),
    );
    if (!record || record.ownerId !== ownerId || record.projectId !== projectId)
      return null;
    return publicDomain(record);
  }

  async begin(
    ownerId: string,
    projectId: string,
    input: string,
  ): Promise<{
    domain: ReturnType<typeof publicDomain>;
    cnameTarget: string;
    txtName: string;
    txtValue: string;
  }> {
    if (!configured(this.config))
      throw new DomainError(
        503,
        "Custom domains are not configured yet.",
        "domains_unavailable",
      );
    const domain = normalizeManagedDomain(input);
    const existingProject = await this.store.get<{ domain: string }>(
      projectDomainKey(projectId),
    );
    if (existingProject && existingProject.domain !== domain)
      throw new DomainError(
        409,
        "Remove the current custom domain before adding another one.",
        "project_domain_exists",
      );
    const existing = await this.store.get<ManagedDomain>(domainKey(domain));
    if (
      existing &&
      (existing.ownerId !== ownerId || existing.projectId !== projectId)
    )
      throw new DomainError(
        409,
        "That domain is already connected to another portfolio.",
        "domain_taken",
      );
    if (existing)
      return {
        domain: publicDomain(existing),
        cnameTarget: this.config.projectSubdomain,
        txtName: existing.dns.txtName,
        txtValue: existing.verificationToken,
      };

    const createdAt = now();
    const record: ManagedDomain = {
      version: 1,
      domain,
      ownerId,
      projectId,
      status: "pending",
      verificationToken: `ps_${base64url(randomBytes(24))}`,
      dns: {
        txtName: `_portfolio-studio.${domain}`,
        txtVerified: false,
        cnameVerified: false,
        checkedAt: createdAt,
      },
      providerDomainId: null,
      providerStatus: null,
      createdAt,
      updatedAt: createdAt,
      lastError: null,
    };
    const claimed = await this.store.putIfAbsent(domainKey(domain), record);
    if (!claimed) {
      const winner = await this.store.get<ManagedDomain>(domainKey(domain));
      if (
        !winner ||
        winner.ownerId !== ownerId ||
        winner.projectId !== projectId
      )
        throw new DomainError(
          409,
          "That domain is already connected to another portfolio.",
          "domain_taken",
        );
      return {
        domain: publicDomain(winner),
        cnameTarget: this.config.projectSubdomain,
        txtName: winner.dns.txtName,
        txtValue: winner.verificationToken,
      };
    }
    const projectClaimed = await this.store.putIfAbsent(
      projectDomainKey(projectId),
      { domain },
    );
    if (!projectClaimed) {
      await this.store.delete(domainKey(domain));
      throw new DomainError(
        409,
        "Remove the current custom domain before adding another one.",
        "project_domain_exists",
      );
    }
    return {
      domain: publicDomain(record),
      cnameTarget: this.config.projectSubdomain,
      txtName: record.dns.txtName,
      txtValue: record.verificationToken,
    };
  }

  async verify(
    ownerId: string,
    projectId: string,
  ): Promise<{
    domain: ReturnType<typeof publicDomain>;
    dns: DnsProof;
    cnameTarget: string;
  }> {
    if (!configured(this.config))
      throw new DomainError(
        503,
        "Custom domains are not configured yet.",
        "domains_unavailable",
      );
    const reference = await this.store.get<{ domain: string }>(
      projectDomainKey(projectId),
    );
    const record = reference
      ? await this.store.get<ManagedDomain>(domainKey(reference.domain))
      : null;
    if (!record || record.ownerId !== ownerId || record.projectId !== projectId)
      throw new DomainError(
        404,
        "No custom domain is connected to this portfolio.",
        "domain_not_found",
      );
    const dns = await verifyDnsProof(
      record.domain,
      record.verificationToken,
      this.config.projectSubdomain,
      this.config.fetcher ?? fetch,
    );
    let next: ManagedDomain = {
      ...record,
      dns,
      updatedAt: now(),
      lastError: null,
    };
    if (!dns.txtVerified || !dns.cnameVerified) {
      next.status = "pending";
      await this.store.compareAndSwap(domainKey(record.domain), record, next);
      return {
        domain: publicDomain(next),
        dns,
        cnameTarget: this.config.projectSubdomain,
      };
    }
    let provider: PagesDomain;
    try {
      provider = record.providerDomainId
        ? await getPagesDomain(this.config, record.domain)
        : await createPagesDomain(this.config, record.domain);
    } catch (error) {
      const message =
        error instanceof DomainError
          ? error.message
          : "Cloudflare could not update this domain yet.";
      next = { ...next, status: "error", lastError: message };
      await this.store.compareAndSwap(domainKey(record.domain), record, next);
      throw error;
    }
    next = {
      ...next,
      providerDomainId: provider.id || record.providerDomainId,
      providerStatus: provider.status,
      status: provider.status === "active" ? "active" : "pending",
    };
    await this.store.compareAndSwap(domainKey(record.domain), record, next);
    return {
      domain: publicDomain(next),
      dns,
      cnameTarget: this.config.projectSubdomain,
    };
  }

  async remove(ownerId: string, projectId: string): Promise<void> {
    const reference = await this.store.get<{ domain: string }>(
      projectDomainKey(projectId),
    );
    const record = reference
      ? await this.store.get<ManagedDomain>(domainKey(reference.domain))
      : null;
    if (!record || record.ownerId !== ownerId || record.projectId !== projectId)
      throw new DomainError(
        404,
        "No custom domain is connected to this portfolio.",
        "domain_not_found",
      );
    // Revoke the local serving claim even if Cloudflare is unavailable. This
    // prevents a failed provider deletion from leaving a public portfolio live.
    if (!configured(this.config)) {
      await this.store.compareAndSwap(domainKey(record.domain), record, {
        ...record,
        status: "error",
        providerStatus: "error",
        lastError: "Custom-domain management is not configured.",
      });
      await this.store.delete(projectDomainKey(projectId));
      throw new DomainError(
        503,
        "Custom domains are not configured yet.",
        "domains_unavailable",
      );
    }
    if (record.providerDomainId) {
      // Mark the record unavailable before the external mutation. If the
      // process or provider fails after this point, resolveVerified cannot
      // continue serving the portfolio.
      const revoking: ManagedDomain = {
        ...record,
        status: "error",
        providerStatus: "revoking",
        lastError: null,
        updatedAt: now(),
      };
      const marked = await this.store.compareAndSwap(
        domainKey(record.domain),
        record,
        revoking,
      );
      if (!marked)
        throw new DomainError(
          409,
          "The domain changed while it was being removed. Try again.",
          "domain_changed",
        );
      try {
        await deletePagesDomain(this.config, record.domain);
      } catch (error) {
        const message =
          error instanceof DomainError
            ? error.message
            : "Cloudflare could not remove this domain yet.";
        await this.store.compareAndSwap(domainKey(record.domain), revoking, {
          ...revoking,
          providerStatus: "error",
          lastError: message,
          updatedAt: now(),
        });
        await this.store.delete(projectDomainKey(projectId));
        throw error;
      }
    }
    await this.store.delete(domainKey(record.domain));
    await this.store.delete(projectDomainKey(projectId));
  }

  async resolveVerified(
    hostname: string,
  ): Promise<{ domain: string; projectId: string } | null> {
    let domain: string;
    try {
      domain = normalizeManagedDomain(hostname);
    } catch {
      return null;
    }
    const record = await this.store.get<ManagedDomain>(domainKey(domain));
    if (
      !record ||
      record.status !== "active" ||
      !record.dns.txtVerified ||
      !record.dns.cnameVerified ||
      record.providerStatus !== "active"
    )
      return null;
    return { domain, projectId: record.projectId };
  }
}
