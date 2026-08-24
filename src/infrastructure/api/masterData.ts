import { api } from './client';

export interface BranchReference {
  id: string;
  name: string;
  code?: string | null;
  status: 'active' | 'inactive' | 'archived' | string;
}

export interface ZoneReference {
  id: string;
  branch_id?: string | null;
  name: string;
  code?: string | null;
  status: 'active' | 'inactive' | 'archived' | string;
  governorate?: string | null;
  city?: string | null;
}

async function allReferenceRows<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  let page = 1;
  for (;;) {
    const response = await api.get<T[]>(path, {
      query: { page, per_page: 100, sort: 'name' },
      retries: 1,
    });
    rows.push(...(Array.isArray(response.data) ? response.data : []));
    const lastPage = Number(response.meta?.last_page ?? page);
    if (!Number.isFinite(lastPage) || page >= lastPage) break;
    page += 1;
  }
  return rows;
}

export async function loadBranches(): Promise<BranchReference[]> {
  return (await allReferenceRows<BranchReference>('/api/v1/branches'))
    .filter((branch) => branch.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}

export async function loadZones(): Promise<ZoneReference[]> {
  return (await allReferenceRows<ZoneReference>('/api/v1/zones'))
    .filter((zone) => zone.status === 'active')
    .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
}
