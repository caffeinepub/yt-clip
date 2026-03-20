import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Clip {
    id: bigint;
    startTime: bigint;
    title: string;
    endTime: bigint;
    createdAt: bigint;
    videoUrl: string;
}
export interface backendInterface {
    createClip(title: string, videoUrl: string, startTime: bigint, endTime: bigint): Promise<{
        id: bigint;
        timestamp: bigint;
    }>;
    deleteClip(id: bigint): Promise<void>;
    getAllClips(): Promise<Array<Clip>>;
}
