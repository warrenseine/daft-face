import { useMemo } from "react";

export const useQueryParam = <T extends string>(
  param: string,
  defaultValue: T
): T => {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const value = params.get(param) as T;

  if (value === null) {
    return defaultValue;
  }

  return value;
};
