import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Clip } from "../backend";
import { useActor } from "./useActor";

export function useGetClips() {
  const { actor, isFetching } = useActor();
  return useQuery<Clip[]>({
    queryKey: ["clips"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllClips();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateClip() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      videoUrl,
      startTime,
      endTime,
    }: {
      title: string;
      videoUrl: string;
      startTime: number;
      endTime: number;
    }) => {
      if (!actor) throw new Error("Not connected");
      return actor.createClip(
        title,
        videoUrl,
        BigInt(Math.round(startTime)),
        BigInt(Math.round(endTime)),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clips"] });
    },
  });
}

export function useDeleteClip() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteClip(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clips"] });
    },
  });
}
