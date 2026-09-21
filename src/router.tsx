import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

const ssrOptions = createIsomorphicFn().server(() => ({
  nonce: getRequestHeader("x-nd-csp-nonce") ?? "",
}));

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    ssr: ssrOptions() ?? {},
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
