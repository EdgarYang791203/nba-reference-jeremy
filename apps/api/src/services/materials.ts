import type { Repos } from '../repos';
import type { MaterialListQuery } from '../repos/materials';
import { NotFoundError } from './errors';

export function createMaterialsService(repos: Repos) {
    return {
        list(query: MaterialListQuery) {
            return repos.materials.list({ ...query, status: 'published' });
        },
        async get(id: number) {
            const material = await repos.materials.getById(id);
            if (!material || material.status !== 'published') {
                throw new NotFoundError(`material ${id}`);
            }
            return material;
        },
        async setStatus(id: number, status: 'published' | 'hidden') {
            const updated = await repos.materials.setStatus(id, status);
            if (!updated) {
                throw new NotFoundError(`material ${id}`);
            }
            return updated;
        }
    };
}
