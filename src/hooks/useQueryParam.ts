import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function useQueryState(
  key: string,
  options?: { defaultValue?: string },
) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const value = searchParams.get(key) ?? options?.defaultValue ?? "";

  const setValue = (val: string | null) => {
    const params = new URLSearchParams(searchParams.toString());

    if (!val) params.delete(key);
    else params.set(key, val);

    router.replace(`?${params.toString()}`, { scroll: false });
  };

  return [value, setValue] as const;
}

export function useQueryParam(key: string, defaultValue = "") {
  const searchParams = useSearchParams();
  const router = useRouter();

  const value = searchParams.get(key);

  useEffect(() => {
    if (!value && defaultValue) {
      const params = new URLSearchParams(searchParams.toString());
      params.set(key, defaultValue);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, []);

  return [
    value ?? defaultValue,
    (val: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (!val) params.delete(key);
      else params.set(key, val);

      router.replace(`?${params.toString()}`, { scroll: false });
    },
  ] as const;
}
