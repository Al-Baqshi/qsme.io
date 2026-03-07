/**
 * QSME backend API client.
 * Uses NEXT_PUBLIC_QSME_API_URL (default http://localhost:8000).
 */

import type {
  ApiProject,
  ApiProjectContext,
  ApiDocument,
  ApiExportJob,
  ApiExportRequest,
  ApiPage,
  ApiOverlay,
  ApiProjectQuantities,
  ApiPageScaleRequest,
} from "./qsme-api-types"

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_QSME_API_URL ?? "http://localhost:8000"
  }
  return process.env.NEXT_PUBLIC_QSME_API_URL ?? "http://localhost:8000"
}

export { getBaseUrl }

export class QSMEApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message)
    this.name = "QSMEApiError"
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { parseJson?: boolean } = {}
): Promise<T> {
  const { parseJson = true, ...init } = options
  const base = getBaseUrl().replace(/\/$/, "")
  const url = path.startsWith("http") ? path : `${base}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers as Record<string, string>),
    },
  })
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new QSMEApiError(
      (body as { detail?: string })?.detail ?? res.statusText,
      res.status,
      body
    )
  }
  if (parseJson && res.status !== 204) {
    return res.json() as Promise<T>
  }
  return undefined as T
}

// ── Projects ──

export async function getProjects(): Promise<ApiProject[]> {
  return request<ApiProject[]>("/projects")
}

export async function createProject(payload: {
  name: string
  description?: string | null
}): Promise<ApiProject> {
  return request<ApiProject>("/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function getProjectContext(projectId: string): Promise<ApiProjectContext> {
  return request<ApiProjectContext>(`/projects/${projectId}/context`)
}

export async function updateProject(
  projectId: string,
  payload: { name?: string; description?: string | null }
): Promise<ApiProject> {
  return request<ApiProject>(`/projects/${projectId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function deleteProject(projectId: string): Promise<void> {
  return request(`/projects/${projectId}`, {
    method: "DELETE",
    parseJson: false,
  })
}

export async function runExtraction(
  projectId: string,
  options?: { force?: boolean }
): Promise<{
  documentsProcessed: number
  totalPages: number
}> {
  const params = new URLSearchParams()
  if (options?.force) params.set("force", "true")
  const qs = params.toString()
  return request(
    `/projects/${projectId}/extract${qs ? `?${qs}` : ""}`,
    { method: "POST" }
  )
}

export async function getProjectQuantities(
  projectId: string
): Promise<ApiProjectQuantities> {
  return request<ApiProjectQuantities>(`/projects/${projectId}/quantities`)
}

// ── Documents ──

export async function uploadDocument(
  projectId: string,
  file: File,
  filename?: string
): Promise<ApiDocument> {
  const form = new FormData()
  form.append("file", file)
  if (filename) form.append("filename", filename)
  const base = getBaseUrl().replace(/\/$/, "")
  const res = await fetch(`${base}/projects/${projectId}/documents`, {
    method: "POST",
    body: form,
    headers: { Accept: "application/json" },
  })
  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new QSMEApiError(
      (body as { detail?: string })?.detail ?? res.statusText,
      res.status,
      body
    )
  }
  return res.json() as Promise<ApiDocument>
}

export async function createDocumentPages(documentId: string): Promise<{ pagesCreated: number }> {
  return request<{ pagesCreated: number }>(`/documents/${documentId}/create-pages`, { method: "POST" })
}

export async function getDocumentPages(documentId: string): Promise<ApiPage[]> {
  return request<ApiPage[]>(`/documents/${documentId}/pages`)
}

export async function getPageStructureJson(
  pageId: string
): Promise<{ pageId: string; rawStructure: unknown }> {
  return request<{ pageId: string; rawStructure: unknown }>(
    `/pages/${pageId}/structure-json`
  )
}

export async function extractPage(
  pageId: string,
  options?: { force?: boolean }
): Promise<{ pageId: string; status: string }> {
  const params = new URLSearchParams()
  if (options?.force) params.set("force", "true")
  const qs = params.toString()
  return request<{ pageId: string; status: string }>(
    `/pages/${pageId}/extract${qs ? `?${qs}` : ""}`,
    { method: "POST" }
  )
}

// ── Pages ──

export async function setPageScale(
  pageId: string,
  payload: ApiPageScaleRequest
): Promise<unknown> {
  return request(`/pages/${pageId}/scale`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

// ── Overlays ──

export async function getPageOverlays(pageId: string): Promise<ApiOverlay[]> {
  return request<ApiOverlay[]>(`/pages/${pageId}/overlays`)
}

export async function createOverlay(
  pageId: string,
  payload: Record<string, unknown>
): Promise<ApiOverlay> {
  return request<ApiOverlay>(`/pages/${pageId}/overlays`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function updateOverlay(
  overlayId: string,
  payload: Record<string, unknown>
): Promise<ApiOverlay> {
  return request<ApiOverlay>(`/overlays/${overlayId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function deleteOverlay(overlayId: string): Promise<void> {
  return request(`/overlays/${overlayId}`, { method: "DELETE" })
}

// ── Quantities & Export ──

export async function exportProject(
  projectId: string,
  format: ApiExportRequest["format"]
): Promise<{ id: string; projectId: string; format: string; status: string; downloadUri: string | null; generatedAt?: string }> {
  return request(`/projects/${projectId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  })
}
